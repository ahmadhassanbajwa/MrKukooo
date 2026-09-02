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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-lg h-full flex flex-col border-l border-gray-200 shadow-2xl relative animate-slide-in">
        <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-accent text-white">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-bold tracking-tight">Order Tracker</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center cursor-pointer text-white transition-colors"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <form onSubmit={handleTrack} className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-150 shadow-xs space-y-4">
            <div className="flex bg-gray-100 p-1 rounded-md border border-gray-200 gap-1">
              <button
                type="button"
                onClick={() => { setTrackMethod('order_id'); setMessage(''); setTrackedOrder(null); setPhoneOrdersList([]); }}
                className={`flex-1 py-1.5 rounded-md font-medium text-xs transition-all cursor-pointer ${
                  trackMethod === 'order_id' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                🔢 Order ID
              </button>
              <button
                type="button"
                onClick={() => { setTrackMethod('phone'); setMessage(''); setTrackedOrder(null); setPhoneOrdersList([]); }}
                className={`flex-1 py-1.5 rounded-md font-medium text-xs transition-all cursor-pointer ${
                  trackMethod === 'phone' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                📞 Phone Number
              </button>
            </div>

            {trackMethod === 'order_id' ? (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Reference ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. K0109-001"
                    value={trackId}
                    onChange={(e) => setTrackId(e.target.value)}
                    className="flex-1 bg-white border border-gray-250 focus:border-primary px-3 py-2 rounded-md font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs sm:text-sm uppercase text-gray-900"
                  />
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary-hover active:translate-y-[0.5px] text-white font-medium px-4 py-2 rounded-md shadow-2xs cursor-pointer text-xs sm:text-sm flex items-center gap-1.5 transition-all border border-primary-hover/50"
                  >
                    <Search className="w-4 h-4 stroke-[2.2]" /> Track
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Customer WhatsApp Phone</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. +92 300 1234567"
                    value={trackPhone}
                    onChange={(e) => setTrackPhone(e.target.value)}
                    className="flex-1 bg-white border border-gray-250 focus:border-primary px-3 py-2 rounded-md font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs sm:text-sm text-gray-900"
                  />
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary-hover active:translate-y-[0.5px] text-white font-medium px-4 py-2 rounded-md shadow-2xs cursor-pointer text-xs sm:text-sm flex items-center gap-1.5 transition-all border border-primary-hover/50"
                  >
                    <Search className="w-4 h-4 stroke-[2.2]" /> Find
                  </button>
                </div>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-primary font-medium text-xs rounded-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}
          </form>

          {phoneOrdersList.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Select an Order</h3>
              <div className="space-y-2">
                {phoneOrdersList.map(ord => (
                  <button
                    key={ord.order_id}
                    onClick={() => { setTrackedOrder(ord); setPhoneOrdersList([]); }}
                    className="w-full bg-white p-3.5 rounded-md border border-gray-200 shadow-2xs hover:border-gray-300 flex justify-between items-center text-left transition-all cursor-pointer"
                  >
                    <div>
                      <span className="text-xs text-primary font-semibold">{ord.order_id}</span>
                      <h4 className="text-sm text-gray-900 font-medium">{ord.items.map(i => `${i.quantity}x ${i.name}${i.size ? ` (${i.size.name})` : ''}`).join(', ')}</h4>
                      <span className="text-[10px] text-gray-400 font-normal block mt-1">
                        Placed on {new Date(ord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-900 font-bold block">Rs. {ord.total_amount}</span>
                      <span className="text-[9px] bg-secondary text-accent px-2 py-0.5 rounded-md uppercase mt-1 inline-block font-semibold border border-secondary-hover/30">
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
              <div className="bg-accent text-white p-5 rounded-lg border border-gray-800 shadow-2xs space-y-3 relative overflow-hidden">
                <div className="absolute right-[-20px] bottom-[-20px] text-white/5 text-8xl font-black select-none pointer-events-none">
                  KUKOOO
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-secondary font-semibold uppercase tracking-wider block">Tracking Order</span>
                    <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">{trackedOrder.order_id}</h3>
                  </div>
                  <span className="bg-secondary text-accent font-semibold text-xs px-2.5 py-1 rounded-md">
                    {trackedOrder.status}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 border-t border-white/10 pt-3 text-white/80">
                  <div className="flex justify-between">
                    <span className="text-white/50">Total Amount:</span>
                    <span className="font-semibold text-white">Rs. {trackedOrder.total_amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Handling:</span>
                    <span className="font-semibold text-white">{trackedOrder.order_type}</span>
                  </div>
                </div>
              </div>

              {trackedOrder.status !== 'Cancelled' && (
                <div className="bg-white border border-gray-200 p-4 sm:p-5 rounded-lg shadow-2xs">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Order Progress</h4>
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                    <div className="relative">
                      <div className={`absolute left-[-24px] top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-colors ${
                        stepVal >= 1 ? 'bg-secondary border-accent text-accent' : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        1
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-gray-900">Order Received</h5>
                        <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">
                          Your order has been sent to our kitchen.
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className={`absolute left-[-24px] top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-colors ${
                        stepVal >= 2 ? 'bg-secondary border-accent text-accent' : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        2
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-gray-900">Preparing & Cooking</h5>
                        <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">
                          Our chef is preparing your fresh meal with love.
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className={`absolute left-[-24px] top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-colors ${
                        stepVal >= 3 ? 'bg-secondary border-accent text-accent' : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        3
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-gray-900">
                          {trackedOrder.order_type === 'Delivery' ? 'Rider on the Way' : 'Ready for Pickup / Table'}
                        </h5>
                        <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">
                          {trackedOrder.order_type === 'Delivery'
                            ? 'Our rider is heading towards your location pin!'
                            : 'Order is ready to eat! Visit the store and present your Order ID.'}
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className={`absolute left-[-24px] top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-colors ${
                        stepVal >= 4 ? 'bg-secondary border-accent text-accent' : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        4
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-gray-900">Delivered & Closed</h5>
                        <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">
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
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-primary font-medium text-xs sm:text-sm rounded-md transition-all cursor-pointer active:translate-y-[0.5px]"
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
