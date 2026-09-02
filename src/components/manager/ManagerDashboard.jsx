import { useState } from 'react';
import { 
  BarChart3, 
  ShoppingBag, 
  Pizza, 
  Image as ImageIcon, 
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
import AddonManagement from './AddonManagement';
import SectionManagement from './SectionManagement';
import BranchManagement from './BranchManagement';
import HoursManagement from './HoursManagement';

export default function ManagerDashboard({
  categories = [],
  products = [],
  offers = [],
  orders = [],
  archivedAnalytics = [],
  archiveAndPurgeOrders,
  addons = [],
  saveAddon,
  deleteAddon,
  homepageSections = [],
  saveHomepageSection,
  deleteHomepageSection,
  branches = [],
  saveBranch,
  deleteBranch,
  saveCategory,
  deleteCategory,
  saveProduct,
  deleteProduct,
  saveOffer,
  deleteOffer,
  updateOrderStatus,
  deleteOrder,
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'orders':
        return (
          <OrderManagement
            orders={orders}
            updateOrderStatus={updateOrderStatus}
            deleteOrder={deleteOrder}
            archiveAndPurgeOrders={archiveAndPurgeOrders}
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
            saveCategory={saveCategory}
            deleteCategory={deleteCategory}
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
            saveProduct={saveProduct}
            deleteProduct={deleteProduct}
          />
        );
      case 'offers':
        return (
          <OfferManagement
            offers={offers}
            branches={branches}
            saveOffer={saveOffer}
            deleteOffer={deleteOffer}
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
              saveProduct={saveProduct}
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
            archivedAnalytics={archivedAnalytics}
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
    { id: 'addons', title: 'Addons extras', icon: Tag },
    { id: 'sections', title: 'Widgets sections', icon: LayoutGrid },
    { id: 'branches', title: 'Store locations', icon: MapPin }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-accent pb-12">
      {/* Header Banner */}
      <header className="bg-accent text-white px-3.5 sm:px-6 py-3 sm:py-3.5 border-b-2 border-secondary/80 flex justify-between items-center shadow-xs shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white border border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            <img src="/logo.png" alt="Mr. Kukooo" className="w-full h-full object-cover scale-110" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-secondary tracking-tight leading-none">Kukooo CMS</h1>
            <span className="text-[9px] sm:text-[10px] text-white/60 font-medium tracking-wide italic">System Administration</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={navigateToPOS}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-secondary hover:bg-secondary-hover text-accent font-medium text-xs rounded-md shadow-2xs cursor-pointer transition-all active:translate-y-[0.5px] border border-secondary-hover/40"
            title="Open POS System"
          >
            <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
            <span className="hidden xs:inline">POS System</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-xs rounded-md shadow-2xs cursor-pointer transition-all active:translate-y-[0.5px]"
            title="Sign Out"
          >
            <Power className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
            <span className="hidden xs:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Tabs navigation list */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 mt-4 sm:mt-6 w-full">
        <div className="flex bg-white p-1 rounded-md border border-gray-200 overflow-x-auto no-scrollbar gap-1 shadow-2xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-md font-medium text-xs transition-all cursor-pointer whitespace-nowrap active:translate-y-[0.5px] border ${
                  isActive
                    ? 'bg-secondary text-accent border-secondary-hover/40 shadow-2xs'
                    : 'bg-white text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                {tab.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Tab Body Frame */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 mt-4 sm:mt-6 w-full flex-1">
        {renderTabContent()}
      </main>
    </div>
  );
}
