import { useState } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, BarChart3, Clock, MapPin, Ticket } from 'lucide-react';
import { getOrderDiscount } from '../../utils/voucherUtils';

export default function DashboardAnalytics({
  orders = [],
  archivedAnalytics = [],
  branches = [],
  selectedBranchId,
  setSelectedBranchId,
  products = []
}) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Calculate dynamic branch context ID (guarantees All branches by default unless specific branch is selected)
  const activeBranchId = selectedBranchId || 'All';

  // Filter live orders by date range and selected branch context
  const filteredOrders = orders.filter(order => {
    // 1. Branch filter
    if (activeBranchId && activeBranchId !== 'All' && order.branch_id && order.branch_id !== activeBranchId) return false;
    
    // 2. Date filters
    const orderDate = order.timestamp ? order.timestamp.split('T')[0] : '';
    if (startDate && orderDate && orderDate < startDate) return false;
    if (endDate && orderDate && orderDate > endDate) return false;
    
    return true;
  });

  // Filter archived summaries overlapping selected range & branch
  const filteredArchives = (archivedAnalytics || []).filter(arch => {
    if (activeBranchId && activeBranchId !== 'All' && arch.branch_id !== 'All' && arch.branch_id !== activeBranchId) return false;
    if (startDate && arch.end_date < startDate) return false;
    if (endDate && arch.start_date > endDate) return false;
    return true;
  });

  const nonCancelledOrders = filteredOrders.filter(o => (o.status || '').toLowerCase() !== 'cancelled');

  let totalRevenue = 0;
  let totalCost = 0;
  let totalDiscounts = 0;
  let totalDeliveryFees = 0;
  let dineInCount = 0;
  let deliveryCount = 0;
  let pickupCount = 0;
  const itemCounts = {};

  // Helper to resolve an order item into constituent products (unpacking deals)
  const resolveItemConstituents = (it) => {
    const qty = Number(it.quantity) || 1;
    const result = [];

    const unpack = (itemObj, multiplier, depth = 0) => {
      if (depth > 5) return; // Prevent any circular references

      // 1. Check if the item explicitly has deal_items attached
      if (itemObj.deal_items && Array.isArray(itemObj.deal_items) && itemObj.deal_items.length > 0) {
        itemObj.deal_items.forEach(dItem => {
          const targetProd = products.find(p => String(p.id) === String(dItem.product_id)) ||
            products.find(p => p.name && dItem.name && p.name.trim().toLowerCase() === dItem.name.trim().toLowerCase());
          const dQty = (Number(dItem.quantity) || 1) * multiplier;
          if (targetProd && (targetProd.is_deal || (targetProd.deal_items && targetProd.deal_items.length > 0))) {
            unpack(targetProd, dQty, depth + 1);
          } else {
            const name = targetProd?.name || dItem.name || (dItem.product_id ? `Item #${dItem.product_id}` : 'Unknown Item');
            result.push({ name, count: dQty });
          }
        });
        return;
      }

      // 2. Check if the item matches a deal product in products list
      const matchedProduct = products.find(p => String(p.id) === String(itemObj.product_id || itemObj.id)) ||
        products.find(p => p.name && itemObj.name && p.name.trim().toLowerCase() === itemObj.name.trim().toLowerCase());

      if (matchedProduct && (matchedProduct.is_deal || (matchedProduct.deal_items && matchedProduct.deal_items.length > 0))) {
        if (Array.isArray(matchedProduct.deal_items) && matchedProduct.deal_items.length > 0) {
          matchedProduct.deal_items.forEach(dItem => {
            const targetProd = products.find(p => String(p.id) === String(dItem.product_id)) ||
              products.find(p => p.name && dItem.name && p.name.trim().toLowerCase() === dItem.name.trim().toLowerCase());
            const dQty = (Number(dItem.quantity) || 1) * multiplier;
            if (targetProd && (targetProd.is_deal || (targetProd.deal_items && targetProd.deal_items.length > 0))) {
              unpack(targetProd, dQty, depth + 1);
            } else {
              const name = targetProd?.name || dItem.name || (dItem.product_id ? `Item #${dItem.product_id}` : 'Unknown Item');
              result.push({ name, count: dQty });
            }
          });
          return;
        }
      }

      // 3. Regular individual item
      const name = itemObj.name || matchedProduct?.name || 'Unknown Item';
      result.push({ name, count: multiplier });
    };

    unpack(it, qty);
    return result;
  };

  // 1. Process active live orders (all non-cancelled orders, including newly placed pending orders)
  nonCancelledOrders.forEach(o => {
    const statusLower = (o.status || '').toLowerCase();
    if (statusLower !== 'cancelled') {
      const discount = getOrderDiscount(o);
      totalRevenue += (Number(o.total_amount) || 0);
      totalDiscounts += discount;
      totalDeliveryFees += (Number(o.delivery_fee) || 0);

      const typeLower = (o.order_type || '').toLowerCase();
      if (typeLower === 'dine-in') dineInCount++;
      else if (typeLower === 'delivery') deliveryCount++;
      else if (typeLower === 'pickup' || typeLower === 'takeaway') pickupCount++;

      if (o.items) {
        o.items.forEach(it => {
          totalCost += (Number(it.unitCost) || 0) * (Number(it.quantity) || 1);
          const constituents = resolveItemConstituents(it);
          constituents.forEach(c => {
            itemCounts[c.name] = (itemCounts[c.name] || 0) + c.count;
          });
        });
      }
    }
  });

  // 2. Merge pre-aggregated historical rollups
  let archivedCompletedCount = 0;
  let archivedCancelledCount = 0;
  filteredArchives.forEach(arch => {
    totalRevenue += (Number(arch.gross_revenue) || 0);
    totalCost += (Number(arch.total_cost) || 0);
    totalDiscounts += (Number(arch.total_discounts) || 0);
    totalDeliveryFees += (Number(arch.total_delivery_fees) || 0);
    archivedCompletedCount += (Number(arch.completed_orders) || 0);
    archivedCancelledCount += (Number(arch.cancelled_orders) || 0);

    if (arch.order_types) {
      dineInCount += (Number(arch.order_types['Dine-In']) || 0);
      deliveryCount += (Number(arch.order_types['Delivery']) || 0);
      pickupCount += (Number(arch.order_types['Takeaway']) || 0);
    }

    if (arch.item_breakdown && Array.isArray(arch.item_breakdown)) {
      arch.item_breakdown.forEach(it => {
        const constituents = resolveItemConstituents(it);
        constituents.forEach(c => {
          itemCounts[c.name] = (itemCounts[c.name] || 0) + c.count;
        });
      });
    }
  });

  const totalProfit = totalRevenue - totalCost;

  // Compute all ordered items sorted by count
  const allOrderedItems = Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const topSellingItem = allOrderedItems.length > 0 ? allOrderedItems[0].name : 'N/A';

  const totalOrders = nonCancelledOrders.length + archivedCompletedCount;
  const pendingOrders = nonCancelledOrders.filter(o => (o.status || '').toLowerCase() === 'pending').length;
  const completedOrders = nonCancelledOrders.filter(o => (o.status || '').toLowerCase() === 'completed').length + archivedCompletedCount;
  
  const liveCancelledCount = filteredOrders.length - nonCancelledOrders.length;
  const cancelledOrdersCount = liveCancelledCount + archivedCancelledCount;
  const totalAllAttempts = (filteredOrders.length + archivedCompletedCount + archivedCancelledCount);
  const cancellationRate = totalAllAttempts > 0 ? Math.round((cancelledOrdersCount / totalAllAttempts) * 100) : 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Header Banner
      doc.setFillColor(200, 16, 46); // #C8102E Premium crimson
      doc.rect(0, 0, 210, 35, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("MR. KUKOOO - ANALYTICS SUMMARY", 15, 22);
      
      doc.setTextColor(17, 17, 17);
      doc.setFontSize(10);
      doc.text(`Timeline: ${startDate} to ${endDate}`, 15, 45);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 51);
      doc.text(`Branch ID Scope: ${activeBranchId || 'All Branches'}`, 15, 57);
      
      doc.setLineWidth(0.5);
      doc.line(15, 61, 195, 61);
      
      // Stats Summaries
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("PERFORMANCE METRICS", 15, 71);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      // Column 1
      doc.text(`Total Orders Placed: ${totalOrders}`, 20, 81);
      doc.text(`Completed Orders: ${completedOrders}`, 20, 87);
      doc.text(`Pending Actions: ${pendingOrders}`, 20, 93);
      doc.text(`Cancellation Rate: ${cancellationRate}%`, 20, 99);
      doc.text(`Top Selling Item: ${topSellingItem.substring(0, 20)}`, 20, 105);
      doc.text(`Dine-in: ${dineInCount} | Delivery: ${deliveryCount} | Pickup: ${pickupCount}`, 20, 111);

      // Column 2
      doc.text(`Gross Revenue: Rs. ${totalRevenue}`, 110, 81);
      doc.text(`Total COGS: Rs. ${totalCost}`, 110, 87);
      doc.text(`Net Profit: Rs. ${totalProfit}`, 110, 93);
      doc.text(`Total Discounts: Rs. ${totalDiscounts}`, 110, 99);
      doc.text(`Delivery Fees Collected: Rs. ${totalDeliveryFees}`, 110, 105);
      doc.text(`Average Order Value: Rs. ${avgOrderValue}`, 110, 111);
      
      // Divider
      doc.line(15, 119, 195, 119);
      
      // All Items Breakdown Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("ALL ORDERED ITEMS BREAKDOWN", 15, 129);
      
      doc.setFontSize(9);
      doc.text("Product Name", 15, 137);
      doc.text("Quantity Sold", 150, 137);
      doc.line(15, 140, 195, 140);
      
      let currentY = 147;
      doc.setFont("helvetica", "normal");
      
      allOrderedItems.forEach((item) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 25;
          doc.setFont("helvetica", "bold");
          doc.text("Product Name", 15, currentY);
          doc.text("Quantity Sold", 150, currentY);
          doc.line(15, currentY + 3, 195, currentY + 3);
          currentY += 10;
          doc.setFont("helvetica", "normal");
        }
        doc.text(item.name, 15, currentY);
        doc.text(`${item.count} items`, 150, currentY);
        currentY += 7;
      });
      
      // Divider before Ledger
      doc.line(15, currentY + 3, 195, currentY + 3);
      currentY += 13;

      // Orders Table Headers
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("TRANSACTION LEDGER LOG", 15, currentY);
      currentY += 10;
      
      doc.setFontSize(8);
      doc.text("Order ID", 15, currentY);
      doc.text("Customer", 35, currentY);
      doc.text("Items & Addons", 70, currentY);
      doc.text("Type", 130, currentY);
      doc.text("Amount", 145, currentY);
      doc.text("Profit", 165, currentY);
      doc.text("Status", 185, currentY);
      doc.line(15, currentY + 3, 195, currentY + 3);
      
      let yPos = currentY + 10;
      doc.setFont("helvetica", "normal");
      
      filteredOrders.forEach((o) => {
        const itemNames = o.items.map(it => {
          const addonText = it.addons && it.addons.length > 0 ? ` (+${it.addons.map(a => a.name).join(', ')})` : '';
          return `${it.quantity}x ${it.name}${addonText}`;
        }).join(' | ');

        const oCost = (o.items || []).reduce((sum, it) => sum + (it.unitCost || 0) * it.quantity, 0);
        const oProfit = o.total_amount - oCost;

        if (yPos > 270) {
          doc.addPage();
          yPos = 25;
          // Subpage Headers
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text("Order ID", 15, yPos);
          doc.text("Customer", 35, yPos);
          doc.text("Items & Addons", 70, yPos);
          doc.text("Type", 130, yPos);
          doc.text("Amount", 145, yPos);
          doc.text("Profit", 165, yPos);
          doc.text("Status", 185, yPos);
          doc.line(15, yPos + 3, 195, yPos + 3);
          yPos += 10;
          doc.setFont("helvetica", "normal");
        }
        
        doc.text(o.order_id || 'N/A', 15, yPos);
        doc.text(o.customer_name?.substring(0, 12) || 'N/A', 35, yPos);
        
        const truncatedItems = itemNames.substring(0, 36);
        doc.text(truncatedItems, 70, yPos);
        
        doc.text(o.order_type || 'N/A', 130, yPos);
        doc.text(`Rs. ${o.total_amount || 0}`, 145, yPos);
        doc.text(`Rs. ${oProfit || 0}`, 165, yPos);
        doc.text(o.status || 'N/A', 185, yPos);
        
        const oDiscount = getOrderDiscount(o);
        if (oDiscount > 0) {
          yPos += 4;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(200, 16, 46);
          doc.text(`*Discount: -Rs. ${oDiscount}${o.voucher_code ? ` (Code: ${o.voucher_code})` : ''}`, 70, yPos);
          doc.setTextColor(17, 17, 17);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
        }

        if (o.special_instructions) {
          yPos += 4;
          doc.setFont("helvetica", "italic");
          doc.setFontSize(7);
          doc.text(`*Instructions: ${o.special_instructions.substring(0, 80)}`, 70, yPos);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
        }

        yPos += 7.5;
      });
      // Output as blob and create manual download link to force correct filename
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `MrKukooo_Sales_Report_${startDate}_to_${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top filter row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 border border-gray-250 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl w-full xs:w-auto">
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-accent/50">Timeline:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent font-bold text-[11px] sm:text-xs border-none focus:outline-none"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent font-bold text-[11px] sm:text-xs border-none focus:outline-none"
            />
          </div>

          {branches.length > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-250 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl">
              <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" />
              <select
                value={activeBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent font-black text-[11px] sm:text-xs border-none focus:outline-none pr-3 cursor-pointer"
              >
                <option value="All">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filteredArchives.length > 0 && (
            <span className="bg-blue-100 text-blue-800 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg sm:rounded-xl border border-blue-200 flex items-center gap-1">
              📦 Includes {filteredArchives.length} Archive{filteredArchives.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <button
          onClick={handleExportPDF}
          className="px-4 py-2.5 sm:px-5 sm:py-3 bg-secondary hover:bg-secondary-hover active:scale-95 text-accent font-black text-xs rounded-xl sm:rounded-2xl comic-border-sm transition-colors cursor-pointer text-center"
        >
          📄 Export PDF Report
        </button>
      </div>

      {/* KPI metric cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Metric 1 - Revenue */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider block leading-tight">Total Revenue</span>
            <h3 className="text-base sm:text-xl font-black text-accent whitespace-nowrap">Rs. {totalRevenue}</h3>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-secondary/15 flex items-center justify-center text-secondary border border-secondary/10 shrink-0 ml-2">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Metric Profit */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider block leading-tight">Net Profit</span>
            <h3 className="text-base sm:text-xl font-black text-green-600 whitespace-nowrap">Rs. {totalProfit}</h3>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-green-50 flex items-center justify-center text-green-600 border border-green-100 shrink-0 ml-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Metric Discounts */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider block leading-tight">Total Discounts</span>
            <h3 className="text-base sm:text-xl font-black text-red-600 whitespace-nowrap">Rs. {totalDiscounts}</h3>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-red-50 flex items-center justify-center text-red-600 border border-red-100 shrink-0 ml-2">
            <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Metric 2 - Orders */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider block leading-tight">Order Volume</span>
            <h3 className="text-base sm:text-xl font-black text-accent whitespace-nowrap">{totalOrders}</h3>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shrink-0 ml-2">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Metric 3 - Avg Ticket */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider block leading-tight">Avg Ticket</span>
            <h3 className="text-base sm:text-xl font-black text-accent whitespace-nowrap">Rs. {avgOrderValue}</h3>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0 ml-2">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Metric 4 - Pending */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider block leading-tight">Pending Orders</span>
            <h3 className="text-base sm:text-xl font-black text-accent whitespace-nowrap">{pendingOrders}</h3>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-600 border border-yellow-100 shrink-0 ml-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main reporting splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* All Ordered items list */}
        <div className="bg-white p-6 rounded-3xl comic-border comic-shadow-sm lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-secondary" />
              <h4 className="text-sm font-black text-accent uppercase tracking-wider">Ordered Items</h4>
            </div>
            {allOrderedItems.length > 0 && (
              <span className="text-[10px] font-black bg-secondary/15 text-accent px-2 py-0.5 rounded-lg">
                {allOrderedItems.length} Products
              </span>
            )}
          </div>
          {allOrderedItems.length > 0 ? (
            <div className="space-y-3.5 overflow-y-auto max-h-72 pr-1">
              {allOrderedItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5.5 h-5.5 rounded-lg bg-gray-150 flex items-center justify-center font-black text-xs text-accent/60 shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-black text-accent leading-snug truncate">{item.name}</span>
                  </div>
                  <span className="text-xs bg-secondary/15 text-accent px-2.5 py-1 rounded-xl font-black shrink-0">
                    {item.count} {item.count === 1 ? 'item' : 'items'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-xs font-bold uppercase tracking-wider">
              No sales records found
            </div>
          )}
        </div>

        {/* Date range context ledger summary */}
        <div className="bg-white p-6 rounded-3xl comic-border comic-shadow-sm lg:col-span-2 space-y-4">
          <h4 className="text-sm font-black text-accent uppercase tracking-wider border-b border-gray-100 pb-3">
            Ledger Activity Feed ({filteredOrders.length} transactions)
          </h4>
          <div className="overflow-y-auto max-h-72 pr-1 space-y-3">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(o => (
                <div
                  key={o.order_id}
                  className="flex items-center justify-between border-b border-gray-50 pb-2.5 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-primary">{o.order_id}</span>
                      {getOrderDiscount(o) > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                          -Rs. {getOrderDiscount(o)} {o.voucher_code || o.items?.[0]?._order_voucher_code ? `(${o.voucher_code || o.items?.[0]?._order_voucher_code})` : 'discount'}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-500 mt-0.5">
                      {o.customer_name} • {o.order_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-accent block">Rs. {o.total_amount}</span>
                    <span className="text-[10px] text-green-600 font-black uppercase block">Profit: Rs. {o.total_amount - (o.items || []).reduce((sum, it) => sum + (it.unitCost || 0) * it.quantity, 0)}</span>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">
                      {o.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-400 text-xs font-bold uppercase tracking-wider">
                No orders inside timeframe
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
