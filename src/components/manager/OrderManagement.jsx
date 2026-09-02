import { useState, useMemo } from 'react';
import { Search, Trash2, Eye, X, Printer, Calendar, Filter, RotateCcw, MapPin, Archive, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { printReceipt } from '../../utils/printReceipt';

export default function OrderManagement({ orders, updateOrderStatus, deleteOrder, archiveAndPurgeOrders, branches = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [timelinePreset, setTimelinePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Archive Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archivePeriod, setArchivePeriod] = useState('30days'); // '30days' | '60days' | '90days' | 'month' | 'custom'
  const [archiveMonth, setArchiveMonth] = useState('08'); // August
  const [archiveYear, setArchiveYear] = useState('2026');
  const [archiveCustomStart, setArchiveCustomStart] = useState('');
  const [archiveCustomEnd, setArchiveCustomEnd] = useState('');
  const [archiveBranch, setArchiveBranch] = useState('All');
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveSuccessMessage, setArchiveSuccessMessage] = useState(null);

  const handlePresetChange = (preset) => {
    setTimelinePreset(preset);
    const today = new Date();
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (preset) {
      case 'today': {
        const d = formatDate(today);
        setStartDate(d);
        setEndDate(d);
        break;
      }
      case 'yesterday': {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        const d = formatDate(y);
        setStartDate(d);
        setEndDate(d);
        break;
      }
      case 'last7': {
        const past = new Date(today);
        past.setDate(past.getDate() - 6);
        setStartDate(formatDate(past));
        setEndDate(formatDate(today));
        break;
      }
      case 'last30': {
        const past = new Date(today);
        past.setDate(past.getDate() - 29);
        setStartDate(formatDate(past));
        setEndDate(formatDate(today));
        break;
      }
      case 'thisMonth': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(formatDate(start));
        setEndDate(formatDate(today));
        break;
      }
      case 'all': {
        setStartDate('');
        setEndDate('');
        break;
      }
      case 'custom':
      default:
        break;
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setBranchFilter('All');
    setTimelinePreset('all');
    setStartDate('');
    setEndDate('');
  };

  const filtered = useMemo(() => {
    return (orders || []).filter(o => {
      // 1. Status Filter
      if (statusFilter !== 'All' && (o.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
      
      // 2. Branch Filter
      if (branchFilter !== 'All' && o.branch_id !== branchFilter) return false;

      // 3. Timeline / Date Range Filter
      if (startDate || endDate) {
        const orderDate = o.timestamp ? o.timestamp.split('T')[0] : '';
        if (startDate && orderDate < startDate) return false;
        if (endDate && orderDate > endDate) return false;
      }

      // 4. Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchId = (o.order_id || '').toLowerCase().includes(term);
        const matchName = (o.customer_name || '').toLowerCase().includes(term);
        const matchPhone = (o.customer_phone || '').includes(term);
        return matchId || matchName || matchPhone;
      }

      return true;
    });
  }, [orders, statusFilter, branchFilter, startDate, endDate, searchTerm]);

  const totalFilteredRevenue = useMemo(() => {
    return filtered.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [filtered]);

  const isAnyFilterActive = searchTerm.trim() || statusFilter !== 'All' || branchFilter !== 'All' || startDate || endDate || timelinePreset !== 'all';

  // --- ARCHIVE TARGET CALCULATION ---
  const { archiveStartDate, archiveEndDate } = useMemo(() => {
    const today = new Date();
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (archivePeriod === '30days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 30);
      return { archiveStartDate: '2020-01-01', archiveEndDate: formatDate(past) };
    } else if (archivePeriod === '60days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 60);
      return { archiveStartDate: '2020-01-01', archiveEndDate: formatDate(past) };
    } else if (archivePeriod === '90days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 90);
      return { archiveStartDate: '2020-01-01', archiveEndDate: formatDate(past) };
    } else if (archivePeriod === 'month') {
      const start = `${archiveYear}-${archiveMonth}-01`;
      const lastDay = new Date(parseInt(archiveYear), parseInt(archiveMonth), 0).getDate();
      const end = `${archiveYear}-${archiveMonth}-${String(lastDay).padStart(2, '0')}`;
      return { archiveStartDate: start, archiveEndDate: end };
    } else {
      return { archiveStartDate: archiveCustomStart, archiveEndDate: archiveCustomEnd };
    }
  }, [archivePeriod, archiveMonth, archiveYear, archiveCustomStart, archiveCustomEnd]);

  const ordersToArchive = useMemo(() => {
    if (!archiveStartDate || !archiveEndDate) return [];
    return (orders || []).filter(o => {
      if (archiveBranch !== 'All' && o.branch_id !== archiveBranch) return false;
      const orderDate = o.timestamp ? o.timestamp.split('T')[0] : '';
      return orderDate >= archiveStartDate && orderDate <= archiveEndDate;
    });
  }, [orders, archiveStartDate, archiveEndDate, archiveBranch]);

  const archiveGrossRevenue = useMemo(() => {
    return ordersToArchive.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [ordersToArchive]);

  const handleExecuteArchive = async () => {
    if (ordersToArchive.length === 0) {
      alert("No matching orders found in the selected period to archive.");
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to archive ${ordersToArchive.length} orders (Total: Rs. ${archiveGrossRevenue.toFixed(2)})?\n\nThis will permanently save their full revenue & profit analytics into the historical rollup ledger and delete the raw order rows from database storage.`
    );
    if (!confirmed) return;

    setIsArchiving(true);
    try {
      if (archiveAndPurgeOrders) {
        const res = await archiveAndPurgeOrders({
          startDate: archiveStartDate,
          endDate: archiveEndDate,
          branchId: archiveBranch,
          ordersToArchive
        });
        setArchiveSuccessMessage(`Successfully archived ${res.count} orders. Analytics preserved and database storage freed.`);
        setTimeout(() => {
          setArchiveSuccessMessage(null);
          setIsArchiveModalOpen(false);
        }, 2500);
      }
    } catch (err) {
      console.error("Archival failed:", err);
      alert("Archival failed: " + (err.message || err));
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl comic-border comic-shadow-sm space-y-4 sm:space-y-6">
      {/* Title & Quick Summary Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3 sm:pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-accent flex items-center gap-2">
            📦 Orders Ledger ({orders?.length || 0})
          </h2>
          <p className="text-[10px] sm:text-xs text-gray-400 font-bold">
            Live order tracking, historical filtering & archive data management
          </p>
        </div>

        {/* Quick Timeline Chips */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl sm:rounded-2xl overflow-x-auto no-scrollbar w-full sm:w-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'last7', label: '7 Days' },
            { id: 'last30', label: '30 Days' },
            { id: 'thisMonth', label: 'Month' },
            { id: 'all', label: 'All Time' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p.id)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer shrink-0 ${
                timelinePreset === p.id
                  ? 'bg-secondary text-accent comic-border-sm shadow-xs'
                  : 'text-gray-500 hover:text-accent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Filter & Search Control Panel */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order ID, name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs font-semibold w-full focus:outline-none"
            />
          </div>

          {/* Quick Selectors & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Timeline Preset Dropdown */}
            <div className="flex items-center gap-1.5 bg-yellow-50/70 border border-yellow-300 px-3 py-2 rounded-2xl">
              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
              <select
                value={timelinePreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="bg-transparent text-xs font-black text-accent focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">📅 All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="custom">Custom Range...</option>
              </select>
            </div>

            {/* Branch Selector */}
            {branches && branches.length > 0 && (
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-250 px-3 py-2 rounded-2xl">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="bg-transparent text-xs font-black text-accent focus:outline-none cursor-pointer pr-1"
                >
                  <option value="All">All Branches</option>
                  {branches.map(br => (
                    <option key={br.id} value={br.id}>{br.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-250 px-3.5 py-2 rounded-2xl text-xs font-black focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Preparing">Preparing</option>
              <option value="Ready/Out for Delivery">Ready/Out for Delivery</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Clear Filters Button */}
            {isAnyFilterActive && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-primary border border-primary/20 px-3 py-2 rounded-2xl text-xs font-black transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}

            {/* Archive & Storage Cleanup Button */}
            <button
              onClick={() => setIsArchiveModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-sm ml-auto"
              title="Archive and purge old orders to save database space"
            >
              <Archive className="w-3.5 h-3.5 text-blue-600" />
              Archive & Cleanup
            </button>
          </div>
        </div>

        {/* Custom Date Range Selector (Visible when timeline is custom or custom dates are selected) */}
        {(timelinePreset === 'custom' || startDate || endDate) && (
          <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200 animate-fade-in text-xs font-bold text-accent">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3 text-secondary" /> Date Range:
            </span>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-gray-500 font-semibold">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setTimelinePreset('custom');
                }}
                className="bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-secondary cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-gray-500 font-semibold">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setTimelinePreset('custom');
                }}
                className="bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-secondary cursor-pointer"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setTimelinePreset('all'); }}
                className="text-[10px] text-gray-400 hover:text-primary underline cursor-pointer ml-auto"
              >
                Clear Timeline
              </button>
            )}
          </div>
        )}

        {/* Active Stats Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-gray-500 border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <span>Showing <strong className="text-accent">{filtered.length}</strong> of {orders?.length || 0} orders</span>
            {(startDate || endDate) && (
              <span className="bg-yellow-100 text-yellow-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                📅 {startDate || 'Start'} to {endDate || 'Now'}
              </span>
            )}
          </div>
          <div>
            <span>Filtered Volume: <strong className="text-primary font-black">Rs. {totalFilteredRevenue.toFixed(2)}</strong></span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-black uppercase text-gray-400">
              <th className="pb-3.5 pl-2">Order ID</th>
              <th className="pb-3.5">Customer Details</th>
              <th className="pb-3.5">Branch</th>
              <th className="pb-3.5">Total Amount</th>
              <th className="pb-3.5">Profit</th>
              <th className="pb-3.5">Status</th>
              <th className="pb-3.5">Placed On</th>
              <th className="pb-3.5 text-right pr-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-bold text-accent">
            {filtered.length > 0 ? (
              filtered.map(o => {
                const branchObj = (branches || []).find(b => b.id === o.branch_id);
                const statusLower = (o.status || '').toLowerCase();
                const statusDisplay = o.status || 'Pending';
                return (
                  <tr key={o.order_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 pl-2 font-black text-primary">{o.order_id}</td>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span>{o.customer_name}</span>
                        <span className="text-[10px] text-gray-400 font-semibold">{o.customer_phone}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-[11px] font-bold">
                        {branchObj?.name || o.branch_id || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4">Rs. {o.total_amount}</td>
                    <td className="py-4 text-green-600 font-black">
                      Rs. {o.total_amount - (o.items || []).reduce((sum, it) => sum + (it.unitCost || 0) * it.quantity, 0)}
                    </td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase inline-block ${
                        statusLower === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                        statusLower === 'cancelled' ? 'bg-red-50 text-red-600 border border-red-200' :
                        statusLower === 'preparing' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                        statusLower.includes('ready') || statusLower.includes('delivery') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-red-50 text-primary border border-primary/20 animate-pulse-soft'
                      }`}>
                        {statusDisplay}
                      </span>
                    </td>
                    <td className="py-4 text-gray-400 font-semibold text-[11px]">
                      {o.timestamp ? new Date(o.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                    </td>
                    <td className="py-4 text-right pr-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => printReceipt(o, branchObj?.name)}
                          className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors cursor-pointer"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete order ${o.order_id}?`)) {
                              deleteOrder(o.order_id);
                            }
                          }}
                          className="p-2 bg-red-50 hover:bg-red-100 text-primary rounded-xl transition-colors cursor-pointer"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-400 font-bold">
                  No orders found matching the filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ARCHIVE & STORAGE CLEANUP MODAL */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl comic-border comic-shadow max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b-2 border-gray-150 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-accent">Archive & Purge Old Orders</h3>
                  <p className="text-[11px] font-bold text-gray-400">Free database storage while keeping analytics permanent</p>
                </div>
              </div>
              <button
                onClick={() => !isArchiving && setIsArchiveModalOpen(false)}
                disabled={isArchiving}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs font-bold text-accent">
              {archiveSuccessMessage ? (
                <div className="p-6 bg-green-50 border-2 border-green-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-green-600 animate-bounce" />
                  <h4 className="font-black text-sm text-green-900">Archival Completed!</h4>
                  <p className="text-xs text-green-700 font-semibold">{archiveSuccessMessage}</p>
                </div>
              ) : (
                <>
                  {/* Explanation Banner */}
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-900 font-semibold leading-relaxed">
                      This process computes an instant, permanent summary snapshot (revenue, profit, sales volume, item breakdown) in the <strong>Analytics Rollup Ledger</strong> before deleting raw database order rows.
                    </p>
                  </div>

                  {/* Period Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400">Choose Archival Period</label>
                    <select
                      value={archivePeriod}
                      onChange={(e) => setArchivePeriod(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-accent/20 px-3.5 py-2.5 rounded-xl text-xs font-black focus:outline-none"
                    >
                      <option value="30days">Older than 30 Days</option>
                      <option value="60days">Older than 60 Days</option>
                      <option value="90days">Older than 90 Days</option>
                      <option value="month">Specific Month (e.g. August 2026)</option>
                      <option value="custom">Custom Date Range</option>
                    </select>
                  </div>

                  {/* Month & Year Selectors */}
                  {archivePeriod === 'month' && (
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Month</label>
                        <select
                          value={archiveMonth}
                          onChange={(e) => setArchiveMonth(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs font-bold focus:outline-none"
                        >
                          <option value="01">January</option>
                          <option value="02">February</option>
                          <option value="03">March</option>
                          <option value="04">April</option>
                          <option value="05">May</option>
                          <option value="06">June</option>
                          <option value="07">July</option>
                          <option value="08">August</option>
                          <option value="09">September</option>
                          <option value="10">October</option>
                          <option value="11">November</option>
                          <option value="12">December</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Year</label>
                        <select
                          value={archiveYear}
                          onChange={(e) => setArchiveYear(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs font-bold focus:outline-none"
                        >
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                          <option value="2027">2027</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Custom Range Selectors */}
                  {archivePeriod === 'custom' && (
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">From Date</label>
                        <input
                          type="date"
                          value={archiveCustomStart}
                          onChange={(e) => setArchiveCustomStart(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">To Date</label>
                        <input
                          type="date"
                          value={archiveCustomEnd}
                          onChange={(e) => setArchiveCustomEnd(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs font-bold focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Branch Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400">Target Branch</label>
                    <select
                      value={archiveBranch}
                      onChange={(e) => setArchiveBranch(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-accent/20 px-3.5 py-2.5 rounded-xl text-xs font-black focus:outline-none"
                    >
                      <option value="All">All Branches</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Live Impact Preview */}
                  <div className="bg-yellow-50/60 border border-yellow-300 p-4 rounded-2xl space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-yellow-800 tracking-wider">Archival Preview</h4>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">Orders to be purged:</span>
                      <span className="font-black text-accent text-sm">{ordersToArchive.length} orders</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">Total Historical Revenue:</span>
                      <span className="font-black text-primary text-sm">Rs. {archiveGrossRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">Date Range:</span>
                      <span className="font-bold text-gray-700">{archiveStartDate || 'Start'} to {archiveEndDate || 'Now'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {!archiveSuccessMessage && (
              <div className="p-5 border-t border-gray-150 bg-gray-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsArchiveModalOpen(false)}
                  disabled={isArchiving}
                  className="px-4 py-2.5 rounded-xl font-black text-xs text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteArchive}
                  disabled={isArchiving || ordersToArchive.length === 0}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-black text-xs comic-shadow-sm comic-hover transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isArchiving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Archiving & Purging...
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      Archive & Purge ({ordersToArchive.length})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl comic-border comic-shadow max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b-2 border-gray-150 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-primary font-black uppercase tracking-wider">Transaction Record</span>
                <h3 className="text-lg font-black text-accent mt-0.5">{selectedOrder.order_id}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center border border-accent/15 cursor-pointer text-gray-500 transition-colors"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-accent">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2 font-semibold">
                <h4 className="font-black text-gray-400 uppercase text-[10px] tracking-wider mb-1">Customer Summary</h4>
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span className="text-accent">{selectedOrder.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span className="text-accent">{selectedOrder.customer_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="text-accent">{selectedOrder.order_type}</span>
                </div>
                {selectedOrder.customer_address && (
                  <div className="flex flex-col text-left mt-1.5 pt-1.5 border-t border-gray-200/50">
                    <span className="text-gray-400">Address:</span>
                    <span className="font-bold text-gray-700 leading-tight mt-0.5">{selectedOrder.customer_address}</span>
                  </div>
                )}
                {selectedOrder.table_number && selectedOrder.order_type === 'Dine-In' && (
                  <div className="flex flex-col text-left mt-1.5 pt-1.5 border-t border-gray-200/50">
                    <span className="text-gray-400">Table Number:</span>
                    <span className="font-bold text-gray-700 leading-tight mt-0.5">{selectedOrder.table_number}</span>
                  </div>
                )}
                {selectedOrder.special_instructions && (
                  <div className="flex flex-col text-left mt-1.5 pt-1.5 border-t border-gray-200/50">
                    <span className="text-gray-400 text-[10px]">Instructions:</span>
                    <span className="font-bold text-gray-600 leading-tight mt-0.5 italic">"{selectedOrder.special_instructions}"</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 font-semibold">
                <h4 className="font-black text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100 pb-1.5">
                  Ordered Items ({selectedOrder.items.length})
                </h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-start border-b border-gray-50 pb-2">
                      <div>
                        <span className="font-black">{it.quantity}x {it.name}{it.size ? ` (${it.size.name})` : ''}</span>
                        {it.addons && it.addons.length > 0 && (
                          <div className="text-[10px] text-primary mt-0.5">
                            + {it.addons.map(a => `${a.name} (Rs. ${a.price})`).join(', ')}
                          </div>
                        )}
                        {it.notes && (
                          <div className="text-[10px] text-gray-400 font-semibold italic mt-0.5">
                            "{it.notes}"
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-accent">Rs. {it.totalPricePerUnit * it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-gray-400 uppercase text-[10px] tracking-wider">Override Order Status</h4>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => {
                    updateOrderStatus(selectedOrder.order_id, e.target.value);
                    setSelectedOrder(prev => ({ ...prev, status: e.target.value }));
                  }}
                  className="w-full bg-gray-50 border-2 border-accent p-3 rounded-2xl font-black text-xs focus:outline-none pr-8 cursor-pointer"
                >
                  <option value="Pending">Pending</option>
                  <option value="Preparing">Preparing</option>
                  <option value="Ready/Out for Delivery">Ready/Out for Delivery</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-150 font-bold text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Total Bill Paid:</span>
                <span className="text-lg font-black text-primary">Rs. {selectedOrder.total_amount}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-500">Order Profit:</span>
                <span className="text-md font-black text-green-600">
                  Rs. {selectedOrder.total_amount - (selectedOrder.items || []).reduce((sum, it) => sum + (it.unitCost || 0) * it.quantity, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
