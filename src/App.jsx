import React, { useState, useEffect, Suspense } from 'react';
import { 
  isSupabaseConfigured,
  seedDatabaseIfEmpty,
  INITIAL_CATEGORIES,
  INITIAL_HOMEPAGE_SECTIONS,
  INITIAL_BRANCHES,
  getCategories,
  saveCategory,
  deleteCategory,
  getProducts,
  saveProduct,
  deleteProduct,
  getOffers,
  saveOffer,
  deleteOffer,
  getOrders,
  getAddons,
  saveAddon,
  deleteAddon,
  placeOrderInDB,
  updateOrderStatusInDB,
  updateOrderDetailsInDB,
  subscribeToOrders,
  getHomepageSections,
  saveHomepageSection,
  deleteHomepageSection,
  deleteOrderInDB,
  getBranches,
  saveBranch,
  deleteBranch,
  subscribeToProducts,
  updateProductStock,
  getIngredients,
  saveIngredient,
  deleteIngredient,
  updateIngredientStock,
  subscribeToIngredients,
  getArchivedAnalytics,
  archiveAndPurgeOrders,
  INITIAL_VOUCHERS,
  INITIAL_VOUCHER_SETTINGS,
  getVouchers,
  saveVoucher,
  deleteVoucher,
  incrementVoucherUsage,
  getVoucherSettings,
  saveVoucherSettings
} from './supabase';
import {
  INITIAL_PRODUCTS,
  INITIAL_OFFERS,
  INITIAL_ORDERS,
  INITIAL_ADDONS,
  INITIAL_INGREDIENTS
} from './mockData';
import { 
  calculateOrderDeductions, 
  checkSizeAvailability, 
  checkProductAvailability, 
  getAvailableQuantity 
} from './utils/productUtils';
import CustomerView from './components/customer/CustomerView';

// Code-split heavy routes to keep initial bundle ultra-lightweight
const StaffLogin = React.lazy(() => import('./components/StaffLogin'));
const ManagerDashboard = React.lazy(() => import('./components/manager/ManagerDashboard'));
const EmployeeDashboard = React.lazy(() => import('./components/employee/EmployeeDashboard'));
const StaffPOSView = React.lazy(() => import('./components/employee/StaffPOSView'));

const getCachedData = (key, fallback) => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    return fallback;
  } catch {
    return fallback;
  }
};

export default function App() {
  // Stale-While-Revalidate: hydrate instantly from cache or initial defaults (0ms wait)
  const [categories, setCategories] = useState(() => getCachedData('kukooo_categories', INITIAL_CATEGORIES));
  const [products, setProducts] = useState(() => getCachedData('kukooo_products', INITIAL_PRODUCTS));
  const [offers, setOffers] = useState(() => getCachedData('kukooo_offers', INITIAL_OFFERS));
  const [orders, setOrders] = useState(() => getCachedData('kukooo_orders', INITIAL_ORDERS));
  const [addons, setAddons] = useState(() => getCachedData('kukooo_addons', INITIAL_ADDONS));
  const [homepageSections, setHomepageSections] = useState(() => getCachedData('kukooo_homepage_sections', INITIAL_HOMEPAGE_SECTIONS));
  const [branches, setBranches] = useState(() => getCachedData('kukooo_branches', INITIAL_BRANCHES));
  const [ingredients, setIngredients] = useState(() => getCachedData('kukooo_ingredients', INITIAL_INGREDIENTS));
  const [vouchers, setVouchers] = useState(() => getCachedData('kukooo_vouchers', INITIAL_VOUCHERS));
  const [voucherSettings, setVoucherSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('kukooo_voucher_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return INITIAL_VOUCHER_SETTINGS;
  });
  const [archivedAnalytics, setArchivedAnalytics] = useState(() => getCachedData('kukooo_order_archives', []));
  const [showSplash, setShowSplash] = useState(true);

  // Smooth 1-second splash loading screen timer
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 1000);
    return () => clearTimeout(splashTimer);
  }, []);

  // Routing and Staff Session
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('kukooo_session') || 'home';
  }); // 'home' | 'staff-login' | 'manager' | 'employee' | 'pos'
  
  const [staffSession, setStaffSession] = useState(() => {
    return localStorage.getItem('kukooo_session') || null; // 'manager' | 'employee' | null
  });

  // Calculate active view before effects
  let activeView = currentView;
  if ((activeView === 'manager' && staffSession !== 'manager') ||
      (activeView === 'employee' && staffSession !== 'employee')) {
    activeView = 'staff-login';
  }

  // --- FAST HYDRATION & REALTIME LIFECYCLE ---
  useEffect(() => {
    let isMounted = true;

    const initializeAppBackend = async () => {
      // Run database seed check in background
      seedDatabaseIfEmpty();

      try {
        const [cats, prods, offs, ords, adds, secs, brs, ings, vchs, vchSettings] = await Promise.all([
          getCategories(),
          getProducts(),
          getOffers(),
          getOrders(),
          getAddons(),
          getHomepageSections(),
          getBranches(),
          getIngredients(),
          getVouchers(),
          getVoucherSettings()
        ]);
        
        if (isMounted) {
          if (cats && cats.length) setCategories(cats);
          if (prods && prods.length) setProducts(prods);
          if (offs && offs.length) setOffers(offs);
          if (ords && ords.length) setOrders(ords);
          if (adds && adds.length) setAddons(adds);
          if (secs && secs.length) setHomepageSections(secs);
          if (brs && brs.length) setBranches(brs);
          if (ings && ings.length) setIngredients(ings);
          if (vchs && vchs.length) setVouchers(vchs);
          if (vchSettings) setVoucherSettings(vchSettings);
        }
      } catch (err) {
        console.error("Error loading initial data from backend:", err);
      }
    };

    initializeAppBackend();

    const unsubscribeOrders = subscribeToOrders((updatedOrders) => {
      if (isMounted && updatedOrders) setOrders(updatedOrders);
    });

    const unsubscribeProducts = subscribeToProducts((updatedProducts) => {
      if (isMounted && updatedProducts) setProducts(updatedProducts);
    });

    const unsubscribeIngredients = subscribeToIngredients((updatedIngredients) => {
      if (isMounted && updatedIngredients) setIngredients(updatedIngredients);
    });

    return () => {
      isMounted = false;
      unsubscribeOrders();
      unsubscribeProducts();
      unsubscribeIngredients();
    };
  }, []);

  // Lazy load analytics archives only when manager view is accessed
  useEffect(() => {
    if (activeView === 'manager' && archivedAnalytics.length === 0) {
      getArchivedAnalytics().then(archs => {
        if (archs && archs.length) setArchivedAnalytics(archs);
      }).catch(console.warn);
    }
  }, [activeView, archivedAnalytics.length]);

  // Sync session state to LocalStorage
  useEffect(() => {
    if (staffSession) {
      localStorage.setItem('kukooo_session', staffSession);
    } else {
      localStorage.removeItem('kukooo_session');
    }
  }, [staffSession]);

  // --- DATA REFRESH HELPER (Targeted / Non-blocking) ---
  const refreshData = async () => {
    try {
      const [cats, prods, offs, ords, adds, secs, brs, ings, vchs, vchSettings] = await Promise.all([
        getCategories(),
        getProducts(),
        getOffers(),
        getOrders(),
        getAddons(),
        getHomepageSections(),
        getBranches(),
        getIngredients(),
        getVouchers(),
        getVoucherSettings()
      ]);
      setCategories(cats);
      setProducts(prods);
      setOffers(offs);
      setOrders(ords);
      setAddons(adds);
      setHomepageSections(secs);
      setBranches(brs);
      setIngredients(ings);
      if (vchs) setVouchers(vchs);
      if (vchSettings) setVoucherSettings(vchSettings);
    } catch (error) {
      console.error("Failed to refresh app data:", error);
    }
  };

  // --- OPTIMISTIC OPERATIONS API ---
  const handleArchiveAndPurgeOrders = async (params) => {
    try {
      const result = await archiveAndPurgeOrders(params);
      // Refresh archives and orders optimistically
      const [newOrds, newArchs] = await Promise.all([getOrders(), getArchivedAnalytics()]);
      setOrders(newOrds);
      setArchivedAnalytics(newArchs);
      return result;
    } catch (err) {
      console.error("Failed to archive and purge orders:", err);
      throw err;
    }
  };

  const placeOrder = async (newOrder) => {
    // 1. Validate inventory and availability for every item and size
    for (const item of (newOrder.items || [])) {
      const pId = (item.product_id || item.id || '').toString();
      const prod = products.find(p => p.id.toString() === pId);
      if (!prod || !prod.is_available) {
        throw new Error(`"${item.name}" is currently unavailable.`);
      }

      const itemQty = parseInt(item.quantity || 1, 10);
      if (item.size && prod.has_sizes && prod.sizes) {
        const matchingSize = prod.sizes.find(s => s.name === item.size.name);
        if (!matchingSize || !checkSizeAvailability(prod, matchingSize, ingredients)) {
          throw new Error(`"${prod.name} (${item.size.name})" is currently unavailable and cannot be ordered.`);
        }
        const availQty = getAvailableQuantity(prod, matchingSize, ingredients, products);
        if (itemQty > availQty) {
          throw new Error(`Only ${availQty} available for "${prod.name} (${item.size.name})". Cannot place order for ${itemQty}.`);
        }
      } else {
        if (!checkProductAvailability(prod, products, ingredients)) {
          throw new Error(`"${prod.name}" is currently unavailable and cannot be ordered.`);
        }
        const availQty = getAvailableQuantity(prod, null, ingredients, products);
        if (itemQty > availQty) {
          throw new Error(`Only ${availQty} available for "${prod.name}". Cannot place order for ${itemQty}.`);
        }
      }
    }

    // 2. Compute stock deductions
    const { ingredientDeductions, productDeductions } = calculateOrderDeductions(newOrder.items || [], products);

    // 3. Optimistic UI: Prepend order to state
    setOrders(prev => [newOrder, ...prev]);

    // Increment voucher usage optimistically
    if (newOrder.voucher_code) {
      setVouchers(prev => prev.map(v =>
        v.code?.toUpperCase() === newOrder.voucher_code?.toUpperCase()
          ? { ...v, times_used: (Number(v.times_used) || 0) + 1 }
          : v
      ));
    }

    // 4. Optimistic UI: Deduct ingredients stock immediately
    setIngredients(prev => prev.map(ing => {
      const deduct = ingredientDeductions[ing.id];
      if (deduct) {
        return {
          ...ing,
          quantity: Math.max(0, parseInt(ing.quantity || 0, 10) - deduct)
        };
      }
      return ing;
    }));

    // 5. Optimistic UI: Deduct legacy product stock immediately
    setProducts(prev => prev.map(p => {
      const deduct = productDeductions[p.id];
      if (deduct) {
        return {
          ...p,
          quantity: Math.max(0, parseInt(p.quantity || 0, 10) - deduct)
        };
      }
      return p;
    }));

    // 6. Persist to DB asynchronously
    try {
      await placeOrderInDB(newOrder, products);
      if (newOrder.voucher_code) {
        await incrementVoucherUsage(newOrder.voucher_code);
      }
    } catch (err) {
      console.error("Failed to place order:", err);
      alert(err.message || "Failed to place order due to insufficient stock.");
      throw err;
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    // Optimistic status update
    setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: newStatus } : o));
    try {
      await updateOrderStatusInDB(orderId, newStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const updateOrderDetails = async (orderId, items, totalAmount, extraFields = {}) => {
    setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, items, total_amount: totalAmount, ...extraFields } : o));
    try {
      await updateOrderDetailsInDB(orderId, items, totalAmount, extraFields);
    } catch (err) {
      console.error("Failed to update order details:", err);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    setOrders(prev => prev.filter(o => o.order_id !== orderId));
    try {
      await deleteOrderInDB(orderId);
    } catch (err) {
      console.error("Failed to delete order:", err);
    }
  };

  const handleSaveProduct = async (prod) => {
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id.toString() === prod.id.toString());
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = prod;
        return next;
      }
      return [...prev, prod];
    });
    try {
      await saveProduct(prod);
    } catch (err) {
      console.error("Failed to save product:", err);
    }
  };

  const handleDeleteProduct = async (id) => {
    setProducts(prev => prev.filter(p => p.id.toString() !== id.toString()));
    try {
      await deleteProduct(id);
    } catch (err) {
      console.error("Failed to delete product:", err);
    }
  };

  const handleSaveCategory = async (id, name, image_url) => {
    setCategories(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], name, ...(image_url ? { image_url } : {}) };
        return next;
      }
      return [...prev, { id, name, image_url }];
    });
    try {
      await saveCategory(id, name, image_url);
    } catch (err) {
      console.error("Failed to save category:", err);
    }
  };

  const handleDeleteCategory = async (id) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    try {
      await deleteCategory(id);
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
  };

  const handleSaveOffer = async (off) => {
    setOffers(prev => {
      const idx = prev.findIndex(o => o.id.toString() === off.id.toString());
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = off;
        return next;
      }
      return [...prev, off];
    });
    try {
      await saveOffer(off);
    } catch (err) {
      console.error("Failed to save offer:", err);
    }
  };

  const handleDeleteOffer = async (id) => {
    setOffers(prev => prev.filter(o => o.id.toString() !== id.toString()));
    try {
      await deleteOffer(id);
    } catch (err) {
      console.error("Failed to delete offer:", err);
    }
  };

  const handleUpdateProductStock = async (id, newQuantity) => {
    const qty = parseInt(newQuantity, 10);
    setProducts(prev => prev.map(p => p.id.toString() === id.toString() ? { ...p, quantity: qty } : p));
    try {
      await updateProductStock(id, qty);
    } catch (err) {
      console.error("Failed to update product stock:", err);
    }
  };

  const handleSaveIngredient = async (ingredient) => {
    setIngredients(prev => {
      const idx = prev.findIndex(i => i.id === ingredient.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = ingredient;
        return next;
      }
      return [...prev, ingredient];
    });
    try {
      await saveIngredient(ingredient);
    } catch (err) {
      console.error("Failed to save ingredient:", err);
    }
  };

  const handleDeleteIngredient = async (id) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
    try {
      await deleteIngredient(id);
    } catch (err) {
      console.error("Failed to delete ingredient:", err);
    }
  };

  const handleUpdateIngredientStock = async (id, newQuantity) => {
    const qty = parseInt(newQuantity, 10);
    setIngredients(prev => prev.map(i => i.id.toString() === id.toString() ? { ...i, quantity: qty } : i));
    try {
      await updateIngredientStock(id, qty);
    } catch (err) {
      console.error("Failed to update ingredient stock:", err);
    }
  };

  const handleSaveAddon = async (addon) => {
    const id = addon.id || `add-${Date.now()}`;
    const newAddon = { ...addon, id };
    setAddons(prev => {
      const idx = prev.findIndex(a => a.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newAddon;
        return next;
      }
      return [...prev, newAddon];
    });
    try {
      await saveAddon(newAddon);
    } catch (err) {
      console.error("Failed to save addon:", err);
    }
  };

  const handleDeleteAddon = async (id) => {
    setAddons(prev => prev.filter(a => a.id !== id));
    try {
      await deleteAddon(id);
    } catch (err) {
      console.error("Failed to delete addon:", err);
    }
  };

  const handleSaveHomepageSection = async (sec) => {
    setHomepageSections(prev => {
      const idx = prev.findIndex(s => s.id === sec.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = sec;
        return next;
      }
      return [...prev, sec];
    });
    try {
      await saveHomepageSection(sec);
    } catch (err) {
      console.error("Failed to save homepage section:", err);
    }
  };

  const handleDeleteHomepageSection = async (id) => {
    setHomepageSections(prev => prev.filter(s => s.id !== id));
    try {
      await deleteHomepageSection(id);
    } catch (err) {
      console.error("Failed to delete homepage section:", err);
    }
  };

  const handleSaveBranch = async (branch) => {
    setBranches(prev => {
      const idx = prev.findIndex(b => b.id === branch.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = branch;
        return next;
      }
      return [...prev, branch];
    });
    try {
      await saveBranch(branch);
    } catch (err) {
      console.error("Failed to save branch:", err);
    }
  };

  const handleDeleteBranch = async (id) => {
    setBranches(prev => prev.filter(b => b.id !== id));
    try {
      await deleteBranch(id);
    } catch (err) {
      console.error("Failed to delete branch:", err);
    }
  };

  const handleSaveVoucher = async (voucher) => {
    setVouchers(prev => {
      const idx = prev.findIndex(v => v.id === voucher.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = voucher;
        return next;
      }
      return [...prev, voucher];
    });
    try {
      await saveVoucher(voucher);
    } catch (err) {
      console.error("Failed to save voucher:", err);
    }
  };

  const handleDeleteVoucher = async (id) => {
    setVouchers(prev => prev.filter(v => v.id !== id));
    try {
      await deleteVoucher(id);
    } catch (err) {
      console.error("Failed to delete voucher:", err);
    }
  };

  const handleSaveVoucherSettings = async (settings) => {
    setVoucherSettings(settings);
    try {
      await saveVoucherSettings(settings);
    } catch (err) {
      console.error("Failed to save voucher settings:", err);
    }
  };

  const handleLogin = (role) => {
    setStaffSession(role);
    setCurrentView(role);
  };

  const handleLogout = () => {
    setStaffSession(null);
    setCurrentView('staff-login');
  };

  if (showSplash) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center font-sans gap-4 transition-all duration-300">
        <div className="w-16 h-16 border-8 border-secondary border-t-primary rounded-full animate-spin"></div>
        <h2 className="text-xl font-black text-accent tracking-tight">Licking the spoons...</h2>
        <p className="text-sm font-bold text-gray-400">Setting up Mr. Kukooo Kitchen</p>
      </div>
    );
  }

  const renderWarningBanner = () => {
    if (isSupabaseConfigured) return null;
    return (
      <div className="bg-amber-500 text-accent font-black py-2 px-4 text-center text-xs border-b-4 border-accent relative z-50">
        ⚠️ Running in LocalStorage Fallback Mode. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to connect to your live database.
      </div>
    );
  };

  const renderView = () => {
    switch (activeView) {
      case 'staff-login':
        return (
          <Suspense fallback={<ViewLoader />}>
            <StaffLogin 
              onLogin={handleLogin}
              navigateToHome={() => setCurrentView('home')}
            />
          </Suspense>
        );
      case 'manager':
        return (
          <Suspense fallback={<ViewLoader />}>
            <ManagerDashboard 
              categories={categories}
              products={products}
              offers={offers}
              orders={orders}
              archivedAnalytics={archivedAnalytics}
              archiveAndPurgeOrders={handleArchiveAndPurgeOrders}
              addons={addons}
              saveAddon={handleSaveAddon}
              deleteAddon={handleDeleteAddon}
              homepageSections={homepageSections}
              saveHomepageSection={handleSaveHomepageSection}
              deleteHomepageSection={handleDeleteHomepageSection}
              branches={branches}
              saveBranch={handleSaveBranch}
              deleteBranch={handleDeleteBranch}
              saveCategory={handleSaveCategory}
              deleteCategory={handleDeleteCategory}
              saveProduct={handleSaveProduct}
              deleteProduct={handleDeleteProduct}
              saveOffer={handleSaveOffer}
              deleteOffer={handleDeleteOffer}
              updateOrderStatus={updateOrderStatus}
              deleteOrder={handleDeleteOrder}
              refreshData={refreshData}
              onLogout={handleLogout}
              ingredients={ingredients}
              saveIngredient={handleSaveIngredient}
              deleteIngredient={handleDeleteIngredient}
              updateIngredientStock={handleUpdateIngredientStock}
              updateProductStock={handleUpdateProductStock}
              vouchers={vouchers}
              saveVoucher={handleSaveVoucher}
              deleteVoucher={handleDeleteVoucher}
              voucherSettings={voucherSettings}
              saveVoucherSettings={handleSaveVoucherSettings}
              navigateToPOS={() => setCurrentView('pos')}
            />
          </Suspense>
        );
      case 'employee':
        return (
          <Suspense fallback={<ViewLoader />}>
            <EmployeeDashboard 
              orders={orders}
              products={products}
              categories={categories}
              branches={branches}
              updateOrderStatus={updateOrderStatus}
              updateOrderDetails={updateOrderDetails}
              deleteOrder={handleDeleteOrder}
              onLogout={handleLogout}
              ingredients={ingredients}
              saveIngredient={handleSaveIngredient}
              deleteIngredient={handleDeleteIngredient}
              updateIngredientStock={handleUpdateIngredientStock}
              updateProductStock={handleUpdateProductStock}
              saveProduct={handleSaveProduct}
              navigateToPOS={() => setCurrentView('pos')}
            />
          </Suspense>
        );
      case 'pos':
        return (
          <Suspense fallback={<ViewLoader />}>
            <StaffPOSView 
              orders={orders}
              categories={categories}
              products={products}
              addons={addons}
              ingredients={ingredients}
              branches={branches}
              placeOrder={placeOrder}
              navigateToStaffLogin={() => setCurrentView(staffSession || 'staff-login')}
            />
          </Suspense>
        );
      case 'home':
      default:
        return (
          <CustomerView 
            categories={categories}
            products={products}
            offers={offers}
            orders={orders}
            addons={addons}
            homepageSections={homepageSections}
            branches={branches}
            ingredients={ingredients}
            vouchers={vouchers}
            voucherSettings={voucherSettings}
            placeOrder={placeOrder}
            updateOrderStatus={updateOrderStatus}
            updateOrderDetails={updateOrderDetails}
            navigateToStaffLogin={() => setCurrentView('staff-login')}
          />
        );
    }
  };

  return (
    <>
      {renderWarningBanner()}
      {renderView()}
    </>
  );
}

function ViewLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center font-sans gap-3">
      <div className="w-10 h-10 border-4 border-secondary border-t-primary rounded-full animate-spin"></div>
      <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Loading view...</p>
    </div>
  );
}
