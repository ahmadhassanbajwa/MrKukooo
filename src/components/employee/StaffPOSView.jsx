import { useState, useEffect, useMemo } from 'react';
import { Bike, ShoppingBag, Trash2, Plus, Minus, ArrowLeft, Utensils, X } from 'lucide-react';
import { checkProductAvailability } from '../../utils/productUtils';
import ProductCustomizerModal from '../customer/ProductCustomizerModal';
import ReceiptModal from '../customer/ReceiptModal';

export default function StaffPOSView({
  categories = [],
  products = [],
  addons = [],
  ingredients = [],
  placeOrder,
  navigateToStaffLogin,
}) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cart, setCart] = useState([]);
  
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

  // Augmented products with availability
  const augmentedProducts = useMemo(() => {
    return products.map(prod => ({ 
      ...prod, 
      is_available: checkProductAvailability(prod, products, ingredients)
    }));
  }, [products, ingredients]);

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

  const handleCheckoutSubmit = async (e) => {
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
        order_id: `KUKOOO-${Math.floor(1000 + Math.random() * 9000)}`,
        customer_name: (type === 'Dine-In' && !customerDetails.name) ? 'Dine-In Customer' : customerDetails.name,
        customer_phone: (type === 'Dine-In' && !customerDetails.phone) ? '-' : customerDetails.phone,
        customer_address: type === 'Delivery' ? customerDetails.address : '',
        table_number: type === 'Dine-In' ? customerDetails.tableNumber : '',
        items: cart,
        total_amount: finalTotal,
        order_type: type,
        status: 'pending',
        timestamp: new Date().toISOString(),
        payment_status: 'unpaid',
        source: 'POS',
        delivery_fee: deliveryFee,
        special_instructions: customerDetails.notes
      };
      
      await placeOrder(newOrder, null);
      setCart([]);
      setCheckoutModal({ isOpen: false, type: null });
      setCompletedOrder(newOrder);
    } catch (err) {
      console.error(err);
    }
  };

  const displayCategories = [{ id: 'All', name: 'All Items' }, ...categories];

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <header className="bg-white px-6 py-3 flex items-center justify-between border-b-4 border-secondary comic-shadow-sm z-20 relative">
        <div className="flex items-center gap-6 flex-1">
          <button 
            onClick={navigateToStaffLogin}
            className="flex items-center gap-2 text-sm text-primary font-bold font-heading uppercase tracking-wide hover:bg-gray-50 px-4 py-2 rounded-xl comic-border-sm comic-shadow-sm comic-hover"
          >
            <ArrowLeft className="w-4 h-4" /> Exit POS
          </button>
          
          <div className="flex items-center gap-3 max-w-md w-full bg-gray-50 rounded-xl px-4 py-2 border-2 border-gray-200 focus-within:border-secondary transition-colors">
            <span className="text-gray-500 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Search:</span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-accent font-bold"
              placeholder="Type product name..."
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-gray-50 px-5 py-2 rounded-xl border-2 border-gray-200">
          <div className="text-primary font-black font-heading text-xl tracking-tight">{formattedTime}</div>
          <div className="w-px h-6 bg-gray-300"></div>
          <div className="text-accent font-bold text-sm uppercase tracking-wide">{formattedDate}</div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Categories */}
        <div className="w-56 bg-white border-r-2 border-gray-200 flex flex-col overflow-y-auto shrink-0 p-3 space-y-2 z-10">
          {displayCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`py-3 px-4 text-left text-sm font-black font-heading uppercase tracking-wide transition-all rounded-xl ${
                activeCategory === cat.id 
                  ? 'bg-primary text-white comic-shadow-sm translate-x-1' 
                  : 'bg-gray-50 text-accent hover:bg-gray-100 hover:translate-x-1'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Central Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Product Grid */}
          <div className="flex-1 p-6 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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
                    className={`relative flex flex-col p-3 rounded-2xl text-left comic-hover ${
                      product.is_available 
                        ? 'bg-secondary comic-shadow-sm cursor-pointer border-2 border-secondary hover:border-white' 
                        : 'bg-gray-200 cursor-not-allowed opacity-70 border-2 border-transparent'
                    }`}
                    style={{ minHeight: '120px' }}
                  >
                    <div className="flex items-start w-full gap-3 mb-2">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="w-14 h-14 rounded-xl object-cover bg-white comic-shadow-sm"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-white/50 comic-shadow-sm"></div>
                      )}
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="font-black font-heading text-accent leading-tight text-sm line-clamp-2">
                          {product.name}
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <span className="bg-white/90 text-primary font-black px-2.5 py-1 rounded-lg text-sm comic-shadow-sm inline-block">
                        Rs. {Number(displayPrice).toFixed(2)}
                      </span>
                    </div>
                    {!product.is_available && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
                        <span className="bg-primary text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg comic-shadow-sm">Out of Stock</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 font-bold gap-3">
                <span className="text-4xl">🐔</span>
                <p>No products found in this category.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Ticket */}
        <div className="w-[340px] bg-white border-l-2 border-gray-200 flex flex-col z-20 shrink-0 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.03)]">
          <div className="bg-accent text-white p-4 flex items-center justify-between">
            <h2 className="font-black font-heading text-lg tracking-wide uppercase text-secondary">Current Ticket</h2>
            <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-lg">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} Items
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 opacity-50">
                <ShoppingBag className="w-10 h-10" />
                <span className="font-bold text-sm">Ticket is empty</span>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.cartItemId} className="bg-white border-2 border-gray-100 rounded-xl p-3 relative comic-shadow-sm">
                    <div className="flex justify-between font-bold mb-1 text-accent text-sm">
                      <span className="truncate pr-2 font-heading font-black">{item.name}</span>
                      <span className="text-primary whitespace-nowrap">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    {/* Render size and addons if they exist to replicate full order structure visually */}
                    {(item.size || (item.addons && item.addons.length > 0) || item.notes) && (
                      <div className="text-xs text-gray-500 mb-3 space-y-1">
                        {item.size && <div>Size: {item.size.name}</div>}
                        {item.addons && item.addons.length > 0 && (
                          <div>Addons: {item.addons.map(a => a.name).join(', ')}</div>
                        )}
                        {item.notes && <div className="italic">Note: {item.notes}</div>}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-200">
                        <button 
                          onClick={() => handleUpdateQuantity(item.cartItemId, -1)}
                          className="w-7 h-7 flex items-center justify-center bg-white hover:bg-gray-100 rounded text-accent comic-shadow-sm"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-black w-8 text-center text-accent">{item.quantity}</span>
                        <button 
                          onClick={() => handleUpdateQuantity(item.cartItemId, 1)}
                          className="w-7 h-7 flex items-center justify-center bg-white hover:bg-gray-100 rounded text-accent comic-shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button 
                        onClick={() => handleRemoveItem(item.cartItemId)}
                        className="text-gray-400 hover:text-primary transition-colors p-2 bg-gray-50 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-white p-4 border-t-2 border-gray-100">
            <div className="flex justify-between items-end mb-4">
              <span className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-1">Total Amount</span>
              <span className="text-primary font-black font-heading text-3xl">Rs. {cartTotal.toFixed(2)}</span>
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => openCheckout('Takeaway')}
                className="flex flex-col items-center justify-center gap-1 bg-blue-500 hover:bg-blue-600 text-white font-black py-3 rounded-xl comic-shadow-sm comic-hover transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="text-xs uppercase tracking-wider">Takeaway</span>
              </button>
              <button
                onClick={() => openCheckout('Dine-In')}
                className="flex flex-col items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl comic-shadow-sm comic-hover transition-colors"
              >
                <Utensils className="w-5 h-5" />
                <span className="text-xs uppercase tracking-wider">Dine-In</span>
              </button>
            </div>
            <button
              onClick={() => openCheckout('Delivery')}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-black py-4 rounded-xl comic-shadow-sm comic-hover transition-colors"
            >
              <Bike className="w-6 h-6" />
              <span className="text-lg uppercase tracking-widest">Delivery</span>
            </button>
          </div>
        </div>
      </div>

      {/* Product Customizer Modal */}
      {customizingProduct && (
        <ProductCustomizerModal
          product={customizingProduct}
          onClose={() => setCustomizingProduct(null)}
          onAdd={handleAddCustomizedItem}
          addons={addons}
          selectedBranchId={null} // Global POS doesn't currently filter by branch in this view unless we pass it, but for simplicity we allow all
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
          onClose={() => setCompletedOrder(null)} 
        />
      )}
    </div>
  );
}
