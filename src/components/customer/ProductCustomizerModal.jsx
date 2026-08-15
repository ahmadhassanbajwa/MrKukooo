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
  const baseCost = (product.has_sizes && selectedSize) ? selectedSize.price : product.price;
  const totalPricePerUnit = baseCost + unitAddonsCost;
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
      totalPricePerUnit
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl comic-border comic-shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        <div className="p-6 border-b-2 border-dashed border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <span className="text-[10px] text-primary font-black uppercase tracking-wider">Customize Bowl</span>
            <h2 className="text-xl font-black text-accent tracking-tight leading-none mt-1">
              {product.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white hover:bg-secondary hover:text-accent flex items-center justify-center comic-border-sm comic-shadow-sm comic-hover cursor-pointer text-accent"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {product.has_sizes && product.sizes?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-accent uppercase tracking-wider flex items-center justify-between">
                <span>Select Size</span>
                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-md font-bold">Required</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {product.sizes.map((s) => (
                  <label
                    key={s.name}
                    onClick={() => setSelectedSize(s)}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                      selectedSize?.name === s.name
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-150 hover:border-gray-250 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedSize?.name === s.name ? 'border-primary' : 'border-gray-300'
                      }`}>
                        {selectedSize?.name === s.name && <div className="w-2 h-2 bg-primary rounded-full" />}
                      </div>
                      <span className="text-xs font-black text-accent leading-tight">{s.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 shrink-0">Rs. {s.price}</span>
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
                className="w-full flex justify-between items-center font-black text-sm uppercase tracking-wide border-b border-accent/10 pb-1 cursor-pointer text-accent"
              >
                🧀 Add-ons & Extra toppings (Optional)
                <span className="text-xs text-gray-400">{expandedPanels.extras ? 'Collapse' : 'Expand'}</span>
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
                        className={`flex items-center justify-between p-3 rounded-xl comic-border-sm text-left font-bold text-xs transition-all cursor-pointer ${
                          isSelected ? 'bg-secondary/20 comic-shadow-sm font-black' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span>{e.name}</span>
                          <span className="text-[10px] text-primary font-black">Rs. {e.price}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-secondary stroke-[4]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-black text-accent uppercase">
              ✍️ Cooking instructions / Special notes
            </label>
            <textarea
              placeholder="e.g. No olives, extra spicy, well done crust..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full comic-border-sm p-3 rounded-xl font-semibold text-xs focus:outline-none bg-gray-50"
            />
          </div>
        </div>

        <div className="p-6 border-t-2 border-dashed border-gray-150 bg-gray-50 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl comic-border-sm">
            <button
              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-accent font-black rounded-lg transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4 stroke-[3]" />
            </button>
            <span className="text-sm font-black text-accent w-6 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(prev => prev + 1)}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-accent font-black rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleSubmit(); }}
            className="flex-1 w-full bg-secondary text-accent font-black py-4 rounded-xl comic-border-sm comic-shadow-sm comic-hover flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isEditMode ? 'Update Items' : 'Add to Bowl'}</span>
            <span className="text-accent/60 font-black">•</span>
            <span>Rs. {totalCost}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
