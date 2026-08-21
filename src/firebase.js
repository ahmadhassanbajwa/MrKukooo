import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_OFFERS, 
  INITIAL_VOUCHERS, 
  INITIAL_ORDERS,
  INITIAL_ADDONS,
  INITIAL_INGREDIENTS
} from './mockData';

// Default categories
const INITIAL_CATEGORIES = [
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

// Default branch matching requested coordinates
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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_PROJECT_ID;


let db = null;
let storage = null;
let auth = null;

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("VITE_FIREBASE_PROJECT_ID not set. Running in LocalStorage fallback mode.");
}

/**
 * Unified CRUD runner that attempts Firebase operations first (if configured)
 * and falls back to LocalStorage persistence.
 */
const runDbOperation = async (firebaseOp, localOp) => {
  if (isFirebaseConfigured && db) {
    try {
      return await firebaseOp();
    } catch (err) {
      console.warn("Firestore operation failed, falling back to LocalStorage:", err);
    }
  }
  return await localOp();
};

// ==========================================
// 1. FILE UPLOAD CONTROLLER
// ==========================================
export const uploadImage = async (file, folder = 'uploads') => {
  if (!file) return '';

  // 1. Bulletproof Client-Side Compression
  const compressImage = (fileObj) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const MAX_SIZE = 500; // Small size to ensure < 100KB

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
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

  // Convert base64 to File
  const dataURLtoFile = (dataurl, filename) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  try {
    const base64Str = await compressImage(file);

    if (isFirebaseConfigured && storage) {
      try {
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_').split('.')[0]}.jpg`;
        const compressedFile = dataURLtoFile(base64Str, fileName);
        const storageRef = ref(storage, `${folder}/${fileName}`);

        // 2. Strict 8-second timeout for Firebase Storage
        const uploadPromise = uploadBytes(storageRef, compressedFile);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Firebase Storage timeout")), 8000)
        );

        const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
        return await getDownloadURL(snapshot.ref);
      } catch (error) {
        console.warn("Firebase Storage failed or timed out. Falling back to Base64.", error);
        return base64Str; // Fallback to storing Base64 directly in Firestore
      }
    }

    return base64Str;
  } catch (err) {
    console.error("Image upload critical failure:", err);
    // Ultimate fallback if canvas fails
    return URL.createObjectURL(file);
  }
};

// ==========================================
// 2. SEED INITIALIZER FOR DATABASE
// ==========================================
export const forceSyncDatabase = async () => {
  if (!isFirebaseConfigured || !db) return;
  console.log("Forcing DB Sync for Azadi Deals & Quantities...");
  
  const catQuery = await getDocs(collection(db, 'categories'));
  const existingCats = catQuery.docs.map(d => d.id);
  for (const cat of INITIAL_CATEGORIES) {
    if (!existingCats.includes(cat.id)) {
      await setDoc(doc(db, 'categories', cat.id), { name: cat.name, image_url: cat.image_url || '' });
    }
  }

  const prodQuery = await getDocs(collection(db, 'products'));
  const existingProds = prodQuery.docs.map(d => d.id);
  for (const d of prodQuery.docs) {
    if (d.id === '_homepage_sections_') continue;
    const data = d.data();
    
    // Helper to find product ID by name
    const getProductIdByName = (nameMatch) => {
      const p = prodQuery.docs.find(doc => {
        const pData = doc.data();
        return pData.name && pData.name.toLowerCase().includes(nameMatch.toLowerCase()) && !pData.is_deal;
      });
      return p ? p.id : null;
    };

    // Fix deals that might have been created without is_deal or deal_items
    const updateData = {};
    if (data.name && data.name.toUpperCase().startsWith('DEAL ')) {
      updateData.is_deal = true;
      updateData.quantity = 0;
      
      const dealName = data.name.toUpperCase();
      let newItems = [];

      if (dealName === 'DEAL 1') {
        newItems = [
          { product_id: getProductIdByName('Small Pizza'), quantity: 2 },
          { product_id: getProductIdByName('Half Ltr') || getProductIdByName('Coca'), quantity: 1 }
        ];
      } else if (dealName === 'DEAL 2') {
        newItems = [
          { product_id: getProductIdByName('Medium Pizza'), quantity: 2 },
          { product_id: getProductIdByName('1 Ltr') || getProductIdByName('1 Liter'), quantity: 1 }
        ];
      } else if (dealName === 'DEAL 3') {
        newItems = [
          { product_id: getProductIdByName('Large Pizza'), quantity: 2 },
          { product_id: getProductIdByName('1.5 Ltr') || getProductIdByName('1 Liter'), quantity: 1 } // Fallback to 1L
        ];
      } else if (dealName === 'DEAL 4') {
        newItems = [
          { product_id: getProductIdByName('Small Pizza'), quantity: 1 },
          { product_id: getProductIdByName('Hot wings') || getProductIdByName('wings'), quantity: 5 },
          { product_id: getProductIdByName('Half Ltr') || getProductIdByName('Coca'), quantity: 1 }
        ];
      } else if (dealName === 'DEAL 5') {
        newItems = [
          { product_id: getProductIdByName('Large Pizza'), quantity: 1 },
          { product_id: getProductIdByName('Hot wings') || getProductIdByName('wings'), quantity: 10 },
          { product_id: getProductIdByName('Zinger'), quantity: 2 },
          { product_id: getProductIdByName('1.5 Ltr') || getProductIdByName('1 Liter'), quantity: 1 }
        ];
      } else if (dealName === 'DEAL 6') {
        newItems = [
          { product_id: getProductIdByName('Zinger'), quantity: 5 },
          { product_id: getProductIdByName('1.5 Ltr') || getProductIdByName('1 Liter'), quantity: 1 }
        ];
      } else if (dealName === 'DEAL 7') {
        newItems = [
          { product_id: getProductIdByName('Shawarma'), quantity: 5 },
          { product_id: getProductIdByName('1 Ltr') || getProductIdByName('1 Liter'), quantity: 1 }
        ];
      } else if (dealName === 'DEAL 8') {
        newItems = [
          { product_id: getProductIdByName('Medium Pizza'), quantity: 1 },
          { product_id: getProductIdByName('Pasta'), quantity: 1 },
          { product_id: getProductIdByName('1 Ltr') || getProductIdByName('1 Liter'), quantity: 1 }
        ];
      } else if (dealName === 'DEAL 9') {
        newItems = [
          { product_id: getProductIdByName('Zinger'), quantity: 1 },
          { product_id: getProductIdByName('Half Ltr') || getProductIdByName('Coca'), quantity: 1 }
        ];
      }

      // Only add valid items
      updateData.deal_items = newItems.filter(item => item.product_id !== null);

    } else if (data.quantity !== 5 && !data.is_deal) {
      updateData.quantity = 5;
    }

    if (Object.keys(updateData).length > 0) {
      await updateDoc(doc(db, 'products', d.id), updateData);
    }
  }

  for (const prod of INITIAL_PRODUCTS) {
    if (prod.id >= 11) {
      if (!existingProds.includes(prod.id.toString())) {
        let categoryId = 'cat-pizzas';
        if (prod.category === 'Burgers') categoryId = 'cat-burgers';
        else if (prod.category === 'Sides') categoryId = 'cat-sides';
        else if (prod.category === 'Drinks') categoryId = 'cat-drinks';
        else if (prod.category === 'Azadi Deals') categoryId = 'cat-azadi-deals';

        await setDoc(doc(db, 'products', prod.id.toString()), {
          name: prod.name,
          description: prod.description,
          price: prod.price,
          category_id: categoryId,
          image_url: prod.image_url,
          is_available: prod.is_available,
          quantity: 5,
          is_deal: !!prod.is_deal,
          deal_items: prod.deal_items || [],
          branch_ids: ['branch-chak-104sb']
        });
      }
    }
  }
  
  localStorage.setItem('kukooo_force_sync_completed', 'true');
  console.log("Force sync complete!");
};

export const seedDatabaseIfEmpty = async () => {
  if (!isFirebaseConfigured || !db) return;

  try {
    if (localStorage.getItem('kukooo_db_seeded') === 'true') {
      return;
    }
    const catQuery = await getDocs(collection(db, 'categories'));
    if (!catQuery.empty) {
      localStorage.setItem('kukooo_db_seeded', 'true');
      return;
    }

    console.log("Seeding categories to Firestore...");
    for (const cat of INITIAL_CATEGORIES) {
      await setDoc(doc(db, 'categories', cat.id), { name: cat.name, image_url: cat.image_url || '' });
    }

    const ingQuery = await getDocs(collection(db, 'ingredients'));
    if (ingQuery.empty) {
      console.log("Seeding ingredients to Firestore...");
      for (const ing of INITIAL_INGREDIENTS) {
        await setDoc(doc(db, 'ingredients', ing.id), ing);
      }
    }

    const prodQuery = await getDocs(collection(db, 'products'));
    if (prodQuery.empty) {
      console.log("Seeding products to Firestore...");
      for (const prod of INITIAL_PRODUCTS) {
        let categoryId = 'cat-pizzas';
        if (prod.category === 'Burgers') categoryId = 'cat-burgers';
        else if (prod.category === 'Sides') categoryId = 'cat-sides';
        else if (prod.category === 'Drinks') categoryId = 'cat-drinks';

        await setDoc(doc(db, 'products', prod.id.toString()), {
          name: prod.name,
          description: prod.description,
          price: prod.price,
          category_id: categoryId,
          image_url: prod.image_url,
          is_available: prod.is_available,
          quantity: prod.quantity || 0,
          is_deal: !!prod.is_deal,
          deal_items: prod.deal_items || [],
          branch_ids: ['branch-chak-104sb']
        });
      }
    }

    const offerQuery = await getDocs(collection(db, 'offers'));
    if (offerQuery.empty) {
      console.log("Seeding offers to Firestore...");
      for (const off of INITIAL_OFFERS) {
        await setDoc(doc(db, 'offers', off.id.toString()), {
          title: off.title,
          promo_image_url: off.promo_image_url,
          active_status: off.active_status,
          branch_ids: ['branch-chak-104sb']
        });
      }
    }

    const voucherQuery = await getDocs(collection(db, 'vouchers'));
    if (voucherQuery.empty) {
      console.log("Seeding vouchers to Firestore...");
      for (const vouch of INITIAL_VOUCHERS) {
        await setDoc(doc(db, 'vouchers', vouch.code), {
          code: vouch.code,
          discount_type: vouch.discount_type,
          value: vouch.value,
          expiry: vouch.expiry,
          usage_count: vouch.usage_count,
          max_total_usage: null,
          min_order_amount: 0,
          expiry_date: vouch.expiry || '',
          one_use_per_phone: false,
          branch_ids: ['branch-chak-104sb']
        });
      }
    }

    const orderQuery = await getDocs(collection(db, 'orders'));
    if (orderQuery.empty) {
      console.log("Seeding initial orders to Firestore...");
      for (const ord of INITIAL_ORDERS) {
        await setDoc(doc(db, 'orders', ord.order_id), {
          order_id: ord.order_id,
          customer_name: ord.customer_name,
          customer_phone: ord.customer_phone,
          customer_address: ord.customer_address || '',
          items: ord.items,
          total_amount: ord.total_amount,
          order_type: ord.order_type,
          status: ord.status,
          timestamp: ord.timestamp,
          branch_id: 'branch-chak-104sb'
        });
      }
    }

    const addonQuery = await getDocs(collection(db, 'addons'));
    if (addonQuery.empty) {
      console.log("Seeding initial addons to Firestore...");
      for (const addon of INITIAL_ADDONS) {
        await setDoc(doc(db, 'addons', addon.id), {
          name: addon.name,
          price: addon.price,
          type: addon.type,
          branch_ids: ['branch-chak-104sb']
        });
      }
    }

    const branchQuery = await getDocs(collection(db, 'branches'));
    if (branchQuery.empty) {
      console.log("Seeding initial branches to Firestore...");
      for (const br of INITIAL_BRANCHES) {
        await setDoc(doc(db, 'branches', br.id), br);
      }
    }
    localStorage.setItem('kukooo_db_seeded', 'true');
  } catch (error) {
    console.error("Error seeding Firestore database:", error);
  }
};

// ==========================================
// 3. DATABASE CRUD API (UNIFIED INTERFACE)
// ==========================================

// --- CATEGORIES ---
export const getCategories = async () => runDbOperation(
  async () => {
    const q = await getDocs(collection(db, 'categories'));
    return q.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }));
  },
  async () => {
    const local = localStorage.getItem('kukooo_categories');
    if (local) return JSON.parse(local);
    localStorage.setItem('kukooo_categories', JSON.stringify(INITIAL_CATEGORIES));
    return INITIAL_CATEGORIES;
  }
);

export const saveCategory = async (id, name, image_url = '') => runDbOperation(
  async () => {
    const payload = { name };
    if (image_url) payload.image_url = image_url;
    await setDoc(doc(db, 'categories', id), payload, { merge: true });
  },
  async () => {
    const list = await getCategories();
    const index = list.findIndex(c => c.id === id);
    if (index >= 0) {
      list[index].name = name;
      if (image_url) list[index].image_url = image_url;
    } else {
      list.push({ id, name, image_url });
    }
    localStorage.setItem('kukooo_categories', JSON.stringify(list));
  }
);

export const deleteCategory = async (id) => runDbOperation(
  async () => {
    await deleteDoc(doc(db, 'categories', id));
  },
  async () => {
    const list = await getCategories();
    const updated = list.filter(c => c.id !== id);
    localStorage.setItem('kukooo_categories', JSON.stringify(updated));
  }
);

// --- INGREDIENTS ---
export const getIngredients = async () => runDbOperation(
  async () => {
    const q = await getDocs(collection(db, 'ingredients'));
    return q.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }));
  },
  async () => {
    const local = localStorage.getItem('kukooo_ingredients');
    if (local) return JSON.parse(local);
    localStorage.setItem('kukooo_ingredients', JSON.stringify(INITIAL_INGREDIENTS));
    return INITIAL_INGREDIENTS;
  }
);

export const saveIngredient = async (ingredient) => runDbOperation(
  async () => {
    await setDoc(doc(db, 'ingredients', ingredient.id), ingredient, { merge: true });
  },
  async () => {
    const list = await getIngredients();
    const index = list.findIndex(i => i.id === ingredient.id);
    if (index >= 0) {
      list[index] = ingredient;
    } else {
      list.push(ingredient);
    }
    localStorage.setItem('kukooo_ingredients', JSON.stringify(list));
  }
);

export const deleteIngredient = async (id) => runDbOperation(
  async () => {
    await deleteDoc(doc(db, 'ingredients', id));
  },
  async () => {
    const list = await getIngredients();
    const updated = list.filter(i => i.id !== id);
    localStorage.setItem('kukooo_ingredients', JSON.stringify(updated));
  }
);

export const subscribeToIngredients = (callback) => {
  if (isFirebaseConfigured && db) {
    try {
      const col = collection(db, 'ingredients');
      let localInterval = null;
      const unsubscribe = onSnapshot(col, {
        next: (snapshot) => {
          callback(snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })));
        },
        error: (err) => {
          console.warn("Firestore onSnapshot error for ingredients, falling back to local:", err);
          if (!localInterval) {
            localInterval = setInterval(() => {
              callback(JSON.parse(localStorage.getItem('kukooo_ingredients') || '[]'));
            }, 1000);
          }
        }
      });
      return () => {
        unsubscribe();
        if (localInterval) clearInterval(localInterval);
      };
    } catch (err) {
      console.warn("Firestore subscribeToIngredients failed, falling back to local:", err);
    }
  }
  const interval = setInterval(() => {
    callback(JSON.parse(localStorage.getItem('kukooo_ingredients') || '[]'));
  }, 1000);
  return () => clearInterval(interval);
};

export const updateIngredientStock = async (id, newQuantity) => runDbOperation(
  async () => {
    await updateDoc(doc(db, 'ingredients', id.toString()), { quantity: parseInt(newQuantity, 10) });
  },
  async () => {
    const list = await getIngredients();
    const index = list.findIndex(p => p.id.toString() === id.toString());
    if (index >= 0) {
      list[index].quantity = parseInt(newQuantity, 10);
      localStorage.setItem('kukooo_ingredients', JSON.stringify(list));
    }
  }
);

// --- PRODUCTS (MENU ITEMS) ---
export const getProducts = async () => runDbOperation(
  async () => {
    const q = await getDocs(collection(db, 'products'));
    return q.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        branch_ids: data.branch_ids || ['branch-chak-104sb']
      };
    });
  },
  async () => {
    const local = localStorage.getItem('kukooo_products');
    if (local) {
      return JSON.parse(local).map(p => ({
        ...p,
        branch_ids: p.branch_ids || ['branch-chak-104sb']
      }));
    }
    const mappedInit = INITIAL_PRODUCTS.map(p => ({ ...p, branch_ids: ['branch-chak-104sb'] }));
    localStorage.setItem('kukooo_products', JSON.stringify(mappedInit));
    return mappedInit;
  }
);

export const saveProduct = async (product) => {
  const idStr = product.id.toString();
  const payload = {
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

  return runDbOperation(
    async () => {
      await setDoc(doc(db, 'products', idStr), payload);
    },
    async () => {
      const list = await getProducts();
      const index = list.findIndex(p => p.id.toString() === idStr);
      const formattedProduct = { id: product.id, ...payload };
      if (index >= 0) {
        list[index] = formattedProduct;
      } else {
        list.push(formattedProduct);
      }
      localStorage.setItem('kukooo_products', JSON.stringify(list));
    }
  );
};

export const deleteProduct = async (id) => {
  const idStr = id.toString();
  return runDbOperation(
    async () => {
      await deleteDoc(doc(db, 'products', idStr));
    },
    async () => {
      const list = await getProducts();
      const updated = list.filter(p => p.id.toString() !== idStr);
      localStorage.setItem('kukooo_products', JSON.stringify(updated));
    }
  );
};

export const subscribeToProducts = (callback) => {
  if (isFirebaseConfigured && db) {
    try {
      const productsCol = collection(db, 'products');
      let localInterval = null;

      const unsubscribe = onSnapshot(productsCol, {
        next: (snapshot) => {
          const products = snapshot.docs.map(docSnapshot => {
            const data = docSnapshot.data();
            return { id: docSnapshot.id, ...data, branch_ids: data.branch_ids || ['branch-chak-104sb'] };
          });
          callback(products);
        },
        error: (err) => {
          console.warn("Firestore onSnapshot error, using local fallback polling:", err);
          if (!localInterval) {
            localInterval = setInterval(() => {
              callback(JSON.parse(localStorage.getItem('kukooo_products') || '[]'));
            }, 1000);
          }
        }
      });

      return () => {
        unsubscribe();
        if (localInterval) clearInterval(localInterval);
      };
    } catch (err) {
      console.warn("Firestore subscribeToProducts failed, falling back to LocalStorage:", err);
    }
  }

  const interval = setInterval(() => {
    callback(JSON.parse(localStorage.getItem('kukooo_products') || '[]'));
  }, 1000);
  return () => clearInterval(interval);
};

export const updateProductStock = async (id, newQuantity) => runDbOperation(
  async () => {
    await updateDoc(doc(db, 'products', id.toString()), { quantity: parseInt(newQuantity, 10) });
  },
  async () => {
    const list = await getProducts();
    const index = list.findIndex(p => p.id.toString() === id.toString());
    if (index >= 0) {
      list[index].quantity = parseInt(newQuantity, 10);
      localStorage.setItem('kukooo_products', JSON.stringify(list));
    }
  }
);

// --- OFFERS ---
export const getOffers = async () => runDbOperation(
  async () => {
    const q = await getDocs(collection(db, 'offers'));
    return q.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        branch_ids: data.branch_ids || ['branch-chak-104sb']
      };
    });
  },
  async () => {
    const local = localStorage.getItem('kukooo_offers');
    if (local) {
      return JSON.parse(local).map(o => ({
        ...o,
        branch_ids: o.branch_ids || ['branch-chak-104sb']
      }));
    }
    const mappedInit = INITIAL_OFFERS.map(o => ({ ...o, branch_ids: ['branch-chak-104sb'] }));
    localStorage.setItem('kukooo_offers', JSON.stringify(mappedInit));
    return mappedInit;
  }
);

export const saveOffer = async (offer) => {
  const idStr = offer.id.toString();
  const payload = {
    title: offer.title,
    promo_image_url: offer.promo_image_url,
    active_status: !!offer.active_status,
    redirect_type: offer.redirect_type || 'none',
    redirect_target: offer.redirect_target || '',
    branch_ids: offer.branch_ids || ['branch-chak-104sb']
  };

  return runDbOperation(
    async () => {
      await setDoc(doc(db, 'offers', idStr), payload);
    },
    async () => {
      const list = await getOffers();
      const index = list.findIndex(o => o.id.toString() === idStr);
      const formattedOffer = { id: offer.id, ...payload };
      if (index >= 0) {
        list[index] = formattedOffer;
      } else {
        list.push(formattedOffer);
      }
      localStorage.setItem('kukooo_offers', JSON.stringify(list));
    }
  );
};

export const deleteOffer = async (id) => {
  const idStr = id.toString();
  return runDbOperation(
    async () => {
      await deleteDoc(doc(db, 'offers', idStr));
    },
    async () => {
      const list = await getOffers();
      const updated = list.filter(o => o.id.toString() !== idStr);
      localStorage.setItem('kukooo_offers', JSON.stringify(updated));
    }
  );
};

// --- VOUCHERS ---
export const getVouchers = async () => runDbOperation(
  async () => {
    const q = await getDocs(collection(db, 'vouchers'));
    return q.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        code: docSnapshot.id,
        ...data,
        max_total_usage: data.max_total_usage !== undefined ? data.max_total_usage : null,
        min_order_amount: data.min_order_amount !== undefined ? data.min_order_amount : 0,
        expiry_date: data.expiry_date || '',
        one_use_per_phone: !!data.one_use_per_phone,
        branch_ids: data.branch_ids || ['branch-chak-104sb']
      };
    });
  },
  async () => {
    const local = localStorage.getItem('kukooo_vouchers');
    if (local) {
      return JSON.parse(local).map(v => ({
        ...v,
        max_total_usage: v.max_total_usage !== undefined ? v.max_total_usage : null,
        min_order_amount: v.min_order_amount !== undefined ? v.min_order_amount : 0,
        expiry_date: v.expiry_date || '',
        one_use_per_phone: !!v.one_use_per_phone,
        branch_ids: v.branch_ids || ['branch-chak-104sb']
      }));
    }
    const mappedInit = INITIAL_VOUCHERS.map(v => ({
      ...v,
      max_total_usage: null,
      min_order_amount: 0,
      expiry_date: v.expiry || '',
      one_use_per_phone: false,
      branch_ids: ['branch-chak-104sb']
    }));
    localStorage.setItem('kukooo_vouchers', JSON.stringify(mappedInit));
    return mappedInit;
  }
);

export const saveVoucher = async (voucher) => {
  const codeUpper = voucher.code.trim().toUpperCase();
  const payload = {
    code: codeUpper,
    discount_type: voucher.discount_type,
    value: parseFloat(voucher.value),
    expiry: voucher.expiry_date || voucher.expiry || '',
    usage_count: parseInt(voucher.usage_count || 0, 10),
    max_total_usage: voucher.max_total_usage ? parseInt(voucher.max_total_usage, 10) : null,
    min_order_amount: voucher.min_order_amount ? parseFloat(voucher.min_order_amount) : 0,
    expiry_date: voucher.expiry_date || '',
    one_use_per_phone: !!voucher.one_use_per_phone,
    branch_ids: voucher.branch_ids || ['branch-chak-104sb']
  };

  return runDbOperation(
    async () => {
      await setDoc(doc(db, 'vouchers', codeUpper), payload);
    },
    async () => {
      const list = await getVouchers();
      const index = list.findIndex(v => v.code.toUpperCase() === codeUpper);
      if (index >= 0) {
        list[index] = payload;
      } else {
        list.push(payload);
      }
      localStorage.setItem('kukooo_vouchers', JSON.stringify(list));
    }
  );
};

export const incrementVoucherUsage = async (code) => {
  const codeUpper = code.trim().toUpperCase();
  return runDbOperation(
    async () => {
      const docRef = doc(db, 'vouchers', codeUpper);
      const currentList = await getVouchers();
      const currentCount = currentList.find(v => v.code === codeUpper)?.usage_count || 0;
      await setDoc(docRef, { usage_count: parseInt(currentCount, 10) + 1 }, { merge: true });
    },
    async () => {
      const list = await getVouchers();
      const index = list.findIndex(v => v.code.toUpperCase() === codeUpper);
      if (index >= 0) {
        list[index].usage_count = (list[index].usage_count || 0) + 1;
        localStorage.setItem('kukooo_vouchers', JSON.stringify(list));
      }
    }
  );
};

export const deleteVoucher = async (code) => {
  const codeUpper = code.trim().toUpperCase();
  return runDbOperation(
    async () => {
      await deleteDoc(doc(db, 'vouchers', codeUpper));
    },
    async () => {
      const list = await getVouchers();
      const updated = list.filter(v => v.code.toUpperCase() !== codeUpper);
      localStorage.setItem('kukooo_vouchers', JSON.stringify(updated));
    }
  );
};

// --- ORDERS ---
export const getOrders = async () => runDbOperation(
  async () => {
    const q = await getDocs(collection(db, 'orders'));
    return q.docs.map(docSnapshot => ({
      order_id: docSnapshot.id,
      ...docSnapshot.data()
    })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },
  async () => {
    const local = localStorage.getItem('kukooo_orders');
    if (local) return JSON.parse(local).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    localStorage.setItem('kukooo_orders', JSON.stringify(INITIAL_ORDERS));
    return INITIAL_ORDERS;
  }
);

export const placeOrderInDB = async (order) => {
  if (isFirebaseConfigured && db) {
    try {
      await runTransaction(db, async (transaction) => {
        const productRefs = {};
        const productDocs = {};
        
        for (const item of order.items) {
           if (!productRefs[item.product_id]) {
             const ref = doc(db, 'products', item.product_id.toString());
             productRefs[item.product_id] = ref;
             productDocs[item.product_id] = await transaction.get(ref);
           }
        }
        
        const deductions = {};
        for (const item of order.items) {
           const docSnap = productDocs[item.product_id];
           if (!docSnap || !docSnap.exists()) continue;
           const prodData = docSnap.data();
           
           if (prodData.is_deal && prodData.deal_items?.length) {
              for (const dItem of prodData.deal_items) {
                 if (!productRefs[dItem.product_id]) {
                    const ref = doc(db, 'products', dItem.product_id.toString());
                    productRefs[dItem.product_id] = ref;
                    productDocs[dItem.product_id] = await transaction.get(ref);
                 }
                 deductions[dItem.product_id] = (deductions[dItem.product_id] || 0) + (parseInt(dItem.quantity) * item.quantity);
              }
           } else {
              deductions[item.product_id] = (deductions[item.product_id] || 0) + item.quantity;
           }
        }
        
        for (const [pId, deductAmt] of Object.entries(deductions)) {
           const pDoc = productDocs[pId];
           if (!pDoc || !pDoc.exists()) throw new Error(`Product not found`);
           const currentQty = parseInt(pDoc.data().quantity || 0);
           if (currentQty < deductAmt) {
             throw new Error(`Insufficient stock for product ${pDoc.data().name || pId}. Available: ${currentQty}, Requested: ${deductAmt}`);
           }
        }
        
        for (const [pId, deductAmt] of Object.entries(deductions)) {
           const pDoc = productDocs[pId];
           const currentQty = parseInt(pDoc.data().quantity || 0);
           transaction.update(productRefs[pId], { quantity: currentQty - deductAmt });
        }
        
        const orderRef = doc(db, 'orders', order.order_id);
        transaction.set(orderRef, order);
      });
      return;
    } catch (err) {
      console.warn("Firestore transaction failed, falling back to LocalStorage:", err);
      if (err.message.includes("Insufficient stock")) {
        throw err;
      }
    }
  }

  const list = await getProducts();
  const listMap = {};
  list.forEach(p => listMap[p.id.toString()] = p);
  
  const deductions = {};
  for (const item of order.items) {
    const prod = listMap[item.product_id.toString()];
    if (!prod) continue;
    if (prod.is_deal && prod.deal_items?.length) {
       for (const dItem of prod.deal_items) {
          deductions[dItem.product_id] = (deductions[dItem.product_id] || 0) + (parseInt(dItem.quantity) * item.quantity);
       }
    } else {
       deductions[item.product_id] = (deductions[item.product_id] || 0) + item.quantity;
    }
  }
  
  for (const [pId, deductAmt] of Object.entries(deductions)) {
     const prod = listMap[pId.toString()];
     if (!prod) throw new Error(`Product not found`);
     if (parseInt(prod.quantity || 0) < deductAmt) {
        throw new Error(`Insufficient stock for product ${prod.name || pId}`);
     }
  }
  
  for (const [pId, deductAmt] of Object.entries(deductions)) {
     const prod = listMap[pId.toString()];
     prod.quantity = parseInt(prod.quantity || 0) - deductAmt;
  }
  localStorage.setItem('kukooo_products', JSON.stringify(Object.values(listMap)));
  
  const ordersList = JSON.parse(localStorage.getItem('kukooo_orders') || '[]');
  ordersList.unshift(order);
  localStorage.setItem('kukooo_orders', JSON.stringify(ordersList));
};

export const updateOrderStatusInDB = async (orderId, newStatus) => runDbOperation(
  async () => {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, { status: newStatus });
  },
  async () => {
    const list = await getOrders();
    const index = list.findIndex(o => o.order_id === orderId);
    if (index >= 0) {
      list[index].status = newStatus;
      localStorage.setItem('kukooo_orders', JSON.stringify(list));
    }
  }
);

export const updateOrderDetailsInDB = async (orderId, updatedItems, newTotal, extraFields = {}) => runDbOperation(
  async () => {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, { 
      items: updatedItems,
      total_amount: parseFloat(newTotal),
      ...extraFields
    });
  },
  async () => {
    const list = await getOrders();
    const index = list.findIndex(o => o.order_id === orderId);
    if (index >= 0) {
      list[index].items = updatedItems;
      list[index].total_amount = parseFloat(newTotal);
      Object.assign(list[index], extraFields);
      localStorage.setItem('kukooo_orders', JSON.stringify(list));
    }
  }
);

export const deleteOrderInDB = async (orderId) => runDbOperation(
  async () => {
    await deleteDoc(doc(db, 'orders', orderId));
  },
  async () => {
    const list = await getOrders();
    const updated = list.filter(o => o.order_id !== orderId);
    localStorage.setItem('kukooo_orders', JSON.stringify(updated));
  }
);

// --- REAL-TIME SUBSCRIPTIONS ---
export const subscribeToOrders = (callback) => {
  if (isFirebaseConfigured && db) {
    try {
      const ordersCol = collection(db, 'orders');
      let localInterval = null;

      const unsubscribe = onSnapshot(ordersCol, {
        next: (snapshot) => {
          const orders = snapshot.docs.map(docSnapshot => ({
            order_id: docSnapshot.id,
            ...docSnapshot.data()
          })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          callback(orders);
        },
        error: (err) => {
          console.warn("Firestore onSnapshot error, using local fallback polling:", err);
          if (!localInterval) {
            localInterval = setInterval(() => {
              callback(JSON.parse(localStorage.getItem('kukooo_orders') || '[]').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
            }, 1000);
          }
        }
      });

      return () => {
        unsubscribe();
        if (localInterval) clearInterval(localInterval);
      };
    } catch (err) {
      console.warn("Firestore subscribeToOrders failed, falling back to LocalStorage:", err);
    }
  }

  const interval = setInterval(() => {
    callback(JSON.parse(localStorage.getItem('kukooo_orders') || '[]').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  }, 1000);
  return () => clearInterval(interval);
};

// --- ADDONS ---
export const getAddons = async () => runDbOperation(
  async () => {
    const q = await getDocs(collection(db, 'addons'));
    return q.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        branch_ids: data.branch_ids || ['branch-chak-104sb']
      };
    });
  },
  async () => {
    const local = localStorage.getItem('kukooo_addons');
    if (local) {
      return JSON.parse(local).map(a => ({
        ...a,
        branch_ids: a.branch_ids || ['branch-chak-104sb']
      }));
    }
    const mappedInit = INITIAL_ADDONS.map(a => ({ ...a, branch_ids: ['branch-chak-104sb'] }));
    localStorage.setItem('kukooo_addons', JSON.stringify(mappedInit));
    return mappedInit;
  }
);

export const saveAddon = async (addon) => {
  const idStr = addon.id || `add-${Date.now()}`;
  const payload = {
    name: addon.name,
    price: parseFloat(addon.price),
    type: addon.type,
    branch_ids: addon.branch_ids || ['branch-chak-104sb']
  };

  return runDbOperation(
    async () => {
      await setDoc(doc(db, 'addons', idStr), payload);
    },
    async () => {
      const list = await getAddons();
      const index = list.findIndex(a => a.id === idStr);
      const formattedAddon = { id: idStr, ...payload };
      if (index >= 0) {
        list[index] = formattedAddon;
      } else {
        list.push(formattedAddon);
      }
      localStorage.setItem('kukooo_addons', JSON.stringify(list));
    }
  );
};

export const deleteAddon = async (id) => runDbOperation(
  async () => {
    await deleteDoc(doc(db, 'addons', id));
  },
  async () => {
    const list = await getAddons();
    const updated = list.filter(a => a.id !== id);
    localStorage.setItem('kukooo_addons', JSON.stringify(updated));
  }
);

// --- HOMEPAGE SECTIONS ---
export const getHomepageSections = async () => runDbOperation(
  async () => {
    const docSnap = await getDoc(doc(db, 'products', '_homepage_sections_'));
    let sections = [];
    if (docSnap.exists()) {
      sections = docSnap.data().sections || [];
    } else {
      sections = [...INITIAL_HOMEPAGE_SECTIONS];
    }
    
    // Seamless migration from localStorage for users who created sections before the fix
    const local = localStorage.getItem('kukooo_homepage_sections');
    if (local) {
      try {
        const localSections = JSON.parse(local);
        let updated = false;
        localSections.forEach(ls => {
          if (!sections.find(s => s.id === ls.id)) {
            sections.push(ls);
            updated = true;
          }
        });
        if (updated) {
          await setDoc(doc(db, 'products', '_homepage_sections_'), { sections });
        }
      } catch (e) {
        console.error("Migration failed", e);
      }
    }
    
    if (!docSnap.exists()) {
      await setDoc(doc(db, 'products', '_homepage_sections_'), { sections });
    }
    
    return sections.map(s => ({ ...s, branch_ids: s.branch_ids || ['branch-chak-104sb'] }));
  },
  async () => {
    const local = localStorage.getItem('kukooo_homepage_sections');
    if (local) {
      return JSON.parse(local).map(s => ({
        ...s,
        branch_ids: s.branch_ids || ['branch-chak-104sb']
      }));
    }
    localStorage.setItem('kukooo_homepage_sections', JSON.stringify(INITIAL_HOMEPAGE_SECTIONS));
    return INITIAL_HOMEPAGE_SECTIONS;
  }
);

export const saveHomepageSection = async (section) => {
  const idStr = section.id.toString();
  const payload = {
    id: idStr,
    name: section.name,
    type: 'products', // Explore Menu is permanent, others are products
    is_active: !!section.is_active,
    branch_ids: section.branch_ids || ['branch-chak-104sb']
  };

  return runDbOperation(
    async () => {
      const list = await getHomepageSections();
      const index = list.findIndex(s => s.id === idStr);
      if (index >= 0) {
        list[index] = payload;
      } else {
        list.push(payload);
      }
      await setDoc(doc(db, 'products', '_homepage_sections_'), { sections: list });
    },
    async () => {
      const list = await getHomepageSections();
      const index = list.findIndex(s => s.id === idStr);
      const formattedSection = { id: idStr, ...payload };
      if (index >= 0) {
        list[index] = formattedSection;
      } else {
        list.push(formattedSection);
      }
      localStorage.setItem('kukooo_homepage_sections', JSON.stringify(list));
    }
  );
};

export const deleteHomepageSection = async (id) => runDbOperation(
  async () => {
    const list = await getHomepageSections();
    const updated = list.filter(s => s.id !== id);
    await setDoc(doc(db, 'products', '_homepage_sections_'), { sections: updated });
  },
  async () => {
    const list = await getHomepageSections();
    const updated = list.filter(s => s.id !== id);
    localStorage.setItem('kukooo_homepage_sections', JSON.stringify(updated));
  }
);

// --- BRANCHES ---
export const getBranches = async () => runDbOperation(
  async () => {
    const q = await getDocs(collection(db, 'branches'));
    return q.docs.map(docSnapshot => ({
      id: docSnapshot.id,
      ...docSnapshot.data()
    }));
  },
  async () => {
    const local = localStorage.getItem('kukooo_branches');
    if (local) return JSON.parse(local);
    localStorage.setItem('kukooo_branches', JSON.stringify(INITIAL_BRANCHES));
    return INITIAL_BRANCHES;
  }
);

export const saveBranch = async (branch) => {
  const idStr = branch.id.toString();
  const payload = {
    name: branch.name,
    address: branch.address,
    lat: parseFloat(branch.lat) || 0,
    lng: parseFloat(branch.lng) || 0,
    maps_link: branch.maps_link || ''
  };

  return runDbOperation(
    async () => {
      await setDoc(doc(db, 'branches', idStr), payload);
    },
    async () => {
      const list = await getBranches();
      const index = list.findIndex(b => b.id.toString() === idStr);
      const formattedBranch = { id: idStr, ...payload };
      if (index >= 0) {
        list[index] = formattedBranch;
      } else {
        list.push(formattedBranch);
      }
      localStorage.setItem('kukooo_branches', JSON.stringify(list));
    }
  );
};

export const deleteBranch = async (id) => {
  const idStr = id.toString();
  return runDbOperation(
    async () => {
      await deleteDoc(doc(db, 'branches', idStr));
    },
    async () => {
      const list = await getBranches();
      const updated = list.filter(b => b.id.toString() !== idStr);
      localStorage.setItem('kukooo_branches', JSON.stringify(updated));
    }
  );
};

// --- STAFF AUTHENTICATION ---
export const authenticateStaff = async (loginId, password) => {
  const normalizedLogin = loginId.trim().toLowerCase();
  const normalizedPassword = password.trim().toLowerCase();

  if (!isFirebaseConfigured || !auth) {
    if (normalizedLogin === 'manager' && (normalizedPassword === 'admin' || normalizedPassword === 'manager')) {
      return { role: 'manager', email: 'manager@local' };
    }
    if ((normalizedLogin === 'employee' || normalizedLogin === 'staff') && (normalizedPassword === 'staff' || normalizedPassword === 'employee')) {
      return { role: 'employee', email: 'employee@local' };
    }
    throw new Error("Invalid local credentials.");
  }

  let email = loginId.trim();
  if (!email.includes('@')) {
    email = `${loginId.toLowerCase()}@mrkukooo.com`;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    let role = null;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        role = userDoc.data().role;
      }
    } catch (dbErr) {
      console.warn("Could not query user role from Firestore, falling back to email prefix check:", dbErr);
    }

    if (!role) {
      if (email.startsWith('manager')) {
        role = 'manager';
      } else if (email.startsWith('employee') || email.startsWith('staff')) {
        role = 'employee';
      } else {
        throw new Error("User has no role assigned. Email prefix must be manager@ or employee@.");
      }
    }

    return { role, email: user.email, uid: user.uid };
  } catch (authErr) {
    console.error("Firebase Auth failed:", authErr);
    
    const isDefaultManager = email === 'manager@mrkukooo.com' && (normalizedPassword === 'admin' || normalizedPassword === 'manager');
    const isDefaultEmployee = (email === 'employee@mrkukooo.com' || email === 'staff@mrkukooo.com') && (normalizedPassword === 'staff' || normalizedPassword === 'employee');

    if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/invalid-email') {
      if (isDefaultManager || isDefaultEmployee) {
        try {
          console.log(`Auto-registering default staff user in Firebase Auth: ${email}`);
          const newUserCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = newUserCredential.user;
          const role = isDefaultManager ? 'manager' : 'employee';

          try {
            await setDoc(doc(db, 'users', user.uid), {
              email: user.email,
              role: role,
              created_at: new Date().toISOString()
            });
          } catch (fsErr) {
            console.error("Failed to store staff role document in Firestore users collection:", fsErr);
          }

          return { role, email: user.email, uid: user.uid };
        } catch (regErr) {
          console.error("Failed to auto-register default staff account:", regErr);
          let regMessage = `Failed to auto-register default user: ${regErr.message || regErr.code}`;
          if (regErr.code === 'auth/operation-not-allowed') {
            regMessage = "Email/Password sign-in is disabled in your Firebase console. Please go to Firebase Console -> Authentication -> Sign-in method, click 'Add new provider', select 'Email/Password', and enable it.";
          }
          throw new Error(regMessage, { cause: regErr });
        }
      }
    }

    let message;
    if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/wrong-password') {
      message = "Invalid credentials. Please verify your login details.";
    } else if (authErr.code === 'auth/user-not-found') {
      message = `User "${email}" not found. Please create this user in Firebase Authentication dashboard.`;
    } else if (authErr.code === 'auth/operation-not-allowed') {
      message = "Email/Password sign-in is disabled in your Firebase console. Please go to Firebase Console -> Authentication -> Sign-in method, click 'Add new provider', select 'Email/Password', and enable it.";
    } else {
      message = `Firebase Authentication Error: ${authErr.message || authErr.code}`;
    }
    throw new Error(message, { cause: authErr });
  }
};
