import { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, X, MapPin, Phone, User, ShoppingBag, ArrowRight } from 'lucide-react';
import MapPicker from './MapPicker';
import { isRestaurantOpen, getHours } from '../../utils/restaurantHours';

function generateOrderId() {
  return `KUKOOO-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  updateQuantity,
  removeFromCart,
  vouchers,
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
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherErrorState, setVoucherErrorState] = useState('');
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

  const deliveryDistance = (orderType === 'Delivery' && currentBranch && customerCoords)
    ? getHaversineDistance(
        currentBranch.lat,
        currentBranch.lng,
        customerCoords.lat,
        customerCoords.lng
      )
    : 0;

  const validateVoucherDetails = (voucher, currentSubtotal, customerPhoneNum) => {
    if (!voucher) return { isValid: false, message: '' };

    const today = new Date().toISOString().split('T')[0];
    const expDate = voucher.expiry_date || voucher.expiry;
    if (expDate && expDate < today) {
      return { isValid: false, message: 'Voucher has expired!' };
    }

    if (voucher.branch_ids && voucher.branch_ids.length > 0 && selectedBranchId) {
      if (!voucher.branch_ids.includes(selectedBranchId)) {
        return { isValid: false, message: 'Voucher is not valid for this branch location.' };
      }
    }

    if (voucher.min_order_amount && currentSubtotal < parseFloat(voucher.min_order_amount)) {
      return { isValid: false, message: `Minimum order of Rs. ${voucher.min_order_amount} is required to use this voucher.` };
    }

    if (voucher.max_total_usage) {
      const timesUsed = (orders || []).filter(o => o.voucher_code === voucher.code && o.status !== 'Cancelled').length;
      if (timesUsed >= parseInt(voucher.max_total_usage, 10)) {
        return { isValid: false, message: 'Voucher maximum usage limit has been reached!' };
      }
    }

    if (voucher.one_use_per_phone && customerPhoneNum.trim()) {
      const sanitizedInput = customerPhoneNum.replace(/\D/g, '');
      const alreadyRedeemed = (orders || []).some(o => {
        if (o.status === 'Cancelled') return false;
        if (o.voucher_code !== voucher.code) return false;
        const oPhone = o.customer_phone.replace(/\D/g, '');
        return oPhone && (oPhone.endsWith(sanitizedInput) || sanitizedInput.endsWith(oPhone));
      });
      if (alreadyRedeemed) {
        return { isValid: false, message: 'This voucher has already been redeemed for this phone number!' };
      }
    }

    return { isValid: true, message: '' };
  };

  // Compute subtotal
  const subtotal = cart.reduce((sum, item) => sum + item.totalPricePerUnit * item.quantity, 0);

  // Compute active voucher validation purely on render
  let activeVoucher = appliedVoucher;
  let activeVoucherError = voucherErrorState;
  if (activeVoucher) {
    const validation = validateVoucherDetails(activeVoucher, subtotal, whatsapp);
    if (!validation.isValid) {
      activeVoucher = null;
      activeVoucherError = validation.message;
    }
  }

  // Calculate discount and delivery fee
  let discount = 0;
  if (activeVoucher) {
    if (activeVoucher.discount_type === 'percentage') {
      discount = Math.round((subtotal * parseFloat(activeVoucher.value)) / 100);
    } else {
      discount = parseFloat(activeVoucher.value);
    }
  }

  let deliveryFee = 0;
  if (orderType === 'Delivery' && currentBranch) {
    const zones = currentBranch.deliveryZones || [{ maxRadius: 5, charge: 0 }, { maxRadius: 15, charge: 150 }];
    const sortedZones = [...zones].sort((a, b) => a.maxRadius - b.maxRadius);
    const applicableZone = sortedZones.find(z => deliveryDistance <= z.maxRadius);
    if (applicableZone) {
      deliveryFee = applicableZone.charge;
    }
  }
  const grandTotal = Math.max(0, subtotal - discount + deliveryFee);

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

  const handleApplyVoucher = () => {
    setVoucherErrorState('');
    if (!voucherCode.trim()) {
      setVoucherErrorState('Enter a coupon code.');
      return;
    }

    const codeUpper = voucherCode.trim().toUpperCase();
    const match = vouchers.find(v => v.code.toUpperCase() === codeUpper);
    if (!match) {
      setVoucherErrorState('Invalid coupon code!');
      setAppliedVoucher(null);
      return;
    }

    const val = validateVoucherDetails(match, subtotal, whatsapp);
    if (!val.isValid) {
      setVoucherErrorState(val.message);
      setAppliedVoucher(null);
    } else {
      setAppliedVoucher(match);
      setVoucherCode('');
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherErrorState('');
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
      order_id: generateOrderId(),
      customer_name: orderType === 'Dine-In' && !name.trim() ? 'Dine-In Customer' : name.trim(),
      customer_phone: orderType === 'Dine-In' && !whatsapp.trim() ? '-' : whatsapp.trim(),
      customer_address: orderType === 'Delivery' ? address.trim() : '',
      items: cart,
      total_amount: grandTotal,
      order_type: orderType,
      status: 'Pending',
      timestamp: new Date().toISOString(),
      branch_id: selectedBranchId || 'branch-chak-104sb',
      voucher_code: activeVoucher ? activeVoucher.code : '',
      discount_amount: discount,
      delivery_fee: deliveryFee,
      special_instructions: specialInstructions,
      customer_coords: orderType === 'Delivery' ? customerCoords : null,
      delivery_distance: orderType === 'Delivery' ? deliveryDistance : 0,
      table_number: orderType === 'Dine-In' ? tableNumber.trim() : ''
    };

    await placeOrder(newOrder, activeVoucher ? activeVoucher.code : null);
    onCheckoutSuccess(newOrder);

    // Reset local form states
    setName('');
    setWhatsapp('');
    setAddress('');
    setTableNumber('');
    setSpecialInstructions('');
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherErrorState('');
  };

  if (!isInline && !isOpen) return null;

  const Wrapper = isInline ? 'div' : 'div';
  const wrapperClass = isInline 
    ? 'hidden lg:flex flex-col w-full h-full bg-white shadow-sm rounded-xl overflow-hidden sticky top-32 max-h-[calc(100vh-8rem)] border border-gray-200'
    : 'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end';

  const innerClass = isInline
    ? 'w-full h-full flex flex-col relative'
    : 'bg-white w-full max-w-lg h-full flex flex-col shadow-2xl relative animate-slide-in';

  return (
    <Wrapper className={wrapperClass}>
      <div className={innerClass}>
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-primary text-white">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-white" />
            <h2 className="text-lg font-black tracking-tight uppercase">Order Details</h2>
            <span className="text-xs bg-white text-primary px-2 py-0.5 rounded-full font-black ml-1">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>
          {!isInline && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gray-50/30">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center space-y-4 py-12">
              <div className="text-5xl">🥣🥖🍔</div>
              <h3 className="text-lg font-black text-accent">Your bowl is clean</h3>
              <p className="text-xs text-gray-400 font-semibold max-w-xs">
                Explore our menu, select your branch location and start adding some delicious burgers or pizzas to your bowl!
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-secondary text-accent font-black text-xs rounded-xl comic-border-sm comic-shadow-sm comic-hover cursor-pointer transition-colors"
              >
                Let's Order
              </button>
            </div>
          ) : (
            <>
              {/* Cart List */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-accent uppercase tracking-wider">Items Selected</h3>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.cartItemId}
                      className="flex items-center gap-3.5 bg-white p-3.5 rounded-xl comic-border-sm comic-shadow-sm"
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-14 h-14 rounded-lg object-cover comic-border-sm flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-accent truncate">
                          {item.name} {item.size && <span className="text-primary font-bold">({item.size.name})</span>}
                        </h4>
                        {item.addons && item.addons.length > 0 && (
                          <p className="text-[10px] font-bold text-primary truncate">
                            + {item.addons.map(a => a.name).join(', ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-gray-400 font-semibold italic truncate">
                            "{item.notes}"
                          </p>
                        )}
                        <span className="text-xs font-black text-accent mt-1 block">
                          Rs. {item.totalPricePerUnit}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-2.5">
                        <button
                          onClick={() => removeFromCart(item.cartItemId)}
                          className="text-gray-400 hover:text-primary transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg comic-border-sm">
                          <button
                            onClick={() => updateQuantity(item.cartItemId, -1)}
                            className="w-5 h-5 flex items-center justify-center bg-gray-50 hover:bg-gray-150 text-accent font-black rounded-lg transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3 stroke-[3]" />
                          </button>
                          <span className="text-xs font-black text-accent w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.cartItemId, 1)}
                            className="w-5 h-5 flex items-center justify-center bg-gray-50 hover:bg-gray-150 text-accent font-black rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {getRecommendations().length > 0 && (
                <div className="bg-secondary/5 rounded-2xl p-5 comic-border space-y-3">
                  <h4 className="text-[11px] font-black text-accent uppercase tracking-wider flex items-center gap-1">
                    👨‍🍳 Add a little extra?
                  </h4>
                  <div className="space-y-2">
                    {getRecommendations().map((prod) => (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between bg-white p-2.5 rounded-lg comic-border-sm"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            className="w-8 h-8 rounded-md object-cover comic-border-sm"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-accent">{prod.name}</span>
                            <span className="text-[10px] text-primary font-black">Rs. {prod.price}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onAddRecommendation(prod)}
                          className="px-3 py-1 bg-secondary text-accent font-black text-[10px] rounded-lg comic-border-sm comic-shadow-sm comic-hover cursor-pointer"
                        >
                          Customize
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coupon / Voucher Codes */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-accent uppercase">
                  🎟️ Have a Voucher Code?
                </label>
                {activeVoucher ? (
                  <div className="flex items-center justify-between bg-green-50 comic-border-sm border-green-500 p-3 rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-green-700">
                        Code applied: {activeVoucher.code}
                      </span>
                      <span className="text-[10px] text-green-600 font-bold">
                        Saved Rs. {discount} on this order!
                      </span>
                    </div>
                    <button
                      onClick={handleRemoveVoucher}
                      className="text-xs text-primary font-black uppercase hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. KUKOOOBRG"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value)}
                        className="flex-1 bg-gray-50 border-2 border-accent px-4.5 py-2 rounded-lg font-bold uppercase focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                      />
                      <button
                        onClick={handleApplyVoucher}
                        className="bg-accent text-white font-black px-4.5 py-2 rounded-lg comic-border-sm comic-shadow-sm comic-hover cursor-pointer border-0"
                      >
                        Apply
                      </button>
                    </div>
                    {activeVoucherError && (
                      <p className="text-[10px] text-primary font-bold">{activeVoucherError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Checkout Form */}
              <form onSubmit={handleCheckoutSubmit} className="space-y-4 border-t-2 border-dashed border-gray-150 pt-5">
                {/* Order Type */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-accent uppercase">Order Handling</label>
                  <div className="flex bg-gray-100 p-1 rounded-lg border-2 border-accent">
                    <button
                      type="button"
                      onClick={() => setOrderType('Delivery')}
                      className={`flex-1 py-2 rounded-md font-black text-xs transition-all cursor-pointer ${
                        orderType === 'Delivery' ? 'bg-accent text-white comic-shadow-sm' : 'text-gray-500 hover:text-accent'
                      }`}
                    >
                      🚀 Home Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('Pickup')}
                      className={`flex-1 py-2 rounded-md font-black text-xs transition-all cursor-pointer ${
                        orderType === 'Pickup' ? 'bg-accent text-white comic-shadow-sm' : 'text-gray-500 hover:text-accent'
                      }`}
                    >
                      🥡 Store Pickup
                    </button>
                    {isPOS && (
                      <button
                        type="button"
                        onClick={() => setOrderType('Dine-In')}
                        className={`flex-1 py-2 rounded-md font-black text-[10px] sm:text-xs transition-all cursor-pointer ${
                          orderType === 'Dine-In' ? 'bg-accent text-white comic-shadow-sm' : 'text-gray-500 hover:text-accent'
                        }`}
                      >
                        🍽️ Dine-In
                      </button>
                    )}
                  </div>
                </div>

                {orderType !== 'Dine-In' && (
                  <>
                    <h3 className="text-xs font-black text-accent uppercase tracking-wider mt-4">Customer details</h3>
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-accent uppercase flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Alice Smith"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                      />
                      {formErrors.name && (
                        <p className="text-[10px] text-primary font-bold">{formErrors.name}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-accent uppercase flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> WhatsApp Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="+92 300 1234567"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                      />
                      {formErrors.whatsapp && (
                        <p className="text-[10px] text-primary font-bold">{formErrors.whatsapp}</p>
                      )}
                    </div>
                  </>
                )}

                {/* Table Number Field for Dine-In */}
                {orderType === 'Dine-In' && (
                  <div className="space-y-3 border-t border-gray-100 pt-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-accent uppercase flex items-center gap-1">
                        🍽️ Table Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Table 5"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                      />
                      {formErrors.tableNumber && (
                        <p className="text-[10px] text-primary font-bold">{formErrors.tableNumber}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Address Map Geofencing */}
                {orderType === 'Delivery' && (
                  <div className="space-y-3 border-t border-gray-100 pt-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-accent uppercase flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> Street Address / Flat Details
                      </label>
                      <input
                        type="text"
                        placeholder="House 12, Street 3, Sector G..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                      />
                      {formErrors.address && (
                        <p className="text-[10px] text-primary font-bold">{formErrors.address}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-accent uppercase">
                        📍 Select location pin on Map
                      </label>
                      <MapPicker
                        currentBranch={currentBranch}
                        customerCoords={customerCoords}
                        setCustomerCoords={setCustomerCoords}
                        orderType={orderType}
                        isCartOpen={isOpen}
                      />
                      <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg comic-border-sm text-[10px] font-bold text-accent">
                        <span>Distance to Store: <strong>{deliveryDistance.toFixed(1)} km</strong></span>
                        {(() => {
                           const zones = currentBranch?.deliveryZones || [{ maxRadius: 5, charge: 0 }, { maxRadius: 15, charge: 150 }];
                           const sortedZones = [...zones].sort((a, b) => a.maxRadius - b.maxRadius);
                           const applicableZone = sortedZones.find(z => deliveryDistance <= z.maxRadius);
                           
                           if (!applicableZone) {
                             return <span className="text-primary">⛔ Out of Range</span>;
                           } else if (applicableZone.charge === 0) {
                             return <span className="text-green-700">🛵 Free Delivery</span>;
                           } else {
                             return <span className="text-primary">🛵 Rs. {applicableZone.charge} Delivery Fee</span>;
                           }
                        })()}
                      </div>
                      {formErrors.geofence && (
                        <p className="text-[10px] text-primary font-bold">{formErrors.geofence}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Special cooking notes */}
                <div className="space-y-1 pb-4">
                  <label className="block text-[10px] font-black text-accent uppercase">Special instructions for kitchen</label>
                  <textarea
                    placeholder="e.g. Ring doorbell, leave on table..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    rows={2}
                    className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                  />
                </div>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t-2 border-dashed border-gray-150 bg-gray-50 space-y-3">
            <div className="space-y-1 text-xs font-bold text-gray-500">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-accent font-black">Rs. {subtotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Promo discount:</span>
                  <span className="font-black">- Rs. {discount}</span>
                </div>
              )}
              {orderType === 'Delivery' && (
                <div className="flex justify-between">
                  <span>Delivery fee ({deliveryDistance.toFixed(1)}km):</span>
                  <span className="text-accent font-black">
                    {deliveryFee > 0 ? `Rs. ${deliveryFee}` : 'Free'}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-accent pt-1.5 border-t border-gray-200">
                <span>Grand Total:</span>
                <span className="text-primary font-black text-base">Rs. {grandTotal}</span>
              </div>
            </div>

            {/* Restaurant closed banner — shown when outside operating hours */}
            {formErrors.hours && (
              <div className="flex items-start gap-2 bg-primary/10 comic-border-sm rounded-lg px-4 py-3" role="alert">
                <span className="text-lg leading-none">🕐</span>
                <div>
                  <p className="text-xs font-black text-primary">We're Currently Closed</p>
                  <p className="text-xs font-semibold text-primary/80 mt-0.5">{formErrors.hours}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleCheckoutSubmit}
              className={`w-full bg-primary text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-sm uppercase tracking-wider ${!isInline && 'comic-border-sm comic-shadow-sm comic-hover'}`}
            >
              <ShoppingBag className="w-4 h-4" /> Place Order Now
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
