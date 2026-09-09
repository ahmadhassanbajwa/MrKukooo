/**
 * Voucher & Discount Calculation Utilities
 */

/**
 * Calculate discount amount based on type and subtotal
 * @param {'price' | 'percentage'} discountType 
 * @param {number} discountValue 
 * @param {number} subtotal 
 * @returns {number} discount amount capped between 0 and subtotal
 */
export const calculateDiscount = (discountType, discountValue, subtotal) => {
  const numericSubtotal = Math.max(0, Number(subtotal) || 0);
  const numericValue = Math.max(0, Number(discountValue) || 0);

  if (numericSubtotal <= 0 || numericValue <= 0) return 0;

  if (discountType === 'percentage') {
    const cappedPercent = Math.min(100, numericValue);
    const amount = (numericSubtotal * cappedPercent) / 100;
    return Math.min(numericSubtotal, Math.round(amount));
  }

  // Price-based discount: capped at subtotal
  return Math.min(numericSubtotal, Math.round(numericValue));
};

/**
 * Validates a voucher code against active vouchers and order criteria
 * @param {string} code 
 * @param {Array} vouchers 
 * @param {number} subtotal 
 * @param {boolean} isCustomerFieldEnabled 
 * @returns {{ valid: boolean, error?: string, voucher?: object, discountAmount?: number }}
 */
export const validateVoucher = (code, vouchers = [], subtotal = 0, isCustomerFieldEnabled = true) => {
  if (!isCustomerFieldEnabled) {
    return { valid: false, error: 'Discount vouchers are currently disabled by the store.' };
  }

  if (!code || !code.trim()) {
    return { valid: false, error: 'Please enter a voucher code.' };
  }

  const cleanCode = code.trim().toUpperCase();
  const voucher = (vouchers || []).find(v => (v.code || '').trim().toUpperCase() === cleanCode);

  if (!voucher) {
    return { valid: false, error: `Voucher code "${cleanCode}" does not exist.` };
  }

  if (!voucher.is_active) {
    return { valid: false, error: `Voucher "${cleanCode}" is currently inactive.` };
  }

  const maxUses = Number(voucher.max_uses);
  const timesUsed = Number(voucher.times_used || 0);
  if (!isNaN(maxUses) && maxUses > 0 && timesUsed >= maxUses) {
    return { valid: false, error: `Voucher "${cleanCode}" has reached its maximum redemption limit.` };
  }

  const minOrder = Number(voucher.min_order || 0);
  if (minOrder > 0 && subtotal < minOrder) {
    return { 
      valid: false, 
      error: `Minimum order amount of Rs. ${minOrder} is required to use this voucher.` 
    };
  }

  const discountAmount = calculateDiscount(voucher.type, voucher.value, subtotal);
  if (discountAmount <= 0) {
    return { valid: false, error: 'This voucher does not provide any discount for this order.' };
  }

  return {
    valid: true,
    voucher,
    discountAmount
  };
};

/**
 * Robustly resolves the discount amount of an order across all representations:
 * 1. Direct order.discount_amount / order.discount
 * 2. Difference between subtotal and total_amount (accounting for delivery_fee)
 * 3. Embedded metadata in items[0]._order_discount
 * 4. Difference between items catalog sum and total_amount
 * @param {object} order 
 * @returns {number} The resolved discount amount (>= 0)
 */
export const getOrderDiscount = (order) => {
  if (!order) return 0;

  // 1. Direct explicit discount fields
  const directDiscount = Number(order.discount_amount ?? order.discount ?? 0);
  if (directDiscount > 0) return directDiscount;

  const totalAmount = Number(order.total_amount || 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const netPaid = Math.max(0, totalAmount - deliveryFee);

  // 2. Explicit subtotal vs net total paid
  const subtotal = Number(order.subtotal || 0);
  if (subtotal > 0 && netPaid > 0 && subtotal > netPaid) {
    return Math.round(subtotal - netPaid);
  }

  // 3. Embedded meta discount in items array
  const firstItem = Array.isArray(order.items) && order.items[0];
  const metaDiscount = Number(firstItem?._order_discount || 0);
  if (metaDiscount > 0) return metaDiscount;

  // 4. Sum of items price vs net total paid
  if (Array.isArray(order.items) && order.items.length > 0 && netPaid > 0) {
    const itemsSum = order.items.reduce((sum, it) => {
      const price = Number(it.price ?? it.totalPricePerUnit ?? 0);
      const qty = Number(it.quantity ?? 1);
      return sum + (price * qty);
    }, 0);
    if (itemsSum > netPaid && (itemsSum - netPaid) >= 1) {
      return Math.round(itemsSum - netPaid);
    }
  }

  return 0;
};

