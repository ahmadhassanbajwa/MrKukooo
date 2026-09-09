import { useState, useMemo } from 'react';
import { Package, Search, Check, AlertTriangle, Edit3, Plus, Link as LinkIcon, Box, Star, X, Info } from 'lucide-react';
import { 
  normalizeIngredientEntry, 
  getIngredientId, 
  isIngredientRequired 
} from '../utils/productUtils';

export default function InventoryManager({ 
  products = [], 
  categories = [], 
  ingredients = [],
  saveIngredient,
  updateIngredientStock,
  saveProduct
}) {
  // State for Column 1: Raw Ingredients
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState(null);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [editQuantities, setEditQuantities] = useState({});
  const [savingState, setSavingState] = useState({});

  // State for Column 3: Menu Mapping Search/Filter
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');

  // Mobile Tab state ('ingredients' | 'dependencies' | 'mapping')
  const [mobileTab, setMobileTab] = useState('ingredients');

  // 1. Ingredients List Filtering (Consistently sorted by name)
  const filteredIngredients = useMemo(() => {
    return ingredients
      .filter(ing => 
        !ingredientSearch || ing.name.toLowerCase().includes(ingredientSearch.toLowerCase())
      )
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [ingredients, ingredientSearch]);

  const selectedIngredient = useMemo(() => {
    return ingredients.find(ing => ing.id === selectedIngredientId) || null;
  }, [ingredients, selectedIngredientId]);

  // 2. Menu Mapping Products Filtering (Consistently sorted by name)
  const validCategoryIds = new Set(products.filter(p => !p.is_deal).map(p => p.category_id));
  const categoryOptions = [
    { id: 'All', name: 'All Categories' },
    ...categories.filter(c => validCategoryIds.has(c.id))
  ];

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        if (p.is_deal) return false;
        if (productCategoryFilter !== 'All' && p.category_id !== productCategoryFilter) return false;
        if (productSearch && !p.name.toLowerCase().includes(productSearch.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [products, productCategoryFilter, productSearch]);

  // Helper to extract an entry for selectedIngredientId from an array of entries
  const getEntryForIngredient = (entries, ingId) => {
    if (!Array.isArray(entries) || !ingId) return null;
    for (const entry of entries) {
      const normalized = normalizeIngredientEntry(entry);
      if (normalized && normalized.id === ingId) {
        return normalized;
      }
    }
    return null;
  };

  // Helper to remove an ingredient entry from a list
  const removeIngredientFromList = (list = [], ingId) => {
    return (list || []).filter(entry => getIngredientId(entry) !== ingId);
  };

  // Helper to add or update an ingredient entry in a list
  const upsertIngredientInList = (list = [], ingId, required = true) => {
    const filtered = (list || []).filter(entry => getIngredientId(entry) !== ingId);
    return [...filtered, { id: ingId, required }];
  };

  // Check if an unsized product is mapped
  const isProductMapped = (product) => {
    if (!selectedIngredientId) return false;
    return !!getEntryForIngredient(product.ingredient_ids, selectedIngredientId);
  };

  // Check if an unsized product's ingredient dependency is required
  const isProductRequired = (product) => {
    if (!selectedIngredientId) return true;
    const entry = getEntryForIngredient(product.ingredient_ids, selectedIngredientId);
    return entry ? entry.required : true;
  };

  // Check if a specific size is mapped to selectedIngredientId
  const isSizeMapped = (product, size) => {
    if (!selectedIngredientId) return false;
    if (getEntryForIngredient(product.ingredient_ids, selectedIngredientId)) {
      return true;
    }
    return !!getEntryForIngredient(size.ingredient_ids, selectedIngredientId);
  };

  // Check if a specific size's ingredient dependency is required
  const isSizeRequired = (product, size) => {
    if (!selectedIngredientId) return true;
    const prodEntry = getEntryForIngredient(product.ingredient_ids, selectedIngredientId);
    if (prodEntry) return prodEntry.required;
    const sizeEntry = getEntryForIngredient(size.ingredient_ids, selectedIngredientId);
    return sizeEntry ? sizeEntry.required : true;
  };

  // 3. Mapped Products / Sizes for Dependency Impact Column
  const mappedItems = useMemo(() => {
    if (!selectedIngredientId) return [];
    const list = [];
    for (const p of products) {
      if (p.is_deal) continue;
      const prodEntry = getEntryForIngredient(p.ingredient_ids, selectedIngredientId);
      const hasSizes = p.has_sizes && Array.isArray(p.sizes) && p.sizes.length > 0;

      if (hasSizes) {
        const mappedSizes = [];
        for (const s of p.sizes) {
          const sEntry = getEntryForIngredient(s.ingredient_ids, selectedIngredientId) || prodEntry;
          if (sEntry) {
            mappedSizes.push({
              name: s.name,
              required: sEntry.required
            });
          }
        }
        if (mappedSizes.length > 0) {
          list.push({
            product: p,
            sizes: mappedSizes,
            hasRequiredDependency: mappedSizes.some(s => s.required),
            isAllSizes: mappedSizes.length === p.sizes.length
          });
        }
      } else if (prodEntry) {
        list.push({
          product: p,
          sizes: null,
          required: prodEntry.required,
          hasRequiredDependency: prodEntry.required,
          isAllSizes: false
        });
      }
    }
    return list;
  }, [products, selectedIngredientId]);

  // --- RAW INGREDIENT HANDLERS ---
  const handleAddIngredient = async () => {
    if (!newIngredientName.trim()) return;
    const newId = 'ing-' + Date.now();
    const newIng = { id: newId, name: newIngredientName.trim(), quantity: 0 };
    await saveIngredient(newIng);
    setNewIngredientName('');
    setSelectedIngredientId(newId);
  };

  const handleQuantityChange = (id, value) => {
    const num = parseInt(value, 10);
    setEditQuantities(prev => ({ ...prev, [id]: isNaN(num) ? '' : num }));
  };

  const handleSaveStock = async (id) => {
    if (editQuantities[id] === undefined || editQuantities[id] === '') return;
    const qty = parseInt(editQuantities[id], 10);
    setSavingState(prev => ({ ...prev, [id]: 'saving' }));
    try {
      await updateIngredientStock(id, qty);
      setSavingState(prev => ({ ...prev, [id]: 'success' }));
      setTimeout(() => {
        setSavingState(prev => ({ ...prev, [id]: null }));
        setEditQuantities(prev => { const next = { ...prev }; delete next[id]; return next; });
      }, 1500);
    } catch (err) {
      console.error("Failed to save stock:", err);
      setSavingState(prev => ({ ...prev, [id]: 'error' }));
    }
  };

  // --- MAPPING HANDLERS ---

  // For products without sizes: toggle mapping completely
  const handleToggleProductMapping = async (product) => {
    if (!selectedIngredientId) return;
    const isMapped = isProductMapped(product);
    const newIds = isMapped
      ? removeIngredientFromList(product.ingredient_ids, selectedIngredientId)
      : upsertIngredientInList(product.ingredient_ids, selectedIngredientId, true);
    await saveProduct({ ...product, ingredient_ids: newIds });
  };

  // For products without sizes: toggle Required vs Optional
  const handleToggleProductRequired = async (product) => {
    if (!selectedIngredientId) return;
    const currentReq = isProductRequired(product);
    const newIds = upsertIngredientInList(product.ingredient_ids, selectedIngredientId, !currentReq);
    await saveProduct({ ...product, ingredient_ids: newIds });
  };

  // For products with sizes: toggle mapping for a single size
  const handleToggleSizeMapping = async (product, targetSizeName) => {
    if (!selectedIngredientId) return;
    const targetSize = (product.sizes || []).find(s => s.name === targetSizeName);
    const isCurrentlyMapped = targetSize ? isSizeMapped(product, targetSize) : false;

    const newSizes = (product.sizes || []).map(s => {
      if (s.name !== targetSizeName) return s;
      const curIds = s.ingredient_ids || [];
      return {
        ...s,
        ingredient_ids: isCurrentlyMapped
          ? removeIngredientFromList(curIds, selectedIngredientId)
          : upsertIngredientInList(curIds, selectedIngredientId, true)
      };
    });

    // Clean up product-level ingredient_ids to avoid ambiguity
    const newProductIngIds = removeIngredientFromList(product.ingredient_ids, selectedIngredientId);

    await saveProduct({
      ...product,
      ingredient_ids: newProductIngIds,
      sizes: newSizes
    });
  };

  // For products with sizes: toggle Required for a single size
  const handleToggleSizeRequired = async (product, targetSizeName) => {
    if (!selectedIngredientId) return;
    const targetSize = (product.sizes || []).find(s => s.name === targetSizeName);
    if (!targetSize) return;

    const currentReq = isSizeRequired(product, targetSize);
    const newSizes = (product.sizes || []).map(s => {
      if (s.name !== targetSizeName) return s;
      return {
        ...s,
        ingredient_ids: upsertIngredientInList(s.ingredient_ids, selectedIngredientId, !currentReq)
      };
    });

    const newProductIngIds = removeIngredientFromList(product.ingredient_ids, selectedIngredientId);

    await saveProduct({
      ...product,
      ingredient_ids: newProductIngIds,
      sizes: newSizes
    });
  };

  // For products with sizes: toggle ALL sizes at once
  const handleToggleAllSizes = async (product) => {
    if (!selectedIngredientId) return;
    const sizes = product.sizes || [];
    const allCurrentlyMapped = sizes.length > 0 && sizes.every(s => isSizeMapped(product, s));
    const targetState = !allCurrentlyMapped;

    const newProductIngIds = removeIngredientFromList(product.ingredient_ids, selectedIngredientId);

    const updatedSizes = sizes.map(s => {
      const isMapped = isSizeMapped(product, s);
      const req = isMapped ? isSizeRequired(product, s) : true;
      return {
        ...s,
        ingredient_ids: targetState
          ? upsertIngredientInList(s.ingredient_ids, selectedIngredientId, req)
          : removeIngredientFromList(s.ingredient_ids, selectedIngredientId)
      };
    });

    await saveProduct({
      ...product,
      ingredient_ids: newProductIngIds,
      sizes: updatedSizes
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 items-start sm:items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-accent text-base sm:text-lg">Inventory Manager</h2>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold">Raw ingredients stock &amp; size-specific recipe mapping</p>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex lg:hidden bg-gray-100 p-1 rounded-xl w-full sm:w-auto gap-1">
          {[
            { id: 'ingredients', label: '1. Ingredients' },
            { id: 'dependencies', label: '2. Impact' },
            { id: 'mapping', label: '3. Mapping' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                mobileTab === tab.id ? 'bg-white text-accent comic-shadow-xs' : 'text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* COLUMN 1: Raw Ingredients */}
        <div className={`bg-white rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex flex-col h-[500px] sm:h-[600px] lg:h-[700px] ${mobileTab !== 'ingredients' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b-2 border-gray-100 bg-gray-50/50 rounded-t-2xl">
            <h3 className="font-black text-accent mb-3 flex items-center gap-2 text-sm">
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
                  className="bg-primary text-white p-2 rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-colors cursor-pointer"
                  title="Add ingredient"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 no-scrollbar">
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
                  <div className="flex flex-col min-w-0 mr-2">
                    <span className={`font-black text-sm truncate ${isSelected ? 'text-primary' : 'text-accent'}`}>
                      {ing.name}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">
                      Stock: <span className={isSoldOut ? 'text-red-500' : 'text-green-600'}>{ing.quantity || 0}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min="0"
                      value={displayQty}
                      onChange={(e) => handleQuantityChange(ing.id, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveStock(ing.id)}
                      className="w-16 bg-white border-2 border-gray-200 px-2 py-1 rounded-lg text-sm font-black text-center focus:outline-none focus:border-primary"
                      title="Current stock quantity"
                    />
                    <button
                      onClick={() => handleSaveStock(ing.id)}
                      disabled={!isEditing || saveStatus === 'saving'}
                      title="Save stock"
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        saveStatus === 'success' ? 'bg-green-100 text-green-600' :
                        isEditing ? 'bg-primary text-white hover:bg-primary-hover shadow-sm' :
                        'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {saveStatus === 'success' ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredIngredients.length === 0 && (
              <div className="text-center p-8 text-gray-400 text-sm font-bold">No ingredients found.</div>
            )}
          </div>
        </div>

        {/* COLUMN 2: Dependency Impact */}
        <div className={`bg-white rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex flex-col h-[500px] sm:h-[600px] lg:h-[700px] ${mobileTab !== 'dependencies' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b-2 border-gray-100 bg-gray-50/50 rounded-t-2xl">
            <h3 className="font-black text-accent mb-1 flex items-center gap-2 text-sm">
              <LinkIcon className="w-4 h-4 text-blue-500" />
              Dependency Impact
            </h3>
            <p className="text-[11px] font-bold text-gray-500">
              {selectedIngredient ? (
                <>Menu items relying on <strong className="text-accent">{selectedIngredient.name}</strong>:</>
              ) : (
                'Select an ingredient on the left to view its impact.'
              )}
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
                {selectedIngredient.quantity <= 0 && mappedItems.length > 0 && (
                  mappedItems.some(i => i.hasRequiredDependency) ? (
                    <div className="bg-red-50 border-2 border-red-200 p-3.5 rounded-2xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-red-800 text-sm font-black">Out of Stock (Required Dependency)</h4>
                        <p className="text-red-600 text-[11px] font-bold mt-0.5">
                          The required items/sizes below are marked unavailable because this ingredient is depleted.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border-2 border-amber-200 p-3.5 rounded-2xl flex items-start gap-3">
                      <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-amber-800 text-sm font-black">Depleted (Optional Ingredient)</h4>
                        <p className="text-amber-700 text-[11px] font-bold mt-0.5">
                          Menu items below remain available to customers because this ingredient is marked optional.
                        </p>
                      </div>
                    </div>
                  )
                )}

                {mappedItems.length === 0 ? (
                  <div className="text-center p-8 text-gray-400 text-sm font-bold">
                    No menu items mapped to this ingredient yet. Map items in the right column!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mappedItems.map(({ product, sizes, isAllSizes, required }) => (
                      <div
                        key={product.id}
                        className="p-3 bg-gray-50 rounded-xl border-2 border-gray-150 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-8 h-8 rounded-lg object-cover comic-border-sm shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center comic-border-sm shrink-0">
                              <Package className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-black text-xs text-accent truncate block">{product.name}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase block">{product.category_id}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 shrink-0 justify-end max-w-[55%]">
                          {sizes ? (
                            sizes.map((s, sIdx) => (
                              <span 
                                key={sIdx} 
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                  s.required 
                                    ? 'bg-amber-50 text-amber-900 border-amber-300' 
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                <span>{s.name}</span>
                                <span className={`text-[8px] uppercase tracking-wider px-1 py-0.2 rounded font-extrabold ${
                                  s.required ? 'bg-amber-200 text-amber-900' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {s.required ? 'Req' : 'Opt'}
                                </span>
                              </span>
                            ))
                          ) : (
                            <span 
                              className={`text-[10px] font-black px-2.5 py-0.5 rounded-md border flex items-center gap-1 ${
                                required 
                                  ? 'bg-amber-50 text-amber-900 border-amber-300' 
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              <span>Entire Item</span>
                              <span className={`text-[8px] uppercase tracking-wider px-1 py-0.2 rounded font-extrabold ${
                                required ? 'bg-amber-200 text-amber-900' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {required ? 'Req' : 'Opt'}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: Menu Mapping */}
        <div className={`bg-white rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex flex-col h-[500px] sm:h-[600px] lg:h-[700px] transition-opacity ${!selectedIngredient ? 'opacity-50 pointer-events-none' : ''} ${mobileTab !== 'mapping' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b-2 border-gray-100 bg-gray-50/50 rounded-t-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black text-accent flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                Menu Mapping
              </h3>
              {selectedIngredient && (
                <span className="text-[11px] font-black bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg truncate max-w-[150px]">
                  {selectedIngredient.name}
                </span>
              )}
            </div>
            
            <p className="text-[11px] font-bold text-gray-500 mb-3">
              {selectedIngredient ? (
                <>Select which menu items or sizes require <strong className="text-accent">{selectedIngredient.name}</strong>.</>
              ) : (
                'Select an ingredient from the left column to map items.'
              )}
            </p>

            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-white border-2 border-gray-200 pl-9 pr-4 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-primary"
                />
              </div>
              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="bg-white border-2 border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-accent focus:outline-none focus:border-primary"
              >
                {categoryOptions.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 no-scrollbar">
            {!selectedIngredient ? (
              <div className="text-center p-8 text-gray-400 text-sm font-bold">
                Waiting for ingredient selection...
              </div>
            ) : (
              filteredProducts.map(p => {
                const hasSizes = p.has_sizes && Array.isArray(p.sizes) && p.sizes.length > 0;

                // Case 1: Product WITHOUT sizes
                if (!hasSizes) {
                  const isMapped = isProductMapped(p);
                  const isReq = isProductRequired(p);
                  return (
                    <div 
                      key={p.id} 
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                        isMapped ? 'bg-primary/5 border-primary shadow-xs' : 'bg-white border-gray-150 hover:bg-gray-50'
                      }`}
                    >
                      <div 
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        onClick={() => handleToggleProductMapping(p)}
                      >
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-lg object-cover comic-border-sm shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center comic-border-sm shrink-0">
                            <Package className="w-3 h-3 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-black text-accent truncate">{p.name}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">{p.category_id}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isMapped && (
                          <button
                            type="button"
                            onClick={() => handleToggleProductRequired(p)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer border ${
                              isReq
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300'
                            }`}
                            title={isReq ? "Required: Blocks order if out of stock. Click to make optional." : "Optional: Deducts stock on order without blocking availability. Click to make required."}
                          >
                            <Star className={`w-3 h-3 ${isReq ? 'fill-amber-500 text-amber-500' : 'text-gray-400'}`} />
                            <span>{isReq ? 'Required' : 'Optional'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleProductMapping(p)}
                          className={`w-6 h-6 rounded-md flex items-center justify-center border-2 shrink-0 transition-colors cursor-pointer ${
                            isMapped ? 'bg-primary border-primary text-white' : 'border-gray-300 bg-white hover:border-primary'
                          }`}
                          title={isMapped ? "Unmap ingredient from item" : "Map ingredient to item"}
                        >
                          {isMapped && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                }

                // Case 2: Product WITH sizes (e.g. pizzas, shawarmas, etc.)
                const sizes = p.sizes || [];
                const mappedSizesCount = sizes.filter(s => isSizeMapped(p, s)).length;
                const isAllMapped = sizes.length > 0 && mappedSizesCount === sizes.length;
                const isPartiallyMapped = mappedSizesCount > 0 && !isAllMapped;

                return (
                  <div 
                    key={p.id}
                    className={`p-3 rounded-xl border-2 transition-all space-y-2.5 ${
                      mappedSizesCount > 0 ? 'bg-primary/5 border-primary/50 shadow-xs' : 'bg-white border-gray-150'
                    }`}
                  >
                    {/* Header: Product info + All Sizes toggle */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-lg object-cover comic-border-sm shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center comic-border-sm shrink-0">
                            <Package className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-black text-accent truncate">{p.name}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">
                            {p.category_id} • {sizes.length} sizes
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleAllSizes(p)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer shrink-0 ${
                          isAllMapped
                            ? 'bg-primary text-white hover:bg-primary-hover'
                            : isPartiallyMapped
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                        }`}
                        title={isAllMapped ? 'Unmap all sizes' : 'Map all sizes'}
                      >
                        {isAllMapped ? '✓ All Sizes' : isPartiallyMapped ? `${mappedSizesCount}/${sizes.length} Sizes` : '+ All Sizes'}
                      </button>
                    </div>

                    {/* Size Selector Buttons with Required Toggle */}
                    <div className="pt-1.5 border-t border-gray-100">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Select Sized Variant(s):</span>
                        <span className="text-[9px] font-bold text-gray-400 lowercase">click name to map • toggle Req/Opt</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sizes.map((s, sIdx) => {
                          const mapped = isSizeMapped(p, s);
                          const req = isSizeRequired(p, s);

                          if (!mapped) {
                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => handleToggleSizeMapping(p, s.name)}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 transition-all flex items-center gap-1 cursor-pointer"
                                title={`Map ${selectedIngredient.name} to ${s.name}`}
                              >
                                <Plus className="w-3 h-3 text-gray-400" />
                                <span>{s.name}</span>
                              </button>
                            );
                          }

                          return (
                            <div
                              key={sIdx}
                              className={`inline-flex items-center rounded-xl border text-xs font-black shadow-xs overflow-hidden transition-all ${
                                req 
                                  ? 'bg-primary/10 border-primary text-primary' 
                                  : 'bg-blue-50 border-blue-300 text-blue-800'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleSizeMapping(p, s.name)}
                                className={`px-2.5 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer hover:bg-red-50 hover:text-red-600 ${
                                  req ? 'text-primary' : 'text-blue-900'
                                }`}
                                title={`Click to unmap ${s.name}`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{s.name}</span>
                              </button>

                              <div className={`h-4 w-[1px] ${req ? 'bg-primary/30' : 'bg-blue-200'}`} />

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSizeRequired(p, s.name);
                                }}
                                className={`px-2 py-1.5 text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                                  req
                                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                                title={req ? "Required: Must be in stock for this size. Click to make optional." : "Optional: Size remains available even if out of stock. Stock will still be deducted. Click to make required."}
                              >
                                <Star className={`w-2.5 h-2.5 ${req ? 'fill-white text-white' : 'text-gray-500'}`} />
                                <span>{req ? 'Req' : 'Opt'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {selectedIngredient && filteredProducts.length === 0 && (
              <div className="text-center p-8 text-gray-400 text-sm font-bold">
                No products found matching filters.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
