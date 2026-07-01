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
  const totalRevenue = nonCancelledOrders.reduce(
    (sum, o) =>
      sum +
      (o.status === 'Completed' ||
      o.status === 'Ready/Out for Delivery' ||
      o.status === 'Preparing'
        ? o.total_amount
        : 0),
    0
  );
  
  const totalOrders = nonCancelledOrders.length;
  const pendingOrders = nonCancelledOrders.filter(o => o.status === 'Pending').length;
  const completedOrders = nonCancelledOrders.filter(o => o.status === 'Completed').length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

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
      doc.setFontSize(10);
      doc.text(`Total Orders Placed: ${totalOrders}`, 20, 81);
      doc.text(`Gross Revenue Generated: Rs. ${totalRevenue}`, 20, 87);
      doc.text(`Average Order Value: Rs. ${avgOrderValue}`, 20, 93);
      doc.text(`Completed Orders: ${completedOrders}`, 20, 99);
      doc.text(`Pending Actions: ${pendingOrders}`, 20, 105);
      
      // Divider
      doc.line(15, 113, 195, 113);
      
      // Orders Table Headers
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("TRANSACTION LEDGER LOG", 15, 123);
      
      doc.setFontSize(8.5);
      doc.text("Order ID", 15, 133);
      doc.text("Customer", 35, 133);
      doc.text("Items & Addons", 75, 133);
      doc.text("Type", 145, 133);
      doc.text("Amount", 165, 133);
      doc.text("Status", 185, 133);
      doc.line(15, 136, 195, 136);
      
      let yPos = 143;
      doc.setFont("helvetica", "normal");
      
      filteredOrders.forEach((o) => {
        const itemNames = o.items.map(it => {
          const addonText = it.addons && it.addons.length > 0 ? ` (+${it.addons.map(a => a.name).join(', ')})` : '';
          return `${it.quantity}x ${it.name}${addonText}`;
        }).join(' | ');

        if (yPos > 270) {
          doc.addPage();
          yPos = 25;
          // Subpage Headers
          doc.setFont("helvetica", "bold");
          doc.text("Order ID", 15, yPos);
          doc.text("Customer", 35, yPos);
          doc.text("Items & Addons", 75, yPos);
          doc.text("Type", 145, yPos);
          doc.text("Amount", 165, yPos);
          doc.text("Status", 185, yPos);
          doc.line(15, yPos + 3, 195, yPos + 3);
          yPos += 10;
          doc.setFont("helvetica", "normal");
        }
        
        doc.text(o.order_id || 'N/A', 15, yPos);
        doc.text(o.customer_name?.substring(0, 15) || 'N/A', 35, yPos);
        
        const truncatedItems = itemNames.substring(0, 42);
        doc.text(truncatedItems, 75, yPos);
        
        doc.text(o.order_type || 'N/A', 145, yPos);
        doc.text(`Rs. ${o.total_amount || 0}`, 165, yPos);
        doc.text(o.status || 'N/A', 185, yPos);
        
        if (o.special_instructions) {
          yPos += 4;
          doc.setFont("helvetica", "italic");
          doc.setFontSize(7);
          doc.text(`*Instructions: ${o.special_instructions.substring(0, 80)}`, 75, yPos);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
        }

        yPos += 7.5;
      });
      
      doc.save(`MrKukooo_Sales_Report_${startDate}_to_${endDate}.pdf`);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="bg-white p-6 rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Total Revenue</span>
            <h3 className="text-2xl font-black text-accent">Rs. {totalRevenue}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center text-secondary border border-secondary/10">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-6 rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Order Volume</span>
            <h3 className="text-2xl font-black text-accent">{totalOrders}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-6 rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Avg Ticket Size</span>
            <h3 className="text-2xl font-black text-accent">Rs. {avgOrderValue}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-6 rounded-3xl comic-border comic-shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Pending Kitchen Actions</span>
            <h3 className="text-2xl font-black text-accent">{pendingOrders}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-600 border border-yellow-100">
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
