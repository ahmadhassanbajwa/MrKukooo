import { useState } from 'react';
import { X, ShoppingBag } from 'lucide-react';

import { getWhatsAppLink } from '../../utils/whatsapp';
import { printReceipt, saveReceiptImage } from '../../utils/printReceipt';

export default function ReceiptModal({ order, branches = [], branchName, onClose }) {
  const [isSaving, setIsSaving] = useState(false);

  if (!order) return null;

  const resolvedBranchName = branchName || (branches && branches.find(b => b.id === order.branch_id)?.name) || 'Sargodha Main Branch';

  const handleSaveReceipt = async () => {
    setIsSaving(true);
    try {
      await saveReceiptImage(order, resolvedBranchName);
    } catch (err) {
      console.error("Save Receipt Error:", err);
      alert("Failed to generate receipt image. Try 'Print -> Save as PDF' instead.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-scale-up">
        <div className="p-4 sm:p-5 border-b border-gray-150 flex items-center justify-between bg-emerald-50/70">
          <div>
            <span className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider">Checkout Successful</span>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight mt-0.5">
              Order Confirmed!
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-emerald-100/70 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh] flex-1">
          <div 
            id="kukooo-receipt-content" 
            className="bg-white border border-gray-200 p-4 sm:p-5 rounded-md space-y-3.5 font-sans text-gray-900 shadow-2xs"
          >
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-300">
              <h3 className="text-xl font-bold tracking-tight text-primary">Mr. Kukooo</h3>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest block italic">Lick the spoons!</span>
              <span className="text-[11px] font-semibold text-gray-700 block mt-1 bg-amber-50 py-0.5 px-2.5 rounded-md border border-amber-200/70 inline-block">
                📍 {resolvedBranchName}
              </span>
              <span className="text-xs font-semibold block text-gray-900 mt-2">
                Order ID: <strong className="font-bold">{order.order_id}</strong>
              </span>
              <span className="text-[10px] font-normal text-gray-400 block">
                {new Date(order.timestamp).toLocaleString()}
              </span>
            </div>

            <div className="text-xs font-normal space-y-1 pb-3 border-b border-gray-150">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <span className="font-semibold text-gray-900">{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone:</span>
                <span className="font-semibold text-gray-900">{order.customer_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type:</span>
                <span className="font-semibold text-gray-900">{order.order_type}</span>
              </div>
              {order.order_type === 'Delivery' && (
                <div className="flex flex-col text-left mt-1">
                  <span className="text-gray-500">Address:</span>
                  <span className="font-medium text-gray-800 leading-snug mt-0.5">{order.customer_address}</span>
                </div>
              )}
              {order.order_type === 'Dine-In' && order.table_number && (
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">Table:</span>
                  <span className="font-semibold text-gray-900">{order.table_number}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 py-1 border-b border-gray-150">
              {order.items.map((item, idx) => (
                <div key={idx} className="text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-gray-900 max-w-[70%]">{item.quantity}x {item.name}{item.size ? ` (${item.size.name})` : ''}</span>
                    <span className="font-semibold text-gray-900">Rs. {item.totalPricePerUnit * item.quantity}</span>
                  </div>
                  {item.addons && item.addons.length > 0 && (
                    <div className="text-[10px] text-primary pl-3 font-medium">
                      + {item.addons.map(a => `${a.name} (Rs. ${a.price})`).join(', ')}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-[10px] text-gray-400 pl-3 font-normal italic">
                      "{item.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-xs font-normal space-y-1.5 pt-1 text-gray-500">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-gray-900 font-semibold">Rs. {order.items.reduce((s, i) => s + i.totalPricePerUnit * i.quantity, 0)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount:</span>
                  <span>- Rs. {order.discount_amount}</span>
                </div>
              )}
              {order.order_type === 'Delivery' && (
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span className="text-gray-900 font-semibold">{order.delivery_fee > 0 ? `Rs. ${order.delivery_fee}` : 'Free'}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-dashed border-gray-300">
                <span>Total Paid:</span>
                <span className="text-primary font-bold text-base">Rs. {order.total_amount}</span>
              </div>
            </div>

            <div className="text-center pt-1.5">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                Thank you for your order!
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-gray-150 bg-gray-50 flex gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => printReceipt(order, resolvedBranchName)}
            className="flex-1 bg-white border border-gray-250 hover:bg-gray-100 text-gray-800 font-medium py-2.5 rounded-md shadow-2xs flex items-center justify-center gap-1.5 text-xs transition-all active:translate-y-[0.5px] cursor-pointer"
          >
            🖨️ Print
          </button>
          <button
            onClick={handleSaveReceipt}
            disabled={isSaving}
            className={`flex-1 bg-secondary hover:bg-secondary-hover text-accent font-medium py-2.5 rounded-md shadow-2xs flex items-center justify-center gap-1.5 text-xs transition-all active:translate-y-[0.5px] border border-secondary-hover/30 ${isSaving ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
          >
            💾 {isSaving ? 'Saving...' : 'Save'}
          </button>
          <a
            href={getWhatsAppLink(
              order.customer_phone,
              `Hi Mr. Kukooo! I just placed order #${order.order_id} for Rs. ${order.total_amount}. Please confirm my order!`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-md shadow-2xs flex items-center justify-center gap-1.5 text-xs transition-all active:translate-y-[0.5px] text-center cursor-pointer border border-emerald-700/40"
          >
            <ShoppingBag className="w-4 h-4" /> Send WA
          </a>
        </div>
      </div>
    </div>
  );
}
