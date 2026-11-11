import { useState, useMemo } from 'react';
import { X, History, Trash2, Calendar, ShoppingBag, ArrowDownRight, Package } from 'lucide-react';
import { formatDualUnitStock, convertToDisplayUnit, getIngredientUnitConfig } from '../../utils/unitUtils';

/**
 * IngredientAnalyticsModal
 * 
 * Detailed Movement History & Analytics for a specific Raw Ingredient.
 * Conforms strictly to requirements:
 * - Summary Tile Backgrounds: clean white/neutral (bg-white border border-gray-200), NO solid color fills.
 * - Colored Text Distinction:
 *   - Current Stock: Blue (text-blue-600)
 *   - Total Purchased: Dark Neutral (text-gray-800)
 *   - Consumed in Orders: Emerald Green (text-emerald-600)
 *   - Total Wasted: Rose Red (text-rose-600)
 * - Donut chart for Consumed % (Green) vs Wasted % (Red)
 * - Tabs: Consumption History (Orders) vs. Wastage Log
 */
export default function IngredientAnalyticsModal({
  ingredient,
  orders = [],
  foodWastage = [],
  orderIngredientLogs = [],
  wastageLogs = [],
  onClose
}) {
  const [activeTab, setActiveTab] = useState('consumption'); // 'consumption' | 'wastage'

  const unitConfig = useMemo(() => getIngredientUnitConfig(ingredient), [ingredient]);
  const ingId = String(ingredient?.id || '');

  // 1. Gather all order consumption records
  const consumptionRecords = useMemo(() => {
    // If we have explicit order_ingredient_logs from DB/state for this ingredient:
    const explicitLogs = (orderIngredientLogs || [])
      .filter(l => String(l.ingredient_id) === ingId)
      .map(l => ({
        id: l.id || `log-${l.order_id}-${l.created_at}`,
        date: l.created_at || l.timestamp,
        orderId: l.order_id,
        menuItem: l.menu_item_name || (l.menu_item_id ? `Item #${l.menu_item_id}` : 'Order Item'),
        quantityDeductedBase: Number(l.quantity_deducted) || 0
      }));

    if (explicitLogs.length > 0) {
      return explicitLogs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }

    // Fallback: derive from orders placed in system
    const derived = [];
    (orders || []).forEach(order => {
      const orderDate = order.timestamp || order.created_at || 'Recently';
      const orderStatus = (order.status || '').toLowerCase();
      // Only count non-cancelled orders
      if (orderStatus === 'cancelled') return;

      (order.items || []).forEach((item, itemIdx) => {
        const itemQty = parseInt(item.quantity || 1, 10);
        // Check if item has mapped ingredient_ids or size with ingredient_ids
        let matchedPortion = 0;

        const checkEntries = (entries = []) => {
          entries.forEach(e => {
            const entryId = typeof e === 'string' ? e : e?.id;
            if (String(entryId) === ingId) {
              const portion = Number(e?.quantity ?? e?.required_quantity) || 1;
              matchedPortion += portion;
            }
          });
        };

        if (Array.isArray(item.ingredient_ids)) checkEntries(item.ingredient_ids);
        if (item.size && Array.isArray(item.size.ingredient_ids)) checkEntries(item.size.ingredient_ids);

        if (matchedPortion > 0) {
          const totalDeducted = matchedPortion * itemQty;
          derived.push({
            id: `ord-${order.order_id}-${itemIdx}`,
            date: orderDate,
            orderId: order.order_id,
            menuItem: item.size?.name ? `${item.name} (${item.size.name})` : item.name,
            quantityDeductedBase: totalDeducted
          });
        }
      });
    });

    return derived.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [orderIngredientLogs, orders, ingId]);

  // 2. Gather all wastage records
  const wastageRecords = useMemo(() => {
    // Check explicit wastage_logs first
    const explicitWastage = (wastageLogs || [])
      .filter(w => String(w.ingredient_id) === ingId)
      .map(w => ({
        id: w.id,
        date: w.created_at,
        reason: w.reason || 'Unspecified',
        reportedBy: w.reported_by || 'Staff',
        wastedQuantityBase: Number(w.wasted_quantity) || 0
      }));

    if (explicitWastage.length > 0) {
      return explicitWastage.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }

    // Fallback: search foodWastage list
    const fromFoodWastage = (foodWastage || [])
      .filter(w => String(w.item_id) === ingId || (w.item_type === 'ingredient' && String(w.item_name).toLowerCase() === String(ingredient?.name).toLowerCase()))
      .map(w => ({
        id: w.id,
        date: w.timestamp || w.created_at,
        reason: w.reason || w.notes || 'Kitchen Wastage',
        reportedBy: w.logged_by || w.staff_name || 'Kitchen Staff',
        wastedQuantityBase: Number(w.quantity) || 0
      }));

    return fromFoodWastage.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [wastageLogs, foodWastage, ingId, ingredient?.name]);

  // 3. Calculate summary metrics (all stored & computed in base units)
  const currentStockBase = Number(ingredient?.stock_quantity ?? ingredient?.quantity ?? 0);
  const totalConsumedBase = consumptionRecords.reduce((sum, r) => sum + r.quantityDeductedBase, 0);
  const totalWastedBase = wastageRecords.reduce((sum, r) => sum + r.wastedQuantityBase, 0);
  // Total Purchased = Current Stock + Total Consumed + Total Wasted
  const totalPurchasedBase = currentStockBase + totalConsumedBase + totalWastedBase;

  // Donut chart ratios
  const totalOutflow = totalConsumedBase + totalWastedBase;
  const consumedPct = totalOutflow > 0 ? Math.round((totalConsumedBase / totalOutflow) * 100) : 100;
  const wastedPct = totalOutflow > 0 ? Math.round((totalWastedBase / totalOutflow) * 100) : 0;

  // Format metric value helper
  const renderMetric = (baseVal) => {
    const dispVal = convertToDisplayUnit(baseVal, ingredient);
    if (unitConfig.conversion_factor > 1) {
      return (
        <div>
          <span className="text-xl sm:text-2xl font-black">{dispVal} {unitConfig.display_unit}</span>
          <span className="text-[11px] font-bold opacity-70 block sm:inline sm:ml-1.5">({baseVal} {unitConfig.base_unit})</span>
        </div>
      );
    }
    return (
      <span className="text-xl sm:text-2xl font-black">{baseVal} {unitConfig.display_unit}</span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div
        className="bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl border border-gray-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-start justify-between gap-3 bg-gray-50/60 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">Inventory Movement &amp; Recipe Audit</span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-gray-900 mt-1">
              Ingredient Analytics &amp; Movement History: <span className="text-primary">{ingredient?.name}</span>
            </h2>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">
              Base unit: <span className="font-bold text-gray-700">{unitConfig.base_unit}</span> | Display unit: <span className="font-bold text-gray-700">{unitConfig.display_unit}</span> (1 {unitConfig.display_unit} = {unitConfig.conversion_factor} {unitConfig.base_unit})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto no-scrollbar flex-1">
          {/* Top Summary Row: 4 bordered cards with white backgrounds and distinct text colors */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Current Stock (Blue Text) */}
            <div className="bg-white border border-gray-200 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">Current Stock</span>
              <div className="text-blue-600 mt-1.5">
                {renderMetric(currentStockBase)}
              </div>
              <span className="text-[10px] font-medium text-gray-400 mt-1 block">Live available inventory</span>
            </div>

            {/* Card 2: Total Purchased (Dark Neutral Text) */}
            <div className="bg-white border border-gray-200 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">Total Purchased</span>
              <div className="text-gray-800 mt-1.5">
                {renderMetric(totalPurchasedBase)}
              </div>
              <span className="text-[10px] font-medium text-gray-400 mt-1 block">Historical inbound intake</span>
            </div>

            {/* Card 3: Consumed in Orders (Emerald Green Text) */}
            <div className="bg-white border border-gray-200 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">Consumed in Orders</span>
              <div className="text-emerald-600 mt-1.5">
                {renderMetric(totalConsumedBase)}
              </div>
              <span className="text-[10px] font-medium text-gray-400 mt-1 block">Recipe deductions from sales</span>
            </div>

            {/* Card 4: Total Wasted (Rose Red Text) */}
            <div className="bg-white border border-gray-200 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">Total Wasted</span>
              <div className="text-rose-600 mt-1.5">
                {renderMetric(totalWastedBase)}
              </div>
              <span className="text-[10px] font-medium text-gray-400 mt-1 block">Logged kitchen spoilage / loss</span>
            </div>
          </div>

          {/* Usage Breakdown: Donut Chart Section */}
          <div className="bg-white border border-gray-200 p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Usage Breakdown</h3>
              <p className="text-xs font-medium text-gray-500">
                Ratio between customer order consumption and reported kitchen waste.
              </p>
              <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-gray-700">Consumed: <strong className="text-emerald-600 font-black">{consumedPct}%</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold text-gray-700">Wasted: <strong className="text-rose-600 font-black">{wastedPct}%</strong></span>
                </div>
              </div>
            </div>

            {/* SVG Lightweight Donut Chart (Zero external dependencies) */}
            <div className="relative flex items-center justify-center shrink-0 w-36 h-36">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <path
                  className="text-gray-150 stroke-current"
                  strokeWidth="4"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Consumed Segment (Green) */}
                <path
                  className="text-emerald-500 stroke-current transition-all duration-700 ease-out"
                  strokeDasharray={`${consumedPct}, 100`}
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Wasted Segment (Red) */}
                {wastedPct > 0 && (
                  <path
                    className="text-rose-500 stroke-current transition-all duration-700 ease-out"
                    strokeDasharray={`${wastedPct}, 100`}
                    strokeDashoffset={`-${consumedPct}`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-gray-800">{consumedPct}%</span>
                <span className="text-[9px] font-bold uppercase text-gray-400">Consumed</span>
              </div>
            </div>
          </div>

          {/* Detailed Logs Section */}
          <div className="space-y-3">
            {/* Tab Selectors */}
            <div className="flex border-b border-gray-200 gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('consumption')}
                className={`pb-2.5 text-xs font-black transition-all cursor-pointer flex items-center gap-2 border-b-2 ${activeTab === 'consumption'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
              >
                <History className="w-4 h-4" />
                Consumption History (Orders)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {consumptionRecords.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('wastage')}
                className={`pb-2.5 text-xs font-black transition-all cursor-pointer flex items-center gap-2 border-b-2 ${activeTab === 'wastage'
                    ? 'border-rose-600 text-rose-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
              >
                <Trash2 className="w-4 h-4" />
                Wastage Log
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {wastageRecords.length}
                </span>
              </button>
            </div>

            {/* Tab 1: Consumption Logs */}
            {activeTab === 'consumption' && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-extrabold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Date &amp; Time</th>
                        <th className="py-2.5 px-3">Order ID</th>
                        <th className="py-2.5 px-3">Menu Item Sold</th>
                        <th className="py-2.5 px-3 text-right">Quantity Deducted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {consumptionRecords.map((r) => {
                        const dateFormatted = r.date ? new Date(r.date).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A';
                        return (
                          <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-2 px-3 whitespace-nowrap text-gray-500 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {dateFormatted}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-gray-900">
                              #{r.orderId}
                            </td>
                            <td className="py-2 px-3 flex items-center gap-1.5 font-bold text-gray-800">
                              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                              {r.menuItem}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-emerald-600 whitespace-nowrap">
                              -{formatDualUnitStock(r.quantityDeductedBase, ingredient)}
                            </td>
                          </tr>
                        );
                      })}
                      {consumptionRecords.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-400 font-bold">
                            <Package className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                            No order consumption logged for this ingredient yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 2: Wastage Logs */}
            {activeTab === 'wastage' && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-extrabold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Date &amp; Time</th>
                        <th className="py-2.5 px-3">Reason / Staff</th>
                        <th className="py-2.5 px-3 text-right">Quantity Deducted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {wastageRecords.map((w) => {
                        const dateFormatted = w.date ? new Date(w.date).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A';
                        return (
                          <tr key={w.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-2 px-3 whitespace-nowrap text-gray-500 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {dateFormatted}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-gray-900 block">{w.reason}</span>
                              <span className="text-[10px] text-gray-400 font-medium">Reported by: {w.reportedBy}</span>
                            </td>
                            <td className="py-2 px-3 text-right font-black text-rose-600 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                                {formatDualUnitStock(w.wastedQuantityBase, ingredient)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {wastageRecords.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-gray-400 font-bold">
                            <Trash2 className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                            No wastage entries logged for this ingredient.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50/50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white font-bold text-xs rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}