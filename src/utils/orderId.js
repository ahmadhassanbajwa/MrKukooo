/**
 * Generate a sequential daily reset Order ID in the format: Kddmm-001
 * Example: For September 1st -> K0109-001, K0109-002, etc.
 * 
 * @param {Array} existingOrders - Optional array of current orders to find the highest sequence today
 * @returns {string} Formatted Order ID
 */
export function generateDailyOrderId(existingOrders = []) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const prefix = `K${day}${month}-`;
  const dateKey = `${year}${month}${day}`;

  // 1. Search existing orders (from state or localStorage) for today's highest sequence number
  let ordersList = Array.isArray(existingOrders) ? existingOrders : [];
  if (ordersList.length === 0 && typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem('kukooo_orders');
      if (cached) ordersList = JSON.parse(cached);
    } catch {
      ordersList = [];
    }
  }

  let maxSeq = 0;
  const regex = new RegExp(`^K${day}${month}-(\\d+)$`, 'i');

  for (const ord of ordersList) {
    if (!ord || !ord.order_id) continue;
    const match = String(ord.order_id).trim().match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  // 2. Also check local daily sequence tracker in localStorage
  let localSeq = 0;
  const storageKey = `kukooo_daily_seq_${dateKey}`;
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) localSeq = parseInt(saved, 10) || 0;
    } catch {
      localSeq = 0;
    }
  }

  const nextSeq = Math.max(maxSeq, localSeq) + 1;

  // 3. Save updated sequence to localStorage for offline / rapid click resilience
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(storageKey, String(nextSeq));
    } catch (err) {
      console.warn("Could not save daily order sequence to localStorage:", err);
    }
  }

  // Pad sequence to at least 3 digits (e.g. 001, 002, ..., 100)
  const paddedSeq = String(nextSeq).padStart(3, '0');
  return `${prefix}${paddedSeq}`;
}
