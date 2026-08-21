import { useState, useEffect } from 'react';
import { 
  isFirebaseConfigured,
  seedDatabaseIfEmpty,
  forceSyncDatabase,
  getCategories,
  getProducts,
  getOffers,
  getVouchers,
  getOrders,
  getAddons,
  saveAddon,
  deleteAddon,
  placeOrderInDB,
  incrementVoucherUsage,
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
  subscribeToIngredients
} from './firebase';
import CustomerView from './components/customer/CustomerView';
import StaffLogin from './components/StaffLogin';
import ManagerDashboard from './components/manager/ManagerDashboard';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import StaffPOSView from './components/employee/StaffPOSView';

export default function App() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [addons, setAddons] = useState([]);
  const [homepageSections, setHomepageSections] = useState([]);
  const [branches, setBranches] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Routing and Staff Session
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('kukooo_session') || 'home';
  }); // 'home' | 'staff-login' | 'manager' | 'employee'
  const [staffSession, setStaffSession] = useState(() => {
    return localStorage.getItem('kukooo_session') || null; // 'manager' | 'employee' | null
  });

  // --- HYDRATION & REALTIME LIFECYCLE ---
  useEffect(() => {
    const initializeAppBackend = async () => {
      // Force clear potentially corrupted caches for the user
      localStorage.removeItem('kukooo_products');
      localStorage.removeItem('kukooo_categories');
      localStorage.removeItem('kukooo_branches');
      
      setLoading(true);
      await seedDatabaseIfEmpty();
      await forceSyncDatabase();
      try {
        const [cats, prods, offs, vouts, adds, secs, brs, ings] = await Promise.all([
          getCategories(),
          getProducts(),
          getOffers(),
          getVouchers(),
          getAddons(),
          getHomepageSections(),
          getBranches(),
          getIngredients()
        ]);
        setCategories(cats);
        setProducts(prods);
        setOffers(offs);
        setVouchers(vouts);
        setAddons(adds);
        setHomepageSections(secs);
        setBranches(brs);
        setIngredients(ings);
      } catch (err) {
        console.error("Error loading initial data from backend:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAppBackend();

    const unsubscribeOrders = subscribeToOrders((updatedOrders) => {
      setOrders(updatedOrders);
    });

    const unsubscribeProducts = subscribeToProducts((updatedProducts) => {
      setProducts(updatedProducts);
    });

    const unsubscribeIngredients = subscribeToIngredients((updatedIngredients) => {
      setIngredients(updatedIngredients);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
      unsubscribeIngredients();
    };
  }, []);

  // Sync session state to LocalStorage
  useEffect(() => {
    if (staffSession) {
      localStorage.setItem('kukooo_session', staffSession);
    } else {
      localStorage.removeItem('kukooo_session');
    }
  }, [staffSession]);

  // Route protection calculated during render
  let activeView = currentView;
  if ((activeView === 'manager' && staffSession !== 'manager') ||
      (activeView === 'employee' && staffSession !== 'employee')) {
    activeView = 'staff-login';
  }

  // --- DATA REFRESH HELPER ---
  const refreshData = async () => {
    try {
      const [cats, prods, offs, vouts, ords, adds, secs, brs, ings] = await Promise.all([
        getCategories(),
        getProducts(),
        getOffers(),
        getVouchers(),
        getOrders(),
        getAddons(),
        getHomepageSections(),
        getBranches(),
        getIngredients()
      ]);
      setCategories(cats);
      setProducts(prods);
      setOffers(offs);
      setVouchers(vouts);
      setOrders(ords);
      setAddons(adds);
      setHomepageSections(secs);
      setBranches(brs);
      setIngredients(ings);
    } catch (error) {
      console.error("Failed to refresh app data:", error);
    }
  };

  // --- OPERATIONS API ---
  const placeOrder = async (newOrder, appliedVoucherCode) => {
    try {
      await placeOrderInDB(newOrder);
      if (appliedVoucherCode) {
        await incrementVoucherUsage(appliedVoucherCode);
      }
      // Product stock is auto-updated via subscribeToProducts
      await refreshData();
    } catch (err) {
      console.error("Failed to place order:", err);
      alert(err.message || "Failed to place order due to insufficient stock.");
      throw err;
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateOrderStatusInDB(orderId, newStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const updateOrderDetails = async (orderId, items, totalAmount, extraFields = {}) => {
    try {
      await updateOrderDetailsInDB(orderId, items, totalAmount, extraFields);
    } catch (err) {
      console.error("Failed to update order details:", err);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await deleteOrderInDB(orderId);
      await refreshData();
    } catch (err) {
      console.error("Failed to delete order:", err);
    }
  };

  const handleSaveProduct = async (prod) => {
    try {
      const { saveProduct } = await import('./firebase');
      await saveProduct(prod);
      await refreshData();
    } catch (err) {
      console.error("Failed to save product:", err);
    }
  };

  const handleSaveAddon = async (addon) => {
    try {
      await saveAddon(addon);
      await refreshData();
    } catch (err) {
      console.error("Failed to save addon:", err);
    }
  };

  const handleDeleteAddon = async (id) => {
    try {
      await deleteAddon(id);
      await refreshData();
    } catch (err) {
      console.error("Failed to delete addon:", err);
    }
  };

  const handleSaveHomepageSection = async (sec) => {
    try {
      await saveHomepageSection(sec);
      await refreshData();
    } catch (err) {
      console.error("Failed to save homepage section:", err);
    }
  };

  const handleDeleteHomepageSection = async (id) => {
    try {
      await deleteHomepageSection(id);
      await refreshData();
    } catch (err) {
      console.error("Failed to delete homepage section:", err);
    }
  };

  const handleSaveBranch = async (branch) => {
    try {
      await saveBranch(branch);
      await refreshData();
    } catch (err) {
      console.error("Failed to save branch:", err);
    }
  };

  const handleDeleteBranch = async (id) => {
    try {
      await deleteBranch(id);
      await refreshData();
    } catch (err) {
      console.error("Failed to delete branch:", err);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center font-sans gap-4">
        <div className="w-16 h-16 border-8 border-secondary border-t-primary rounded-full animate-spin"></div>
        <h2 className="text-xl font-black text-accent">Licking the spoons...</h2>
        <p className="text-sm font-bold text-gray-400">Setting up Mr. Kukooo Kitchen</p>
      </div>
    );
  }

  const renderWarningBanner = () => {
    if (isFirebaseConfigured) return null;
    return (
      <div className="bg-amber-500 text-accent font-black py-2 px-4 text-center text-xs border-b-4 border-accent relative z-50">
        ⚠️ Running in LocalStorage Fallback Mode. Create a .env file with VITE_FIREBASE_PROJECT_ID to connect to your live database.
      </div>
    );
  };

  switch (activeView) {
    case 'staff-login':
      return (
        <>
          {renderWarningBanner()}
          <StaffLogin 
            onLogin={handleLogin}
            navigateToHome={() => setCurrentView('home')}
          />
        </>
      );
    case 'manager':
      return (
        <>
          {renderWarningBanner()}
          <ManagerDashboard 
            categories={categories}
            products={products}
            offers={offers}
            vouchers={vouchers}
            orders={orders}
            addons={addons}
            saveAddon={handleSaveAddon}
            deleteAddon={handleDeleteAddon}
            homepageSections={homepageSections}
            saveHomepageSection={handleSaveHomepageSection}
            deleteHomepageSection={handleDeleteHomepageSection}
            branches={branches}
            saveBranch={handleSaveBranch}
            deleteBranch={handleDeleteBranch}
            refreshData={refreshData}
            onLogout={handleLogout}
            ingredients={ingredients}
            saveIngredient={saveIngredient}
            deleteIngredient={deleteIngredient}
            updateIngredientStock={updateIngredientStock}
            updateProductStock={updateProductStock}
            navigateToPOS={() => setCurrentView('pos')}
          />
        </>
      );
    case 'employee':
      return (
        <>
          {renderWarningBanner()}
          <EmployeeDashboard 
            orders={orders}
            products={products}
            categories={categories}
            updateOrderStatus={updateOrderStatus}
            updateOrderDetails={updateOrderDetails}
            deleteOrder={handleDeleteOrder}
            onLogout={handleLogout}
            ingredients={ingredients}
            saveIngredient={saveIngredient}
            deleteIngredient={deleteIngredient}
            updateIngredientStock={updateIngredientStock}
            updateProductStock={updateProductStock}
            saveProduct={handleSaveProduct}
            navigateToPOS={() => setCurrentView('pos')}
          />
        </>
      );
    case 'pos':
      return (
        <>
          {renderWarningBanner()}
          <StaffPOSView 
            categories={categories}
            products={products}
            addons={addons}
            ingredients={ingredients}
            placeOrder={placeOrder}
            navigateToStaffLogin={() => setCurrentView(staffSession || 'staff-login')}
          />
        </>
      );
    case 'home':
    default:
      return (
        <>
          {renderWarningBanner()}
          <CustomerView 
            categories={categories}
            products={products}
            offers={offers}
            vouchers={vouchers}
            orders={orders}
            addons={addons}
            homepageSections={homepageSections}
            branches={branches}
            ingredients={ingredients}
            placeOrder={placeOrder}
            updateOrderStatus={updateOrderStatus}
            updateOrderDetails={updateOrderDetails}
            navigateToStaffLogin={() => setCurrentView('staff-login')}
          />
        </>
      );
  }
}
