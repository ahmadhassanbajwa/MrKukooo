export const normalizeIngredientEntry = (entry) => {
  if (!entry) return null;
  if (typeof entry === 'string') {
    return { id: entry, required: true };
  }
  if (typeof entry === 'object' && entry.id) {
    return { id: entry.id, required: entry.required !== false };
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
    const rawEntries = [
      ...(product.ingredient_ids || []),
      ...(size.ingredient_ids || [])
    ];
    const normalized = rawEntries.map(normalizeIngredientEntry).filter(Boolean);

    if (normalized.length > 0) {
      const requiredEntries = normalized.filter(e => e.required);

      // If there are required ingredients, ALL of them must be in stock (> 0)
      if (requiredEntries.length > 0) {
        const requiredQuantities = requiredEntries.map(e => {
          const ing = allIngredients.find(i => i.id === e.id);
          return ing ? Math.max(0, parseInt(ing.quantity || 0, 10)) : 0;
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
  const rawEntries = (product.ingredient_ids || []).map(normalizeIngredientEntry).filter(Boolean);
  if (rawEntries.length > 0) {
    const requiredEntries = rawEntries.filter(e => e.required);
    if (requiredEntries.length > 0) {
      const requiredQuantities = requiredEntries.map(e => {
        const ing = allIngredients.find(i => i.id === e.id);
        return ing ? Math.max(0, parseInt(ing.quantity || 0, 10)) : 0;
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
        
        const rawEntries = (constituent.ingredient_ids || []).map(normalizeIngredientEntry).filter(Boolean);
        if (rawEntries.length > 0) {
          for (const entry of rawEntries) {
            ingredientDeductions[entry.id] = (ingredientDeductions[entry.id] || 0) + constituentQty;
          }
        } else {
          productDeductions[constituent.id] = (productDeductions[constituent.id] || 0) + constituentQty;
        }
      }
    } else {
      let hasMappedIngredients = false;

      // 1. Shared product-level ingredients (deduct BOTH required and optional!)
      if (prod.ingredient_ids && prod.ingredient_ids.length > 0) {
        for (const entry of prod.ingredient_ids.map(normalizeIngredientEntry).filter(Boolean)) {
          ingredientDeductions[entry.id] = (ingredientDeductions[entry.id] || 0) + itemQty;
          hasMappedIngredients = true;
        }
      }

      // 2. Size-specific ingredients (deduct BOTH required and optional!)
      if (item.size && prod.has_sizes && prod.sizes) {
        const matchingSize = prod.sizes.find(s => s.name === item.size.name);
        if (matchingSize && matchingSize.ingredient_ids && matchingSize.ingredient_ids.length > 0) {
          for (const entry of matchingSize.ingredient_ids.map(normalizeIngredientEntry).filter(Boolean)) {
            ingredientDeductions[entry.id] = (ingredientDeductions[entry.id] || 0) + itemQty;
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
