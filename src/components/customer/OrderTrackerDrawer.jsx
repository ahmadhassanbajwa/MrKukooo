import { useState } from 'react';
import { X, Search, Clock, AlertCircle } from 'lucide-react';
import { getOrderTracking, isSupabaseConfigured } from '../../supabase';

export default function OrderTrackerDrawer({
  isOpen,
  onClose,
  orders = []
}) {
  const [trackId, setTrackId] = useState('');
  const [trackingToken, setTrackingToken] = useState('');
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [message, setMessage] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);

  if (!isOpen) return null;

  const handleTrack = async (e) => {
    e.preventDefault();
    setMessage('');
    setTrackedOrder(null);
    if (!trackId.trim() || !trackingToken.trim()) {
      setMessage('Enter both your order ID and tracking code.');
      return;
    }

    setIsLookingUp(true);
    try {
      const order = isSupabaseConfigured
        ? await getOrderTracking(trackId.trim().toUpperCase(), trackingToken.trim().toLowerCase())
        : orders.find(o =>
            o.order_id?.trim().toUpperCase() === trackId.trim().toUpperCase() &&
            o.tracking_token === trackingToken.trim().toLowerCase()
          );
      if (order) {
        setTrackedOrder(order);
      } else {
        setMessage('No order found. Check the order ID and tracking code on your receipt.');
      }
    } catch (error) {
      console.error('Could not look up order tracking:', error);
      setMessage('Order tracking is temporarily unavailable. Please try again later.');
    } finally {
      setIsLookingUp(false);
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
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Order ID</label>
              <input
                type="text"
                placeholder="e.g. K2210-..."
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                className="w-full bg-white border border-gray-250 focus:border-primary px-3 py-2 rounded-md font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs sm:text-sm uppercase text-gray-900"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Private tracking code</label>
              <input
                type="text"
                autoComplete="off"
                value={trackingToken}
                onChange={(e) => setTrackingToken(e.target.value)}
                className="w-full bg-white border border-gray-250 focus:border-primary px-3 py-2 rounded-md font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs sm:text-sm text-gray-900"
              />
            </div>
            <button
              type="submit"
              disabled={isLookingUp}
              className="w-full bg-primary hover:bg-primary-hover active:translate-y-[0.5px] text-white font-medium px-4 py-2 rounded-md shadow-2xs disabled:opacity-60 cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all border border-primary-hover/50"
            >
              <Search className="w-4 h-4 stroke-[2.2]" /> {isLookingUp ? 'Checking...' : 'Track Order'}
            </button>

            {message && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-primary font-medium text-xs rounded-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}
          </form>

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
                <p className="text-xs text-gray-500 text-center">
                  To request a cancellation, contact the restaurant directly.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
