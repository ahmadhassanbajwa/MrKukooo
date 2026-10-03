import assert from 'node:assert';

console.log("Running Wastage, Profit, and Deal Constituents Tests...");

// 1. Test deal constituents resolution
const products = [
  { id: '1', name: 'Zinger Burger', is_deal: false, deal_items: [] },
  { id: '2', name: 'Fries', is_deal: false, deal_items: [] },
  { 
    id: '3', 
    name: 'Combo Deal', 
    is_deal: true, 
    deal_items: [
      { product_id: '1', quantity: 2 },
      { product_id: '2', quantity: 1 }
    ] 
  },
  {
    id: '4',
    name: 'Pasta with stale deal items',
    is_deal: false,
    deal_items: [
      { product_id: '99', quantity: 5 }
    ]
  }
];

const resolveItemConstituents = (it) => {
  const qty = Number(it.quantity) || 1;
  const result = [];

  const unpack = (itemObj, multiplier, depth = 0) => {
    if (depth > 5) return;

    if (itemObj.is_deal === true && itemObj.deal_items && Array.isArray(itemObj.deal_items) && itemObj.deal_items.length > 0) {
      itemObj.deal_items.forEach(dItem => {
        const dProdId = dItem.product_id ? String(dItem.product_id).trim() : '';
        const targetProd = (dProdId ? products.find(p => String(p.id) === dProdId) : null) ||
          products.find(p => p.name && dItem.name && p.name.trim().toLowerCase() === dItem.name.trim().toLowerCase());
        const dQty = (Number(dItem.quantity) || 1) * multiplier;
        if (targetProd && targetProd.is_deal === true && Array.isArray(targetProd.deal_items) && targetProd.deal_items.length > 0) {
          unpack(targetProd, dQty, depth + 1);
        } else {
          const name = targetProd?.name || dItem.name || (dProdId ? `Item #${dProdId}` : 'Unknown Item');
          result.push({ name, count: dQty });
        }
      });
      return;
    }

    const itProdId = (itemObj.product_id || itemObj.id) ? String(itemObj.product_id || itemObj.id).trim() : '';
    const matchedProduct = (itProdId ? products.find(p => String(p.id) === itProdId) : null) ||
      products.find(p => p.name && itemObj.name && p.name.trim().toLowerCase() === itemObj.name.trim().toLowerCase());

    if (matchedProduct && matchedProduct.is_deal === true && Array.isArray(matchedProduct.deal_items) && matchedProduct.deal_items.length > 0) {
      matchedProduct.deal_items.forEach(dItem => {
        const dProdId = dItem.product_id ? String(dItem.product_id).trim() : '';
        const targetProd = (dProdId ? products.find(p => String(p.id) === dProdId) : null) ||
          products.find(p => p.name && dItem.name && p.name.trim().toLowerCase() === dItem.name.trim().toLowerCase());
        const dQty = (Number(dItem.quantity) || 1) * multiplier;
        if (targetProd && targetProd.is_deal === true && Array.isArray(targetProd.deal_items) && targetProd.deal_items.length > 0) {
          unpack(targetProd, dQty, depth + 1);
        } else {
          const name = targetProd?.name || dItem.name || (dProdId ? `Item #${dProdId}` : 'Unknown Item');
          result.push({ name, count: dQty });
        }
      });
      return;
    }

    const name = itemObj.name || matchedProduct?.name || 'Unknown Item';
    result.push({ name, count: multiplier });
  };

  unpack(it, qty);
  return result;
};

// Test 1: Real deal unpacks
const dealOrdered = resolveItemConstituents({ product_id: '3', quantity: 2 });
assert.strictEqual(dealOrdered.length, 2);
assert.strictEqual(dealOrdered[0].name, 'Zinger Burger');
assert.strictEqual(dealOrdered[0].count, 4); // 2 * 2
assert.strictEqual(dealOrdered[1].name, 'Fries');
assert.strictEqual(dealOrdered[1].count, 2); // 2 * 1
console.log('✓ Deal constituent unpacking works correctly');

// Test 2: Non-deal with stale deal_items should NOT be unpacked
const nonDealOrdered = resolveItemConstituents({ product_id: '4', name: 'Pasta with stale deal items', quantity: 1 });
assert.strictEqual(nonDealOrdered.length, 1);
assert.strictEqual(nonDealOrdered[0].name, 'Pasta with stale deal items');
assert.strictEqual(nonDealOrdered[0].count, 1);
console.log('✓ Non-deal items with accidental deal_items are NEVER unpacked');

// Test 3: Profit calculation with food wastage
const grossRevenue = 50000;
const totalCOGS = 20000;
const foodWastageList = [
  { item_name: 'Burger Buns', quantity: 10, unit_cost: 30, total_cost: 300 },
  { item_name: 'Zinger Petty', quantity: 4, unit_cost: 175, total_cost: 700 }
];
const totalWastageCost = foodWastageList.reduce((sum, w) => sum + (Number(w.total_cost) || 0), 0);
const netProfit = grossRevenue - totalCOGS - totalWastageCost;

assert.strictEqual(totalWastageCost, 1000);
assert.strictEqual(netProfit, 29000);
console.log('✓ Net profit properly subtracts food wastage (50000 - 20000 - 1000 = 29000)');

console.log('🎉 All Wastage and Analytics verification tests passed successfully!');
