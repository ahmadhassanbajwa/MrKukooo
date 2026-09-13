import { describe, it, expect } from 'vitest';
import { 
  checkProductAvailability, 
  checkSizeAvailability, 
  getAvailableQuantity, 
  calculateOrderDeductions 
} from './productUtils';

describe('productUtils', () => {
  it('should return false if product is completely unavailable', () => {
    const product = { is_available: false };
    expect(checkProductAvailability(product, [], [])).toBe(false);
  });

  it('should return true for normal product with legacy quantity', () => {
    const product = { is_available: true, is_deal: false, quantity: 5 };
    expect(checkProductAvailability(product, [], [])).toBe(true);
  });

  it('should return false for normal product with zero legacy quantity', () => {
    const product = { is_available: true, is_deal: false, quantity: 0 };
    expect(checkProductAvailability(product, [], [])).toBe(false);
  });

  it('should return true if all ingredients are available', () => {
    const product = { is_available: true, is_deal: false, ingredient_ids: ['ing1', 'ing2'] };
    const ingredients = [
      { id: 'ing1', quantity: 10 },
      { id: 'ing2', quantity: 5 }
    ];
    expect(checkProductAvailability(product, [], ingredients)).toBe(true);
  });

  it('should return false if any ingredient is out of stock', () => {
    const product = { is_available: true, is_deal: false, ingredient_ids: ['ing1', 'ing2'] };
    const ingredients = [
      { id: 'ing1', quantity: 10 },
      { id: 'ing2', quantity: 0 } // out of stock
    ];
    expect(checkProductAvailability(product, [], ingredients)).toBe(false);
  });

  it('should correctly handle size-specific ingredient dependencies', () => {
    const pizza = {
      is_available: true,
      is_deal: false,
      has_sizes: true,
      ingredient_ids: ['ing-cheese'], // shared ingredient
      sizes: [
        { name: 'Small', ingredient_ids: ['ing-small-dough'] },
        { name: 'Medium', ingredient_ids: ['ing-med-dough'] }
      ]
    };

    const ingredients = [
      { id: 'ing-cheese', quantity: 10 },
      { id: 'ing-small-dough', quantity: 0 }, // small dough out of stock
      { id: 'ing-med-dough', quantity: 5 }    // med dough in stock
    ];

    // Small size should be unavailable
    expect(checkSizeAvailability(pizza, pizza.sizes[0], ingredients)).toBe(false);

    // Medium size should be available
    expect(checkSizeAvailability(pizza, pizza.sizes[1], ingredients)).toBe(true);

    // Pizza as a whole should still be available because Medium is available
    expect(checkProductAvailability(pizza, [], ingredients)).toBe(true);
  });

  it('should return false for sized product if all sizes are out of stock', () => {
    const pizza = {
      is_available: true,
      is_deal: false,
      has_sizes: true,
      sizes: [
        { name: 'Small', ingredient_ids: ['ing-small-dough'] },
        { name: 'Medium', ingredient_ids: ['ing-med-dough'] }
      ]
    };

    const ingredients = [
      { id: 'ing-small-dough', quantity: 0 },
      { id: 'ing-med-dough', quantity: 0 }
    ];

    expect(checkProductAvailability(pizza, [], ingredients)).toBe(false);
  });

  it('should return false for all sizes if global ingredient is out of stock', () => {
    const pizza = {
      is_available: true,
      is_deal: false,
      has_sizes: true,
      ingredient_ids: ['ing-cheese'],
      sizes: [
        { name: 'Small', ingredient_ids: ['ing-small-dough'] },
        { name: 'Medium', ingredient_ids: ['ing-med-dough'] }
      ]
    };

    const ingredients = [
      { id: 'ing-cheese', quantity: 0 }, // shared cheese out of stock
      { id: 'ing-small-dough', quantity: 10 },
      { id: 'ing-med-dough', quantity: 10 }
    ];

    expect(checkSizeAvailability(pizza, pizza.sizes[0], ingredients)).toBe(false);
    expect(checkSizeAvailability(pizza, pizza.sizes[1], ingredients)).toBe(false);
    expect(checkProductAvailability(pizza, [], ingredients)).toBe(false);
  });

  it('should properly check deals', () => {
    const product = {
      is_available: true,
      is_deal: true,
      deal_items: [{ product_id: 'p1', quantity: 1 }]
    };
    const allProducts = [
      { id: 'p1', is_available: true, quantity: 5 }
    ];
    expect(checkProductAvailability(product, allProducts, [])).toBe(true);
  });

  it('should calculate available quantity accurately for sized and unsized products', () => {
    const pizza = {
      is_available: true,
      has_sizes: true,
      ingredient_ids: ['ing-cheese'],
      sizes: [
        { name: 'Small', ingredient_ids: ['ing-small-dough'] },
        { name: 'Medium', ingredient_ids: ['ing-med-dough'] }
      ]
    };

    const ingredients = [
      { id: 'ing-cheese', quantity: 20 },
      { id: 'ing-small-dough', quantity: 3 },
      { id: 'ing-med-dough', quantity: 0 }
    ];

    expect(getAvailableQuantity(pizza, pizza.sizes[0], ingredients)).toBe(3);
    expect(getAvailableQuantity(pizza, pizza.sizes[1], ingredients)).toBe(0);
    expect(getAvailableQuantity(pizza, null, ingredients)).toBe(3);
  });

  it('should accurately calculate order deductions for sized items and deals', () => {
    const products = [
      {
        id: 'p1',
        name: 'Tikka Pizza',
        has_sizes: true,
        ingredient_ids: ['ing-cheese'],
        sizes: [
          { name: 'Small', ingredient_ids: ['ing-small-dough'] },
          { name: 'Large', ingredient_ids: ['ing-large-dough'] }
        ]
      },
      {
        id: 'p2',
        name: 'Zinger',
        has_sizes: false,
        ingredient_ids: ['ing-bun', 'ing-zinger']
      },
      {
        id: 'p3',
        name: 'Combo Deal',
        is_deal: true,
        deal_items: [
          { product_id: 'p2', quantity: 2 }
        ]
      }
    ];

    const orderItems = [
      {
        product_id: 'p1',
        name: 'Tikka Pizza',
        size: { name: 'Small' },
        quantity: 2
      },
      {
        product_id: 'p3',
        name: 'Combo Deal',
        quantity: 1
      }
    ];

    const { ingredientDeductions } = calculateOrderDeductions(orderItems, products);

    // Tikka Pizza Small (qty 2): 2x cheese, 2x small dough
    expect(ingredientDeductions['ing-cheese']).toBe(2);
    expect(ingredientDeductions['ing-small-dough']).toBe(2);
    expect(ingredientDeductions['ing-large-dough']).toBeUndefined();

    // Combo Deal (qty 1 with 2x Zinger): 2x bun, 2x zinger
    expect(ingredientDeductions['ing-bun']).toBe(2);
    expect(ingredientDeductions['ing-zinger']).toBe(2);
  });

  it('should require all required ingredients for a product/size to be available', () => {
    const cheeseLoverPizza = {
      id: 'p-cheese-lover',
      name: 'Cheese Lover Pizza',
      is_available: true,
      has_sizes: true,
      ingredient_ids: [
        { id: 'ing-pizza-dough', required: true }
      ],
      sizes: [
        {
          name: 'Small',
          ingredient_ids: [
            { id: 'ing-small-dough', required: true }
          ]
        }
      ]
    };

    // Case A: Both small pizza dough and pizza dough in stock -> Available
    const ingredientsBothAvailable = [
      { id: 'ing-pizza-dough', quantity: 10 },
      { id: 'ing-small-dough', quantity: 5 }
    ];
    expect(checkSizeAvailability(cheeseLoverPizza, cheeseLoverPizza.sizes[0], ingredientsBothAvailable)).toBe(true);

    // Case B: Pizza dough in stock, but small pizza dough is 0 -> NOT Available
    const ingredientsSmallDoughOut = [
      { id: 'ing-pizza-dough', quantity: 10 },
      { id: 'ing-small-dough', quantity: 0 }
    ];
    expect(checkSizeAvailability(cheeseLoverPizza, cheeseLoverPizza.sizes[0], ingredientsSmallDoughOut)).toBe(false);
    expect(checkProductAvailability(cheeseLoverPizza, [], ingredientsSmallDoughOut)).toBe(false);

    // Case C: Small pizza dough in stock, but general pizza dough is 0 -> NOT Available
    const ingredientsGeneralDoughOut = [
      { id: 'ing-pizza-dough', quantity: 0 },
      { id: 'ing-small-dough', quantity: 5 }
    ];
    expect(checkSizeAvailability(cheeseLoverPizza, cheeseLoverPizza.sizes[0], ingredientsGeneralDoughOut)).toBe(false);
  });

  it('should remain available if an optional ingredient is out of stock, but still deduct it on order', () => {
    const pizzaWithOptionalSauce = {
      id: 'p-pizza',
      name: 'Special Pizza',
      is_available: true,
      has_sizes: false,
      ingredient_ids: [
        { id: 'ing-dough', required: true },
        { id: 'ing-oregano-packet', required: false } // optional garnish/packet
      ]
    };

    // Garnish is out of stock (0), but dough is in stock (10)
    const ingredients = [
      { id: 'ing-dough', quantity: 10 },
      { id: 'ing-oregano-packet', quantity: 0 }
    ];

    // Should still be available because oregano packet is optional
    expect(checkProductAvailability(pizzaWithOptionalSauce, [], ingredients)).toBe(true);
    expect(getAvailableQuantity(pizzaWithOptionalSauce, null, ingredients)).toBe(10);

    // But order deductions must still count both required and optional ingredients
    const orderItems = [
      { product_id: 'p-pizza', quantity: 3 }
    ];
    const { ingredientDeductions } = calculateOrderDeductions(orderItems, [pizzaWithOptionalSauce]);
    expect(ingredientDeductions['ing-dough']).toBe(3);
    expect(ingredientDeductions['ing-oregano-packet']).toBe(3);
  });

  it('should accurately calculate portions and deductions for items like wings (10 pcs vs 1 pc)', () => {
    const wingsFlavours = {
      id: 'p-wings',
      name: 'Wings flavours',
      is_available: true,
      has_sizes: true,
      sizes: [
        { name: 'regular 5 pcs', ingredient_ids: ['ing-chicken-wings'] },
        { name: 'regular 10 pcs', ingredient_ids: ['ing-chicken-wings'] }
      ]
    };

    const singleWing = {
      id: 'p-single-wing',
      name: 'Wing 1 pc',
      is_available: true,
      has_sizes: false,
      ingredient_ids: ['ing-chicken-wings']
    };

    const ingredients = [
      { id: 'ing-chicken-wings', quantity: 15 }
    ];

    // 15 wings in stock:
    // - regular 10 pcs: Math.floor(15 / 10) = 1 available
    expect(getAvailableQuantity(wingsFlavours, wingsFlavours.sizes[1], ingredients)).toBe(1);
    // - regular 5 pcs: Math.floor(15 / 5) = 3 available
    expect(getAvailableQuantity(wingsFlavours, wingsFlavours.sizes[0], ingredients)).toBe(3);
    // - Wing 1 pc: Math.floor(15 / 1) = 15 available
    expect(getAvailableQuantity(singleWing, null, ingredients)).toBe(15);

    // If stock drops to 8:
    const lowIngredients = [
      { id: 'ing-chicken-wings', quantity: 8 }
    ];
    // - regular 10 pcs should be out of stock (8 < 10)
    expect(checkSizeAvailability(wingsFlavours, wingsFlavours.sizes[1], lowIngredients)).toBe(false);
    expect(getAvailableQuantity(wingsFlavours, wingsFlavours.sizes[1], lowIngredients)).toBe(0);
    // - regular 5 pcs still available (1 portion)
    expect(checkSizeAvailability(wingsFlavours, wingsFlavours.sizes[0], lowIngredients)).toBe(true);
    expect(getAvailableQuantity(wingsFlavours, wingsFlavours.sizes[0], lowIngredients)).toBe(1);

    // Deductions:
    // Order 2 portions of 10 pcs -> should deduct 20 wings
    const orderItems = [
      { product_id: 'p-wings', size: { name: 'regular 10 pcs' }, quantity: 2 },
      { product_id: 'p-single-wing', quantity: 3 }
    ];
    const { ingredientDeductions } = calculateOrderDeductions(orderItems, [wingsFlavours, singleWing]);
    // 2 * 10 + 3 * 1 = 23 wings
    expect(ingredientDeductions['ing-chicken-wings']).toBe(23);
  });
});



