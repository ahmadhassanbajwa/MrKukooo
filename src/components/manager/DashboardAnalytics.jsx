import { useState } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, BarChart3, Clock, MapPin } from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function DashboardAnalytics({
  orders = [],
  branches = [],
  selectedBranchId,
  setSelectedBranchId
}) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Calculate dynamic branch context ID (guarantees a fallback if selectedBranchId is empty)
  const activeBranchId = selectedBranchId && branches.some(b => b.id === selectedBranchId)
    ? selectedBranchId
    : (branches[0]?.id || '');

  // Filter orders by date range and selected branch context
  const filteredOrders = orders.filter(order => {
    // 1. Branch filter
    if (activeBranchId && order.branch_id !== activeBranchId) return false;
    
    // 2. Date filters
    const orderDate = order.timestamp.split('T')[0];
    if (startDate && orderDate < startDate) return false;
    if (endDate && orderDate > endDate) return false;
    
    return true;
  });

  const nonCancelledOrders = filteredOrders.filter(o => o.status !== 'Cancelled');
  const cancelledOrdersCount = filteredOrders.length - nonCancelledOrders.length;
  const cancellationRate = filteredOrders.length > 0 ? Math.round((cancelledOrdersCount / filteredOrders.length) * 100) : 0;

  let totalRevenue = 0;
  let totalCost = 0;
  let totalDiscounts = 0;
  let totalDeliveryFees = 0;
  let dineInCount = 0;
  let deliveryCount = 0;
  let pickupCount = 0;

  nonCancelledOrders.forEach(o => {
    if (o.status === 'Completed' || o.status === 'Ready/Out for Delivery' || o.status === 'Preparing') {
      totalRevenue += o.total_amount;
      totalDiscounts += (o.discount_amount || 0);
      totalDeliveryFees += (o.delivery_fee || 0);

      if (o.order_type === 'Dine-In') dineInCount++;
      else if (o.order_type === 'Delivery') deliveryCount++;
      else if (o.order_type === 'Pickup') pickupCount++;

      if (o.items) {
        o.items.forEach(it => {
          totalCost += (it.unitCost || 0) * it.quantity;
        });
      }
    }
  });

  const totalProfit = totalRevenue - totalCost;

  // Compute popular items
  const itemCounts = {};
  nonCancelledOrders.forEach(o => {
    if (o.items) {
      o.items.forEach(it => {
        itemCounts[it.name] = (itemCounts[it.name] || 0) + it.quantity;
      });
    }
  });

  const popularItems = Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topSellingItem = popularItems.length > 0 ? popularItems[0].name : 'N/A';

  const totalOrders = nonCancelledOrders.length;
  const pendingOrders = nonCancelledOrders.filter(o => o.status === 'Pending').length;
  const completedOrders = nonCancelledOrders.filter(o => o.status === 'Completed').length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const handleExportPDF = () => {
    try {
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
      
      // Items Breakdown Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("ITEM SALES BREAKDOWN", 15, 129);
      
      doc.setFontSize(9);
      doc.text("Product Name", 15, 137);
      doc.text("Quantity Sold", 150, 137);
      doc.line(15, 140, 195, 140);
      
      let currentY = 147;
      doc.setFont("helvetica", "normal");
      
      const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
      sortedItems.forEach(([name, count]) => {
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
        doc.text(name, 15, currentY);
        doc.text(count.toString(), 150, currentY);
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
    <div className="space-y-6">
      {/* Top filter row */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl comic-border comic-shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-250 px-3.5 py-2 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-accent/50">Timeline:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent font-bold text-xs border-none focus:outline-none"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent font-bold text-xs border-none focus:outline-none"
            />
          </div>

          {branches.length > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-250 px-3.5 py-2 rounded-2xl">
              <MapPin className="w-4 h-4 text-secondary" />
              <select
                value={activeBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent font-black text-xs border-none focus:outline-none pr-4 cursor-pointer"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={handleExportPDF}
          className="px-5 py-3 bg-secondary hover:bg-secondary-hover text-accent font-black text-xs rounded-2xl comic-border-sm transition-colors cursor-pointer"
        >
          📄 Export PDF Report
        </button>
      </div>

      {/* KPI metric cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Metric 1 */}
        <div className="bg-white p-6 rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Total Revenue</span>
            <h3 className="text-2xl font-black text-accent">Rs. {totalRevenue}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center text-secondary border border-secondary/10 shrink-0 ml-2">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Profit */}
        <div className="bg-white p-6 rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Net Profit</span>
            <h3 className="text-2xl font-black text-accent">Rs. {totalProfit}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 border border-green-100 shrink-0 ml-2">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-6 rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Order Volume</span>
            <h3 className="text-2xl font-black text-accent">{totalOrders}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shrink-0 ml-2">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-6 rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Avg Ticket</span>
            <h3 className="text-2xl font-black text-accent">Rs. {avgOrderValue}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0 ml-2">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-6 rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Pending</span>
            <h3 className="text-2xl font-black text-accent">{pendingOrders}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-600 border border-yellow-100 shrink-0 ml-2">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main reporting splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Popular items list */}
        <div className="bg-white p-6 rounded-3xl comic-border comic-shadow-sm lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <TrendingUp className="w-5 h-5 text-secondary" />
            <h4 className="text-sm font-black text-accent uppercase tracking-wider">Top Ordered Items</h4>
          </div>
          {popularItems.length > 0 ? (
            <div className="space-y-3.5">
              {popularItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-5.5 h-5.5 rounded-lg bg-gray-150 flex items-center justify-center font-black text-xs text-accent/60">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-black text-accent leading-none">{item.name}</span>
                  </div>
                  <span className="text-xs bg-secondary/15 text-accent px-2.5 py-1 rounded-xl font-black">
                    {item.count} items
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
                    <span className="font-black text-primary">{o.order_id}</span>
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
