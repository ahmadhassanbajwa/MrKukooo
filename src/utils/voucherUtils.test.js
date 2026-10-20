import assert from 'node:assert/strict';
import { calculateDiscount, validateVoucher } from './voucherUtils.js';

console.log('Running voucherUtils tests...');

// calculateDiscount tests
assert.equal(calculateDiscount('price', 150, 1000), 150, 'Price discount 150 from 1000');
assert.equal(calculateDiscount('price', 50, 200), 50, 'Price discount 50 from 200');
assert.equal(calculateDiscount('price', 500, 300), 300, 'Price discount capped at subtotal');
assert.equal(calculateDiscount('price', 1000, 1000), 1000, 'Price discount 100% of subtotal');

assert.equal(calculateDiscount('percentage', 10, 1000), 100, '10% of 1000 is 100');
assert.equal(calculateDiscount('percentage', 25, 400), 100, '25% of 400 is 100');
assert.equal(calculateDiscount('percentage', 150, 500), 500, '150% capped at subtotal');
assert.equal(calculateDiscount('percentage', 100, 500), 500, '100% discount equal to subtotal');

assert.equal(calculateDiscount('price', -50, 500), 0, 'Negative price discount is 0');
assert.equal(calculateDiscount('percentage', -10, 500), 0, 'Negative percentage discount is 0');
assert.equal(calculateDiscount('price', 100, 0), 0, 'Subtotal 0 returns 0');

// validateVoucher tests
const mockVouchers = [
  {
    id: 'v1',
    code: 'SAVE100',
    type: 'price',
    value: 100,
    min_order: 300,
    max_uses: 10,
    times_used: 2,
    is_active: true
  },
  {
    id: 'v2',
    code: 'TENPERCENT',
    type: 'percentage',
    value: 10,
    min_order: 0,
    max_uses: 5,
    times_used: 5, // limit reached
    is_active: true
  },
  {
    id: 'v3',
    code: 'INACTIVE',
    type: 'price',
    value: 50,
    min_order: 0,
    max_uses: 10,
    times_used: 0,
    is_active: false
  }
];

// Test disabled global customer field
let res = validateVoucher('SAVE100', mockVouchers, 500, false);
assert.equal(res.valid, false);
assert.match(res.error, /disabled/i);

// Test empty code
res = validateVoucher('', mockVouchers, 500, true);
assert.equal(res.valid, false);
assert.match(res.error, /enter a voucher code/i);

// Test non-existent code
res = validateVoucher('DOESNOTEXIST', mockVouchers, 500, true);
assert.equal(res.valid, false);
assert.match(res.error, /does not exist/i);

// Test inactive voucher
res = validateVoucher('INACTIVE', mockVouchers, 500, true);
assert.equal(res.valid, false);
assert.match(res.error, /inactive/i);

// Test redemption limit reached
res = validateVoucher('TENPERCENT', mockVouchers, 500, true);
assert.equal(res.valid, false);
assert.match(res.error, /redemption limit/i);

// Test minimum order unmet
res = validateVoucher('SAVE100', mockVouchers, 200, true);
assert.equal(res.valid, false);
assert.match(res.error, /minimum order/i);

// Test valid code (case insensitive)
res = validateVoucher('save100', mockVouchers, 500, true);
assert.equal(res.valid, true);
assert.equal(res.voucher.code, 'SAVE100');

// Test getOrderDiscount
import { getOrderDiscount } from './voucherUtils.js';

// 1. Direct discount_amount
assert.equal(getOrderDiscount({ discount_amount: 150, total_amount: 850 }), 150);
// 2. Subtotal vs total_amount
assert.equal(getOrderDiscount({ subtotal: 1000, total_amount: 850, delivery_fee: 0 }), 150);
assert.equal(getOrderDiscount({ subtotal: 1000, total_amount: 900, delivery_fee: 50 }), 150);
// 3. Embedded meta discount
assert.equal(getOrderDiscount({ items: [{ name: 'Item', price: 500, quantity: 2, _order_discount: 200 }], total_amount: 800 }), 200);
// 4. Items sum vs total_amount
assert.equal(getOrderDiscount({ items: [{ name: 'Item 1', price: 600, quantity: 2 }], total_amount: 1000, delivery_fee: 0 }), 200);
// 5. No discount
assert.equal(getOrderDiscount({ items: [{ name: 'Item', price: 500, quantity: 2 }], total_amount: 1000, delivery_fee: 0 }), 0);
assert.equal(getOrderDiscount(null), 0);

console.log('✓ All voucherUtils tests passed successfully!');
