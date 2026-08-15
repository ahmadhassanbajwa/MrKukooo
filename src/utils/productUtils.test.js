import { describe, it, expect } from 'vitest';
import { checkProductAvailability } from './productUtils';

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

  it('should return false for deals if a constituent is out of stock', () => {
    const product = {
      is_available: true,
      is_deal: true,
      deal_items: [{ product_id: 'p1', quantity: 1 }]
    };
    const allProducts = [
      { id: 'p1', is_available: true, quantity: 0 } // missing quantity
    ];
    expect(checkProductAvailability(product, allProducts, [])).toBe(false);
  });
});
