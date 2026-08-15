export const checkProductAvailability = (product, allProducts, allIngredients = []) => {
  if (!product.is_available) return false;

  if (!product.is_deal) {
    // Check ingredient dependencies first
    if (product.ingredient_ids && product.ingredient_ids.length > 0) {
      for (const ingId of product.ingredient_ids) {
        const ingredient = allIngredients.find(ing => ing.id === ingId);
        // If an ingredient is missing or out of stock, product is unavailable
        if (!ingredient || parseInt(ingredient.quantity || 0, 10) <= 0) {
          return false;
        }
      }
      return true; // All dependencies are in stock
    }

    // Fallback to legacy quantity if no ingredients are mapped
    return parseInt(product.quantity || 0, 10) > 0;
  }

  // It's a deal
  if (!product.deal_items || product.deal_items.length === 0) {
    return false;
  }

  for (const dItem of product.deal_items) {
    const constituent = allProducts.find(p => p.id?.toString() === dItem.product_id?.toString());
    if (!constituent) return false;

    // A deal item is available if its constituent is available.
    // We check its availability recursively.
    const isConstituentAvailable = checkProductAvailability(constituent, allProducts, allIngredients);
    if (!isConstituentAvailable) {
      return false;
    }

    // If the constituent has no ingredient dependencies, we also ensure its legacy quantity 
    // is enough for the required deal amount.
    if (!constituent.ingredient_ids || constituent.ingredient_ids.length === 0) {
      if (parseInt(constituent.quantity || 0, 10) < parseInt(dItem.quantity || 1, 10)) {
        return false;
      }
    }
  }

  return true;
};
