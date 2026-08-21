import { useState } from 'react';
import { Search, Trash2, Eye, X, Printer } from 'lucide-react';
import { printReceipt } from '../../utils/printReceipt';

export default function OrderManagement({ orders, updateOrderStatus, deleteOrder, branches }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filtered = (orders || []).filter(o => {
    if (statusFilter !== 'All' && o.status !== statusFilter) return false;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchId = o.order_id.toLowerCase().includes(term);
      const matchName = o.customer_name.toLowerCase().includes(term);
      const matchPhone = o.customer_phone.includes(term);
      return matchId || matchName || matchPhone;
    }
    return true;
  });

  return (
    <div className="bg-white rounded-3xl comic-border comic-shadow-sm p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-xl">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-gray-50 border border-gray-250 px-3.5 py-2.5 rounded-2xl">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order ID, name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs font-semibold w-full focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-250 px-3.5 py-2.5 rounded-2xl text-xs font-black focus:outline-none pr-8 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Preparing">Preparing</option>
            <option value="Ready/Out for Delivery">Ready/Out for Delivery</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
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
                const branchObj = branches.find(b => b.id === o.branch_id);
                return (
                  <tr key={o.order_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 pl-2 font-black text-primary">{o.order_id}</td>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span>{o.customer_name}</span>
                        <span className="text-[10px] text-gray-400 font-semibold">{o.customer_phone}</span>
                      </div>
                    </td>
                    <td className="py-4">{branchObj?.name || o.branch_id || 'N/A'}</td>
                    <td className="py-4">Rs. {o.total_amount}</td>
                    <td className="py-4 text-green-600 font-black">
                      Rs. {o.total_amount - (o.items || []).reduce((sum, it) => sum + (it.unitCost || 0) * it.quantity, 0)}
                    </td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase inline-block ${
                        o.status === 'Completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                        o.status === 'Cancelled' ? 'bg-red-50 text-red-600 border border-red-200' :
                        o.status === 'Preparing' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                        o.status === 'Ready/Out for Delivery' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-red-50 text-primary border border-primary/20 animate-pulse-soft'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-4 text-gray-400 font-semibold">
                      {new Date(o.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-4 text-right pr-2 space-x-2.5">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="p-2 hover:bg-secondary/15 rounded-xl border border-transparent hover:border-secondary/20 text-secondary transition-all cursor-pointer inline-flex items-center"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => printReceipt(o)}
                        className="p-2 hover:bg-gray-800/10 rounded-xl border border-transparent hover:border-gray-800/20 text-gray-800 transition-all cursor-pointer inline-flex items-center"
                        title="Print Receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete order ${o.order_id}?`)) {
                            deleteOrder(o.order_id);
                          }
                        }}
                        className="p-2 hover:bg-primary/10 rounded-xl border border-transparent hover:border-primary/10 text-primary transition-all cursor-pointer inline-flex items-center"
                        title="Delete Order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-12 text-gray-400 uppercase font-black">
                  No orders matched search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl comic-border comic-shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
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
