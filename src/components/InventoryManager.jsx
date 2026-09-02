import { useState, useMemo } from 'react';
import { Package, Search, Check, AlertTriangle, Edit3, Plus, Link as LinkIcon, Box } from 'lucide-react';

export default function InventoryManager({ 
  products, 
  categories = [], 
  ingredients = [],
  saveIngredient,
  updateIngredientStock,
  saveProduct
}) {
  // State for Column 1: Ingredients
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState(null);
  
  // State for Column 3: Products
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');

  // Inline editing state for ingredients
  const [newIngredientName, setNewIngredientName] = useState('');
  const [editQuantities, setEditQuantities] = useState({});
  const [savingState, setSavingState] = useState({});

  // 1. Ingredients List Filtering
  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ing => 
      !ingredientSearch || ing.name.toLowerCase().includes(ingredientSearch.toLowerCase())
    );
  }, [ingredients, ingredientSearch]);

  const selectedIngredient = useMemo(() => {
    return ingredients.find(ing => ing.id === selectedIngredientId) || null;
  }, [ingredients, selectedIngredientId]);

  // 2. Mapped Products (Column 2)
  const mappedProducts = useMemo(() => {
    if (!selectedIngredientId) return [];
    return products.filter(p => p.ingredient_ids && p.ingredient_ids.includes(selectedIngredientId));
  }, [products, selectedIngredientId]);

  // 3. Products List Filtering (Column 3)
  const validCategoryIds = new Set(products.filter(p => !p.is_deal).map(p => p.category_id));
  const categoryOptions = [
    { id: 'All', name: 'All' },
    ...categories.filter(c => validCategoryIds.has(c.id))
  ];

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.is_deal) return false; // Usually deals don't directly map to raw ingredients, they map to products
      if (productCategoryFilter !== 'All' && p.category_id !== productCategoryFilter) return false;
      if (productSearch && !p.name.toLowerCase().includes(productSearch.toLowerCase())) return false;
      return true;
    });
  }, [products, productCategoryFilter, productSearch]);


  // Handlers for Ingredients
  const handleAddIngredient = async () => {
    if (!newIngredientName.trim()) return;
    const newId = 'ing-' + Date.now();
    const newIng = {
      id: newId,
      name: newIngredientName.trim(),
      quantity: 0
    };
    await saveIngredient(newIng);
    setNewIngredientName('');
    setSelectedIngredientId(newId);
  };

  const handleQuantityChange = (id, value) => {
    const num = parseInt(value, 10);
    setEditQuantities(prev => ({
      ...prev,
      [id]: isNaN(num) ? '' : num
    }));
  };

  const handleSaveStock = async (id) => {
    if (editQuantities[id] === undefined || editQuantities[id] === '') return;
    
    setSavingState(prev => ({ ...prev, [id]: 'saving' }));
    try {
      await updateIngredientStock(id, editQuantities[id]);
      setSavingState(prev => ({ ...prev, [id]: 'success' }));
      setTimeout(() => {
        setSavingState(prev => ({ ...prev, [id]: null }));
        setEditQuantities(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error("Failed to save stock:", err);
      setSavingState(prev => ({ ...prev, [id]: 'error' }));
    }
  };

  // Handlers for Product Mapping (Checkbox toggle)
  const handleToggleMapping = async (product) => {
    if (!selectedIngredientId) return;

    let currentIds = product.ingredient_ids || [];
    let newIds;

    if (currentIds.includes(selectedIngredientId)) {
      // Remove dependency
      newIds = currentIds.filter(id => id !== selectedIngredientId);
    } else {
      // Add dependency
      newIds = [...currentIds, selectedIngredientId];
    }

    const updatedProduct = {
      ...product,
      ingredient_ids: newIds
    };

    await saveProduct(updatedProduct);
  };

  // Mobile View Tab state
  const [mobileTab, setMobileTab] = useState('ingredients'); // 'ingredients' | 'dependencies' | 'mapping'

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 items-start sm:items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-accent text-base sm:text-lg">Dependency Inventory</h2>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold">Map raw ingredients to menu items</p>
          </div>
        </div>

        {/* Mobile Column Tab Switcher (<1024px) */}
        <div className="flex lg:hidden bg-gray-100 p-1 rounded-xl w-full sm:w-auto gap-1">
          <button
            onClick={() => setMobileTab('ingredients')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              mobileTab === 'ingredients' ? 'bg-white text-accent comic-shadow-xs' : 'text-gray-500'
            }`}
          >
            1. Raw Ingredients ({ingredients.length})
          </button>
          <button
            onClick={() => setMobileTab('dependencies')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              mobileTab === 'dependencies' ? 'bg-white text-accent comic-shadow-xs' : 'text-gray-500'
            }`}
          >
            2. Impact ({mappedProducts.length})
          </button>
          <button
            onClick={() => setMobileTab('mapping')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              mobileTab === 'mapping' ? 'bg-white text-accent comic-shadow-xs' : 'text-gray-500'
            }`}
          >
            3. Mapping
          </button>
        </div>
      </div>

      {/* 3-Column Layout on Desktop / Tabbed on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* COLUMN 1: INGREDIENTS LIST */}
        <div className={`bg-white rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex flex-col h-[500px] sm:h-[600px] lg:h-[700px] ${mobileTab !== 'ingredients' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b-2 border-gray-100 bg-gray-50/50 rounded-t-2xl">
            <h3 className="font-black text-accent mb-3 flex items-center gap-2">
              <Box className="w-4 h-4 text-primary" />
              Raw Ingredients
            </h3>
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ingredients..."
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  className="w-full bg-white border-2 border-gray-200 pl-9 pr-4 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New ingredient..."
                  value={newIngredientName}
                  onChange={(e) => setNewIngredientName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
                  className="flex-1 bg-white border-2 border-gray-200 px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={handleAddIngredient}
                  disabled={!newIngredientName.trim()}
                  className="bg-primary text-white p-2 rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-colors comic-hover cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
            {filteredIngredients.map(ing => {
              const isSelected = selectedIngredientId === ing.id;
              const isEditing = editQuantities[ing.id] !== undefined;
              const displayQty = isEditing ? editQuantities[ing.id] : (ing.quantity || 0);
              const isSoldOut = displayQty <= 0;
              const saveStatus = savingState[ing.id];

              return (
                <div 
                  key={ing.id}
                  onClick={() => setSelectedIngredientId(ing.id)}
                  className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className={`font-black text-sm ${isSelected ? 'text-primary' : 'text-accent'}`}>
                      {ing.name}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">
                      Stock: <span className={isSoldOut ? 'text-red-500' : 'text-green-600'}>{ing.quantity || 0}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min="0"
                      value={displayQty}
                      onChange={(e) => handleQuantityChange(ing.id, e.target.value)}
                      className="w-16 bg-white border-2 border-gray-200 px-2 py-1 rounded-lg text-sm font-black text-center focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => handleSaveStock(ing.id)}
                      disabled={!isEditing || saveStatus === 'saving'}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        saveStatus === 'success' ? 'bg-green-100 text-green-600' :
                        isEditing ? 'bg-primary text-white hover:bg-primary-hover shadow-sm' :
                        'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {saveStatus === 'success' ? <Check className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredIngredients.length === 0 && (
              <div className="text-center p-8 text-gray-400 text-sm font-bold">
                No ingredients found.
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: DEPENDENCY VIEW */}
        <div className={`bg-white rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex flex-col h-[500px] sm:h-[600px] lg:h-[700px] ${mobileTab !== 'dependencies' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b-2 border-gray-100 bg-gray-50/50 rounded-t-2xl">
            <h3 className="font-black text-accent mb-1 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-blue-500" />
              Dependency Impact
            </h3>
            <p className="text-[11px] font-bold text-gray-500">
              Menu items relying on {selectedIngredient ? <strong className="text-accent">{selectedIngredient.name}</strong> : 'selected ingredient'}.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            {!selectedIngredient ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm font-bold p-6 text-center space-y-3">
                <Box className="w-12 h-12 text-gray-200" />
                <p>Select an ingredient from the left column to view its dependencies.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedIngredient.quantity <= 0 && mappedProducts.length > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 p-3 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-red-800 text-sm font-black">Out of Stock</h4>
                      <p className="text-red-600 text-[11px] font-bold mt-1">
                        The selected ingredient is out of stock. The following items will be automatically marked as <strong className="uppercase">Unavailable</strong> on the customer menu.
                      </p>
                    </div>
                  </div>
                )}

                {mappedProducts.length === 0 ? (
                  <div className="text-center p-8 text-gray-400 text-sm font-bold">
                    No menu items are mapped to this ingredient yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mappedProducts.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border-2 border-gray-100">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover comic-border-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center comic-border-sm">
                            <Package className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-black text-sm text-accent">{p.name}</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{p.category_id}</div>
                        </div>
                        {selectedIngredient.quantity <= 0 ? (
                           <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-lg font-black border border-red-200">UNAVAILABLE</span>
                        ) : (
                           <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-lg font-black border border-green-200">AVAILABLE</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: MENU MAPPING SELECTOR */}
        <div className={`bg-white rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex flex-col h-[500px] sm:h-[600px] lg:h-[700px] transition-opacity ${!selectedIngredient ? 'opacity-50 pointer-events-none' : ''} ${mobileTab !== 'mapping' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b-2 border-gray-100 bg-gray-50/50 rounded-t-2xl">
            <h3 className="font-black text-accent mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Menu Mapping
            </h3>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-white border-2 border-gray-200 pl-9 pr-4 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-primary"
                />
              </div>
              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="bg-white border-2 border-gray-200 px-3 py-2 rounded-xl text-sm font-bold text-accent focus:outline-none focus:border-primary"
              >
                {categoryOptions.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
            {!selectedIngredient ? (
               <div className="text-center p-8 text-gray-400 text-sm font-bold">
                 Waiting for ingredient...
               </div>
            ) : (
              <div className="space-y-1">
                {filteredProducts.map(p => {
                  const isMapped = p.ingredient_ids && p.ingredient_ids.includes(selectedIngredientId);
                  
                  return (
                    <label 
                      key={p.id} 
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        isMapped ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isMapped}
                        onChange={() => handleToggleMapping(p)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 cursor-pointer"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-lg object-cover comic-border-sm" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center comic-border-sm">
                            <Package className="w-3 h-3 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-black text-accent">{p.name}</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase">{p.category_id}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <div className="text-center p-8 text-gray-400 text-sm font-bold">
                    No products found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
