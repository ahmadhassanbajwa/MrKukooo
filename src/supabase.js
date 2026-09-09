import { createClient } from '@supabase/supabase-js';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_OFFERS, 
  INITIAL_ORDERS,
  INITIAL_ADDONS,
  INITIAL_INGREDIENTS
} from './mockData';
import { calculateOrderDeductions } from './utils/productUtils';

// Default categories
export const INITIAL_CATEGORIES = [
  { id: 'cat-pizzas', name: 'Pizzas', image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&auto=format&fit=crop&q=80' },
  { id: 'cat-burgers', name: 'Burgers', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop&q=80' },
  { id: 'cat-sides', name: 'Sides', image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=200&auto=format&fit=crop&q=80' },
  { id: 'cat-drinks', name: 'Drinks', image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&auto=format&fit=crop&q=80' },
  { id: 'cat-azadi-deals', name: 'Azadi Deals', image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&auto=format&fit=crop&q=80' }
];

// Default sections
export const INITIAL_HOMEPAGE_SECTIONS = [
  { id: 'sec-explore', name: 'Explore Menu', type: 'categories', is_active: true, branch_ids: ['branch-chak-104sb'] },
  { id: 'sec-featured', name: 'Featured Products', type: 'products', is_active: true, branch_ids: ['branch-chak-104sb'] },
  { id: 'sec-recommendations', name: 'Chef Recommendations', type: 'products', is_active: true, branch_ids: ['branch-chak-104sb'] },
  { id: 'sec-special-deals', name: 'Special Deals', type: 'products', is_active: true, branch_ids: ['branch-chak-104sb'] }
];

export const INITIAL_BRANCHES = [
  {
    id: 'branch-chak-104sb',
    name: 'Sargodha Main Branch',
    address: 'chak 104 SB luqman Chowk, Sargodha 40100',
    lat: 32.000028,
    lng: 72.694944,
    maps_link: 'https://maps.google.com/?q=32.000028,72.694944'
  }
];

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;
export const isFirebaseConfigured = isSupabaseConfigured; // Backward compatibility alias

export let supabase = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase initialized successfully.");
  } catch (error) {
    console.error("Supabase initialization failed:", error);
  }
} else {
  console.warn("VITE_SUPABASE_URL not set. Running in LocalStorage fallback mode.");
}

const withTimeout = (promise, ms = 4000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
  ]);
};

const runDbOperation = async (supabaseOp, localOp) => {
  if (isSupabaseConfigured && supabase) {
    try {
      return await withTimeout(supabaseOp(), 4000);
    } catch (err) {
      console.warn("Supabase operation failed/timed out, falling back to LocalStorage:", err.message);
    }
  }
  return await localOp();
};

// ==========================================
// 1. FILE UPLOAD CONTROLLER
// ==========================================
export const uploadImage = async (file, folder = 'uploads') => {
  if (!file) return '';

  const compressImage = (fileObj) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const MAX_SIZE = 500;
          if (width > height) {
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => reject(new Error("Image processing failed"));
        img.src = event.target.result;
      };
      reader.onerror = () => reject(new Error("File read failed"));
      reader.readAsDataURL(fileObj);
    });
  };

  const dataURLtoFile = (dataurl, filename) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    return new File([u8arr], filename, { type: mime });
  };

  try {
    const base64Str = await compressImage(file);

    if (isSupabaseConfigured && supabase) {
      try {
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_').split('.')[0]}.jpg`;
        const compressedFile = dataURLtoFile(base64Str, fileName);
        
        const { error } = await supabase.storage
          .from('uploads')
          .upload(`${folder}/${fileName}`, compressedFile);
          
        if (error) throw error;
        
        const { data: publicUrlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(`${folder}/${fileName}`);
          
        return publicUrlData.publicUrl;
      } catch (error) {
        console.warn("Supabase Storage failed. Falling back to Base64.", error);
        return base64Str;
      }
    }
    return base64Str;
  } catch (err) {
    console.error("Image upload critical failure:", err);
    return URL.createObjectURL(file);
  }
};

// ==========================================
// 2. SEED INITIALIZER FOR DATABASE
// ==========================================
export const forceSyncDatabase = async () => {
  // No-op for performance
};

export const seedDatabaseIfEmpty = async () => {
  if (localStorage.getItem('kukooo_db_seeded') === 'true') return;
  if (!isSupabaseConfigured || !supabase) {
    localStorage.setItem('kukooo_db_seeded', 'true');
    return;
  }
  try {
    const { data: cats } = await supabase.from('categories').select('id').limit(1);
    if (cats && cats.length > 0) {
      localStorage.setItem('kukooo_db_seeded', 'true');
      return;
    }

    console.log("Seeding to Supabase in background...");
    const promises = [
      ...INITIAL_CATEGORIES.map(cat => supabase.from('categories').upsert({ id: cat.id, name: cat.name, image_url: cat.image_url || '' })),
      ...INITIAL_INGREDIENTS.map(ing => supabase.from('ingredients').upsert(ing)),
      ...INITIAL_BRANCHES.map(br => supabase.from('branches').upsert(br)),
      ...INITIAL_ADDONS.map(addon => supabase.from('addons').upsert({ ...addon, branch_ids: ['branch-chak-104sb'] }))
    ];
    await Promise.allSettled(promises);
    localStorage.setItem('kukooo_db_seeded', 'true');
  } catch (error) {
    console.error("Error seeding Supabase database:", error);
  }
};

// ==========================================
// 3. DATABASE CRUD API (UNIFIED INTERFACE)
// ==========================================

export const getCategories = async () => runDbOperation(
  async () => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) throw error;
    if (data) localStorage.setItem('kukooo_categories', JSON.stringify(data));
    return data;
  },
  async () => {
    const local = localStorage.getItem('kukooo_categories');
    if (local) return JSON.parse(local);
    localStorage.setItem('kukooo_categories', JSON.stringify(INITIAL_CATEGORIES));
    return INITIAL_CATEGORIES;
  }
);

export const saveCategory = async (id, name, image_url = '') => {
  const localList = JSON.parse(localStorage.getItem('kukooo_categories') || '[]');
  const idx = localList.findIndex(c => c.id === id);
  if (idx >= 0) { localList[idx].name = name; if (image_url) localList[idx].image_url = image_url; }
  else { localList.push({ id, name, image_url }); }
  localStorage.setItem('kukooo_categories', JSON.stringify(localList));

  return runDbOperation(
    async () => {
      const payload = { id, name };
      if (image_url) payload.image_url = image_url;
      const { error } = await supabase.from('categories').upsert(payload);
      if (error) throw error;
    },
    async () => {}
  );
};

export const deleteCategory = async (id) => {
  const localList = JSON.parse(localStorage.getItem('kukooo_categories') || '[]');
  localStorage.setItem('kukooo_categories', JSON.stringify(localList.filter(c => c.id !== id)));

  return runDbOperation(
    async () => { await supabase.from('categories').delete().eq('id', id); },
    async () => {}
  );
};

// --- INGREDIENTS ---
export const getIngredients = async () => runDbOperation(
  async () => {
    const { data, error } = await supabase.from('ingredients').select('*').order('name');
    if (error) throw error;
    if (data) localStorage.setItem('kukooo_ingredients', JSON.stringify(data));
    return data;
  },
  async () => {
    const local = localStorage.getItem('kukooo_ingredients');
    if (local) return JSON.parse(local);
    localStorage.setItem('kukooo_ingredients', JSON.stringify(INITIAL_INGREDIENTS));
    return INITIAL_INGREDIENTS;
  }
);

export const saveIngredient = async (ingredient) => {
  const localList = JSON.parse(localStorage.getItem('kukooo_ingredients') || '[]');
  const idx = localList.findIndex(i => i.id === ingredient.id);
  if (idx >= 0) localList[idx] = ingredient; else localList.push(ingredient);
  localStorage.setItem('kukooo_ingredients', JSON.stringify(localList));

  return runDbOperation(
    async () => { await supabase.from('ingredients').upsert(ingredient); },
    async () => {}
  );
};

export const deleteIngredient = async (id) => {
  const localList = JSON.parse(localStorage.getItem('kukooo_ingredients') || '[]');
  localStorage.setItem('kukooo_ingredients', JSON.stringify(localList.filter(i => i.id !== id)));

  return runDbOperation(
    async () => { await supabase.from('ingredients').delete().eq('id', id); },
    async () => {}
  );
};

export const subscribeToIngredients = (callback) => {
  if (isSupabaseConfigured && supabase) {
    const channel = supabase.channel('public:ingredients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, async () => {
        const { data } = await supabase.from('ingredients').select('*').order('name');
        if (data) {
          localStorage.setItem('kukooo_ingredients', JSON.stringify(data));
          callback(data);
        }
      })
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }
  let lastStr = localStorage.getItem('kukooo_ingredients') || '';
  const interval = setInterval(() => {
    const raw = localStorage.getItem('kukooo_ingredients') || '[]';
    if (raw !== lastStr) {
      lastStr = raw;
      callback(JSON.parse(raw));
    }
  }, 3000);
  return () => clearInterval(interval);
};

export const updateIngredientStock = async (id, newQuantity) => {
  const localList = JSON.parse(localStorage.getItem('kukooo_ingredients') || '[]');
  const idx = localList.findIndex(p => p.id.toString() === id.toString());
  if (idx >= 0) {
    localList[idx].quantity = parseInt(newQuantity, 10);
    localStorage.setItem('kukooo_ingredients', JSON.stringify(localList));
  }

  return runDbOperation(
    async () => { await supabase.from('ingredients').update({ quantity: parseInt(newQuantity, 10) }).eq('id', id.toString()); },
    async () => {}
  );
};

// --- PRODUCTS (MENU ITEMS) ---
export const getProducts = async () => runDbOperation(
  async () => {
    const { data, error } = await supabase.from('products').select('*').order('id');
    if (error) throw error;
    const mapped = data.map(d => ({ ...d, branch_ids: d.branch_ids || ['branch-chak-104sb'] }));
    localStorage.setItem('kukooo_products', JSON.stringify(mapped));
    return mapped;
  },
  async () => {
    const local = localStorage.getItem('kukooo_products');
    if (local) return JSON.parse(local).map(p => ({ ...p, branch_ids: p.branch_ids || ['branch-chak-104sb'] }));
    const mappedInit = INITIAL_PRODUCTS.map(p => ({ ...p, branch_ids: ['branch-chak-104sb'] }));
    localStorage.setItem('kukooo_products', JSON.stringify(mappedInit));
    return mappedInit;
  }
);

export const saveProduct = async (product) => {
  const payload = {
    id: product.id.toString(),
    name: product.name,
    description: product.description || '',
    price: parseFloat(product.price),
    cost: parseFloat(product.cost || 0),
    category_id: product.category_id,
    image_url: product.image_url,
    is_available: !!product.is_available,
    quantity: parseInt(product.quantity || 0, 10),
    is_deal: !!product.is_deal,
    deal_items: product.deal_items || [],
    homepage_sections: product.homepage_sections || [],
    branch_ids: product.branch_ids || ['branch-chak-104sb'],
    has_sizes: !!product.has_sizes,
    sizes: product.sizes || [],
    ingredient_ids: product.ingredient_ids || []
  };

  const localList = JSON.parse(localStorage.getItem('kukooo_products') || '[]');
  const idx = localList.findIndex(p => p.id.toString() === payload.id);
  if (idx >= 0) localList[idx] = payload; else localList.push(payload);
  localStorage.setItem('kukooo_products', JSON.stringify(localList));

  return runDbOperation(
    async () => { await supabase.from('products').upsert(payload); },
    async () => {}
  );
};

export const deleteProduct = async (id) => {
  const idStr = id.toString();
  const localList = JSON.parse(localStorage.getItem('kukooo_products') || '[]');
  localStorage.setItem('kukooo_products', JSON.stringify(localList.filter(p => p.id.toString() !== idStr)));

  return runDbOperation(
    async () => { await supabase.from('products').delete().eq('id', idStr); },
    async () => {}
  );
};

export const subscribeToProducts = (callback) => {
  if (isSupabaseConfigured && supabase) {
    const channel = supabase.channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
        const { data } = await supabase.from('products').select('*').order('id');
        if (data) {
          const mapped = data.map(d => ({ ...d, branch_ids: d.branch_ids || ['branch-chak-104sb'] }));
          localStorage.setItem('kukooo_products', JSON.stringify(mapped));
          callback(mapped);
        }
      })
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }
  let lastStr = localStorage.getItem('kukooo_products') || '';
  const interval = setInterval(() => {
    const raw = localStorage.getItem('kukooo_products') || '[]';
    if (raw !== lastStr) {
      lastStr = raw;
      callback(JSON.parse(raw));
    }
  }, 3000);
  return () => clearInterval(interval);
};

export const updateProductStock = async (id, newQuantity) => {
  const localList = JSON.parse(localStorage.getItem('kukooo_products') || '[]');
  const idx = localList.findIndex(p => p.id.toString() === id.toString());
  if (idx >= 0) {
    localList[idx].quantity = parseInt(newQuantity, 10);
    localStorage.setItem('kukooo_products', JSON.stringify(localList));
  }

  return runDbOperation(
    async () => { await supabase.from('products').update({ quantity: parseInt(newQuantity, 10) }).eq('id', id.toString()); },
    async () => {}
  );
};

// --- OFFERS ---
export const getOffers = async () => runDbOperation(
  async () => {
    const { data, error } = await supabase.from('offers').select('*');
    if (error) throw error;
    if (data) localStorage.setItem('kukooo_offers', JSON.stringify(data));
    return data;
  },
  async () => {
    const local = localStorage.getItem('kukooo_offers');
    if (local) return JSON.parse(local);
    localStorage.setItem('kukooo_offers', JSON.stringify(INITIAL_OFFERS));
    return INITIAL_OFFERS;
  }
);

export const saveOffer = async (offer) => {
  const payload = {
    id: offer.id.toString(),
    title: offer.title,
    promo_image_url: offer.promo_image_url,
    active_status: !!offer.active_status,
    redirect_type: offer.redirect_type || 'none',
    redirect_target: offer.redirect_target || '',
    branch_ids: offer.branch_ids || ['branch-chak-104sb']
  };

  const localList = JSON.parse(localStorage.getItem('kukooo_offers') || '[]');
  const idx = localList.findIndex(o => o.id.toString() === payload.id);
  if (idx >= 0) localList[idx] = payload; else localList.push(payload);
  localStorage.setItem('kukooo_offers', JSON.stringify(localList));

  return runDbOperation(
    async () => { await supabase.from('offers').upsert(payload); },
    async () => {}
  );
};

export const deleteOffer = async (id) => {
  const localList = JSON.parse(localStorage.getItem('kukooo_offers') || '[]');
  localStorage.setItem('kukooo_offers', JSON.stringify(localList.filter(o => o.id.toString() !== id.toString())));

  return runDbOperation(
    async () => { await supabase.from('offers').delete().eq('id', id.toString()); },
    async () => {}
  );
};

const mergeOrdersWithLocalData = (dbOrders = []) => {
  const localOrders = JSON.parse(localStorage.getItem('kukooo_orders') || '[]');
  return dbOrders.map(dbOrder => {
    const local = localOrders.find(lo => lo.order_id === dbOrder.order_id);
    const firstItem = Array.isArray(dbOrder.items) ? dbOrder.items[0] : null;

    const discountAmount = (dbOrder.discount_amount !== undefined && dbOrder.discount_amount !== null)
      ? Number(dbOrder.discount_amount)
      : (local?.discount_amount !== undefined && local?.discount_amount !== null
          ? Number(local.discount_amount)
          : (Number(firstItem?._order_discount) || 0));

    const voucherCode = dbOrder.voucher_code || local?.voucher_code || firstItem?._order_voucher_code || null;
    const discountType = dbOrder.discount_type || local?.discount_type || firstItem?._order_discount_type || null;
    const discountValue = dbOrder.discount_value !== undefined && dbOrder.discount_value !== null
      ? Number(dbOrder.discount_value)
      : (local?.discount_value ?? (firstItem?._order_discount_value ?? 0));
    const subtotal = dbOrder.subtotal !== undefined && dbOrder.subtotal !== null
      ? Number(dbOrder.subtotal)
      : (local?.subtotal ?? (firstItem?._order_subtotal ?? dbOrder.total_amount));

    return {
      ...local,
      ...dbOrder,
      discount_amount: discountAmount,
      voucher_code: voucherCode,
      discount_type: discountType,
      discount_value: discountValue,
      subtotal: subtotal
    };
  });
};

// --- ORDERS ---
export const getOrders = async () => runDbOperation(
  async () => {
    const { data, error } = await supabase.from('orders').select('*').order('timestamp', { ascending: false }).limit(200);
    if (error) throw error;
    const merged = mergeOrdersWithLocalData(data || []);
    const sorted = merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    localStorage.setItem('kukooo_orders', JSON.stringify(sorted));
    return sorted;
  },
  async () => {
    const local = localStorage.getItem('kukooo_orders');
    if (local) return JSON.parse(local).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    localStorage.setItem('kukooo_orders', JSON.stringify(INITIAL_ORDERS));
    return INITIAL_ORDERS;
  }
);

export const placeOrderInDB = async (order, allProducts = []) => {
  // Embed discount information inside items payload as well so that if custom Postgres columns don't exist, it is never lost
  const itemsWithMeta = (order.items || []).map((it, idx) => {
    if (idx === 0) {
      return {
        ...it,
        _order_discount: Number(order.discount_amount) || 0,
        _order_voucher_code: order.voucher_code || null,
        _order_discount_type: order.discount_type || null,
        _order_discount_value: Number(order.discount_value) || 0,
        _order_subtotal: Number(order.subtotal) || Number(order.total_amount) || 0
      };
    }
    return it;
  });

  const fullOrder = {
    ...order,
    items: itemsWithMeta
  };

  // 1. Immediately record in local storage so local state is instant
  const ordersList = JSON.parse(localStorage.getItem('kukooo_orders') || '[]');
  ordersList.unshift(fullOrder);
  localStorage.setItem('kukooo_orders', JSON.stringify(ordersList));

  // 2. Compute stock deductions using provided products list or local cache
  const productsList = (allProducts && allProducts.length > 0)
    ? allProducts
    : JSON.parse(localStorage.getItem('kukooo_products') || '[]');

  const { ingredientDeductions, productDeductions } = calculateOrderDeductions(order.items || [], productsList);

  // 3. Deduct ingredients in local storage
  const localIngredients = JSON.parse(localStorage.getItem('kukooo_ingredients') || '[]');
  localIngredients.forEach(ing => {
    if (ingredientDeductions[ing.id]) {
      ing.quantity = Math.max(0, parseInt(ing.quantity || 0, 10) - ingredientDeductions[ing.id]);
    }
  });
  localStorage.setItem('kukooo_ingredients', JSON.stringify(localIngredients));

  // 4. Deduct products legacy stock in local storage
  const localProducts = JSON.parse(localStorage.getItem('kukooo_products') || '[]');
  localProducts.forEach(prod => {
    if (productDeductions[prod.id]) {
      prod.quantity = Math.max(0, parseInt(prod.quantity || 0, 10) - productDeductions[prod.id]);
    }
  });
  localStorage.setItem('kukooo_products', JSON.stringify(localProducts));

  if (isSupabaseConfigured && supabase) {
    try {
      // Parallel stock update in Supabase for ingredients
      const ingredientUpdatePromises = Object.keys(ingredientDeductions).map(async (ingId) => {
        const found = localIngredients.find(i => i.id === ingId);
        if (found) {
          await supabase.from('ingredients').update({ quantity: found.quantity }).eq('id', ingId);
        }
      });

      // Parallel stock update in Supabase for legacy products
      const productUpdatePromises = Object.keys(productDeductions).map(async (pId) => {
        const found = localProducts.find(p => p.id.toString() === pId.toString());
        if (found) {
          await supabase.from('products').update({ quantity: found.quantity }).eq('id', pId);
        }
      });

      const orderInsertPromise = (async () => {
        const { error: insertError } = await supabase.from('orders').insert(order);
        if (insertError) {
          const sanitizedOrder = {
            order_id: order.order_id,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            customer_address: order.customer_address || '',
            items: order.items,
            total_amount: parseFloat(order.total_amount) || 0,
            order_type: order.order_type || 'Takeaway',
            status: order.status || 'Pending',
            timestamp: order.timestamp || new Date().toISOString(),
            branch_id: order.branch_id || 'branch-chak-104sb',
            discount_amount: parseFloat(order.discount_amount) || 0,
            discount_type: order.discount_type || null,
            discount_value: parseFloat(order.discount_value) || 0,
            voucher_code: order.voucher_code || null,
            delivery_fee: parseFloat(order.delivery_fee) || 0,
            special_instructions: order.special_instructions || ''
          };
          const { error: secondErr } = await supabase.from('orders').insert(sanitizedOrder);
          if (secondErr) {
            // Minimalist fallback if custom columns do not exist in Postgres
            const minimalOrder = {
              order_id: order.order_id,
              customer_name: order.customer_name,
              customer_phone: order.customer_phone,
              customer_address: order.customer_address || '',
              items: order.items,
              total_amount: parseFloat(order.total_amount) || 0,
              order_type: order.order_type || 'Takeaway',
              status: order.status || 'Pending',
              timestamp: order.timestamp || new Date().toISOString(),
              branch_id: order.branch_id || 'branch-chak-104sb'
            };
            await supabase.from('orders').insert(minimalOrder);
          }
        }
      })();

      await Promise.allSettled([...ingredientUpdatePromises, ...productUpdatePromises, orderInsertPromise]);
      return;
    } catch (err) {
      console.warn("Supabase order placement error:", err);
    }
  }
};

export const updateOrderStatusInDB = async (orderId, newStatus) => runDbOperation(
  async () => { await supabase.from('orders').update({ status: newStatus }).eq('order_id', orderId); },
  async () => {
    const list = await getOrders();
    const index = list.findIndex(o => o.order_id === orderId);
    if (index >= 0) { list[index].status = newStatus; localStorage.setItem('kukooo_orders', JSON.stringify(list)); }
  }
);

export const updateOrderDetailsInDB = async (orderId, updatedItems, newTotal, extraFields = {}) => runDbOperation(
  async () => {
    await supabase.from('orders').update({ items: updatedItems, total_amount: parseFloat(newTotal), ...extraFields }).eq('order_id', orderId);
  },
  async () => {
    const list = await getOrders();
    const index = list.findIndex(o => o.order_id === orderId);
    if (index >= 0) {
      list[index].items = updatedItems; list[index].total_amount = parseFloat(newTotal);
      Object.assign(list[index], extraFields); localStorage.setItem('kukooo_orders', JSON.stringify(list));
    }
  }
);

export const deleteOrderInDB = async (orderId) => runDbOperation(
  async () => { await supabase.from('orders').delete().eq('order_id', orderId); },
  async () => {
    const list = await getOrders();
    localStorage.setItem('kukooo_orders', JSON.stringify(list.filter(o => o.order_id !== orderId)));
  }
);

// --- ORDER ANALYTICS ARCHIVES & PURGE ---
export const getArchivedAnalytics = async () => runDbOperation(
  async () => {
    const { data, error } = await supabase.from('order_analytics_archives').select('*');
    if (error) {
      console.warn("Could not fetch order_analytics_archives:", error);
      return [];
    }
    return data || [];
  },
  async () => {
    const local = localStorage.getItem('kukooo_order_archives');
    return local ? JSON.parse(local) : [];
  }
);

export const archiveAndPurgeOrders = async ({ startDate, endDate, branchId = 'All', ordersToArchive = [] }) => {
  if (!ordersToArchive || ordersToArchive.length === 0) return { count: 0, archiveId: null };

  const totalOrders = ordersToArchive.length;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let grossRevenue = 0;
  let totalCost = 0;
  let totalDiscounts = 0;
  let totalDeliveryFees = 0;
  const orderTypes = { 'Dine-In': 0, 'Delivery': 0, 'Takeaway': 0 };
  const itemMap = {};

  ordersToArchive.forEach(o => {
    const statusLower = (o.status || '').toLowerCase();
    if (statusLower === 'cancelled') {
      cancelledOrders++;
    } else {
      completedOrders++;
      grossRevenue += (Number(o.total_amount) || 0);
      totalDiscounts += (Number(o.discount_amount) || 0);
      totalDeliveryFees += (Number(o.delivery_fee) || 0);

      const typeLower = (o.order_type || '').toLowerCase();
      if (typeLower === 'dine-in') orderTypes['Dine-In'] = (orderTypes['Dine-In'] || 0) + 1;
      else if (typeLower === 'delivery') orderTypes['Delivery'] = (orderTypes['Delivery'] || 0) + 1;
      else orderTypes['Takeaway'] = (orderTypes['Takeaway'] || 0) + 1;

      if (o.items) {
        o.items.forEach(it => {
          totalCost += (Number(it.unitCost) || 0) * (Number(it.quantity) || 1);
          const name = it.name || 'Unknown Item';
          if (!itemMap[name]) itemMap[name] = { name, quantity: 0, revenue: 0 };
          itemMap[name].quantity += (Number(it.quantity) || 1);
          itemMap[name].revenue += ((Number(it.price) || 0) * (Number(it.quantity) || 1));
        });
      }
    }
  });

  const netProfit = grossRevenue - totalCost;
  const itemBreakdown = Object.values(itemMap);

  const archiveId = `archive_${startDate || 'earliest'}_${endDate || 'latest'}_${branchId}_${Date.now()}`;
  const archivePayload = {
    id: archiveId,
    start_date: startDate || '2020-01-01',
    end_date: endDate || new Date().toISOString().split('T')[0],
    branch_id: branchId,
    total_orders: totalOrders,
    completed_orders: completedOrders,
    cancelled_orders: cancelledOrders,
    gross_revenue: grossRevenue,
    total_cost: totalCost,
    net_profit: netProfit,
    total_discounts: totalDiscounts,
    total_delivery_fees: totalDeliveryFees,
    order_types: orderTypes,
    item_breakdown: itemBreakdown,
    archived_at: new Date().toISOString()
  };

  // Step 1: Save archive record
  await runDbOperation(
    async () => {
      const { error } = await supabase.from('order_analytics_archives').upsert(archivePayload);
      if (error) throw error;
    },
    async () => {
      const archives = JSON.parse(localStorage.getItem('kukooo_order_archives') || '[]');
      archives.push(archivePayload);
      localStorage.setItem('kukooo_order_archives', JSON.stringify(archives));
    }
  );

  // Step 2: Delete raw orders from DB
  const orderIdsToDelete = ordersToArchive.map(o => o.order_id);
  await runDbOperation(
    async () => {
      const { error } = await supabase.from('orders').delete().in('order_id', orderIdsToDelete);
      if (error) throw error;
    },
    async () => {
      const currentOrders = JSON.parse(localStorage.getItem('kukooo_orders') || '[]');
      const remainingOrders = currentOrders.filter(o => !orderIdsToDelete.includes(o.order_id));
      localStorage.setItem('kukooo_orders', JSON.stringify(remainingOrders));
    }
  );

  return { count: orderIdsToDelete.length, archiveId };
};

export const subscribeToOrders = (callback) => {
  if (isSupabaseConfigured && supabase) {
    const channel = supabase.channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        const { data } = await supabase.from('orders').select('*');
        if (data) {
          const merged = mergeOrdersWithLocalData(data || []);
          const sorted = merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          localStorage.setItem('kukooo_orders', JSON.stringify(sorted));
          callback(sorted);
        }
      })
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }
  let lastStr = localStorage.getItem('kukooo_orders') || '';
  const interval = setInterval(() => {
    const raw = localStorage.getItem('kukooo_orders') || '[]';
    if (raw !== lastStr) {
      lastStr = raw;
      callback(JSON.parse(raw).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    }
  }, 2000);
  return () => clearInterval(interval);
};

// --- ADDONS ---
export const getAddons = async () => runDbOperation(
  async () => {
    const { data, error } = await supabase.from('addons').select('*');
    if (error) throw error;
    if (data) localStorage.setItem('kukooo_addons', JSON.stringify(data));
    return data;
  },
  async () => {
    const local = localStorage.getItem('kukooo_addons');
    if (local) return JSON.parse(local);
    localStorage.setItem('kukooo_addons', JSON.stringify(INITIAL_ADDONS));
    return INITIAL_ADDONS;
  }
);

export const saveAddon = async (addon) => {
  const idStr = addon.id || `add-${Date.now()}`;
  const payload = { id: idStr, name: addon.name, price: parseFloat(addon.price), type: addon.type, branch_ids: addon.branch_ids || ['branch-chak-104sb'] };
  const localList = JSON.parse(localStorage.getItem('kukooo_addons') || '[]');
  const idx = localList.findIndex(a => a.id === idStr);
  if (idx >= 0) localList[idx] = payload; else localList.push(payload);
  localStorage.setItem('kukooo_addons', JSON.stringify(localList));

  return runDbOperation(
    async () => { await supabase.from('addons').upsert(payload); },
    async () => {}
  );
};

export const deleteAddon = async (id) => {
  const localList = JSON.parse(localStorage.getItem('kukooo_addons') || '[]');
  localStorage.setItem('kukooo_addons', JSON.stringify(localList.filter(a => a.id !== id)));

  return runDbOperation(
    async () => { await supabase.from('addons').delete().eq('id', id); },
    async () => {}
  );
};

// --- HOMEPAGE SECTIONS ---
export const getHomepageSections = async () => runDbOperation(
  async () => {
    const { data } = await supabase.from('homepage_sections_doc').select('sections').eq('id', '_homepage_sections_').single();
    let sections = data ? data.sections : [...INITIAL_HOMEPAGE_SECTIONS];
    if (!data) await supabase.from('homepage_sections_doc').insert({ id: '_homepage_sections_', sections });
    if (sections) localStorage.setItem('kukooo_homepage_sections', JSON.stringify(sections));
    return sections;
  },
  async () => {
    const local = localStorage.getItem('kukooo_homepage_sections');
    if (local) return JSON.parse(local);
    localStorage.setItem('kukooo_homepage_sections', JSON.stringify(INITIAL_HOMEPAGE_SECTIONS));
    return INITIAL_HOMEPAGE_SECTIONS;
  }
);

export const saveHomepageSection = async (section) => {
  const payload = { id: section.id.toString(), name: section.name, type: 'products', is_active: !!section.is_active, branch_ids: section.branch_ids || ['branch-chak-104sb'] };
  const localList = JSON.parse(localStorage.getItem('kukooo_homepage_sections') || '[]');
  const idx = localList.findIndex(s => s.id === payload.id);
  if (idx >= 0) localList[idx] = payload; else localList.push(payload);
  localStorage.setItem('kukooo_homepage_sections', JSON.stringify(localList));

  return runDbOperation(
    async () => {
      await supabase.from('homepage_sections_doc').upsert({ id: '_homepage_sections_', sections: localList });
    },
    async () => {}
  );
};

export const deleteHomepageSection = async (id) => {
  const localList = JSON.parse(localStorage.getItem('kukooo_homepage_sections') || '[]');
  const remaining = localList.filter(s => s.id !== id);
  localStorage.setItem('kukooo_homepage_sections', JSON.stringify(remaining));

  return runDbOperation(
    async () => {
      await supabase.from('homepage_sections_doc').update({ sections: remaining }).eq('id', '_homepage_sections_');
    },
    async () => {}
  );
};

// --- BRANCHES ---
export const getBranches = async () => runDbOperation(
  async () => {
    const { data, error } = await supabase.from('branches').select('*');
    if (error) throw error;
    if (data) localStorage.setItem('kukooo_branches', JSON.stringify(data));
    return data;
  },
  async () => {
    const local = localStorage.getItem('kukooo_branches');
    if (local) return JSON.parse(local);
    localStorage.setItem('kukooo_branches', JSON.stringify(INITIAL_BRANCHES));
    return INITIAL_BRANCHES;
  }
);

export const saveBranch = async (branch) => {
  const payload = { id: branch.id.toString(), name: branch.name, address: branch.address, lat: parseFloat(branch.lat) || 0, lng: parseFloat(branch.lng) || 0, maps_link: branch.maps_link || '' };
  const localList = JSON.parse(localStorage.getItem('kukooo_branches') || '[]');
  const idx = localList.findIndex(b => b.id === payload.id);
  if (idx >= 0) localList[idx] = payload; else localList.push(payload);
  localStorage.setItem('kukooo_branches', JSON.stringify(localList));

  return runDbOperation(
    async () => { await supabase.from('branches').upsert(payload); },
    async () => {}
  );
};

export const deleteBranch = async (id) => {
  const localList = JSON.parse(localStorage.getItem('kukooo_branches') || '[]');
  localStorage.setItem('kukooo_branches', JSON.stringify(localList.filter(b => b.id !== id.toString())));

  return runDbOperation(
    async () => { await supabase.from('branches').delete().eq('id', id.toString()); },
    async () => {}
  );
};

// --- STAFF AUTHENTICATION ---
export const authenticateStaff = async (loginId, password) => {
  const normalizedLogin = loginId.trim().toLowerCase();
  const normalizedPassword = password.trim().toLowerCase();

  if (!isSupabaseConfigured || !supabase) {
    if (normalizedLogin === 'manager' && (normalizedPassword === 'admin' || normalizedPassword === 'manager')) return { role: 'manager', email: 'manager@local' };
    if ((normalizedLogin === 'employee' || normalizedLogin === 'staff') && (normalizedPassword === 'staff' || normalizedPassword === 'employee')) return { role: 'employee', email: 'employee@local' };
    throw new Error("Invalid local credentials.");
  }

  let email = loginId.trim();
  if (!email.includes('@')) email = `${loginId.toLowerCase()}@mrkukooo.com`;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const user = data.user;
    
    const { data: userDoc } = await supabase.from('users').select('role').eq('id', user.id).single();
    let role = userDoc?.role;

    if (!role) {
      if (email.startsWith('manager')) role = 'manager';
      else if (email.startsWith('employee') || email.startsWith('staff')) role = 'employee';
      else throw new Error("User has no role assigned. Email prefix must be manager@ or employee@.");
    }

    return { role, email: user.email, uid: user.id };
  } catch (authErr) {
    console.error("Supabase Auth failed:", authErr);
    const isDefaultManager = email === 'manager@mrkukooo.com' && (normalizedPassword === 'admin' || normalizedPassword === 'manager');
    const isDefaultEmployee = (email === 'employee@mrkukooo.com' || email === 'staff@mrkukooo.com') && (normalizedPassword === 'staff' || normalizedPassword === 'employee');

    if (authErr.message.includes('Invalid login credentials')) {
      if (isDefaultManager || isDefaultEmployee) {
        try {
          console.log(`Auto-registering default staff user in Supabase Auth: ${email}`);
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
          if (signUpError) throw signUpError;
          
          const role = isDefaultManager ? 'manager' : 'employee';
          await supabase.from('users').insert({ id: signUpData.user.id, email: signUpData.user.email, role });
          
          return { role, email: signUpData.user.email, uid: signUpData.user.id };
        } catch (regErr) {
          throw new Error(`Failed to auto-register default user: ${regErr.message}`, { cause: regErr });
        }
      }
    }
    throw new Error(authErr.message, { cause: authErr });
  }
};

// ==========================================
// 4. VOUCHERS & DISCOUNT PROMO CODES
// ==========================================
export const INITIAL_VOUCHERS = [
  {
    id: 'vouch-welcome50',
    code: 'WELCOME50',
    type: 'price',
    value: 50,
    min_order: 300,
    max_uses: 100,
    times_used: 0,
    is_active: true
  },
  {
    id: 'vouch-kukooo10',
    code: 'KUKOOO10',
    type: 'percentage',
    value: 10,
    min_order: 500,
    max_uses: 50,
    times_used: 0,
    is_active: true
  }
];

export const INITIAL_VOUCHER_SETTINGS = {
  customer_vouchers_enabled: false
};

export const getVouchers = async () => runDbOperation(
  async () => {
    const { data, error } = await supabase.from('vouchers').select('*').order('code');
    if (error) throw error;
    if (data) localStorage.setItem('kukooo_vouchers', JSON.stringify(data));
    return data;
  },
  async () => {
    const local = localStorage.getItem('kukooo_vouchers');
    if (local) return JSON.parse(local);
    localStorage.setItem('kukooo_vouchers', JSON.stringify(INITIAL_VOUCHERS));
    return INITIAL_VOUCHERS;
  }
);

export const saveVoucher = async (voucher) => {
  const idStr = voucher.id || `vouch-${Date.now()}`;
  const payload = {
    ...voucher,
    id: idStr,
    code: (voucher.code || '').trim().toUpperCase(),
    type: voucher.type || 'price',
    value: parseFloat(voucher.value) || 0,
    min_order: parseFloat(voucher.min_order) || 0,
    max_uses: parseInt(voucher.max_uses, 10) || 0,
    times_used: parseInt(voucher.times_used, 10) || 0,
    is_active: voucher.is_active !== false
  };

  const localList = JSON.parse(localStorage.getItem('kukooo_vouchers') || '[]');
  const idx = localList.findIndex(v => v.id === idStr);
  if (idx >= 0) localList[idx] = payload; else localList.push(payload);
  localStorage.setItem('kukooo_vouchers', JSON.stringify(localList));

  return runDbOperation(
    async () => { await supabase.from('vouchers').upsert(payload); },
    async () => {}
  );
};

export const deleteVoucher = async (id) => {
  const localList = JSON.parse(localStorage.getItem('kukooo_vouchers') || '[]');
  localStorage.setItem('kukooo_vouchers', JSON.stringify(localList.filter(v => v.id !== id)));

  return runDbOperation(
    async () => { await supabase.from('vouchers').delete().eq('id', id); },
    async () => {}
  );
};

export const incrementVoucherUsage = async (voucherCode) => {
  if (!voucherCode) return;
  const cleanCode = voucherCode.trim().toUpperCase();
  const localList = JSON.parse(localStorage.getItem('kukooo_vouchers') || '[]');
  const idx = localList.findIndex(v => (v.code || '').trim().toUpperCase() === cleanCode);
  if (idx >= 0) {
    localList[idx].times_used = (parseInt(localList[idx].times_used, 10) || 0) + 1;
    localStorage.setItem('kukooo_vouchers', JSON.stringify(localList));
  }

  return runDbOperation(
    async () => {
      const { data } = await supabase.from('vouchers').select('*').eq('code', cleanCode).single();
      if (data) {
        await supabase.from('vouchers').update({ times_used: (data.times_used || 0) + 1 }).eq('id', data.id);
      }
    },
    async () => {}
  );
};

export const getVoucherSettings = async () => runDbOperation(
  async () => {
    const { data } = await supabase.from('store_settings').select('*').eq('key', 'voucher_settings').single();
    if (data && data.value) {
      localStorage.setItem('kukooo_voucher_settings', JSON.stringify(data.value));
      return data.value;
    }
    return INITIAL_VOUCHER_SETTINGS;
  },
  async () => {
    const local = localStorage.getItem('kukooo_voucher_settings');
    if (local) return JSON.parse(local);
    localStorage.setItem('kukooo_voucher_settings', JSON.stringify(INITIAL_VOUCHER_SETTINGS));
    return INITIAL_VOUCHER_SETTINGS;
  }
);

export const saveVoucherSettings = async (settings) => {
  localStorage.setItem('kukooo_voucher_settings', JSON.stringify(settings));

  return runDbOperation(
    async () => {
      await supabase.from('store_settings').upsert({ key: 'voucher_settings', value: settings });
    },
    async () => {}
  );
};

