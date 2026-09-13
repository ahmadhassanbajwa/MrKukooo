export const parseQuantityFromName = (name) => {
  if (!name || typeof name !== 'string') return 1;
  const match = name.match(/\b(\d+(?:\.\d+)?)\s*(?:pcs?|pieces?|pc)\b/i);
  if (match) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val > 0) return val;
  }
  return 1;
};

export const normalizeIngredientEntry = (entry, contextName = '') => {
  if (!entry) return null;
  const fallbackQty = parseQuantityFromName(contextName);
  if (typeof entry === 'string') {
    return { id: entry, required: true, quantity: fallbackQty };
  }
  if (typeof entry === 'object' && entry.id) {
    const parsedQty = parseFloat(entry.quantity);
    const quantity = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : fallbackQty;
    return { id: entry.id, required: entry.required !== false, quantity };
  }
  return null;
};

export const getIngredientId = (entry) => {
  if (!entry) return null;
  return typeof entry === 'string' ? entry : entry.id;
};

export const isIngredientRequired = (entry) => {
  if (!entry) return false;
  if (typeof entry === 'string') return true;
  return entry.required !== false;
};

export const getIngredientPortion = (entry, contextName = '') => {
  const norm = normalizeIngredientEntry(entry, contextName);
  return norm ? norm.quantity : 1;
};

export const getAvailableQuantity = (product, size = null, allIngredients = [], allProducts = []) => {
  if (!product || !product.is_available) return 0;

  // 1. Deal handling: limit is determined by the minimum available constituent count
  if (product.is_deal) {
    if (!product.deal_items || product.deal_items.length === 0) return 0;
    const dealLimits = [];
    for (const dItem of product.deal_items) {
      const constituent = (allProducts || []).find(p => p.id?.toString() === dItem.product_id?.toString());
      if (!constituent) return 0;
      const constituentAvail = getAvailableQuantity(constituent, null, allIngredients, allProducts);
      const reqPerDeal = parseInt(dItem.quantity || 1, 10);
      dealLimits.push(Math.floor(constituentAvail / reqPerDeal));
    }
    return Math.max(0, Math.min(...dealLimits));
  }

  // 2. Specific size requested
  if (size) {
    const prodEntries = (product.ingredient_ids || []).map(e => normalizeIngredientEntry(e, product.name)).filter(Boolean);
    const sizeEntries = (size.ingredient_ids || []).map(e => normalizeIngredientEntry(e, size.name)).filter(Boolean);
    const normalized = [...prodEntries, ...sizeEntries];

    if (normalized.length > 0) {
      const requiredEntries = normalized.filter(e => e.required);

      // If there are required ingredients, ALL of them must have sufficient stock for their portion
      if (requiredEntries.length > 0) {
        const requiredQuantities = requiredEntries.map(e => {
          const ing = allIngredients.find(i => i.id === e.id);
          const stock = ing ? Math.max(0, parseInt(ing.quantity || 0, 10)) : 0;
          const portion = Math.max(1, parseFloat(e.quantity || 1));
          return Math.floor(stock / portion);
        });
        return Math.min(...requiredQuantities);
      }

      // If only optional ingredients are mapped, product is available up to legacy product quantity or default 999
      return Math.max(0, parseInt(product.quantity ?? 999, 10));
    }

    // Fallback if no ingredients mapped to this size: use product quantity or 999
    return Math.max(0, parseInt(product.quantity ?? 999, 10));
  }

  // 3. Product with sizes, but no specific size passed: return max across available sizes
  if (product.has_sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
    const sizeQuantities = product.sizes.map(s => getAvailableQuantity(product, s, allIngredients, allProducts));
    return Math.max(0, ...sizeQuantities);
  }

  // 4. Product without sizes
  const rawEntries = (product.ingredient_ids || []).map(e => normalizeIngredientEntry(e, product.name)).filter(Boolean);
  if (rawEntries.length > 0) {
    const requiredEntries = rawEntries.filter(e => e.required);
    if (requiredEntries.length > 0) {
      const requiredQuantities = requiredEntries.map(e => {
        const ing = allIngredients.find(i => i.id === e.id);
        const stock = ing ? Math.max(0, parseInt(ing.quantity || 0, 10)) : 0;
        const portion = Math.max(1, parseFloat(e.quantity || 1));
        return Math.floor(stock / portion);
      });
      return Math.min(...requiredQuantities);
    }
    return Math.max(0, parseInt(product.quantity ?? 999, 10));
  }

  // Fallback to legacy product quantity
  return Math.max(0, parseInt(product.quantity || 0, 10));
};

export const checkSizeAvailability = (product, size, allIngredients = []) => {
  if (!product || !product.is_available) return false;
  return getAvailableQuantity(product, size, allIngredients) > 0;
};

export const checkProductAvailability = (product, allProducts = [], allIngredients = []) => {
  if (!product || !product.is_available) return false;
  return getAvailableQuantity(product, null, allIngredients, allProducts) > 0;
};

export const calculateOrderDeductions = (orderItems = [], allProducts = []) => {
  const ingredientDeductions = {};
  const productDeductions = {};

  for (const item of orderItems) {
    const pId = (item.product_id || item.id || '').toString();
    const prod = allProducts.find(p => p.id?.toString() === pId);
    if (!prod) continue;
    const itemQty = parseInt(item.quantity || 1, 10);

    if (prod.is_deal && prod.deal_items?.length) {
      for (const dItem of prod.deal_items) {
        const constituent = allProducts.find(p => p.id?.toString() === dItem.product_id?.toString());
        if (!constituent) continue;
        const constituentQty = (parseInt(dItem.quantity || 1, 10)) * itemQty;
        
        let constituentEntries = [];
        if (dItem.size && constituent.has_sizes && constituent.sizes) {
          const matchSize = constituent.sizes.find(s => s.name === (dItem.size?.name || dItem.size));
          if (matchSize && matchSize.ingredient_ids) {
            constituentEntries.push(...matchSize.ingredient_ids.map(e => normalizeIngredientEntry(e, matchSize.name)));
          }
        }
        if (constituent.ingredient_ids) {
          constituentEntries.push(...constituent.ingredient_ids.map(e => normalizeIngredientEntry(e, constituent.name)));
        }

        const rawEntries = constituentEntries.filter(Boolean);
        if (rawEntries.length > 0) {
          for (const entry of rawEntries) {
            const portion = Math.max(1, parseFloat(entry.quantity || 1));
            ingredientDeductions[entry.id] = (ingredientDeductions[entry.id] || 0) + (constituentQty * portion);
          }
        } else {
          productDeductions[constituent.id] = (productDeductions[constituent.id] || 0) + constituentQty;
        }
      }
    } else {
      let hasMappedIngredients = false;

      // 1. Shared product-level ingredients (deduct BOTH required and optional!)
      if (prod.ingredient_ids && prod.ingredient_ids.length > 0) {
        for (const entry of prod.ingredient_ids.map(e => normalizeIngredientEntry(e, prod.name)).filter(Boolean)) {
          const portion = Math.max(1, parseFloat(entry.quantity || 1));
          ingredientDeductions[entry.id] = (ingredientDeductions[entry.id] || 0) + (itemQty * portion);
          hasMappedIngredients = true;
        }
      }

      // 2. Size-specific ingredients (deduct BOTH required and optional!)
      if (item.size && prod.has_sizes && prod.sizes) {
        const sizeName = item.size?.name || (typeof item.size === 'string' ? item.size : '');
        const matchingSize = prod.sizes.find(s => s.name === sizeName);
        if (matchingSize && matchingSize.ingredient_ids && matchingSize.ingredient_ids.length > 0) {
          for (const entry of matchingSize.ingredient_ids.map(e => normalizeIngredientEntry(e, matchingSize.name)).filter(Boolean)) {
            const portion = Math.max(1, parseFloat(entry.quantity || 1));
            ingredientDeductions[entry.id] = (ingredientDeductions[entry.id] || 0) + (itemQty * portion);
            hasMappedIngredients = true;
          }
        }
      }

      // 3. Fallback to legacy product quantity if no ingredients are mapped
      if (!hasMappedIngredients) {
        productDeductions[prod.id] = (productDeductions[prod.id] || 0) + itemQty;
      }
    }
  }

  return { ingredientDeductions, productDeductions };
};
