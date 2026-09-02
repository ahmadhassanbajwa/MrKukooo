import { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, X, MapPin, Phone, User, ShoppingBag, ArrowRight } from 'lucide-react';
import MapPicker from './MapPicker';
import { isRestaurantOpen, getHours } from '../../utils/restaurantHours';
import { generateDailyOrderId } from '../../utils/orderId';

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  updateQuantity,
  removeFromCart,
  products,
  orders,
  selectedBranchId,
  currentBranch,
  placeOrder,
  onCheckoutSuccess,
  onAddRecommendation,
  isInline = false,
  isPOS = false
}) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [orderType, setOrderType] = useState('Delivery'); // 'Delivery' or 'Pickup'
  const [address, setAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [customerCoords, setCustomerCoords] = useState(() => {
    if (currentBranch && currentBranch.lat && currentBranch.lng) {
      return { lat: currentBranch.lat + 0.002, lng: currentBranch.lng + 0.002 };
    }
    return { lat: 32.0836, lng: 72.6711 };
  });

  const [prevBranchId, setPrevBranchId] = useState(currentBranch ? currentBranch.id : null);
  const currentBranchId = currentBranch ? currentBranch.id : null;
  if (currentBranchId !== prevBranchId) {
    setPrevBranchId(currentBranchId);
    if (currentBranch && currentBranch.lat && currentBranch.lng) {
      setCustomerCoords({
        lat: currentBranch.lat + 0.002,
        lng: currentBranch.lng + 0.002
      });
    }
  }

  // Recalculate distance
  const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deliveryDistance = (currentBranch && currentBranch.lat && currentBranch.lng && customerCoords)
    ? getHaversineDistance(currentBranch.lat, currentBranch.lng, customerCoords.lat, customerCoords.lng)
    : 0;

  // Compute subtotal
  const subtotal = cart.reduce((sum, item) => sum + item.totalPricePerUnit * item.quantity, 0);

  // Calculate delivery fee
  let deliveryFee = 0;
  if (orderType === 'Delivery' && currentBranch) {
    const zones = currentBranch.deliveryZones || [{ maxRadius: 5, charge: 0 }, { maxRadius: 15, charge: 150 }];
    const sortedZones = [...zones].sort((a, b) => a.maxRadius - b.maxRadius);
    const applicableZone = sortedZones.find(z => deliveryDistance <= z.maxRadius);
    deliveryFee = applicableZone ? applicableZone.charge : 150;
  }

  const grandTotal = Math.max(0, subtotal + deliveryFee);

  // Recommendations
  const getRecommendations = () => {
    if (cart.length === 0) return [];
    const cartProductIds = cart.map(item => item.id);
    const cartCategories = cart.map(item => {
      const p = products.find(prod => prod.id === item.id);
      return p ? (p.category || '').toLowerCase() : '';
    });

    const hasMains = cartCategories.some(cat => cat.includes('pizza') || cat.includes('burger') || cat.includes('deal'));
    const hasDrinks = cartCategories.some(cat => cat.includes('drink') || cat.includes('beverage') || cat.includes('cold') || cat.includes('pepsi') || cat.includes('coke'));
    const hasSides = cartCategories.some(cat => cat.includes('side') || cat.includes('appetizer') || cat.includes('fries') || cat.includes('garlic'));

    const eligibleProducts = products.filter(p => {
      if (!p.is_available) return false;
      if (cartProductIds.includes(p.id)) return false;
      if (selectedBranchId) {
        return !p.branch_ids || p.branch_ids.length === 0 || p.branch_ids.includes(selectedBranchId);
      }
      return true;
    });

    let recommended = [];
    if (hasMains && !hasDrinks) {
      recommended = eligibleProducts.filter(p => (p.category || '').toLowerCase().includes('drink') || (p.category || '').toLowerCase().includes('beverage'));
    } else if (hasMains && hasDrinks && !hasSides) {
      recommended = eligibleProducts.filter(p => (p.category || '').toLowerCase().includes('side') || (p.category || '').toLowerCase().includes('appetizer') || (p.category || '').toLowerCase().includes('fries'));
    } else if (!hasMains && (hasDrinks || hasSides)) {
      recommended = eligibleProducts.filter(p => (p.category || '').toLowerCase().includes('pizza') || (p.category || '').toLowerCase().includes('burger'));
    }

    if (recommended.length === 0) {
      recommended = eligibleProducts.slice(0, 2);
    }
    return recommended.slice(0, 2);
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (orderType !== 'Dine-In') {
      if (!name.trim()) errors.name = 'Full name is required';
      if (!whatsapp.trim()) {
        errors.whatsapp = 'Phone number is required';
      } else if (whatsapp.replace(/\D/g, '').length < 10) {
        errors.whatsapp = 'Enter a valid phone number (min 10 digits)';
      }
    }

    if (orderType === 'Delivery') {
      if (!address.trim()) errors.address = 'Delivery address is required';
      
      const zones = currentBranch?.deliveryZones || [{ maxRadius: 5, charge: 0 }, { maxRadius: 15, charge: 150 }];
      const maxRadius = zones.length > 0 ? Math.max(...zones.map(z => z.maxRadius)) : 15.0;
      
      if (deliveryDistance > maxRadius) {
        errors.geofence = `Out of Range. We deliver up to ${maxRadius}km. Current: ${deliveryDistance.toFixed(1)}km`;
      }
    } else if (orderType === 'Dine-In') {
      if (!tableNumber.trim()) errors.tableNumber = 'Table number is required for Dine-In';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // ── Restaurant hours gate ──────────────────────────────────────────
    // Check the manager-configured schedule before accepting the order.
    const hoursCheck = isRestaurantOpen(getHours());
    if (!hoursCheck.open) {
      setFormErrors({ hours: hoursCheck.reason });
      return;
    }
    // ──────────────────────────────────────────────────────────────────

    setFormErrors({});

    const newOrder = {
      order_id: generateDailyOrderId(orders),
      customer_name: orderType === 'Dine-In' && !name.trim() ? 'Dine-In Customer' : name.trim(),
      customer_phone: orderType === 'Dine-In' && !whatsapp.trim() ? '-' : whatsapp.trim(),
      customer_address: orderType === 'Delivery' ? address.trim() : '',
      items: cart,
      total_amount: grandTotal,
      order_type: orderType,
      status: 'Pending',
      timestamp: new Date().toISOString(),
      branch_id: selectedBranchId || 'branch-chak-104sb',
      delivery_fee: deliveryFee,
      special_instructions: specialInstructions,
      customer_coords: orderType === 'Delivery' ? customerCoords : null,
      delivery_distance: orderType === 'Delivery' ? deliveryDistance : 0,
      table_number: orderType === 'Dine-In' ? tableNumber.trim() : ''
    };

    await placeOrder(newOrder);
    onCheckoutSuccess(newOrder);

    // Reset local form states
    setName('');
    setWhatsapp('');
    setAddress('');
    setTableNumber('');
    setSpecialInstructions('');
  };

  if (!isInline && !isOpen) return null;

  const Wrapper = isInline ? 'div' : 'div';
  const wrapperClass = isInline 
    ? 'hidden lg:flex flex-col w-full h-full bg-white shadow-sm rounded-md overflow-hidden sticky top-32 max-h-[calc(100vh-8rem)] border border-gray-200'
    : 'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end';

  const innerClass = isInline
    ? 'w-full h-full flex flex-col relative'
    : 'bg-white w-full max-w-lg h-full flex flex-col shadow-2xl relative animate-slide-in';

  return (
    <Wrapper className={wrapperClass}>
      <div className={innerClass}>
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-primary text-white">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-white" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight">Order Details</h2>
            <span className="text-xs bg-white text-primary px-2 py-0.5 rounded-md font-bold ml-1 shadow-2xs">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>
          {!isInline && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          )}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-gray-50/50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center space-y-4 py-12">
              <div className="text-5xl">🥣🥖🍔</div>
              <h3 className="text-lg font-bold text-gray-900">Your bowl is clean</h3>
              <p className="text-xs text-gray-500 font-normal max-w-xs leading-relaxed">
                Explore our menu, select your branch location and start adding some delicious burgers or pizzas to your bowl!
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-accent font-medium text-xs rounded-md shadow-2xs transition-all cursor-pointer active:translate-y-[0.5px]"
              >
                Let's Order
              </button>
            </div>
          ) : (
            <>
              {/* Cart List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Items Selected</h3>
                <div className="space-y-2.5">
                  {cart.map((item) => (
                    <div
                      key={item.cartItemId}
                      className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-2xs"
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-14 h-14 rounded-md object-cover border border-gray-150 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">
                          {item.name} {item.size && <span className="text-primary font-semibold">({item.size.name})</span>}
                        </h4>
                        {item.addons && item.addons.length > 0 && (
                          <p className="text-[11px] font-medium text-primary truncate">
                            + {item.addons.map(a => a.name).join(', ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-[11px] text-gray-400 font-normal italic truncate">
                            "{item.notes}"
                          </p>
                        )}
                        <span className="text-xs font-bold text-gray-900 mt-0.5 block">
                          Rs. {item.totalPricePerUnit}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => removeFromCart(item.cartItemId)}
                          className="text-gray-400 hover:text-primary transition-colors cursor-pointer p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">
                          <button
                            onClick={() => updateQuantity(item.cartItemId, -1)}
                            className="w-5 h-5 flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-sm transition-colors cursor-pointer active:scale-95 shadow-2xs"
                          >
                            <Minus className="w-3 h-3 stroke-[2.2]" />
                          </button>
                          <span className="text-xs font-bold text-gray-900 w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.cartItemId, 1)}
                            className="w-5 h-5 flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-sm transition-colors cursor-pointer active:scale-95 shadow-2xs"
                          >
                            <Plus className="w-3 h-3 stroke-[2.2]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {getRecommendations().length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Frequently Added Together</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {getRecommendations().map((prod) => (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-lg shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            className="w-8 h-8 rounded-md object-cover border border-gray-200"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-900">{prod.name}</span>
                            <span className="text-[11px] text-primary font-bold">Rs. {prod.price}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onAddRecommendation(prod)}
                          className="px-2.5 py-1 bg-secondary/15 hover:bg-secondary text-accent font-medium text-[11px] rounded-md transition-colors cursor-pointer active:translate-y-[0.5px]"
                        >
                          Customize
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checkout Form */}
              <form onSubmit={handleCheckoutSubmit} className="space-y-4 border-t border-gray-200/80 pt-4">
                {/* Order Type */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">Order Handling</label>
                  <div className="flex bg-gray-100 p-1 rounded-md border border-gray-200 gap-1">
                    <button
                      type="button"
                      onClick={() => setOrderType('Delivery')}
                      className={`flex-1 py-1.5 rounded-md font-medium text-xs transition-all cursor-pointer ${
                        orderType === 'Delivery' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      🚀 Home Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('Pickup')}
                      className={`flex-1 py-1.5 rounded-md font-medium text-xs transition-all cursor-pointer ${
                        orderType === 'Pickup' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      🥡 Store Pickup
                    </button>
                    {isPOS && (
                      <button
                        type="button"
                        onClick={() => setOrderType('Dine-In')}
                        className={`flex-1 py-1.5 rounded-md font-medium text-xs transition-all cursor-pointer ${
                          orderType === 'Dine-In' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        🍽️ Dine-In
                      </button>
                    )}
                  </div>
                </div>

                {orderType !== 'Dine-In' && (
                  <>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mt-4">Customer Details</h3>
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gray-400" /> Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Alice Smith"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white border border-gray-250 focus:border-primary px-3 py-2 rounded-md font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs sm:text-sm text-gray-900"
                      />
                      {formErrors.name && (
                        <p className="text-[11px] text-primary font-medium">{formErrors.name}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-400" /> WhatsApp Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="+92 300 1234567"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full bg-white border border-gray-250 focus:border-primary px-3 py-2 rounded-md font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs sm:text-sm text-gray-900"
                      />
                      {formErrors.whatsapp && (
                        <p className="text-[11px] text-primary font-medium">{formErrors.whatsapp}</p>
                      )}
                    </div>
                  </>
                )}

                {/* Table Number Field for Dine-In */}
                {orderType === 'Dine-In' && (
                  <div className="space-y-3 border-t border-gray-100 pt-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1">
                        🍽️ Table Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Table 5"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        className="w-full bg-white border border-gray-250 focus:border-primary px-3 py-2 rounded-md font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs sm:text-sm text-gray-900"
                      />
                      {formErrors.tableNumber && (
                        <p className="text-[11px] text-primary font-medium">{formErrors.tableNumber}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Address Map Geofencing */}
                {orderType === 'Delivery' && (
                  <div className="space-y-3 border-t border-gray-100 pt-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" /> Street Address / Flat Details
                      </label>
                      <input
                        type="text"
                        placeholder="House 12, Street 3, Sector G..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-white border border-gray-250 focus:border-primary px-3 py-2 rounded-md font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs sm:text-sm text-gray-900"
                      />
                      {formErrors.address && (
                        <p className="text-[11px] text-primary font-medium">{formErrors.address}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-gray-700">
                        📍 Pinpoint Delivery Location on Map:
                      </label>
                      
                      <MapPicker
                        currentBranch={currentBranch}
                        customerCoords={customerCoords}
                        setCustomerCoords={setCustomerCoords}
                        orderType={orderType}
                        isCartOpen={isOpen}
                      />

                      <div className="flex items-center justify-between text-xs font-semibold bg-gray-50 border border-gray-200 p-2.5 rounded-md">
                        <span className="text-gray-600">Calculated Distance:</span>
                        <span className="text-gray-900 font-bold">{deliveryDistance.toFixed(2)} km</span>
                      </div>

                      <div className="text-xs font-semibold bg-gray-50 border border-gray-200 p-2.5 rounded-md flex items-center justify-between">
                        <span className="text-gray-600">Delivery Tier:</span>
                        {(() => {
                           const zones = currentBranch?.deliveryZones || [{ maxRadius: 5, charge: 0 }, { maxRadius: 15, charge: 150 }];
                           const sortedZones = [...zones].sort((a, b) => a.maxRadius - b.maxRadius);
                           const applicableZone = sortedZones.find(z => deliveryDistance <= z.maxRadius);
                           
                           if (!applicableZone) {
                             return <span className="text-primary font-bold">⛔ Out of Range</span>;
                           } else if (applicableZone.charge === 0) {
                             return <span className="text-emerald-700 font-bold">🛵 Free Delivery</span>;
                           } else {
                             return <span className="text-primary font-bold">🛵 Rs. {applicableZone.charge} Delivery Fee</span>;
                           }
                        })()}
                      </div>
                      {formErrors.geofence && (
                        <p className="text-[11px] text-primary font-medium">{formErrors.geofence}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Special cooking notes */}
                <div className="space-y-1 pb-2">
                  <label className="block text-xs font-semibold text-gray-700">Special instructions for kitchen (Optional)</label>
                  <textarea
                    placeholder="e.g. Ring doorbell, leave on table..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-gray-250 focus:border-primary px-3 py-2 rounded-md font-normal focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs sm:text-sm text-gray-900"
                  />
                </div>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-white space-y-3">
            <div className="space-y-1 text-xs font-medium text-gray-500">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-gray-900 font-semibold">Rs. {subtotal}</span>
              </div>
              {orderType === 'Delivery' && (
                <div className="flex justify-between">
                  <span>Delivery fee ({deliveryDistance.toFixed(1)}km):</span>
                  <span className="text-gray-900 font-semibold">
                    {deliveryFee > 0 ? `Rs. ${deliveryFee}` : 'Free'}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Grand Total:</span>
                <span className="text-primary font-bold text-base">Rs. {grandTotal}</span>
              </div>
            </div>

            {/* Restaurant closed banner */}
            {formErrors.hours && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3.5 py-2.5" role="alert">
                <span className="text-base leading-none">🕐</span>
                <div>
                  <p className="text-xs font-bold text-primary">We're Currently Closed</p>
                  <p className="text-xs font-medium text-primary/80 mt-0.5">{formErrors.hours}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleCheckoutSubmit}
              className="w-full bg-primary hover:bg-primary-hover active:translate-y-[0.5px] text-white font-medium py-3 rounded-md flex items-center justify-center gap-2 cursor-pointer text-sm shadow-2xs border border-primary-hover/50 transition-all"
            >
              <ShoppingBag className="w-4 h-4" /> Place Order Now
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
