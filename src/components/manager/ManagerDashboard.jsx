import { useState } from 'react';
import { 
  BarChart3, 
  ShoppingBag, 
  Pizza, 
  Image as ImageIcon, 
  Ticket, 
  Tag, 
  LayoutGrid, 
  MapPin, 
  Power,
  FolderOpen,
  Clock,
  Package,
  Utensils
} from 'lucide-react';
import DashboardAnalytics from './DashboardAnalytics';
import InventoryManager from '../InventoryManager';
import OrderManagement from './OrderManagement';
import CategoryManagement from './CategoryManagement';
import ProductManagement from './ProductManagement';
import OfferManagement from './OfferManagement';
import VoucherManagement from './VoucherManagement';
import AddonManagement from './AddonManagement';
import SectionManagement from './SectionManagement';
import BranchManagement from './BranchManagement';
import HoursManagement from './HoursManagement';

export default function ManagerDashboard({
  categories = [],
  products = [],
  offers = [],
  vouchers = [],
  orders = [],
  addons = [],
  saveAddon,
  deleteAddon,
  homepageSections = [],
  saveHomepageSection,
  deleteHomepageSection,
  branches = [],
  saveBranch,
  deleteBranch,
  refreshData,
  onLogout,
  ingredients = [],
  saveIngredient,
  deleteIngredient,
  updateIngredientStock,
  updateProductStock,
  navigateToPOS
}) {
  const [activeTab, setActiveTab] = useState('analytics');
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // CRUD overrides linking to parent handlers to ensure sync state
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    // App level update operations
    const { updateOrderStatusInDB } = await import('../../firebase');
    await updateOrderStatusInDB(orderId, newStatus);
    await refreshData();
  };

  const handleDeleteOrder = async (orderId) => {
    const { deleteOrderInDB } = await import('../../firebase');
    await deleteOrderInDB(orderId);
    await refreshData();
  };

  const handleSaveCategory = async (id, name, image_url) => {
    const { saveCategory } = await import('../../firebase');
    await saveCategory(id, name, image_url);
    await refreshData();
  };

  const handleDeleteCategory = async (id) => {
    const { deleteCategory } = await import('../../firebase');
    await deleteCategory(id);
    await refreshData();
  };

  const handleSaveProduct = async (prod) => {
    const { saveProduct } = await import('../../firebase');
    await saveProduct(prod);
    await refreshData();
  };

  const handleDeleteProduct = async (id) => {
    const { deleteProduct } = await import('../../firebase');
    await deleteProduct(id);
    await refreshData();
  };

  const handleSaveOffer = async (off) => {
    const { saveOffer } = await import('../../firebase');
    await saveOffer(off);
    await refreshData();
  };

  const handleDeleteOffer = async (id) => {
    const { deleteOffer } = await import('../../firebase');
    await deleteOffer(id);
    await refreshData();
  };

  const handleSaveVoucher = async (vouch) => {
    const { saveVoucher } = await import('../../firebase');
    await saveVoucher(vouch);
    await refreshData();
  };

  const handleDeleteVoucher = async (code) => {
    const { deleteVoucher } = await import('../../firebase');
    await deleteVoucher(code);
    await refreshData();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'orders':
        return (
          <OrderManagement
            orders={orders}
            updateOrderStatus={handleUpdateOrderStatus}
            deleteOrder={handleDeleteOrder}
            branches={branches}
          />
        );
      case 'branches':
        return (
          <BranchManagement
            branches={branches}
            saveBranch={saveBranch}
            deleteBranch={deleteBranch}
          />
        );
      case 'categories':
        return (
          <CategoryManagement
            categories={categories}
            saveCategory={handleSaveCategory}
            deleteCategory={handleDeleteCategory}
          />
        );
      case 'products':
        return (
          <ProductManagement
            products={products}
            categories={categories}
            branches={branches}
            ingredients={ingredients}
            homepageSections={homepageSections}
            saveProduct={handleSaveProduct}
            deleteProduct={handleDeleteProduct}
          />
        );
      case 'offers':
        return (
          <OfferManagement
            offers={offers}
            branches={branches}
            saveOffer={handleSaveOffer}
            deleteOffer={handleDeleteOffer}
          />
        );
      case 'vouchers':
        return (
          <VoucherManagement
            vouchers={vouchers}
            branches={branches}
            saveVoucher={handleSaveVoucher}
            deleteVoucher={handleDeleteVoucher}
          />
        );
      case 'addons':
        return (
          <AddonManagement
            addons={addons}
            branches={branches}
            saveAddon={saveAddon}
            deleteAddon={deleteAddon}
          />
        );
      case 'sections':
        return (
          <SectionManagement
            homepageSections={homepageSections}
            branches={branches}
            saveHomepageSection={saveHomepageSection}
            deleteHomepageSection={deleteHomepageSection}
          />
        );
      case 'inventory':
        return (
          <div className="pt-2">
            <InventoryManager
              products={products}
              categories={categories}
              ingredients={ingredients}
              saveIngredient={saveIngredient}
              deleteIngredient={deleteIngredient}
              updateIngredientStock={updateIngredientStock}
              updateProductStock={updateProductStock}
              saveProduct={handleSaveProduct}
            />
          </div>
        );
      case 'hours':
        return <HoursManagement />;
      case 'analytics':
      default:
        return (
          <DashboardAnalytics
            orders={orders}
            branches={branches}
            selectedBranchId={selectedBranchId}
            setSelectedBranchId={setSelectedBranchId}
            products={products}
          />
        );
    }
  };

  const tabs = [
    { id: 'analytics', title: 'Analytics', icon: BarChart3 },
    { id: 'orders', title: 'Orders ledger', icon: ShoppingBag },
    { id: 'inventory', title: 'Inventory', icon: Package },
    { id: 'hours', title: 'Opening Hours', icon: Clock },
    { id: 'categories', title: 'Categories', icon: FolderOpen },
    { id: 'products', title: 'Menu Products', icon: Pizza },
    { id: 'offers', title: 'Banners Offers', icon: ImageIcon },
    { id: 'vouchers', title: 'Vouchers Coupons', icon: Ticket },
    { id: 'addons', title: 'Addons extras', icon: Tag },
    { id: 'sections', title: 'Widgets sections', icon: LayoutGrid },
    { id: 'branches', title: 'Store locations', icon: MapPin }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-accent pb-12">
      {/* Header Banner */}
      <header className="bg-accent text-white px-6 py-4 border-b-4 border-secondary flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white comic-border-sm flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Mr. Kukooo" className="w-full h-full object-cover scale-110" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-secondary tracking-tight">Kukooo CMS</h1>
            <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">System Administration</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={navigateToPOS}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-secondary text-accent hover:bg-secondary-hover font-black text-xs rounded-xl comic-border-sm cursor-pointer transition-colors"
          >
            <Utensils className="w-4 h-4" /> POS System
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-black text-xs rounded-xl comic-border-sm cursor-pointer transition-colors"
          >
            <Power className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      {/* Tabs navigation list */}
      <div className="max-w-7xl mx-auto px-6 mt-8 w-full">
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-250 overflow-x-auto no-scrollbar gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl font-black text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-secondary text-accent comic-border-sm shadow-sm scale-105'
                    : 'text-gray-500 hover:text-accent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Tab Body Frame */}
      <main className="max-w-7xl mx-auto px-6 mt-6 w-full flex-1">
        {renderTabContent()}
      </main>
    </div>
  );
}
