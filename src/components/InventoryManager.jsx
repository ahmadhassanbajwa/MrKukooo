import { useState, useMemo } from 'react';
import { Package, Search, Check, AlertTriangle, Edit3, Trash2, Plus, Link as LinkIcon, Box, Star, X, Info } from 'lucide-react';
import { 
  normalizeIngredientEntry, 
  getIngredientId, 
  parseQuantityFromName 
} from '../utils/productUtils';

export default function InventoryManager({ 
  products = [], 
  categories = [], 
  ingredients = [],
  saveIngredient,
  deleteIngredient,
  updateIngredientStock,
  updateProductStock,
  saveProduct,
  foodWastage = [],
  recordFoodWastage,
  deleteFoodWastage
}) {
  // State for Column 1: Raw Ingredients
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState(null);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [editQuantities, setEditQuantities] = useState({});
  const [savingState, setSavingState] = useState({});
  const [renamingIngredientId, setRenamingIngredientId] = useState(null);
  const [renamingIngredientName, setRenamingIngredientName] = useState('');

  // State for Food Wastage Management
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const [wastageTab, setWastageTab] = useState('log'); // 'log' | 'history'
  const [wasteItemType, setWasteItemType] = useState('ingredient'); // 'ingredient' | 'product'
  const [wasteItemId, setWasteItemId] = useState('');
  const [wasteQuantity, setWasteQuantity] = useState(1);
  const [wasteUnitCost, setWasteUnitCost] = useState('');
  const [wasteReason, setWasteReason] = useState('Expired / Spoiled');
  const [wasteNotes, setWasteNotes] = useState('');
  const [isSubmittingWaste, setIsSubmittingWaste] = useState(false);
  const [wasteFeedback, setWasteFeedback] = useState(null);

  const totalLoggedWastage = useMemo(() => {
    return (foodWastage || []).reduce((sum, w) => sum + (Number(w.total_cost) || 0), 0);
  }, [foodWastage]);

  const handleItemSelect = (type, id) => {
    setWasteItemId(id);
    if (!id) {
      setWasteUnitCost('');
      return;
    }
    if (type === 'ingredient') {
      const ing = ingredients.find(i => String(i.id) === String(id));
      setWasteUnitCost(ing?.cost || ing?.cost_per_unit || ing?.price_per_unit || 0);
    } else {
      const prod = products.find(p => String(p.id) === String(id));
      setWasteUnitCost(prod?.cost || 0);
    }
  };

  const handleRecordWasteSubmit = async (e) => {
    e?.preventDefault();
    if (!wasteItemId) {
      alert("Please select an item.");
      return;
    }
    const qty = Math.max(1, parseInt(wasteQuantity, 10) || 1);
    const unitCost = Math.max(0, parseFloat(wasteUnitCost) || 0);
    
    let itemName = 'Unknown Item';
    if (wasteItemType === 'ingredient') {
      const ing = ingredients.find(i => String(i.id) === String(wasteItemId));
      itemName = ing?.name || 'Raw Ingredient';
      if (updateIngredientStock && ing) {
        const nextQty = Math.max(0, (Number(ing.quantity) || 0) - qty);
        updateIngredientStock(wasteItemId, nextQty);
      }
    } else {
      const prod = products.find(p => String(p.id) === String(wasteItemId));
      itemName = prod?.name || 'Menu Product';
      if (updateProductStock && prod) {
        const nextQty = Math.max(0, (Number(prod.quantity) || 0) - qty);
        updateProductStock(wasteItemId, nextQty);
      }
    }

    setIsSubmittingWaste(true);
    try {
      if (recordFoodWastage) {
        await recordFoodWastage({
          item_type: wasteItemType,
          item_id: wasteItemId,
          item_name: itemName,
          quantity: qty,
          unit_cost: unitCost,
          total_cost: qty * unitCost,
          reason: wasteReason,
          notes: wasteNotes,
          timestamp: new Date().toISOString()
        });
      }
      setWasteFeedback(`Successfully logged ${qty}x ${itemName} as waste (Rs. ${qty * unitCost}). Inventory stock deducted!`);
      setWasteItemId('');
      setWasteQuantity(1);
      setWasteUnitCost('');
      setWasteNotes('');
      setTimeout(() => setWasteFeedback(null), 4000);
    } catch (err) {
      console.error("Wastage logging error:", err);
      alert("Failed to log wastage: " + (err.message || err));
    } finally {
      setIsSubmittingWaste(false);
    }
  };

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
  const getEntryForIngredient = (entries, ingId, contextName = '') => {
    if (!Array.isArray(entries) || !ingId) return null;
    for (const entry of entries) {
      const normalized = normalizeIngredientEntry(entry, contextName);
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
  const upsertIngredientInList = (list = [], ingId, required = true, quantity = null, contextName = '') => {
    const existing = getEntryForIngredient(list, ingId, contextName);
    const finalQty = quantity !== null && quantity !== undefined
      ? Math.max(1, parseInt(quantity, 10) || 1)
      : (existing?.quantity || parseQuantityFromName(contextName) || 1);

    const filtered = (list || []).filter(entry => getIngredientId(entry) !== ingId);
    return [...filtered, { id: ingId, required, quantity: finalQty }];
  };

  // Get portion quantity for unsized product
  const getProductPortion = (product) => {
    if (!selectedIngredientId) return 1;
    const entry = getEntryForIngredient(product.ingredient_ids, selectedIngredientId, product.name);
    return entry ? (entry.quantity || 1) : parseQuantityFromName(product.name);
  };

  // Get portion quantity for sized product
  const getSizePortion = (product, size) => {
    if (!selectedIngredientId) return 1;
    const sizeEntry = getEntryForIngredient(size.ingredient_ids, selectedIngredientId, size.name);
    if (sizeEntry) return sizeEntry.quantity || parseQuantityFromName(size.name);
    const prodEntry = getEntryForIngredient(product.ingredient_ids, selectedIngredientId, product.name);
    if (prodEntry) return prodEntry.quantity || parseQuantityFromName(product.name);
    return parseQuantityFromName(size.name);
  };

  // Check if an unsized product is mapped
  const isProductMapped = (product) => {
    if (!selectedIngredientId) return false;
    return !!getEntryForIngredient(product.ingredient_ids, selectedIngredientId, product.name);
  };

  // Check if an unsized product's ingredient dependency is required
  const isProductRequired = (product) => {
    if (!selectedIngredientId) return true;
    const entry = getEntryForIngredient(product.ingredient_ids, selectedIngredientId, product.name);
    return entry ? entry.required : true;
  };

  // Check if a specific size is mapped to selectedIngredientId
  const isSizeMapped = (product, size) => {
    if (!selectedIngredientId) return false;
    if (getEntryForIngredient(product.ingredient_ids, selectedIngredientId, product.name)) {
      return true;
    }
    return !!getEntryForIngredient(size.ingredient_ids, selectedIngredientId, size.name);
  };

  // Check if a specific size's ingredient dependency is required
  const isSizeRequired = (product, size) => {
    if (!selectedIngredientId) return true;
    const sizeEntry = getEntryForIngredient(size.ingredient_ids, selectedIngredientId, size.name);
    if (sizeEntry) return sizeEntry.required;
    const prodEntry = getEntryForIngredient(product.ingredient_ids, selectedIngredientId, product.name);
    if (prodEntry) return prodEntry.required;
    return true;
  };

  // 3. Mapped Products / Sizes for Dependency Impact Column
  const mappedItems = useMemo(() => {
    if (!selectedIngredientId) return [];
    const list = [];
    for (const p of products) {
      if (p.is_deal) continue;
      const prodEntry = getEntryForIngredient(p.ingredient_ids, selectedIngredientId, p.name);
      const hasSizes = p.has_sizes && Array.isArray(p.sizes) && p.sizes.length > 0;

      if (hasSizes) {
        const mappedSizes = [];
        for (const s of p.sizes) {
          const sEntry = getEntryForIngredient(s.ingredient_ids, selectedIngredientId, s.name) || prodEntry;
          if (sEntry) {
            mappedSizes.push({
              name: s.name,
              required: sEntry.required,
              quantity: sEntry.quantity || 1
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
          quantity: prodEntry.quantity || 1,
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

  const handleStartRename = (ing) => {
    setRenamingIngredientId(ing.id);
    setRenamingIngredientName(ing.name || '');
  };

  const handleCancelRename = () => {
    setRenamingIngredientId(null);
    setRenamingIngredientName('');
  };

  const handleSaveRename = async (ing) => {
    const trimmed = renamingIngredientName.trim();
    if (!trimmed || trimmed === ing.name) {
      handleCancelRename();
      return;
    }
    try {
      await saveIngredient({ ...ing, name: trimmed });
      handleCancelRename();
    } catch (err) {
      console.error("Failed to rename ingredient:", err);
    }
  };

  const handleDeleteIngredient = async (ing) => {
    const affectedProducts = products.filter(p => {
      if (p.is_deal) return false;
      const inProd = Array.isArray(p.ingredient_ids) && p.ingredient_ids.some(e => getIngredientId(e) === ing.id);
      const inSizes = Array.isArray(p.sizes) && p.sizes.some(s => Array.isArray(s.ingredient_ids) && s.ingredient_ids.some(e => getIngredientId(e) === ing.id));
      return inProd || inSizes;
    });

    const confirmMsg = affectedProducts.length > 0
      ? `Delete ingredient "${ing.name}"?\n\nIt is currently mapped to ${affectedProducts.length} product(s). Deleting it will unlink it from those items to keep them available.`
      : `Are you sure you want to delete ingredient "${ing.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (deleteIngredient) {
        await deleteIngredient(ing.id);
      }
      // Clean up mapping in any affected products so they don't get locked out
      for (const prod of affectedProducts) {
        const cleanedProdIds = removeIngredientFromList(prod.ingredient_ids, ing.id);
        const cleanedSizes = Array.isArray(prod.sizes)
          ? prod.sizes.map(s => ({
              ...s,
              ingredient_ids: removeIngredientFromList(s.ingredient_ids, ing.id)
            }))
          : prod.sizes;
        await saveProduct({
          ...prod,
          ingredient_ids: cleanedProdIds,
          sizes: cleanedSizes
        });
      }

      if (selectedIngredientId === ing.id) {
        setSelectedIngredientId(null);
      }
      if (renamingIngredientId === ing.id) {
        handleCancelRename();
      }
    } catch (err) {
      console.error("Failed to delete ingredient:", err);
    }
  };

  // --- MAPPING HANDLERS ---

  // For products without sizes: toggle mapping completely
  const handleToggleProductMapping = async (product) => {
    if (!selectedIngredientId) return;
    const isMapped = isProductMapped(product);
    const newIds = isMapped
      ? removeIngredientFromList(product.ingredient_ids, selectedIngredientId)
      : upsertIngredientInList(product.ingredient_ids, selectedIngredientId, true, null, product.name);
    await saveProduct({ ...product, ingredient_ids: newIds });
  };

  // For products without sizes: toggle Required vs Optional
  const handleToggleProductRequired = async (product) => {
    if (!selectedIngredientId) return;
    const currentReq = isProductRequired(product);
    const curPortion = getProductPortion(product);
    const newIds = upsertIngredientInList(product.ingredient_ids, selectedIngredientId, !currentReq, curPortion, product.name);
    await saveProduct({ ...product, ingredient_ids: newIds });
  };

  // For products without sizes: update portion quantity
  const handleUpdateProductPortion = async (product, newQuantity) => {
    if (!selectedIngredientId) return;
    const req = isProductRequired(product);
    const parsed = Math.max(1, parseInt(newQuantity, 10) || 1);
    const newIds = upsertIngredientInList(product.ingredient_ids, selectedIngredientId, req, parsed, product.name);
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
          : upsertIngredientInList(curIds, selectedIngredientId, true, null, s.name)
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
    const curPortion = getSizePortion(product, targetSize);
    const newSizes = (product.sizes || []).map(s => {
      if (s.name !== targetSizeName) return s;
      return {
        ...s,
        ingredient_ids: upsertIngredientInList(s.ingredient_ids, selectedIngredientId, !currentReq, curPortion, s.name)
      };
    });

    const newProductIngIds = removeIngredientFromList(product.ingredient_ids, selectedIngredientId);

    await saveProduct({
      ...product,
      ingredient_ids: newProductIngIds,
      sizes: newSizes
    });
  };

  // For products with sizes: update portion quantity for a single size
  const handleUpdateSizePortion = async (product, targetSizeName, newQuantity) => {
    if (!selectedIngredientId) return;
    const targetSize = (product.sizes || []).find(s => s.name === targetSizeName);
    if (!targetSize) return;

    const req = isSizeRequired(product, targetSize);
    const parsed = Math.max(1, parseInt(newQuantity, 10) || 1);
    const newSizes = (product.sizes || []).map(s => {
      if (s.name !== targetSizeName) return s;
      return {
        ...s,
        ingredient_ids: upsertIngredientInList(s.ingredient_ids, selectedIngredientId, req, parsed, s.name)
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
      const curPortion = getSizePortion(product, s);
      return {
        ...s,
        ingredient_ids: targetState
          ? upsertIngredientInList(s.ingredient_ids, selectedIngredientId, req, curPortion, s.name)
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

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => setIsWastageModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-200 hover:border-red-300 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
            title="Track and manage wasted food items"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Food Wastage Tracker</span>
            {totalLoggedWastage > 0 && (
              <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold ml-1">
                Rs. {totalLoggedWastage.toLocaleString()}
              </span>
            )}
          </button>

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
                  {renamingIngredientId === ing.id ? (
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        autoFocus
                        value={renamingIngredientName}
                        onChange={(e) => setRenamingIngredientName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(ing);
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                        className="w-full bg-white border-2 border-primary px-2 py-1 rounded-lg text-xs font-black text-accent focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(ing)}
                        title="Save name"
                        className="p-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors shrink-0 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleCancelRename}
                        title="Cancel"
                        className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors shrink-0 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col min-w-0 mr-2 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-black text-sm truncate ${isSelected ? 'text-primary' : 'text-accent'}`}>
                          {ing.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(ing);
                          }}
                          title="Rename ingredient"
                          className="p-1 text-gray-400 hover:text-primary rounded hover:bg-primary/10 transition-colors shrink-0 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteIngredient(ing);
                          }}
                          title="Delete ingredient"
                          className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-[11px] font-bold text-gray-500 uppercase">
                        Stock: <span className={isSoldOut ? 'text-red-500' : 'text-green-600'}>{ing.quantity || 0}</span>
                      </span>
                    </div>
                  )}

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
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-black text-accent flex items-center gap-2 text-sm">
                <LinkIcon className="w-4 h-4 text-blue-500" />
                Dependency Impact
              </h3>
              {selectedIngredient && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartRename(selectedIngredient)}
                    title="Rename this ingredient"
                    className="text-[11px] font-black px-2 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-accent flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3 h-3 text-primary" />
                    Rename
                  </button>
                  <button
                    onClick={() => handleDeleteIngredient(selectedIngredient)}
                    title="Delete this ingredient"
                    className="text-[11px] font-black px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-600 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
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
                    {mappedItems.map(({ product, sizes, required, quantity }) => (
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
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${
                                  s.required 
                                    ? 'bg-amber-50 text-amber-900 border-amber-300' 
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                <span>{s.name}</span>
                                <span className="text-[9px] font-black bg-white/90 px-1 py-0.2 rounded border border-gray-200 text-accent" title={`${s.quantity || 1} units per order`}>
                                  {s.quantity || 1}x
                                </span>
                                <span className={`text-[8px] uppercase tracking-wider px-1 py-0.2 rounded font-extrabold ${
                                  s.required ? 'bg-amber-200 text-amber-900' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {s.required ? 'Req' : 'Opt'}
                                </span>
                              </span>
                            ))
                          ) : (
                            <span 
                              className={`text-[10px] font-black px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${
                                required 
                                  ? 'bg-amber-50 text-amber-900 border-amber-300' 
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              <span>Entire Item</span>
                              <span className="text-[9px] font-black bg-white/90 px-1 py-0.2 rounded border border-gray-200 text-accent" title={`${quantity || 1} units per order`}>
                                {quantity || 1}x
                              </span>
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
                          <>
                            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-0.5" title="Units of this ingredient used per order">
                              <span className="text-[9px] font-bold text-gray-400 uppercase">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                value={getProductPortion(p)}
                                onChange={(e) => handleUpdateProductPortion(p, e.target.value)}
                                className="w-9 text-xs font-black text-center text-accent focus:outline-none focus:text-primary"
                              />
                              <span className="text-[10px] font-bold text-gray-400">x</span>
                            </div>

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
                          </>
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

                              {/* Portion quantity input */}
                              <div className="flex items-center px-1.5 bg-white/70 hover:bg-white transition-colors" title="Portion: units of this ingredient used for this size">
                                <input
                                  type="number"
                                  min="1"
                                  value={getSizePortion(p, s)}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleUpdateSizePortion(p, s.name, e.target.value)}
                                  className="w-8 text-[11px] font-black text-center text-accent focus:outline-none focus:text-primary"
                                />
                                <span className="text-[9px] font-bold text-gray-400">x</span>
                              </div>

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

      {/* FOOD WASTAGE TRACKER MODAL */}
      {isWastageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl comic-border comic-shadow max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-6 border-b-2 border-gray-150 flex items-center justify-between bg-red-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 border border-red-200 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-red-600 font-black uppercase tracking-wider">Inventory Loss Control</span>
                  <h3 className="text-lg font-black text-accent mt-0.5">Food Wastage Tracker</h3>
                  <p className="text-[11px] text-gray-500 font-bold">Track wasted food, deduct stock, and deduct loss from net profit</p>
                </div>
              </div>
              <button
                onClick={() => setIsWastageModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center border border-accent/15 cursor-pointer text-gray-500 transition-colors"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-150 bg-gray-50 px-6 pt-3 gap-2">
              <button
                onClick={() => setWastageTab('log')}
                className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
                  wastageTab === 'log'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                ➕ Log New Wastage
              </button>
              <button
                onClick={() => setWastageTab('history')}
                className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  wastageTab === 'history'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                📋 Wastage History &amp; Audit
                {(foodWastage || []).length > 0 && (
                  <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded-full font-bold">
                    {(foodWastage || []).length}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {wasteFeedback && (
                <div className="p-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-700 font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <span>{wasteFeedback}</span>
                </div>
              )}

              {wastageTab === 'log' ? (
                <form onSubmit={handleRecordWasteSubmit} className="space-y-4">
                  {/* Select Type */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block">
                      1. Select Category of Wasted Item
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setWasteItemType('ingredient');
                          setWasteItemId('');
                          setWasteUnitCost('');
                        }}
                        className={`p-3 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          wasteItemType === 'ingredient'
                            ? 'border-red-500 bg-red-50/50 text-red-700 shadow-xs'
                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <Box className="w-4 h-4" />
                        Raw Ingredient
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWasteItemType('product');
                          setWasteItemId('');
                          setWasteUnitCost('');
                        }}
                        className={`p-3 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          wasteItemType === 'product'
                            ? 'border-red-500 bg-red-50/50 text-red-700 shadow-xs'
                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <Package className="w-4 h-4" />
                        Menu Product
                      </button>
                    </div>
                  </div>

                  {/* Select Specific Item */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block">
                      2. Choose {wasteItemType === 'ingredient' ? 'Raw Ingredient' : 'Product'}
                    </label>
                    <select
                      value={wasteItemId}
                      onChange={(e) => handleItemSelect(wasteItemType, e.target.value)}
                      required
                      className="w-full bg-white border-2 border-gray-200 p-2.5 rounded-xl font-bold text-accent text-xs focus:outline-none focus:border-red-500"
                    >
                      <option value="">-- Choose {wasteItemType === 'ingredient' ? 'Ingredient' : 'Product'} --</option>
                      {wasteItemType === 'ingredient' ? (
                        ingredients.map(ing => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} (In Stock: {ing.quantity || 0} pcs)
                          </option>
                        ))
                      ) : (
                        products.filter(p => !p.is_deal).map(prod => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name} (Stock: {prod.quantity ?? 0} pcs • Cost: Rs. {prod.cost || 0})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Quantity and Unit Cost */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block">
                        3. Quantity Wasted
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={wasteQuantity}
                        onChange={(e) => setWasteQuantity(e.target.value)}
                        className="w-full bg-white border-2 border-gray-200 p-2.5 rounded-xl font-bold text-accent text-xs focus:outline-none focus:border-red-500"
                        placeholder="e.g. 5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block">
                        4. Cost Per Unit (Rs.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={wasteUnitCost}
                        onChange={(e) => setWasteUnitCost(e.target.value)}
                        className="w-full bg-white border-2 border-gray-200 p-2.5 rounded-xl font-bold text-accent text-xs focus:outline-none focus:border-red-500"
                        placeholder="e.g. 150"
                      />
                    </div>
                  </div>

                  {/* Reason for Wastage */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block">
                      5. Reason for Wastage
                    </label>
                    <select
                      value={wasteReason}
                      onChange={(e) => setWasteReason(e.target.value)}
                      className="w-full bg-white border-2 border-gray-200 p-2.5 rounded-xl font-bold text-accent text-xs focus:outline-none focus:border-red-500"
                    >
                      <option value="Expired / Spoiled">Expired / Spoiled</option>
                      <option value="Burned / Damaged in Preparation">Burned / Damaged in Preparation</option>
                      <option value="Dropped / Spilled">Dropped / Spilled</option>
                      <option value="Customer Returned / Rejected">Customer Returned / Rejected</option>
                      <option value="Quality Check Failed">Quality Check Failed</option>
                      <option value="Kitchen Tasting / Training">Kitchen Tasting / Training</option>
                      <option value="Other">Other Reason</option>
                    </select>
                  </div>

                  {/* Optional Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block">
                      6. Notes / Details (Optional)
                    </label>
                    <input
                      type="text"
                      value={wasteNotes}
                      onChange={(e) => setWasteNotes(e.target.value)}
                      placeholder="e.g. Discarded during morning inspection"
                      className="w-full bg-white border-2 border-gray-200 p-2.5 rounded-xl font-semibold text-accent text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Total Loss Preview Banner */}
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-red-500 font-black uppercase tracking-wider block">Total Food Wastage Value</span>
                      <p className="text-[11px] text-gray-600 font-bold mt-0.5">
                        Will be deducted from inventory stock &amp; subtracted from Net Profit in Analytics.
                      </p>
                    </div>
                    <span className="text-xl font-black text-red-600 whitespace-nowrap ml-3">
                      Rs. {((parseInt(wasteQuantity, 10) || 0) * (parseFloat(wasteUnitCost) || 0)).toLocaleString()}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingWaste || !wasteItemId}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-98 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer uppercase tracking-wider"
                  >
                    {isSubmittingWaste ? 'Recording & Deducting Stock...' : 'Confirm Wastage & Deduct From Inventory'}
                  </button>
                </form>
              ) : (
                /* History Tab */
                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 font-black uppercase block">Total Recorded Wastage Loss</span>
                      <h4 className="text-lg font-black text-red-600">Rs. {totalLoggedWastage.toLocaleString()}</h4>
                    </div>
                    <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-xl border border-gray-200">
                      {(foodWastage || []).length} Recorded Events
                    </span>
                  </div>

                  {(foodWastage || []).length > 0 ? (
                    <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                      {(foodWastage || []).map((w, idx) => (
                        <div key={w.id || idx} className="py-3 flex items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-accent text-xs">{w.item_name}</span>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                w.item_type === 'product' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {w.item_type}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 flex flex-wrap gap-2.5 font-bold">
                              <span>Qty: <strong className="text-accent">{w.quantity}</strong></span>
                              <span>Unit Cost: <strong className="text-accent">Rs. {w.unit_cost}</strong></span>
                              <span>Reason: <strong className="text-red-600">{w.reason}</strong></span>
                              {w.notes && <span className="italic text-gray-400">"{w.notes}"</span>}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {w.timestamp ? new Date(w.timestamp).toLocaleString() : 'N/A'}
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <div>
                              <span className="text-xs font-black text-red-600 block">- Rs. {w.total_cost || (w.quantity * w.unit_cost)}</span>
                              <span className="text-[9px] text-gray-400 font-bold uppercase">Subtracted</span>
                            </div>
                            {deleteFoodWastage && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Delete wastage record for ${w.item_name} (Rs. ${w.total_cost})? Note: this does not automatically revert inventory deductions.`)) {
                                    await deleteFoodWastage(w.id);
                                  }
                                }}
                                className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete wastage record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400 font-bold">
                      <p className="text-sm">No food wastage records yet.</p>
                      <p className="text-[11px] mt-1 text-gray-400">Log waste events to track food loss and adjust net profit.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end">
              <button
                onClick={() => setIsWastageModalOpen(false)}
                className="px-5 py-2 bg-accent text-white font-black text-xs rounded-xl hover:bg-accent/90 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
