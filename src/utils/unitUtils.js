// Unit conversion dictionary and helpers for recipe-based inventory
export const UNIT_CONFIGS = {
  KG: {
    display_unit: 'KG',
    base_unit: 'Grams',
    conversion_factor: 1000,
    supported_units: ['KG', 'Grams']
  },
  Liters: {
    display_unit: 'Liters',
    base_unit: 'ml',
    conversion_factor: 1000,
    supported_units: ['Liters', 'ml']
  },
  Pieces: {
    display_unit: 'Pieces',
    base_unit: 'Pieces',
    conversion_factor: 1,
    supported_units: ['Pieces']
  },
  Packs: {
    display_unit: 'Packs',
    base_unit: 'Units',
    conversion_factor: 1,
    supported_units: ['Packs', 'Units']
  }
};

/**
 * Returns normalized unit config for an ingredient.
 * Falls back to KG/Grams if missing or unrecognized.
 */
export const getIngredientUnitConfig = (ingredient) => {
  const display = (ingredient?.display_unit || ingredient?.unit || 'KG').trim();
  const match = Object.values(UNIT_CONFIGS).find(
    u => u.display_unit.toLowerCase() === display.toLowerCase()
  );

  if (match) {
    return {
      display_unit: match.display_unit,
      base_unit: ingredient?.base_unit || match.base_unit,
      conversion_factor: Number(ingredient?.conversion_factor) || match.conversion_factor,
      supported_units: match.supported_units
    };
  }

  // Fallback default
  return {
    display_unit: display || 'KG',
    base_unit: ingredient?.base_unit || 'Grams',
    conversion_factor: Number(ingredient?.conversion_factor) || 1000,
    supported_units: [display || 'KG', ingredient?.base_unit || 'Grams']
  };
};

/**
 * Converts a value from a given unit (e.g. 'KG' or 'Grams') to base units (e.g. Grams).
 */
export const convertToBaseUnit = (quantity, unit, ingredient) => {
  const num = Number(quantity) || 0;
  const config = getIngredientUnitConfig(ingredient);
  const u = (unit || config.base_unit).trim().toLowerCase();

  if (u === config.display_unit.toLowerCase() && config.conversion_factor > 1) {
    return Math.round(num * config.conversion_factor);
  }
  return Math.round(num);
};

/**
 * Converts base units back to display units.
 */
export const convertToDisplayUnit = (baseQuantity, ingredient) => {
  const num = Number(baseQuantity) || 0;
  const config = getIngredientUnitConfig(ingredient);
  if (config.conversion_factor > 1) {
    const val = num / config.conversion_factor;
    // Format up to 3 decimal places without trailing zeroes
    return parseFloat(val.toFixed(3));
  }
  return num;
};

/**
 * Returns formatted dual-unit string, e.g. "2.5 KG (2500 Grams)" or "50 Pieces"
 */
export const formatDualUnitStock = (stockInBase, ingredient) => {
  const baseNum = Number(stockInBase) || 0;
  const config = getIngredientUnitConfig(ingredient);
  const displayVal = convertToDisplayUnit(baseNum, ingredient);

  if (config.conversion_factor > 1) {
    return `${displayVal} ${config.display_unit} (${baseNum} ${config.base_unit})`;
  }
  return `${baseNum} ${config.display_unit}`;
};

