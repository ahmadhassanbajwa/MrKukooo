import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, MapPin, Clock, ArrowLeft } from 'lucide-react';
import { checkProductAvailability } from '../../utils/productUtils';
import HeroCarousel from './HeroCarousel';
import MenuSection from './MenuSection';
import HomepageSectionRow from './HomepageSectionRow';
import ProductCustomizerModal from './ProductCustomizerModal';
import CartDrawer from './CartDrawer';
import OrderTrackerDrawer from './OrderTrackerDrawer';
import ReceiptModal from './ReceiptModal';
import ReviewSection from './ReviewSection';
import { getHours, formatTime, DAYS_OF_WEEK } from '../../utils/restaurantHours';
import { getWhatsAppLink } from '../../utils/whatsapp';

export default function CustomerView({
  categories = [],
  products = [],
  offers = [],
  vouchers = [],
  orders = [],
  addons = [],
  homepageSections = [],
  branches = [],
  ingredients = [],
  placeOrder,
  onCancelOrder = async (orderId) => {
    console.log("Cancel order:", orderId);
  },
  navigateToStaffLogin,
  isPOS = false
}) {
  const normalizedBranches = useMemo(() => {
    return (branches || []).map(br => {
      if (br.id === 'branch-chak-104sb') {
        return {
          ...br,
          address: 'chak 104 SB luqman Chowk, Sargodha 40100',
          lat: 32.000028,
          lng: 72.694944
        };
      }
      return br;
    });
  }, [branches]);

  const augmentedProducts = useMemo(() => {
    return products.map(prod => {
      return { 
        ...prod, 
        is_available: checkProductAvailability(prod, products, ingredients)
      };
    });
  }, [products, ingredients]);

  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    let saved = sessionStorage.getItem('kukooo_customer_branch') || '';
    // If the saved branch doesn't exist in our branches list, discard it
    if (saved && !branches.find(b => b.id === saved)) {
      sessionStorage.removeItem('kukooo_customer_branch');
      saved = '';
    }
    return saved;
  });

  useEffect(() => {
    if (selectedBranchId) {
      sessionStorage.setItem('kukooo_customer_branch', selectedBranchId);
    }
  }, [selectedBranchId]);

  const currentBranch = normalizedBranches.find(b => b.id === selectedBranchId) || 
                        normalizedBranches.find(b => b.id === 'branch-chak-104sb') || 
                        normalizedBranches[0] || {
    id: 'default',
    name: 'Sargodha Main Branch',
    address: 'Luqman Chowk, Sargodha, Punjab',
    lat: 32.000028,
    lng: 72.694944,
    maps_link: ''
  };

  const [cart, setCart] = useState(() => {
    try {
      const saved = sessionStorage.getItem('kukooo_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    sessionStorage.setItem('kukooo_cart', JSON.stringify(cart));
  }, [cart]);

  const [viewMode, setViewMode] = useState(() => {
    return window.location.hash === '#menu' ? 'menu' : 'home';
  }); // 'home' | 'menu'

  useEffect(() => {
    if (viewMode === 'menu' && window.location.hash !== '#menu') {
      window.history.pushState(null, '', '#menu');
    } else if (viewMode === 'home' && window.location.hash === '#menu') {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
  }, [viewMode]);

  useEffect(() => {
    const handlePopState = () => {
      setViewMode(window.location.hash === '#menu' ? 'menu' : 'home');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);


  // Offers banner filtering
  const activeOffers = offers.filter(o => {
    if (!o.active_status) return false;
    if (selectedBranchId && o.branch_ids && o.branch_ids.length > 0) {
      return o.branch_ids.includes(selectedBranchId);
    }
    return true;
  });

  // Customize Item Handlers
  const handleOpenCustomizer = (product) => {
    setCustomizingProduct(product);
  };

  const handleAddCustomizedItem = ({ product, size, addons, quantity, notes, totalPricePerUnit, unitCost }) => {
    const newCartItem = {
      cartItemId: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      id: product.id,
      product_id: product.id,
      name: product.name,
      image_url: product.image_url,
      price: product.price,
      size: size || null,
      quantity,
      addons,
      totalPricePerUnit,
      unitCost,
      notes
    };

    setCart(prev => [...prev, newCartItem]);
    setCustomizingProduct(null);
    if (viewMode !== 'menu' || window.innerWidth < 1024) {
      setIsCartOpen(true);
    }
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

  const handleRemoveFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const handleBannerClick = (offer) => {
    if (!offer.redirect_type || offer.redirect_type === 'none') return;

    if (offer.redirect_type === 'category') {
      const targetCategory = offer.redirect_target;
      if (targetCategory) {
        setActiveCategory(targetCategory);
        setViewMode('menu');
      }
    } else if (offer.redirect_type === 'product') {
      const targetProductId = offer.redirect_target;
      const targetProd = augmentedProducts.find(p => p.id.toString() === targetProductId.toString());
      if (targetProd) {
        handleOpenCustomizer(targetProd);
      }
    }
  };



  const handleCheckoutSuccess = (order) => {
    setCart([]);
    setIsCartOpen(false);
    setLastPlacedOrder(order);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans relative">
      {isPOS && (
        <div className="bg-accent text-white px-4 py-2 flex justify-between items-center text-xs font-black z-50 relative">
          <span className="animate-pulse">🔴 POS TERMINAL MODE</span>
          <button 
            onClick={navigateToStaffLogin}
            className="bg-primary hover:bg-primary-hover text-white px-3 py-1 rounded-md transition-colors comic-border-sm"
          >
            Back to Dashboard
          </button>
        </div>
      )}
      {/* Header / Navbar */}
      <header className="bg-accent text-white px-3 py-3 sm:px-6 sm:py-4 border-b-4 border-secondary flex justify-between items-center gap-2 comic-shadow-sm sticky top-0 z-40">
        <div 
          className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0"
          onClick={() => {
            setViewMode('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white comic-border-sm flex items-center justify-center overflow-hidden shrink-0">
            <img src="/logo.png" alt="Mr. Kukooo" className="w-full h-full object-cover scale-110" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-base sm:text-xl lg:text-2xl font-black text-secondary tracking-tight leading-none whitespace-nowrap">Mr. Kukooo</h1>
            <span className="text-[8px] sm:text-[10px] text-white/50 font-bold uppercase tracking-wider whitespace-nowrap mt-0.5">Lick the spoons!</span>
          </div>
        </div>

        {/* Branch Context Selector & Control Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {normalizedBranches.length > 0 && (
            <div className="hidden md:flex items-center gap-1 bg-white/10 px-3.5 py-1.5 rounded-xl border-2 border-white/30">
              <MapPin className="w-3.5 h-3.5 text-secondary" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent text-white font-black text-xs border-none focus:outline-none pr-4 cursor-pointer"
              >
                {normalizedBranches.map(b => (
                  <option key={b.id} value={b.id} className="bg-accent text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setIsTrackerOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 sm:py-2 bg-white/10 border-2 border-white text-white font-black text-[10px] sm:text-xs rounded-lg sm:rounded-xl comic-shadow-sm comic-hover cursor-pointer whitespace-nowrap"
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary shrink-0" /> 
            <span className="hidden sm:inline">Track Order</span>
            <span className="sm:hidden">Track</span>
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 bg-secondary text-accent font-black text-[10px] sm:text-xs rounded-lg sm:rounded-xl comic-border-sm comic-shadow-sm comic-hover relative cursor-pointer whitespace-nowrap"
          >
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> 
            <span>Cart</span>
            {cart.length > 0 && (
              <span className="absolute top-[-6px] right-[-6px] sm:top-[-8px] sm:right-[-8px] w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-white border-2 border-accent text-[9px] sm:text-[10px] flex items-center justify-center font-black">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Full-width Banner Area */}
      {viewMode === 'home' && activeOffers.length > 0 && (
        <section className="w-full">
          <HeroCarousel activeOffers={activeOffers} onOfferClick={handleBannerClick} />
        </section>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 space-y-12 flex-1 w-full overflow-hidden sm:overflow-visible">
        {viewMode === 'home' ? (
          <>

            {/* 1. Permanent Default "Explore Menu" Section */}
            <div className="space-y-10">
              {categories.length > 0 && (
                <HomepageSectionRow
                  section={{ id: 'explore-menu', name: 'Explore Menu' }}
                  items={categories}
                  type="categories"
                  onItemClick={(catId) => { 
                    setActiveCategory(catId); 
                    setViewMode('menu'); 
                    setTimeout(() => {
                      const element = document.getElementById(catId);
                      if (element) {
                        const yOffset = -150; 
                        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      } else {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }, 150);
                  }}
                  onSeeMore={() => { setViewMode('menu'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                />
              )}

              {/* 2. Dynamic Manager-Sequenced Product Sections */}
              {homepageSections
                .filter(sec => sec.is_active && sec.branch_ids.includes(currentBranch.id) && sec.type !== 'categories' && !sec.name.toLowerCase().includes('explore menu'))
                .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                .map(section => {
                  const isSpecialDealsSection = section.name.toLowerCase().includes('special deals');
                  const items = augmentedProducts
                    .filter(p => p.homepage_sections && (p.homepage_sections.includes(section.id) || (isSpecialDealsSection && p.homepage_sections.includes('sec-special-deals'))));

                  return (
                    <HomepageSectionRow
                      key={section.id}
                      section={section}
                      items={items}
                      type="products"
                      onItemClick={handleOpenCustomizer}
                    />
                  );
                })}
            </div>
          </>
        ) : (
          <section className="space-y-6 animate-fade-in relative">
            <div className="flex justify-between items-end border-b border-gray-200 pb-4">
              <div>
                <button 
                  onClick={() => setViewMode('home')}
                  className="flex items-center gap-1 text-xs text-primary font-black uppercase tracking-wider mb-2 hover:text-primary-hover transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
                </button>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-accent mt-0.5 uppercase">Explore Menu</h2>
              </div>
              <span className="text-xs font-bold text-gray-400">Serving from {currentBranch.name}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                <MenuSection
                  categories={categories}
                  products={augmentedProducts}
                  onCustomize={handleOpenCustomizer}
                  selectedBranchId={currentBranch.id}
                  initialActiveCategory={activeCategory}
                />
              </div>
              <div className="hidden lg:block lg:col-span-4 relative">
                <CartDrawer
                  isInline={true}
                  isOpen={true} // always open inline
                  onClose={() => {}} // no-op for inline
                  cart={cart}
                  updateQuantity={handleUpdateQuantity}
                  removeFromCart={handleRemoveFromCart}
                  vouchers={vouchers}
                  products={augmentedProducts}
                  orders={orders}
                  selectedBranchId={selectedBranchId}
                  currentBranch={currentBranch}
                  placeOrder={placeOrder}
                  isPOS={isPOS}
                  onCheckoutSuccess={handleCheckoutSuccess}
                />
              </div>
            </div>
          </section>
        )}

        {/* Store Locations Map + Customer Reviews Section */}
        {normalizedBranches.length > 0 && (
          <ReviewSection
            branches={normalizedBranches}
            selectedBranchId={selectedBranchId}
            onSelectBranch={setSelectedBranchId}
            orders={orders}
          />
        )}
      </main>

      {/* Site Footer — mirrors navbar colour and weight */}
      <footer className="bg-accent text-white mt-16 border-t-4 border-secondary">
        {/* Main footer content row */}
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-8 items-center">

          {/* Left — Logo & brand (same as navbar) */}
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-white comic-border-sm flex items-center justify-center overflow-hidden shrink-0">
              <img src="/logo.png" alt="Mr. Kukooo" className="w-full h-full object-cover scale-110" />
            </div>
            <div>
              <p className="text-xl font-black text-secondary tracking-tight leading-tight">Mr. Kukooo</p>
              <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Lick the spoons!</span>
            </div>
          </div>

          {/* Middle — Instagram link and tagline */}
          <div className="flex flex-col items-center justify-center gap-1.5 text-center">
            <a 
              href="https://instagram.com/mrkukooo" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors cursor-pointer"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
              Serving the best fast food in town!
            </span>
          </div>

          {/* Right — Hours, WhatsApp, Staff Portal */}
          <div className="flex flex-col items-center sm:items-end gap-2">

            {/* Restaurant timings — live from manager-configured schedule */}
            {(() => {
              const hours = getHours();
              const todayIdx = (new Date().getDay() + 6) % 7; // Monday=0
              const todayName = DAYS_OF_WEEK[todayIdx];
              const slot = hours[todayName];
              return (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Today</span>
                  <span className="text-sm font-black text-secondary">
                    {slot?.open
                      ? `${formatTime(slot.start)} – ${formatTime(slot.end)}`
                      : 'Closed Today'
                    }
                  </span>
                </div>
              );
            })()}

            {/* WhatsApp contact link */}
            <a
              href={getWhatsAppLink('+923094101580', '')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-black text-white hover:text-secondary transition-colors"
              aria-label="Chat with us on WhatsApp"
            >
              {/* WhatsApp SVG icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-400">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              +92 309 4101580
            </a>

            {/* Discreet staff portal — same dark bg blends it in; visible only on hover */}
            <button
              onClick={navigateToStaffLogin}
              className="text-[10px] font-bold uppercase tracking-wider text-white/20 hover:text-primary hover:underline transition-colors cursor-pointer"
              aria-label="Staff portal access"
            >
              🔑 Staff Portal
            </button>
          </div>
        </div>

        {/* Copyright bar — centred at the very bottom */}
        <div className="border-t border-white/10 py-3 text-center">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
            © 2026 Mr. Kukooo Kitchen · All Rights Reserved
          </span>
        </div>
      </footer>

      {/* Product Customizer Overlay Modal */}
      {customizingProduct && (
        <ProductCustomizerModal
          product={customizingProduct}
          onClose={() => setCustomizingProduct(null)}
          onAdd={handleAddCustomizedItem}
          addons={addons}
          selectedBranchId={selectedBranchId}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        updateQuantity={handleUpdateQuantity}
        removeFromCart={handleRemoveFromCart}
        vouchers={vouchers}
        products={products}
        orders={orders}
        selectedBranchId={selectedBranchId}
        currentBranch={currentBranch}
        placeOrder={placeOrder}
        onCheckoutSuccess={handleCheckoutSuccess}
        onAddRecommendation={handleOpenCustomizer}
        isPOS={isPOS}
      />

      {/* Tracker Drawer */}
      <OrderTrackerDrawer
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        orders={orders}
        onCancelOrder={onCancelOrder}
      />

      {/* Post Checkout Success Receipt Overview */}
      {lastPlacedOrder && (
        <ReceiptModal
          order={lastPlacedOrder}
          onClose={() => setLastPlacedOrder(null)}
        />
      )}
    </div>
  );
}
