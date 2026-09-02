import { useState, useEffect } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';

export default function ProductCustomizerModal({
  product,
  onClose,
  onAdd,
  addons,
  selectedBranchId,
  isEditMode = false
}) {
  const [drink, setDrink] = useState('');
  const [sauces, setSauces] = useState([]);
  const [extras, setExtras] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedSize, setSelectedSize] = useState(product?.has_sizes && product.sizes?.length > 0 ? product.sizes[0] : null);
  const [expandedPanels, setExpandedPanels] = useState({ drinks: true, sauces: true, extras: true });

  useEffect(() => {
    if (product?.has_sizes && product.sizes?.length > 0) {
      if (!product.sizes.find(s => s.name === selectedSize?.name)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedSize(product.sizes[0]);
      }
    } else {
      setSelectedSize(null);
    }
  }, [product, selectedSize]);

  if (!product) return null;

  const eligibleAddons = (addons || []).filter(a => {
    if (selectedBranchId && a.branch_ids && a.branch_ids.length > 0) {
      return a.branch_ids.includes(selectedBranchId);
    }
    return true;
  });

  const availableDrinks = eligibleAddons.filter(a => a.type === 'drinks');
  const availableSauces = eligibleAddons.filter(a => a.type === 'sauces');
  const availableExtras = eligibleAddons.filter(a => a.type === 'extras');

  const togglePanel = (panel) => {
    setExpandedPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  const handleToggleSauce = (sauceId) => {
    setSauces(prev => 
      prev.includes(sauceId) ? prev.filter(id => id !== sauceId) : [...prev, sauceId]
    );
  };

  const handleToggleExtra = (extraId) => {
    setExtras(prev => 
      prev.includes(extraId) ? prev.filter(id => id !== extraId) : [...prev, extraId]
    );
  };

  const selectedDrinksCost = drink ? (availableDrinks.find(d => d.id === drink)?.price || 0) : 0;
  const selectedSaucesCost = sauces.reduce((sum, id) => sum + (availableSauces.find(s => s.id === id)?.price || 0), 0);
  const selectedExtrasCost = extras.reduce((sum, id) => sum + (availableExtras.find(e => e.id === id)?.price || 0), 0);
  
  const unitAddonsCost = selectedDrinksCost + selectedSaucesCost + selectedExtrasCost;
  const basePrice = (product.has_sizes && selectedSize) ? selectedSize.price : product.price;
  const baseUnitCost = (product.has_sizes && selectedSize) ? (selectedSize.cost || 0) : (product.cost || 0);
  const totalPricePerUnit = basePrice + unitAddonsCost;
  const totalCost = totalPricePerUnit * quantity;

  const handleSubmit = () => {
    const selectedAddonsList = [];
    if (drink) {
      const dObj = availableDrinks.find(d => d.id === drink);
      if (dObj) selectedAddonsList.push(dObj);
    }
    sauces.forEach(id => {
      const sObj = availableSauces.find(s => s.id === id);
      if (sObj) selectedAddonsList.push(sObj);
    });
    extras.forEach(id => {
      const eObj = availableExtras.find(e => e.id === id);
      if (eObj) selectedAddonsList.push(eObj);
    });

    onAdd({
      product,
      size: selectedSize,
      addons: selectedAddonsList,
      quantity,
      notes,
      totalPricePerUnit,
      unitCost: baseUnitCost
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-150 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        <div className="p-4 sm:p-5 border-b border-gray-150 flex items-center justify-between bg-gray-50/70">
          <div>
            <span className="text-[11px] text-primary font-semibold uppercase tracking-wider">Customize Item</span>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight mt-0.5">
              {product.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200/60 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {product.has_sizes && product.sizes?.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span>Select Size</span>
                <span className="text-[10px] bg-red-50 text-primary border border-primary/20 px-2 py-0.5 rounded-md font-semibold">Required</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {product.sizes.map((s) => (
                  <label
                    key={s.name}
                    onClick={() => setSelectedSize(s)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedSize?.name === s.name
                        ? 'border-primary bg-primary/5 shadow-2xs font-semibold'
                        : 'border-gray-200 hover:border-gray-300 bg-white font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        selectedSize?.name === s.name ? 'border-primary' : 'border-gray-300'
                      }`}>
                        {selectedSize?.name === s.name && <div className="w-2 h-2 bg-primary rounded-full" />}
                      </div>
                      <span className="text-xs text-gray-900 leading-tight">{s.name}</span>
                    </div>
                    <span className="text-[11px] text-gray-500 shrink-0">Rs. {s.price}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {availableDrinks.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => togglePanel('drinks')}
                className="w-full flex justify-between items-center font-black text-sm uppercase tracking-wide border-b border-accent/10 pb-1 cursor-pointer text-accent"
              >
                🥤 Select beverage (Optional)
                <span className="text-xs text-gray-400">{expandedPanels.drinks ? 'Collapse' : 'Expand'}</span>
              </button>
              {expandedPanels.drinks && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className={`flex items-center justify-between p-3 rounded-xl comic-border-sm cursor-pointer font-bold text-xs transition-all ${
                    drink === '' ? 'bg-secondary/20 comic-shadow-sm font-black' : 'bg-white hover:bg-gray-50'
                  }`}>
                    <span>No Drink</span>
                    <input
                      type="radio"
                      name="drink_addon"
                      value=""
                      checked={drink === ''}
                      onChange={() => setDrink('')}
                      className="accent-primary"
                    />
                  </label>
                  {availableDrinks.map((d) => (
                    <label key={d.id} className={`flex items-center justify-between p-3 rounded-xl comic-border-sm cursor-pointer font-bold text-xs transition-all ${
                      drink === d.id ? 'bg-secondary/20 comic-shadow-sm font-black' : 'bg-white hover:bg-gray-50'
                    }`}>
                      <div className="flex flex-col">
                        <span>{d.name}</span>
                        <span className="text-[10px] text-primary font-black">Rs. {d.price}</span>
                      </div>
                      <input
                        type="radio"
                        name="drink_addon"
                        value={d.id}
                        checked={drink === d.id}
                        onChange={() => setDrink(d.id)}
                        className="accent-primary"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {availableSauces.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => togglePanel('sauces')}
                className="w-full flex justify-between items-center font-black text-sm uppercase tracking-wide border-b border-accent/10 pb-1 cursor-pointer text-accent"
              >
                🥫 Extra dips & sauces (Optional)
                <span className="text-xs text-gray-400">{expandedPanels.sauces ? 'Collapse' : 'Expand'}</span>
              </button>
              {expandedPanels.sauces && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableSauces.map((s) => {
                    const isSelected = sauces.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleToggleSauce(s.id)}
                        className={`flex items-center justify-between p-3 rounded-xl comic-border-sm text-left font-bold text-xs transition-all cursor-pointer ${
                          isSelected ? 'bg-secondary/20 comic-shadow-sm font-black' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span>{s.name}</span>
                          <span className="text-[10px] text-primary font-black">Rs. {s.price}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-secondary stroke-[4]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {availableExtras.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => togglePanel('extras')}
                className="w-full flex items-center justify-between py-1 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer"
              >
                <span>🧀 Add-ons & Extra toppings (Optional)</span>
                <span className="text-primary text-[11px] font-semibold">{expandedPanels.extras ? '− Close' : '+ Expand'}</span>
              </button>
              {expandedPanels.extras && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableExtras.map((e) => {
                    const isSelected = extras.includes(e.id);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => handleToggleExtra(e.id)}
                        className={`flex items-center justify-between p-2.5 rounded-md border text-left text-xs transition-all cursor-pointer ${
                          isSelected ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-gray-900">{e.name}</span>
                          <span className="text-[11px] text-primary font-semibold">Rs. {e.price}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">
              ✍️ Cooking instructions / Special notes (Optional)
            </label>
            <textarea
              placeholder="e.g. No olives, extra spicy, well done crust..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-250 focus:border-primary focus:ring-1 focus:ring-primary/20 p-2.5 rounded-md font-normal text-xs sm:text-sm focus:outline-none bg-white text-gray-900"
            />
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-gray-150 bg-white flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-md shrink-0">
            <button
              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              disabled={quantity <= 1}
              className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-700 font-bold rounded-sm transition-colors cursor-pointer active:scale-95 shadow-2xs"
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
            <span className="text-xs sm:text-sm font-bold text-gray-900 w-5 sm:w-6 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(prev => prev + 1)}
              className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-sm transition-colors cursor-pointer active:scale-95 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleSubmit(); }}
            className="flex-1 w-full bg-primary hover:bg-primary-hover active:translate-y-[0.5px] text-white font-medium py-3 rounded-md flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm shadow-2xs border border-primary-hover/50 transition-all"
          >
            <span>{isEditMode ? 'Update Item' : 'Add to Bowl'}</span>
            <span className="text-white/60 font-medium">•</span>
            <span>Rs. {totalCost}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
