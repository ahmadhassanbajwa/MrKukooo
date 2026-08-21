import { useState } from 'react';
import { X, Search, Clock, AlertCircle } from 'lucide-react';

export default function OrderTrackerDrawer({
  isOpen,
  onClose,
  orders,
  onCancelOrder
}) {
  const [trackMethod, setTrackMethod] = useState('order_id'); // 'order_id' | 'phone'
  const [trackId, setTrackId] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [phoneOrdersList, setPhoneOrdersList] = useState([]);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleTrack = (e) => {
    e.preventDefault();
    setMessage('');
    setTrackedOrder(null);
    setPhoneOrdersList([]);

    if (trackMethod === 'order_id') {
      if (!trackId.trim()) {
        setMessage('Please enter an order ID.');
        return;
      }
      const match = (orders || []).find(
        o => o.order_id.trim().toUpperCase() === trackId.trim().toUpperCase()
      );
      if (match) {
        setTrackedOrder(match);
      } else {
        setMessage('No order found matching this order ID.');
      }
    } else {
      if (!trackPhone.trim()) {
        setMessage('Please enter your phone number.');
        return;
      }
      const sanitizedSearch = trackPhone.replace(/\D/g, '');
      const matches = (orders || []).filter(o => {
        const oPhone = o.customer_phone.replace(/\D/g, '');
        return oPhone && (oPhone.endsWith(sanitizedSearch) || sanitizedSearch.endsWith(oPhone));
      });

      if (matches.length === 1) {
        setTrackedOrder(matches[0]);
      } else if (matches.length > 1) {
        setPhoneOrdersList(matches);
      } else {
        setMessage('No orders found matching this phone number.');
      }
    }
  };

  const getStatusStep = (status) => {
    switch (status) {
      case 'Pending': return 1;
      case 'Preparing': return 2;
      case 'Ready/Out for Delivery': return 3;
      case 'Completed': return 4;
      case 'Cancelled': return 0;
      default: return 1;
    }
  };

  const stepVal = trackedOrder ? getStatusStep(trackedOrder.status) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-lg h-full flex flex-col border-l-4 border-accent shadow-[-4px_0_0_0_#1a1a1a] relative animate-slide-in">
        <div className="p-6 border-b-2 border-dashed border-gray-150 flex items-center justify-between bg-accent text-white">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-secondary" />
            <h2 className="text-xl font-black tracking-tight">Order Tracker</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white hover:bg-secondary hover:text-accent flex items-center justify-center comic-border-sm comic-shadow-sm comic-hover cursor-pointer text-accent"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form onSubmit={handleTrack} className="bg-white p-5 rounded-2xl comic-border comic-shadow-sm space-y-4">
            <div className="flex bg-gray-100 p-1 rounded-lg border-2 border-accent">
              <button
                type="button"
                onClick={() => { setTrackMethod('order_id'); setMessage(''); setTrackedOrder(null); setPhoneOrdersList([]); }}
                className={`flex-1 py-2 rounded-md font-black text-xs transition-all cursor-pointer ${
                  trackMethod === 'order_id' ? 'bg-accent text-white comic-shadow-sm' : 'text-gray-500 hover:text-accent'
                }`}
              >
                🔢 Order ID
              </button>
              <button
                type="button"
                onClick={() => { setTrackMethod('phone'); setMessage(''); setTrackedOrder(null); setPhoneOrdersList([]); }}
                className={`flex-1 py-2 rounded-md font-black text-xs transition-all cursor-pointer ${
                  trackMethod === 'phone' ? 'bg-accent text-white comic-shadow-sm' : 'text-gray-500 hover:text-accent'
                }`}
              >
                📞 Phone Number
              </button>
            </div>

            {trackMethod === 'order_id' ? (
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-accent uppercase">Reference ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. KUKOOO-4581"
                    value={trackId}
                    onChange={(e) => setTrackId(e.target.value)}
                    className="flex-1 bg-white border-2 border-accent px-4 py-2.5 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs uppercase"
                  />
                  <button
                    type="submit"
                    className="bg-primary text-white font-black px-4.5 py-2.5 rounded-lg comic-border-sm comic-shadow-sm comic-hover cursor-pointer text-xs flex items-center gap-1.5 border-0"
                  >
                    <Search className="w-4 h-4 stroke-[3]" /> Track
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-accent uppercase">Customer WhatsApp Phone</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. +92 300 1234567"
                    value={trackPhone}
                    onChange={(e) => setTrackPhone(e.target.value)}
                    className="flex-1 bg-white border-2 border-accent px-4 py-2.5 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                  />
                  <button
                    type="submit"
                    className="bg-primary text-white font-black px-4.5 py-2.5 rounded-lg comic-border-sm comic-shadow-sm comic-hover cursor-pointer text-xs flex items-center gap-1.5 border-0"
                  >
                    <Search className="w-4 h-4 stroke-[3]" /> Find
                  </button>
                </div>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 p-3 bg-red-50 comic-border-sm text-primary font-bold text-xs rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}
          </form>

          {phoneOrdersList.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-accent uppercase tracking-wider">Select an Order</h3>
              <div className="space-y-2">
                {phoneOrdersList.map(ord => (
                  <button
                    key={ord.order_id}
                    onClick={() => { setTrackedOrder(ord); setPhoneOrdersList([]); }}
                    className="w-full bg-white p-4.5 rounded-lg comic-border-sm comic-shadow-sm comic-hover flex justify-between items-center text-left font-black transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="text-xs text-primary">{ord.order_id}</span>
                      <h4 className="text-sm text-accent">{ord.items.map(i => `${i.quantity}x ${i.name}${i.size ? ` (${i.size.name})` : ''}`).join(', ')}</h4>
                      <span className="text-[10px] text-gray-400 font-bold block mt-1">
                        Placed on {new Date(ord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-accent block">Rs. {ord.total_amount}</span>
                      <span className="text-[9px] bg-secondary text-accent px-2 py-0.5 rounded-md uppercase mt-1 inline-block font-black border border-accent">
                        {ord.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {trackedOrder && (
            <div className="space-y-6 animate-scale-up border-t border-gray-100 pt-5">
              <div className="bg-accent text-white p-5 rounded-2xl comic-border comic-shadow-sm space-y-3 relative overflow-hidden">
                <div className="absolute right-[-20px] bottom-[-20px] text-white/5 text-8xl font-black select-none pointer-events-none">
                  KUKOOO
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-secondary font-black uppercase tracking-wider">Active Order Feed</span>
                    <h3 className="text-lg font-black">{trackedOrder.order_id}</h3>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-lg comic-border-sm uppercase font-black ${
                    trackedOrder.status === 'Cancelled' ? 'bg-primary text-white' : 'bg-secondary text-accent'
                  }`}>
                    {trackedOrder.status}
                  </span>
                </div>

                <div className="border-t border-white/10 pt-3 text-xs font-bold text-white/70 space-y-1">
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="text-white">{trackedOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Order Type:</span>
                    <span className="text-white">{trackedOrder.order_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Bill:</span>
                    <span className="text-white">Rs. {trackedOrder.total_amount}</span>
                  </div>
                </div>
              </div>

              {trackedOrder.status !== 'Cancelled' && (
                <div className="space-y-5 bg-gray-55 p-5 rounded-2xl comic-border comic-shadow-sm">
                  <h4 className="text-xs font-black text-accent uppercase tracking-wider">Preparation Steps</h4>
                  <div className="relative pl-7 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-200">
                    <div className="relative">
                      <div className={`absolute left-[-24px] top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 font-black text-xs transition-colors ${
                        stepVal >= 1 ? 'bg-secondary border-accent text-accent' : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        1
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-accent">Order Submitted</h5>
                        <p className="text-[10px] text-gray-400 font-semibold leading-relaxed mt-0.5">
                          Received by kitchen staff and queued.
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className={`absolute left-[-24px] top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 font-black text-xs transition-colors ${
                        stepVal >= 2 ? 'bg-secondary border-accent text-accent' : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        2
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-accent">Cooking & Assembling</h5>
                        <p className="text-[10px] text-gray-400 font-semibold leading-relaxed mt-0.5">
                          Ingredients are being prepared and baked in our premium ovens.
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className={`absolute left-[-24px] top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 font-black text-xs transition-colors ${
                        stepVal >= 3 ? 'bg-secondary border-accent text-accent' : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        3
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-accent">
                          {trackedOrder.order_type === 'Delivery' ? 'Out for Delivery' : 'Ready for Pickup'}
                        </h5>
                        <p className="text-[10px] text-gray-400 font-semibold leading-relaxed mt-0.5">
                          {trackedOrder.order_type === 'Delivery'
                            ? 'Our rider is heading towards your location pin!'
                            : 'Order is ready to eat! Visit the store and present your Order ID.'}
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className={`absolute left-[-24px] top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 font-black text-xs transition-colors ${
                        stepVal >= 4 ? 'bg-secondary border-accent text-accent' : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        4
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-accent">Delivered & Closed</h5>
                        <p className="text-[10px] text-gray-400 font-semibold leading-relaxed mt-0.5">
                          Thank you for choosing Mr. Kukooo! Lick the spoons!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {trackedOrder.status === 'Pending' && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to cancel this order?")) {
                      onCancelOrder(trackedOrder.order_id);
                      setTrackedOrder(null);
                    }
                  }}
                  className="w-full py-3.5 bg-primary text-white font-black text-xs rounded-xl comic-border-sm comic-shadow-sm comic-hover uppercase tracking-wider cursor-pointer border-0"
                >
                  Cancel Order
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
