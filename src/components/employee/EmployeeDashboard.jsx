import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  MapPin, 
  Phone, 
  CheckCircle, 
  Truck, 
  ShoppingBag, 
  Bell, 
  Power, 
  X, 
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  ThumbsUp,
  Package,
  ShoppingBag as ShoppingBagIcon,
  Utensils,
  Printer
} from 'lucide-react';
import { getWhatsAppLink } from '../../utils/whatsapp';
import { printReceipt } from '../../utils/printReceipt';
import InventoryManager from '../InventoryManager';



const getConfirmWhatsAppLink = (order) => {
  const text = `Hello from Mr. Kukooo! We have received your order #${order.order_id}. We are preparing it now!`;
  return getWhatsAppLink(order.customer_phone, text);
};

const getNotifyWhatsAppLink = (order) => {
  const messageText = order.order_type === 'Delivery'
    ? `Get ready! Your Mr. Kukooo order #${order.order_id} is out for delivery and arriving soon!`
    : `Great news! Your Mr. Kukooo order #${order.order_id} is hot and ready for pickup!`;
  return getWhatsAppLink(order.customer_phone, messageText);
};

const getFeedbackWhatsAppLink = (order) => {
  const text = `Hi ${order.customer_name}! Thank you for choosing Mr. Kukooo. How was your experience with order #${order.order_id}? We'd love to hear your feedback!`;
  return getWhatsAppLink(order.customer_phone, text);
};

const getRelativeTime = (isoString, currentTime) => {
  const elapsed = currentTime - new Date(isoString).getTime();
  const mins = Math.floor(elapsed / 60000);
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  return `${mins} mins ago`;
};

export default function EmployeeDashboard({ 
  orders = [], 
  products = [], 
  updateOrderStatus, 
  updateOrderDetails, 
  deleteOrder,
  onLogout,
  updateProductStock,
  ingredients,
  saveIngredient,
  deleteIngredient,
  updateIngredientStock,
  saveProduct,
  categories,
  navigateToPOS
}) {
  const [activeTab, setActiveTab] = useState('orders');
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingItems, setEditingItems] = useState([]);
  const [editingTotal, setEditingTotal] = useState(0);

  const [expandedSections, setExpandedSections] = useState({
    Pending: true,
    Preparing: true,
    'Ready/Out for Delivery': true,
    Completed: false,
    Cancelled: false
  });

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const columns = [
    { id: 'Pending', title: '📥 New Orders (Pending)', bg: 'bg-red-50/70', border: 'border-red-500', text: 'text-primary' },
    { id: 'Preparing', title: '🍳 Preparing', bg: 'bg-yellow-50/70', border: 'border-yellow-500', text: 'text-yellow-700' },
    { id: 'Ready/Out for Delivery', title: '🛵 Out for Delivery / Ready for Pickup', bg: 'bg-blue-50/70', border: 'border-blue-500', text: 'text-blue-700' },
    { id: 'Completed', title: '✅ Completed (Delivered & Closed)', bg: 'bg-green-50/70', border: 'border-green-500', text: 'text-green-700' },
    { id: 'Cancelled', title: '❌ Cancelled Orders', bg: 'bg-gray-100/70', border: 'border-gray-500', text: 'text-gray-600' }
  ];

  const getSortedOrders = (statusId) => {
    return orders
      .filter(order => order.status === statusId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const handleOpenEditor = (order) => {
    setEditingOrder(order);
    setEditingItems(order.items.map(item => ({ ...item })));
    setEditingTotal(order.total_amount);
  };

  const recalculateTotal = (items) => {
    const sum = items.reduce((acc, item) => {
      const addonCost = item.addons?.reduce((s, a) => s + a.price, 0) || 0;
      return acc + ((item.price + addonCost) * item.quantity);
    }, 0);
    setEditingTotal(sum);
  };

  const handleUpdateQty = (index, delta) => {
    const updated = editingItems.map((item, idx) => {
      if (idx === index) {
        const nextQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: nextQty };
      }
      return item;
    });
    setEditingItems(updated);
    recalculateTotal(updated);
  };

  const handleDeleteItem = (index) => {
    const updated = editingItems.filter((_, idx) => idx !== index);
    setEditingItems(updated);
    recalculateTotal(updated);
  };

  const handleAddItem = (productId) => {
    if (!productId) return;
    const match = products.find(p => p.id.toString() === productId.toString());
    if (!match) return;

    const existingIndex = editingItems.findIndex(it => it.name === match.name && (!it.addons || it.addons.length === 0));
    let updated;
    if (existingIndex >= 0) {
      updated = editingItems.map((item, idx) => {
        if (idx === existingIndex) {
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      });
    } else {
      updated = [
        ...editingItems,
        {
          product_id: match.id,
          name: match.name,
          price: parseFloat(match.price),
          quantity: 1,
          addons: [],
          notes: ''
        }
      ];
    }
    setEditingItems(updated);
    recalculateTotal(updated);
  };

  const handleSaveEditor = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    
    await updateOrderDetails(editingOrder.order_id, editingItems, editingTotal);
    setEditingOrder(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-accent text-white px-6 py-4 border-b-4 border-secondary flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white comic-border-sm flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Mr. Kukooo" className="w-full h-full object-cover scale-110" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-secondary tracking-tight">Kukooo Kitchen</h1>
            <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Live Staff Dashboard</span>
          </div>
        </div>

        <div className="flex bg-white/10 p-1 rounded-xl border border-white/20 mr-auto ml-8 hidden md:flex">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg font-black text-xs transition-colors flex items-center gap-2 ${
              activeTab === 'orders' ? 'bg-white text-accent' : 'text-white/80 hover:text-white'
            }`}
          >
            <ShoppingBagIcon className="w-4 h-4" /> Live Orders
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-lg font-black text-xs transition-colors flex items-center gap-2 ${
              activeTab === 'inventory' ? 'bg-white text-accent' : 'text-white/80 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" /> Inventory Control
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl border-2 border-white/30">
            <Bell className="w-4 h-4 text-secondary animate-swing" />
            <span className="text-xs font-black">{orders.filter(o => o.status === 'Pending').length} Pending Orders</span>
          </div>

          <button
            onClick={navigateToPOS}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-secondary text-accent hover:bg-secondary-hover font-black text-xs rounded-xl comic-border-sm comic-shadow-sm comic-hover cursor-pointer"
          >
            <Utensils className="w-3.5 h-3.5 stroke-[3]" /> POS System
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-black text-xs rounded-xl comic-border-sm comic-shadow-sm comic-hover cursor-pointer"
          >
            <Power className="w-3.5 h-3.5 stroke-[3]" /> Logout
          </button>
        </div>
      </header>

      {/* Mobile Tabs */}
      <div className="flex bg-accent text-white border-b-2 border-secondary md:hidden p-2 gap-2 overflow-x-auto no-scrollbar shadow-inner">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-shrink-0 px-4 py-2 rounded-lg font-black text-xs transition-colors flex items-center gap-2 ${
            activeTab === 'orders' ? 'bg-white text-accent' : 'bg-white/5 text-white/80 hover:text-white'
          }`}
        >
          <ShoppingBagIcon className="w-4 h-4" /> Live Orders
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-shrink-0 px-4 py-2 rounded-lg font-black text-xs transition-colors flex items-center gap-2 ${
            activeTab === 'inventory' ? 'bg-white text-accent' : 'bg-white/5 text-white/80 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" /> Inventory Control
        </button>
        <button
          onClick={navigateToPOS}
          className="flex-shrink-0 px-4 py-2 rounded-lg font-black text-xs transition-colors flex items-center gap-2 bg-white/5 text-secondary hover:bg-white hover:text-accent"
        >
          <Utensils className="w-4 h-4" /> POS System
        </button>
      </div>

      {activeTab === 'orders' ? (
        <>
          {/* ACCORDION SECTIONS */}
          <main className="flex-grow p-4 md:p-6 max-w-6xl w-full mx-auto space-y-4">
        {columns.map((col) => {
          const sortedList = getSortedOrders(col.id);
          const isExpanded = !!expandedSections[col.id];
          
          return (
            <div 
              key={col.id} 
              className="rounded-2xl border-4 border-accent comic-shadow overflow-hidden bg-white"
            >
              <button
                onClick={() => toggleSection(col.id)}
                className={`w-full flex items-center justify-between p-4 font-black transition-colors border-b-3 border-accent text-accent ${col.bg} hover:bg-opacity-80`}
              >
                <div className="flex items-center gap-2.5 text-sm md:text-base">
                  <span>{col.title}</span>
                  <span className="bg-accent text-white rounded-full text-xs font-black px-2.5 py-0.5 border border-accent">
                    {sortedList.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                )}
              </button>

              {isExpanded && (
                <div className="p-4 md:p-6 bg-gray-50/50">
                  {sortedList.length > 0 ? (
                    <div className="flex flex-row overflow-x-auto gap-6 pb-4 snap-x no-scrollbar">
                      {sortedList.map((order) => (
                        <div 
                          key={order.order_id} 
                          className={`bg-white rounded-2xl comic-border p-5 space-y-4 comic-shadow-sm comic-hover relative shrink-0 w-full sm:w-[320px] md:w-[350px] snap-center ${
                            order.status === 'Pending' ? 'border-l-8 border-l-primary' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">#{order.order_id}</span>
                              <h4 className="font-extrabold text-accent text-sm md:text-base mt-0.5">{order.customer_name}</h4>
                            </div>
                            <span className="text-[10px] bg-red-50 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {getRelativeTime(order.timestamp, currentTime)}
                            </span>
                          </div>

                          {order.is_edited && (
                            <div className="bg-primary text-white font-black text-[9px] uppercase tracking-widest py-1.5 rounded-lg flex items-center justify-center gap-1 animate-pulse border border-accent shadow-sm">
                              ⚠️ CUSTOMER EDITED ORDER
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                            {order.order_type === 'Delivery' ? (
                              <>
                                <Truck className="w-3.5 h-3.5 text-purple-600" />
                                <span>Delivery</span>
                              </>
                            ) : order.order_type === 'Dine-In' ? (
                              <>
                                <Utensils className="w-3.5 h-3.5 text-accent" />
                                <span className="text-accent">Dine-In</span>
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="w-3.5 h-3.5 text-green-600" />
                                <span>Self Pickup</span>
                              </>
                            )}
                          </div>

                          {order.order_type === 'Delivery' && order.delivery_distance !== undefined && (
                            <div className="flex justify-between items-center text-[10px] bg-gray-50 px-2 py-1 rounded-md border text-gray-500 font-bold">
                              <span>Distance:</span>
                              <span className="font-black text-accent">{order.delivery_distance} km</span>
                            </div>
                          )}

                          {order.order_type === 'Delivery' && order.customer_address && (
                            <div className="text-xs bg-purple-50 text-purple-900 p-2.5 rounded-xl border border-purple-200 font-bold leading-normal">
                              <MapPin className="w-3.5 h-3.5 inline mr-1 text-purple-600 shrink-0" />
                              {order.customer_address}
                            </div>
                          )}

                          {order.order_type === 'Dine-In' && order.table_number && (
                            <div className="text-xs bg-accent text-white p-2.5 rounded-xl border border-accent/20 font-black leading-normal flex items-center justify-between shadow-sm">
                              <span className="opacity-80">Table Number:</span>
                              <span className="text-sm">{order.table_number}</span>
                            </div>
                          )}

                          <div className="text-xs font-bold text-accent flex items-center gap-1 bg-yellow-50/50 p-2 rounded-xl border border-yellow-250">
                            <Phone className="w-3.5 h-3.5 text-secondary-hover shrink-0" />
                            <span>{order.customer_phone}</span>
                          </div>

                          <div className="border-t border-dashed border-gray-200 pt-3 space-y-2">
                            {order.items.map((item, idx) => {
                              const addonCost = item.addons?.reduce((s, a) => s + a.price, 0) || 0;
                              const rowPrice = (item.price + addonCost) * item.quantity;
                              return (
                                <div key={idx} className="border-b border-gray-100 pb-2 last:border-b-0">
                                  <div className="flex justify-between text-xs font-bold text-accent">
                                    <span>{item.quantity}x {item.name}</span>
                                    <span className="text-gray-400">Rs. {rowPrice}</span>
                                  </div>
                                  {item.addons && item.addons.length > 0 && (
                                    <div className="pl-4 text-[9px] text-gray-400 font-bold space-y-0.5 leading-tight">
                                      {item.addons.map((a, aIdx) => (
                                        <span key={aIdx} className="block text-green-700">+ {a.name} (+Rs. {a.price})</span>
                                      ))}
                                    </div>
                                  )}
                                  {item.notes && (
                                    <p className="pl-4 text-[9px] text-primary italic font-black bg-red-50 inline-block px-1 rounded">
                                      Note: "{item.notes}"
                                    </p>
                                  )}
                                </div>
                              );
                            })}

                            {order.special_instructions && (
                              <div className="bg-red-50 border border-primary/20 p-2.5 rounded-xl text-[10px] font-bold text-accent">
                                <span className="text-primary font-black block uppercase text-[8px] mb-0.5 leading-none">Notes:</span>
                                "{order.special_instructions}"
                              </div>
                            )}

                            <div className="flex justify-between text-sm font-black text-accent border-t border-gray-150 pt-2.5 mt-2">
                              <span>Total Amount</span>
                              <span className="text-primary">Rs. {order.total_amount}</span>
                            </div>
                          </div>

                          <div className="border-t border-gray-150 pt-3 space-y-2.5">
                            {order.status !== 'Completed' && (
                              <button
                                onClick={() => handleOpenEditor(order)}
                                className="w-full bg-white border-2 border-accent text-accent font-black py-1.5 rounded-xl text-xs cursor-pointer comic-shadow-sm comic-hover transition-all"
                              >
                                ✏️ Edit Items / Cost
                              </button>
                            )}

                            {order.status === 'Pending' && (
                              <a
                                href={getConfirmWhatsAppLink(order)}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full bg-secondary text-accent font-black py-2 rounded-xl comic-border-sm text-xs flex items-center justify-center gap-1.5 comic-shadow-sm comic-hover cursor-pointer transition-all"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> Confirm WhatsApp
                              </a>
                            )}

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider shrink-0">Status:</span>
                              <select
                                value={order.status}
                                onChange={(e) => updateOrderStatus(order.order_id, e.target.value)}
                                className="flex-grow bg-gray-55 border-2 border-accent px-2.5 py-1.5 rounded-lg font-bold text-xs cursor-pointer focus:outline-none"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Preparing">Preparing</option>
                                <option value="Ready/Out for Delivery">Ready / Out</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </div>

                            {(order.status === 'Preparing' || order.status === 'Ready/Out for Delivery') && (
                              <a
                                href={getNotifyWhatsAppLink(order)}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full bg-[#25D366] text-white font-black py-2 rounded-xl comic-border-sm text-xs flex items-center justify-center gap-1.5 comic-shadow-sm comic-hover cursor-pointer transition-all"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                {order.order_type === 'Delivery' ? 'Notify Out for Delivery' : 'Notify Ready for Pickup'}
                              </a>
                            )}

                            {order.status === 'Completed' && (
                              <div className="space-y-2.5">
                                <div className="text-center text-green-600 font-black text-xs flex items-center justify-center gap-1.5 py-1 bg-green-50 rounded-xl border border-green-200">
                                  <CheckCircle className="w-4 h-4 stroke-[3]" /> Order Finalized
                                </div>
                                <a
                                  href={getFeedbackWhatsAppLink(order)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-2 rounded-xl comic-border-sm text-xs flex items-center justify-center gap-1.5 comic-shadow-sm comic-hover cursor-pointer transition-all mt-1"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" /> Ask for Feedback
                                </a>
                              </div>
                            )}
                            
                            <button
                              onClick={() => printReceipt(order)}
                              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-black py-2 rounded-xl comic-border-sm text-xs flex items-center justify-center gap-1.5 comic-shadow-sm comic-hover cursor-pointer transition-all mt-2"
                            >
                              <Printer className="w-3.5 h-3.5" /> Print Receipt
                            </button>

                            {order.status === 'Cancelled' && (
                              <div className="text-center text-red-600 font-black text-xs flex items-center justify-center gap-1.5 py-1 bg-red-50 rounded-xl border border-red-200">
                                <X className="w-4 h-4 stroke-[3]" /> Order Cancelled
                              </div>
                            )}

                            <button
                              onClick={() => {
                                  if (window.confirm(`Are you sure you want to permanently delete order #${order.order_id}?`)) {
                                    deleteOrder(order.order_id);
                                  }
                                }}
                              className="w-full bg-red-50 border-2 border-primary/25 text-red-650 hover:bg-red-100 font-black py-1.5 rounded-lg text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete Order
                            </button>

                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400 text-sm font-bold border-2 border-dashed border-accent/15 rounded-2xl bg-white">
                      No orders in this section.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </main>

      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl comic-border comic-shadow-xl p-6 max-w-md w-full animate-scale-up space-y-4 text-accent">
            
            <div className="flex justify-between items-center border-b-2 border-accent pb-2">
              <div>
                <h3 className="text-lg font-black">Edit Order Details</h3>
                <span className="text-xs text-gray-400 font-bold">Order ID: #{editingOrder.order_id}</span>
              </div>
              <button 
                onClick={() => setEditingOrder(null)} 
                className="p-1 rounded-lg hover:bg-gray-150 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveEditor} className="space-y-4">
              
              <div className="space-y-1">
                <label className="block text-xs font-black uppercase">Add Menu Item</label>
                <select
                  onChange={(e) => {
                    handleAddItem(e.target.value);
                    e.target.value = '';
                  }}
                  className="w-full bg-gray-55 border-2 border-accent px-3 py-2 rounded-lg font-bold focus:outline-none text-sm cursor-pointer"
                >
                  <option value="">-- Choose item to add --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - Rs. {p.price}</option>
                  ))}
                </select>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 border-2 border-dashed border-accent/40 p-3 rounded-xl bg-gray-50">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Items in Order</span>
                {editingItems.map((item, idx) => {
                  const addonCost = item.addons?.reduce((s, a) => s + a.price, 0) || 0;
                  const rowPrice = (item.price + addonCost) * item.quantity;
                  return (
                    <div key={idx} className="border-b border-gray-150 pb-2 last:border-b-0 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="truncate max-w-[160px]">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-white border border-accent/30 rounded-lg px-1.5 py-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, -1)}
                              className="font-black text-primary px-1 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-bold text-accent min-w-[12px] text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, 1)}
                              className="font-black text-green-700 px-1 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-gray-400 font-bold w-12 text-right">
                            Rs. {rowPrice}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 hover:bg-red-50 text-gray-400 hover:text-primary rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {item.addons && item.addons.length > 0 && (
                        <div className="pl-4 text-[9px] text-gray-400 font-bold space-y-0.5 leading-tight">
                          {item.addons.map((a, aIdx) => (
                            <span key={aIdx} className="block text-green-700">+ {a.name} (+Rs. {a.price})</span>
                          ))}
                        </div>
                      )}
                      {item.notes && (
                        <p className="pl-4 text-[9px] text-primary italic font-black">
                          Note: "{item.notes}"
                        </p>
                      )}
                    </div>
                  );
                })}
                {editingItems.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-4 font-bold">No items left in order!</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black uppercase">Grand Total Amount (Rs.)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={editingTotal}
                  onChange={(e) => setEditingTotal(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border-2 border-accent px-3 py-2 rounded-lg font-bold focus:outline-none text-sm"
                />
                <span className="text-[10px] text-gray-400 font-medium block">
                  Adjust manually to apply discounts or custom custom-order fees.
                </span>
              </div>

              <button
                type="submit"
                className="w-full bg-secondary text-accent font-black py-2.5 rounded-xl comic-border-sm comic-shadow-sm comic-hover text-sm cursor-pointer transition-all"
              >
                Save Order Changes
              </button>

            </form>
          </div>
        </div>
      )}
      </>
      ) : (
        <main className="flex-grow p-4 md:p-6 max-w-6xl w-full mx-auto">
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
        </main>
      )}
    </div>
  );
}
