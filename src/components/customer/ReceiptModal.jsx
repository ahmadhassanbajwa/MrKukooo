import { useState } from 'react';
import { X, ShoppingBag } from 'lucide-react';

import { getWhatsAppLink } from '../../utils/whatsapp';
import { printReceipt, saveReceiptImage } from '../../utils/printReceipt';

export default function ReceiptModal({ order, onClose }) {
  const [isSaving, setIsSaving] = useState(false);

  if (!order) return null;

  const handleSaveReceipt = async () => {
    setIsSaving(true);
    try {
      await saveReceiptImage(order);
    } catch (err) {
      console.error("Save Receipt Error:", err);
      alert("Failed to generate receipt image. Try 'Print -> Save as PDF' instead.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl comic-border comic-shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-scale-up">
        <div className="p-6 border-b-2 border-dashed border-gray-100 flex items-center justify-between bg-green-50/50">
          <div>
            <span className="text-[10px] text-green-700 font-black uppercase tracking-wider">Checkout Successful</span>
            <h2 className="text-xl font-black text-accent tracking-tight leading-none mt-1">
              Order Confirmed!
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-gray-150 flex items-center justify-center border border-accent/15 cursor-pointer text-gray-500 hover:text-accent transition-colors"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] flex-1">
          <div 
            id="kukooo-receipt-content" 
            className="bg-white border-2 border-accent p-6 rounded-2xl space-y-4 font-sans text-accent"
          >
            <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-accent">
              <h3 className="text-xl font-black uppercase tracking-tight text-primary">Mr. Kukooo</h3>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Lick the spoons!</span>
              <span className="text-[10px] font-bold block text-accent mt-2">
                Order ID: <strong>{order.order_id}</strong>
              </span>
              <span className="text-[9px] font-bold text-gray-400 block">
                {new Date(order.timestamp).toLocaleString()}
              </span>
            </div>

            <div className="text-xs font-bold space-y-1 pb-3 border-b border-gray-100">
              <div className="flex justify-between">
                <span className="text-gray-400">Customer:</span>
                <span>{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Phone:</span>
                <span>{order.customer_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span>{order.order_type}</span>
              </div>
              {order.order_type === 'Delivery' && (
                <div className="flex flex-col text-left mt-1">
                  <span className="text-gray-400">Address:</span>
                  <span className="font-semibold text-gray-700 leading-tight mt-0.5">{order.customer_address}</span>
                </div>
              )}
              {order.order_type === 'Dine-In' && order.table_number && (
                <div className="flex justify-between mt-1">
                  <span className="text-gray-400">Table:</span>
                  <span className="font-semibold text-gray-700">{order.table_number}</span>
                </div>
              )}
            </div>

            <div className="space-y-2.5 py-1 border-b border-gray-100">
              {order.items.map((item, idx) => (
                <div key={idx} className="text-xs font-bold">
                  <div className="flex justify-between items-start">
                    <span className="max-w-[70%]">{item.quantity}x {item.name}{item.size ? ` (${item.size.name})` : ''}</span>
                    <span>Rs. {item.totalPricePerUnit * item.quantity}</span>
                  </div>
                  {item.addons && item.addons.length > 0 && (
                    <div className="text-[9px] text-primary pl-4 font-semibold">
                      + {item.addons.map(a => `${a.name} (Rs. ${a.price})`).join(', ')}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-[9px] text-gray-400 pl-4 font-semibold italic">
                      "{item.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-xs font-bold space-y-1.5 pt-1.5 text-gray-500">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-accent">Rs. {order.items.reduce((s, i) => s + i.totalPricePerUnit * i.quantity, 0)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Voucher Discount ({order.voucher_code}):</span>
                  <span>- Rs. {order.discount_amount}</span>
                </div>
              )}
              {order.order_type === 'Delivery' && (
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span className="text-accent">{order.delivery_fee > 0 ? `Rs. ${order.delivery_fee}` : 'Free'}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-accent pt-2 border-t-2 border-dashed border-accent">
                <span>Total Paid:</span>
                <span className="text-primary font-black text-base">Rs. {order.total_amount}</span>
              </div>
            </div>

            <div className="text-center pt-2.5">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                Thank you for your order!
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t-2 border-dashed border-gray-100 bg-gray-50 flex gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => printReceipt(order)}
            className="flex-1 bg-white border-2 border-accent hover:bg-gray-100 text-accent font-black py-3 rounded-2xl comic-shadow-sm flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider cursor-pointer transition-colors"
          >
            🖨️ Print
          </button>
          <button
            onClick={handleSaveReceipt}
            disabled={isSaving}
            className={`flex-1 bg-secondary hover:bg-secondary-hover text-accent font-black py-3 rounded-2xl comic-border-sm comic-shadow-sm flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider transition-colors ${isSaving ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
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
            className="flex-1 sm:flex-none sm:w-auto bg-primary hover:bg-primary-hover text-white font-black py-3 px-4 rounded-2xl comic-border-sm comic-shadow-sm flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider transition-colors text-center"
          >
            <ShoppingBag className="w-4 h-4" /> Send WA
          </a>
        </div>
      </div>
    </div>
  );
}
