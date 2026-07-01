import { useState, useEffect } from 'react';
import { Clock, Save, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { DAYS_OF_WEEK, getHours, saveHours, formatTime } from '../../utils/restaurantHours';

// ---------------------------------------------------------------------------
// HoursManagement — manager tab for configuring weekly restaurant hours
// ---------------------------------------------------------------------------
export default function HoursManagement() {
  const [schedule, setSchedule] = useState(() => getHours());
  const [saved, setSaved]       = useState(false);

  // Persist to localStorage whenever manager saves
  const handleSave = () => {
    saveHours(schedule);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  /** Toggle a day open / closed. */
  const toggleDay = (day) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], open: !prev[day].open }
    }));
  };

  /** Update start or end time for a given day. */
  const handleTimeChange = (day, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  /**
   * Apply one day's settings to all days (bulk-fill shortcut).
   * Useful when the restaurant keeps the same hours every day.
   */
  const applyToAll = (sourceDay) => {
    const slot = schedule[sourceDay];
    const updated = Object.fromEntries(
      DAYS_OF_WEEK.map(d => [d, { ...slot }])
    );
    setSchedule(updated);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-primary font-black uppercase tracking-wider">
            Configuration
          </span>
          <h2 className="text-2xl font-black text-accent tracking-tight mt-0.5">
            Restaurant Hours
          </h2>
          <p className="text-xs text-gray-400 font-semibold mt-1">
            Set your opening and closing times for each day of the week.
            Customers will not be able to place orders outside these hours.
          </p>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          id="hours-save-btn"
          className={`flex items-center gap-2 px-5 py-2.5 font-black text-sm rounded-xl comic-border-sm comic-shadow-sm comic-hover cursor-pointer transition-colors ${
            saved
              ? 'bg-green-500 text-white border-green-700'
              : 'bg-secondary text-accent'
          }`}
        >
          {saved ? (
            <><CheckCircle className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Hours</>
          )}
        </button>
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-3 bg-secondary/10 border-2 border-secondary rounded-xl p-4">
        <Clock className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
        <div className="text-xs font-semibold text-accent">
          <strong className="font-black">Overnight windows supported.</strong>{' '}
          If your closing time is past midnight (e.g. 1:00 AM), just enter{' '}
          <code className="bg-white px-1 rounded border border-gray-200">01:00</code> as the end
          time — the system will handle the day-boundary automatically.
        </div>
      </div>

      {/* Day-by-day schedule table */}
      <div className="bg-white rounded-2xl comic-border comic-shadow overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3 bg-accent text-white">
          <span className="text-xs font-black uppercase tracking-wider">Day</span>
          <span className="text-xs font-black uppercase tracking-wider text-center w-16">Status</span>
          <span className="text-xs font-black uppercase tracking-wider text-center w-28">Opens</span>
          <span className="text-xs font-black uppercase tracking-wider text-center w-28">Closes</span>
          <span className="text-xs font-black uppercase tracking-wider text-center w-24">Apply All</span>
        </div>

        {/* One row per day */}
        {DAYS_OF_WEEK.map((day, idx) => {
          const slot = schedule[day];
          const isOpen = slot?.open ?? true;

          return (
            <div
              key={day}
              className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-4 border-t-2 border-gray-100 transition-colors ${
                !isOpen ? 'bg-gray-50 opacity-75' : ''
              }`}
              id={`hours-row-${day.toLowerCase()}`}
            >
              {/* Day name */}
              <div>
                <span className={`text-sm font-black ${isOpen ? 'text-accent' : 'text-gray-400'}`}>
                  {day}
                </span>
                {isOpen && slot?.start && slot?.end && (
                  <span className="block text-[10px] font-semibold text-gray-400 mt-0.5">
                    {formatTime(slot.start)} – {formatTime(slot.end)}
                  </span>
                )}
              </div>

              {/* Open / Closed toggle */}
              <button
                type="button"
                onClick={() => toggleDay(day)}
                id={`hours-toggle-${day.toLowerCase()}`}
                className="flex items-center gap-1.5 cursor-pointer w-16 justify-center"
                aria-label={`Toggle ${day} ${isOpen ? 'closed' : 'open'}`}
              >
                {isOpen ? (
                  <ToggleRight className="w-7 h-7 text-green-500" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-gray-300" />
                )}
                <span className={`text-[10px] font-black uppercase ${isOpen ? 'text-green-600' : 'text-gray-400'}`}>
                  {isOpen ? 'Open' : 'Closed'}
                </span>
              </button>

              {/* Start time */}
              <div className="w-28">
                <input
                  type="time"
                  value={slot?.start ?? '15:00'}
                  disabled={!isOpen}
                  onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                  id={`hours-start-${day.toLowerCase()}`}
                  className={`w-full px-3 py-2 rounded-lg comic-border-sm text-sm font-bold text-accent focus:outline-none focus:ring-2 focus:ring-secondary/40 ${
                    !isOpen ? 'opacity-40 cursor-not-allowed bg-gray-50' : 'bg-white cursor-pointer'
                  }`}
                />
              </div>

              {/* End time */}
              <div className="w-28">
                <input
                  type="time"
                  value={slot?.end ?? '01:00'}
                  disabled={!isOpen}
                  onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                  id={`hours-end-${day.toLowerCase()}`}
                  className={`w-full px-3 py-2 rounded-lg comic-border-sm text-sm font-bold text-accent focus:outline-none focus:ring-2 focus:ring-secondary/40 ${
                    !isOpen ? 'opacity-40 cursor-not-allowed bg-gray-50' : 'bg-white cursor-pointer'
                  }`}
                />
              </div>

              {/* Apply to all days shortcut */}
              <div className="w-24 flex justify-center">
                <button
                  type="button"
                  onClick={() => applyToAll(day)}
                  disabled={!isOpen}
                  title={`Apply ${day}'s hours to every day`}
                  className={`text-[10px] font-black uppercase tracking-wide px-2 py-1.5 rounded-lg border-2 border-accent/20 hover:border-accent transition-colors ${
                    !isOpen ? 'opacity-30 cursor-not-allowed text-gray-400' : 'cursor-pointer text-accent hover:bg-accent/5'
                  }`}
                >
                  Apply All
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save reminder */}
      <p className="text-xs text-gray-400 font-semibold text-center">
        Changes are not live until you click <strong className="text-accent">Save Hours</strong> above.
      </p>
    </div>
  );
}
