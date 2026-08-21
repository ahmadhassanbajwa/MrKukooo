/**
 * restaurantHours.js
 * -----------------------------------------------------------------
 * Shared utility for reading, writing and evaluating restaurant
 * opening hours.
 *
 * Data shape stored in localStorage under HOURS_KEY:
 * {
 *   "Monday":    { open: true,  start: "15:00", end: "01:00" },
 *   "Tuesday":   { open: true,  start: "15:00", end: "01:00" },
 *   ...
 *   "Sunday":    { open: true,  start: "15:00", end: "01:00" }
 * }
 *
 * "end" may be past midnight (e.g. "01:00"), which means the slot
 * spans two calendar days.  isRestaurantOpen() handles this case.
 * -----------------------------------------------------------------
 */

export const HOURS_KEY = 'kukooo_restaurant_hours';

/** Ordered list of days used for display and iteration. */
export const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

/**
 * Default schedule — 3:00 PM to 1:00 AM every day.
 * "01:00" is treated as 1 AM the following day.
 */
const DEFAULT_HOURS = Object.fromEntries(
  DAYS_OF_WEEK.map((day) => [day, { open: true, start: '15:00', end: '01:00' }])
);

/** Load the saved schedule from localStorage, falling back to defaults. */
export function getHours() {
  try {
    const raw = localStorage.getItem(HOURS_KEY);
    if (!raw) return { ...DEFAULT_HOURS };
    const parsed = JSON.parse(raw);
    // Merge with defaults so any newly-added day keys are never missing
    return { ...DEFAULT_HOURS, ...parsed };
  } catch {
    return { ...DEFAULT_HOURS };
  }
}

/** Persist the schedule to localStorage. */
export function saveHours(hours) {
  localStorage.setItem(HOURS_KEY, JSON.stringify(hours));
}

/**
 * Convert an "HH:MM" string to total minutes since midnight.
 * @param {string} timeStr  e.g. "15:00" or "01:00"
 * @returns {number}
 */
function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Return the JS day-of-week name for a given Date object.
 * JS Date uses 0=Sunday…6=Saturday; we map it to our DAYS_OF_WEEK strings.
 */
function getDayName(date) {
  return DAYS_OF_WEEK[(date.getDay() + 6) % 7]; // shift so Monday = index 0
}

/**
 * Determine whether the restaurant is currently open given a schedule.
 *
 * Handles overnight windows (e.g. open 15:00 → 01:00 the next day):
 *  - If end <= start, the slot crosses midnight.
 *    We check: currentMin >= start  OR  currentMin < end
 *    The "previous day" slot is also checked to cover the post-midnight period.
 *
 * @param {Object} hours  Schedule object (from getHours())
 * @param {Date}   [now]  Defaults to new Date() — injectable for unit testing
 * @returns {{ open: boolean, reason: string }}
 */
export function isRestaurantOpen(hours, now = new Date()) {
  const dayName   = getDayName(now);
  const slot      = hours[dayName];
  const currentMin = now.getHours() * 60 + now.getMinutes();

  // Helper: is currentMin inside a single [start, end) window?
  function inWindow(start, end) {
    const s = toMinutes(start);
    const e = toMinutes(end);
    if (e > s) {
      // Normal window (e.g. 09:00 → 22:00)
      return currentMin >= s && currentMin < e;
    } else {
      // Overnight window (e.g. 15:00 → 01:00 next day)
      return currentMin >= s || currentMin < e;
    }
  }

  // Check today's slot
  if (slot?.open && inWindow(slot.start, slot.end)) {
    return { open: true, reason: '' };
  }

  // For overnight windows the "end" period belongs to the *next* calendar
  // day — so check if yesterday's slot is still active right now.
  const prevDayIdx = (DAYS_OF_WEEK.indexOf(dayName) + 6) % 7;
  const prevSlot   = hours[DAYS_OF_WEEK[prevDayIdx]];
  if (prevSlot?.open) {
    const s = toMinutes(prevSlot.start);
    const e = toMinutes(prevSlot.end);
    const isOvernight = e <= s; // e.g. start=15:00, end=01:00
    if (isOvernight && currentMin < e) {
      return { open: true, reason: '' };
    }
  }

  // Closed — build a helpful reason string
  if (!slot?.open) {
    return { open: false, reason: `We're closed on ${dayName}s.` };
  }

  const fmt = (t) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return {
    open: false,
    reason: `We're currently closed. Today's hours: ${fmt(slot.start)} – ${fmt(slot.end)}.`
  };
}

/**
 * Format an "HH:MM" 24-hour string to a human-readable 12-hour string.
 * e.g. "15:00" → "3:00 PM", "01:00" → "1:00 AM"
 */
export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}
