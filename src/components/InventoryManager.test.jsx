import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InventoryManager from './InventoryManager';

describe('InventoryManager', () => {
  const mockProducts = [
    { id: 'p1', name: 'Burger', category_id: 'c1', ingredient_ids: ['ing1'], is_deal: false },
    { id: 'p2', name: 'Fries', category_id: 'c2', ingredient_ids: ['ing2'], is_deal: false },
  ];
  const mockCategories = [
    { id: 'c1', name: 'Mains' },
    { id: 'c2', name: 'Sides' }
  ];
  const mockIngredients = [
    { id: 'ing1', name: 'Beef Patty', quantity: 50 },
    { id: 'ing2', name: 'Potatoes', quantity: 100 }
  ];

  it('renders the ingredient list and product list', () => {
    render(
      <InventoryManager 
        products={mockProducts}
        categories={mockCategories}
        ingredients={mockIngredients}
      />
    );
    expect(screen.getByText('Beef Patty')).toBeInTheDocument();
    expect(screen.getByText('Potatoes')).toBeInTheDocument();
  });

  it('filters ingredients by search term', () => {
    render(
      <InventoryManager 
        products={mockProducts}
        categories={mockCategories}
        ingredients={mockIngredients}
      />
    );
    const searchInput = screen.getAllByPlaceholderText(/Search/i)[0];
    fireEvent.change(searchInput, { target: { value: 'Beef' } });
    
    expect(screen.getByText('Beef Patty')).toBeInTheDocument();
    expect(screen.queryByText('Potatoes')).not.toBeInTheDocument();
  });
  
  it('calls saveIngredient when adding a new ingredient', () => {
    const saveIngredientMock = vi.fn();
    render(
      <InventoryManager 
        products={mockProducts}
        categories={mockCategories}
        ingredients={mockIngredients}
        saveIngredient={saveIngredientMock}
      />
    );
    
    // Add new ingredient
    const addInput = screen.getByPlaceholderText(/New ingredient/i);
    fireEvent.change(addInput, { target: { value: 'Cheese' } });
    
    // Find the add button which contains the Plus icon
    const addButton = addInput.nextElementSibling;
    fireEvent.click(addButton);
        expect(saveIngredientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cheese'
      })
    );
  });
});
