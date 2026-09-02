import { useState, useEffect, useMemo } from 'react';
import { Bike, ShoppingBag, Trash2, Plus, Minus, ArrowLeft, Utensils, X, MapPin } from 'lucide-react';
import { checkProductAvailability } from '../../utils/productUtils';
import { generateDailyOrderId } from '../../utils/orderId';
import ProductCustomizerModal from '../customer/ProductCustomizerModal';
import ReceiptModal from '../customer/ReceiptModal';

export default function StaffPOSView({
  orders = [],
  categories = [],
  products = [],
  addons = [],
  ingredients = [],
  branches = [],
  placeOrder,
  navigateToStaffLogin,
}) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cart, setCart] = useState([]);
  
  // Branch Selection State
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    const saved = localStorage.getItem('kukooo_pos_branch');
    if (saved && branches.some(b => b.id === saved)) return saved;
    return branches[0]?.id || 'branch-chak-104sb';
  });

  const effectiveBranchId = (selectedBranchId && branches.some(b => b.id === selectedBranchId)) 
    ? selectedBranchId 
    : (branches[0]?.id || 'branch-chak-104sb');

  const handleBranchChange = (newBranchId) => {
    setSelectedBranchId(newBranchId);
    localStorage.setItem('kukooo_pos_branch', newBranchId);
  };
  
  // Customization Modal State
  const [customizingProduct, setCustomizingProduct] = useState(null);
  
  // Completed Order State for Receipt
  const [completedOrder, setCompletedOrder] = useState(null);

  // Checkout Modal State
  const [checkoutModal, setCheckoutModal] = useState({ isOpen: false, type: null });
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    tableNumber: '',
    deliveryCharges: ''
  });

  // Augmented products with availability and branch availability
  const augmentedProducts = useMemo(() => {
    return products
      .filter(prod => {
        if (!effectiveBranchId) return true;
        if (!prod.branch_ids || prod.branch_ids.length === 0) return true;
        return prod.branch_ids.includes(effectiveBranchId);
      })
      .map(prod => ({ 
        ...prod, 
        is_available: checkProductAvailability(prod, products, ingredients)
      }));
  }, [products, ingredients, effectiveBranchId]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let result = augmentedProducts;
    if (activeCategory !== 'All') {
      result = result.filter(p => p.category_id === activeCategory);
    }
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.trim().toLowerCase();
      result = result.filter(p => (p.name || '').toLowerCase().includes(lowerQuery));
    }
    return result;
  }, [augmentedProducts, activeCategory, searchQuery]);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour12: true });
  const formattedDate = currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleAddCustomizedItem = ({ product, size, addons: selectedAddons, quantity, notes, totalPricePerUnit, unitCost }) => {
    const newCartItem = {
      cartItemId: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      product_id: product.id,
      name: product.name,
      image_url: product.image_url,
      price: totalPricePerUnit, // This includes size and addons
      size: size || null,
      quantity,
      addons: selectedAddons,
      totalPricePerUnit,
      unitCost,
      notes
    };

    setCart(prev => [...prev, newCartItem]);
    setCustomizingProduct(null);
  };

  const handleUpdateQuantity = (cartItemId, delta) => {
    setCart(prev =>
      prev.map(item => {
        if (item.cartItemId === cartItemId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean)
    );
  };

  const handleRemoveItem = (cartItemId) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  const openCheckout = (type) => {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }
    setCheckoutModal({ isOpen: true, type });
    // Reset details
    setCustomerDetails({
      name: '',
      phone: '',
      address: '',
      notes: '',
      tableNumber: '',
      deliveryCharges: ''
    });
  };

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    
    // Validate based on type
    const { type } = checkoutModal;
    if (type === 'Dine-In' && !customerDetails.tableNumber) {
      alert("Please enter a table number.");
      return;
    }
    if ((type === 'Takeaway' || type === 'Delivery') && (!customerDetails.name || !customerDetails.phone)) {
      alert("Please enter customer name and phone number.");
      return;
    }
    if (type === 'Delivery' && !customerDetails.address) {
      alert("Please enter delivery address.");
      return;
    }

    try {
      const deliveryFee = type === 'Delivery' ? (Number(customerDetails.deliveryCharges) || 0) : 0;
      const finalTotal = cartTotal + deliveryFee;

      const newOrder = {
        order_id: generateDailyOrderId(orders),
        customer_name: (type === 'Dine-In' && !customerDetails.name) ? 'Dine-In Customer' : customerDetails.name,
        customer_phone: (type === 'Dine-In' && !customerDetails.phone) ? '-' : customerDetails.phone,
        customer_address: type === 'Delivery' ? customerDetails.address : '',
        table_number: type === 'Dine-In' ? customerDetails.tableNumber : '',
        items: [...cart],
        total_amount: finalTotal,
        order_type: type,
        status: 'Pending',
        timestamp: new Date().toISOString(),
        payment_status: 'unpaid',
        source: 'POS',
        branch_id: effectiveBranchId || 'branch-chak-104sb',
        delivery_fee: deliveryFee,
        special_instructions: customerDetails.notes
      };
      
      // 0ms instantaneous UI transition: clear cart, close checkout, show receipt modal immediately
      setCart([]);
      setCheckoutModal({ isOpen: false, type: null });
      setCompletedOrder(newOrder);

      // Place order in background without freezing UI
      placeOrder(newOrder, null).catch(err => {
        console.error("Order background sync error:", err);
      });
    } catch (err) {
      console.error("Order placement error:", err);
      alert(err.message || "Failed to place order. Please try again.");
    }
  };

  const [isMobileTicketOpen, setIsMobileTicketOpen] = useState(false);

  const displayCategories = [{ id: 'All', name: 'All Items' }, ...categories];
  const totalCartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const renderTicketContent = () => (
    <>
      <div className="bg-accent text-white p-3.5 sm:p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-black font-heading text-base sm:text-lg tracking-wide uppercase text-secondary">Current Ticket</h2>
          {isMobileTicketOpen && (
            <button 
              onClick={() => setIsMobileTicketOpen(false)}
              className="lg:hidden text-white/70 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-lg">
          {totalCartItemCount} Items
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50/50">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[160px] text-gray-400 gap-2 opacity-50">
            <ShoppingBag className="w-10 h-10" />
            <span className="font-bold text-sm">Ticket is empty</span>
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {cart.map(item => (
              <div key={item.cartItemId} className="bg-white border-2 border-gray-100 rounded-xl p-2.5 sm:p-3 relative comic-shadow-sm">
                <div className="flex justify-between font-bold mb-1 text-accent text-xs sm:text-sm">
                  <span className="truncate pr-2 font-heading font-black">{item.name}</span>
                  <span className="text-primary whitespace-nowrap">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                </div>
                {(item.size || (item.addons && item.addons.length > 0) || item.notes) && (
                  <div className="text-[11px] text-gray-500 mb-2 space-y-0.5">
                    {item.size && <div>Size: {item.size.name}</div>}
                    {item.addons && item.addons.length > 0 && (
                      <div>Addons: {item.addons.map(a => a.name).join(', ')}</div>
                    )}
                    {item.notes && <div className="italic">Note: {item.notes}</div>}
                  </div>
                )}
                <div className="flex justify-between items-center mt-1.5">
                  <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 border border-gray-200">
                    <button 
                      onClick={() => handleUpdateQuantity(item.cartItemId, -1)}
                      className="w-7 h-7 flex items-center justify-center bg-white hover:bg-gray-100 rounded text-accent comic-shadow-sm active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-black w-7 text-center text-accent text-xs sm:text-sm">{item.quantity}</span>
                    <button 
                      onClick={() => handleUpdateQuantity(item.cartItemId, 1)}
                      className="w-7 h-7 flex items-center justify-center bg-white hover:bg-gray-100 rounded text-accent comic-shadow-sm active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button 
                    onClick={() => handleRemoveItem(item.cartItemId)}
                    className="text-gray-400 hover:text-primary transition-colors p-1.5 bg-gray-50 hover:bg-red-50 rounded-lg"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-white p-3 sm:p-4 border-t-2 border-gray-100 shrink-0">
        <div className="flex justify-between items-end mb-3">
          <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] sm:text-xs mb-0.5">Total Amount</span>
          <span className="text-primary font-black font-heading text-2xl sm:text-3xl">Rs. {cartTotal.toFixed(2)}</span>
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={() => {
              setIsMobileTicketOpen(false);
              openCheckout('Takeaway');
            }}
            className="flex flex-col items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 active:translate-y-[0.5px] text-white font-medium py-2.5 sm:py-3 rounded-md shadow-2xs transition-all cursor-pointer border border-blue-700/40"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[11px] sm:text-xs tracking-wide">Takeaway</span>
          </button>
          <button
            onClick={() => {
              setIsMobileTicketOpen(false);
              openCheckout('Dine-In');
            }}
            className="flex flex-col items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:translate-y-[0.5px] text-white font-medium py-2.5 sm:py-3 rounded-md shadow-2xs transition-all cursor-pointer border border-emerald-700/40"
          >
            <Utensils className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[11px] sm:text-xs tracking-wide">Dine-In</span>
          </button>
        </div>
        <button
          onClick={() => {
            setIsMobileTicketOpen(false);
            openCheckout('Delivery');
          }}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover active:translate-y-[0.5px] text-white font-medium py-3 rounded-md shadow-2xs transition-all cursor-pointer border border-primary-hover/50"
        >
          <Bike className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-sm sm:text-base tracking-wide">Delivery</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <header className="bg-white px-3.5 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between border-b border-gray-200 shadow-2xs z-20 relative gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <button 
            onClick={navigateToStaffLogin}
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-700 hover:text-gray-900 font-medium hover:bg-gray-100 px-3 py-2 rounded-md border border-gray-200 shadow-2xs transition-all active:translate-y-[0.5px] cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
            <span className="hidden xs:inline">Exit POS</span>
            <span className="xs:hidden">Exit</span>
          </button>

          {/* Branch Selector */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200 shadow-2xs shrink-0 max-w-[140px] sm:max-w-none">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-semibold uppercase text-gray-500 tracking-wider leading-none">Branch</span>
              <select
                value={selectedBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="bg-transparent font-bold text-xs text-gray-900 focus:outline-none cursor-pointer pr-1 truncate"
              >
                {branches && branches.length > 0 ? (
                  branches.map(br => (
                    <option key={br.id} value={br.id} className="text-gray-900 font-medium">
                      {br.name}
                    </option>
                  ))
                ) : (
                  <option value="branch-chak-104sb">Sargodha Main Branch</option>
                )}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2 max-w-xs sm:max-w-md w-full bg-white rounded-md px-3 py-1.5 sm:py-2 border border-gray-250 focus-within:border-primary transition-colors shadow-2xs">
            <span className="text-gray-400 font-medium text-xs whitespace-nowrap hidden sm:inline">Search:</span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-gray-900 font-medium text-xs sm:text-sm placeholder:text-gray-400 min-w-0"
              placeholder="Search food item..."
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-700">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-3 bg-gray-50 px-4 py-1.5 rounded-md border border-gray-200 shrink-0">
          <div className="text-primary font-bold font-heading text-lg tracking-tight">{formattedTime}</div>
          <div className="w-px h-5 bg-gray-300"></div>
          <div className="text-gray-600 font-medium text-xs">{formattedDate}</div>
        </div>
      </header>

      {/* Mobile/Tablet Category Pills Bar (<1024px) */}
      <div className="flex lg:hidden bg-white border-b border-gray-200 px-3 py-2 gap-1.5 overflow-x-auto no-scrollbar shrink-0 z-10">
        {displayCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`py-1.5 px-3.5 text-xs font-medium whitespace-nowrap rounded-md transition-all shrink-0 cursor-pointer border ${
              activeCategory === cat.id 
                ? 'bg-primary text-white border-primary-hover shadow-2xs' 
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Left Sidebar - Categories (>= 1024px) */}
        <div className="hidden lg:flex w-48 xl:w-56 bg-white border-r border-gray-200 flex-col overflow-y-auto shrink-0 p-3 space-y-1.5 z-10">
          {displayCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`py-2.5 px-3.5 text-left text-xs sm:text-sm font-medium transition-all rounded-md cursor-pointer border ${
                activeCategory === cat.id 
                  ? 'bg-primary text-white border-primary-hover shadow-2xs' 
                  : 'bg-white text-gray-700 border-transparent hover:bg-gray-100/70 hover:text-gray-900'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Central Product Grid Area */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden pb-16 lg:pb-0">
          <div className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-4">
              {filteredProducts.map(product => {
                const displayPrice = product.has_sizes && product.sizes?.length > 0 
                  ? Math.min(...product.sizes.map(s => s.price)) 
                  : product.price;

                return (
                  <button
                    key={product.id}
                    onClick={() => {
                      if(product.is_available) {
                        setCustomizingProduct(product);
                      }
                    }}
                    disabled={!product.is_available}
                    className={`relative flex flex-col p-2.5 sm:p-3.5 rounded-lg text-left transition-all ${
                      product.is_available 
                        ? 'bg-amber-400/90 hover:bg-amber-400 border border-amber-300 shadow-2xs cursor-pointer active:translate-y-[0.5px]' 
                        : 'bg-gray-200 cursor-not-allowed opacity-70 border border-transparent'
                    }`}
                    style={{ minHeight: '110px' }}
                  >
                    <div className="flex items-start w-full gap-2 sm:gap-3 mb-2">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-md object-cover bg-white shadow-2xs shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-white/50 shadow-2xs shrink-0"></div>
                      )}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="font-bold text-gray-900 leading-tight text-xs sm:text-sm line-clamp-2">
                          {product.name}
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <span className="bg-white text-primary font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-xs sm:text-sm shadow-2xs inline-block">
                        Rs. {Number(displayPrice).toFixed(2)}
                      </span>
                    </div>
                    {!product.is_available && (
                      <div className="absolute inset-0 bg-white/75 flex items-center justify-center rounded-lg backdrop-blur-[1px]">
                        <span className="bg-primary text-white px-2.5 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider rounded-md shadow-2xs">Out of Stock</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-gray-400 font-bold gap-3">
                <span className="text-4xl">🐔</span>
                <p className="text-sm">No products found in this category.</p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Right Sidebar - Ticket (>= 1024px) */}
        <div className="hidden lg:flex w-80 xl:w-96 bg-white border-l-2 border-gray-200 flex-col z-20 shrink-0 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.03)]">
          {renderTicketContent()}
        </div>
      </div>

      {/* Mobile/Tablet Sticky Floating Ticket Bar (<1024px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-accent text-white p-3 border-t-2 border-secondary flex items-center justify-between z-30 comic-shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-secondary text-accent font-black text-xs px-2.5 py-1 rounded-lg">
            {totalCartItemCount} items
          </div>
          <div className="text-base font-black text-white font-heading">
            Rs. {cartTotal.toFixed(2)}
          </div>
        </div>
        <button
          onClick={() => setIsMobileTicketOpen(true)}
          className="bg-primary hover:bg-primary-hover active:scale-95 text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl comic-border-sm comic-shadow-sm flex items-center gap-1.5"
        >
          <ShoppingBag className="w-4 h-4" /> View Ticket
        </button>
      </div>

      {/* Mobile Ticket Slide-Up Bottom Drawer / Overlay */}
      {isMobileTicketOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
          <div className="bg-white rounded-t-3xl w-full max-h-[85vh] flex flex-col overflow-hidden comic-shadow-xl animate-slide-up">
            {renderTicketContent()}
          </div>
        </div>
      )}

      {/* Product Customizer Modal */}
      {customizingProduct && (
        <ProductCustomizerModal
          product={customizingProduct}
          onClose={() => setCustomizingProduct(null)}
          onAdd={handleAddCustomizedItem}
          addons={addons}
          selectedBranchId={selectedBranchId}
        />
      )}

      {/* Checkout Modal */}
      {checkoutModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden comic-shadow-xl animate-scale-up flex flex-col max-h-[90vh]">
            <div className="bg-accent px-6 py-4 flex justify-between items-center text-white">
              <h2 className="font-heading font-black text-xl uppercase tracking-wide text-secondary">
                {checkoutModal.type} Details
              </h2>
              <button onClick={() => setCheckoutModal({ isOpen: false, type: null })} className="text-white/60 hover:text-white transition-colors bg-white/10 p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCheckoutSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
              {checkoutModal.type === 'Dine-In' && (
                <div>
                  <label className="block text-accent font-bold text-sm mb-1.5">Table Number *</label>
                  <input
                    type="text"
                    required
                    value={customerDetails.tableNumber}
                    onChange={(e) => setCustomerDetails({...customerDetails, tableNumber: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-accent focus:border-secondary focus:outline-none transition-colors text-lg"
                    placeholder="e.g. 5, T1, VIP-2"
                    autoFocus
                  />
                </div>
              )}

              {(checkoutModal.type === 'Takeaway' || checkoutModal.type === 'Delivery') && (
                <>
                  <div>
                    <label className="block text-accent font-bold text-sm mb-1.5">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={customerDetails.name}
                      onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2.5 font-bold text-accent focus:border-secondary focus:outline-none transition-colors"
                      placeholder="Enter name"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-accent font-bold text-sm mb-1.5">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={customerDetails.phone}
                      onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2.5 font-bold text-accent focus:border-secondary focus:outline-none transition-colors"
                      placeholder="Enter phone"
                    />
                  </div>
                </>
              )}

              {checkoutModal.type === 'Delivery' && (
                <>
                  <div>
                    <label className="block text-accent font-bold text-sm mb-1.5">Delivery Address *</label>
                    <textarea
                      required
                      value={customerDetails.address}
                      onChange={(e) => setCustomerDetails({...customerDetails, address: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2.5 font-bold text-accent focus:border-secondary focus:outline-none transition-colors min-h-[80px]"
                      placeholder="Enter full address"
                    />
                  </div>
                  <div>
                    <label className="block text-accent font-bold text-sm mb-1.5">Delivery Charges</label>
                    <input
                      type="number"
                      min="0"
                      value={customerDetails.deliveryCharges}
                      onChange={(e) => setCustomerDetails({...customerDetails, deliveryCharges: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2.5 font-bold text-accent focus:border-secondary focus:outline-none transition-colors"
                      placeholder="e.g. 150"
                    />
                  </div>
                  <div>
                    <label className="block text-accent font-bold text-sm mb-1.5">Notes (Optional)</label>
                    <textarea
                      value={customerDetails.notes}
                      onChange={(e) => setCustomerDetails({...customerDetails, notes: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2.5 font-bold text-accent focus:border-secondary focus:outline-none transition-colors min-h-[60px]"
                      placeholder="Any specific instructions?"
                    />
                  </div>
                </>
              )}
              
              <div className="pt-4 border-t-2 border-gray-100 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-500 text-sm">Total to Pay</span>
                  <span className="font-heading font-black text-2xl text-primary">
                    Rs. {(cartTotal + (checkoutModal.type === 'Delivery' ? (Number(customerDetails.deliveryCharges) || 0) : 0)).toFixed(2)}
                  </span>
                </div>
                <button
                  type="submit"
                  className="w-full bg-secondary hover:bg-secondary-hover text-accent font-black font-heading text-lg py-4 rounded-xl comic-shadow-sm comic-hover uppercase tracking-widest transition-colors"
                >
                  Confirm Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completed Order Receipt Modal */}
      {completedOrder && (
        <ReceiptModal 
          order={completedOrder} 
          branches={branches}
          onClose={() => setCompletedOrder(null)} 
        />
      )}
    </div>
  );
}
