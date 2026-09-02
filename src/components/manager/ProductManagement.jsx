import { useState } from 'react';
import { Plus, X, Trash2, Edit3, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { checkProductAvailability } from '../../utils/productUtils';
import { uploadImage } from '../../supabase';

export default function ProductManagement({
  products,
  categories,
  branches,
  ingredients = [],
  homepageSections,
  saveProduct,
  deleteProduct
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    id: '',
    name: '',
    description: '',
    price: '',
    cost: '',
    category_id: '',
    image_url: '',
    is_available: true,
    has_sizes: false,
    sizes: [],
    is_deal: false,
    deal_items: [],
    homepage_sections: [],
    branch_ids: []
  });

  const handleOpenModal = (prod = null) => {
    setFile(null);
    if (prod) {
      setEditingProduct(prod);
      setForm({
        ...prod,
        price: prod.price ? prod.price.toString() : '',
        cost: prod.cost ? prod.cost.toString() : '',
        has_sizes: prod.has_sizes || false,
        sizes: (prod.sizes || []).map(s => ({ ...s, price: s.price.toString(), cost: s.cost ? s.cost.toString() : '' })),
        is_deal: prod.is_deal || false,
        deal_items: prod.deal_items || [],
        homepage_sections: prod.homepage_sections || [],
        branch_ids: prod.branch_ids || []
      });
    } else {
      setEditingProduct(null);
      setForm({
        id: Date.now().toString(),
        name: '',
        description: '',
        price: '',
        cost: '',
        category_id: categories[0]?.id || '',
        image_url: '',
        is_available: true,
        has_sizes: false,
        sizes: [],
        is_deal: false,
        deal_items: [],
        homepage_sections: [],
        branch_ids: branches.map(b => b.id)
      });
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleToggleBranch = (branchId) => {
    setForm(prev => {
      const ids = prev.branch_ids.includes(branchId)
        ? prev.branch_ids.filter(id => id !== branchId)
        : [...prev.branch_ids, branchId];
      return { ...prev, branch_ids: ids };
    });
  };

  const handleToggleSection = (sectionId) => {
    setForm(prev => {
      const sections = prev.homepage_sections.includes(sectionId)
        ? prev.homepage_sections.filter(id => id !== sectionId)
        : [...prev.homepage_sections, sectionId];
      return { ...prev, homepage_sections: sections };
    });
  };

  const handleToggleAvailable = async (prod) => {
    await saveProduct({
      ...prod,
      is_available: !prod.is_available
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category_id) return;
    if (!form.has_sizes && !form.price.trim()) return;
    if (form.has_sizes && form.sizes.length === 0) {
      alert("Please add at least one size.");
      return;
    }
    if (form.is_deal && form.deal_items.length === 0) {
      alert("Please add at least one item to the deal.");
      return;
    }

    setIsUploading(true);
    let uploadedUrl = form.image_url;
    if (file) {
      try {
        uploadedUrl = await uploadImage(file, 'products');
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }

    try {
      const parsedSizes = form.sizes.map(s => ({
        name: s.name.trim(),
        price: parseFloat(s.price) || 0,
        cost: parseFloat(s.cost) || 0
      }));

      await saveProduct({
        ...form,
        price: form.has_sizes ? (parsedSizes.length > 0 ? parsedSizes[0].price : 0) : parseFloat(form.price),
        cost: form.has_sizes ? (parsedSizes.length > 0 ? parsedSizes[0].cost : 0) : parseFloat(form.cost),
        sizes: parsedSizes,
        quantity: editingProduct ? (editingProduct.quantity ?? 0) : 0,
        is_deal: form.is_deal,
        deal_items: form.deal_items,
        image_url: uploadedUrl
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save product:", err);
      alert("Failed to save product. If you are not connected to Supabase, your browser's local storage might be full. Error: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const validCategoryIds = new Set(products.map(p => p.category_id));
  const categoryOptions = [
    { id: 'All', name: 'All' },
    ...categories.filter(c => validCategoryIds.has(c.id))
  ];
  
  const filteredProducts = products.filter(p => {
    if (categoryFilter !== 'All' && p.category_id !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-3xl comic-border comic-shadow-sm p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h4 className="text-sm font-black text-accent uppercase tracking-wider">Food Menu Products</h4>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-gray-50 border-2 border-accent/20 px-3 py-1.5 rounded-xl text-xs font-bold text-accent focus:outline-none focus:border-accent cursor-pointer"
          >
            {categoryOptions.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-black text-xs rounded-xl comic-border-sm cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add New Product
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-black uppercase text-gray-400">
              <th className="pb-3.5 pl-2">Photo</th>
              <th className="pb-3.5">Name</th>
              <th className="pb-3.5">Category</th>
              <th className="pb-3.5">Price</th>
              <th className="pb-3.5">Availability</th>
              <th className="pb-3.5 text-right pr-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-bold text-accent">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(p => {
                const catObj = categories.find(c => c.id === p.category_id);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pl-2">
                      <img
                        src={p.image_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=100'}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded-xl border border-accent/10"
                      />
                    </td>
                    <td className="py-3 font-black text-accent">
                      <div className="flex flex-col">
                        <span>{p.name}</span>
                        <span className="text-[9px] text-gray-450 font-semibold truncate max-w-xs">{p.description}</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-500">{catObj?.name || p.category_id || 'N/A'}</td>
                    <td className="py-3 font-black text-primary">
                      {p.has_sizes && p.sizes?.length > 0 
                        ? `Starts at Rs. ${Math.min(...p.sizes.map(s => s.price))}`
                        : `Rs. ${p.price}`}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <button
                          onClick={() => handleToggleAvailable(p)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer border ${
                            checkProductAvailability(p, products, ingredients)
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-primary border-red-200'
                          }`}
                        >
                          {checkProductAvailability(p, products, ingredients) ? 'In Stock' : 'Sold Out'}
                        </button>
                        {p.is_deal && (!p.deal_items || p.deal_items.length === 0) && (
                          <span className="flex items-center gap-1 text-[9px] text-orange-500 font-bold">
                            <AlertTriangle className="w-3 h-3" /> Needs Config
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-right pr-2 space-x-2">
                      <button
                        onClick={() => handleOpenModal(p)}
                        className="p-2 hover:bg-secondary/15 rounded-xl text-secondary inline-flex items-center cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete product ${p.name}?`)) deleteProduct(p.id);
                        }}
                        className="p-2 hover:bg-primary/10 rounded-xl text-primary inline-flex items-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-12 text-gray-400 uppercase font-black">
                  No menu items created
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl comic-border comic-shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-base font-black text-accent">
                {editingProduct ? 'Edit Menu Product' : 'Create Menu Product'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center border border-accent/15 cursor-pointer text-gray-500 transition-colors"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-semibold text-accent flex-1">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400">Product Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Double Smash Burger"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                  />
                </div>

                {!form.has_sizes && (
                  <>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase text-gray-400">Base Price (Rs.)</label>
                      <input
                        type="number"
                        placeholder="e.g. 799"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase text-gray-400">Cost (Rs.)</label>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={form.cost}
                        onChange={(e) => setForm({ ...form, cost: e.target.value })}
                        className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Deal Feature */}
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-150 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-accent">Menu Deal Bundle</h5>
                    <p className="text-[9px] text-gray-450 font-bold">Enable to create a deal from existing menu items.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={form.is_deal}
                      onChange={(e) => setForm({ ...form, is_deal: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                  </label>
                </div>

                {form.is_deal && (
                  <div className="space-y-2">
                    {form.deal_items.map((item, idx) => {
                      const selectedProduct = products.find(p => p.id === item.product_id);
                      return (
                        <div key={idx} className="flex flex-wrap gap-2 items-center">
                          <select
                            value={item.product_id}
                            onChange={(e) => {
                              const newItems = [...form.deal_items];
                              newItems[idx].product_id = e.target.value;
                              newItems[idx].size = ''; // reset size
                              setForm({ ...form, deal_items: newItems });
                            }}
                            className="flex-1 min-w-[120px] bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                          >
                            <option value="">-- Select Product --</option>
                            {products.filter(p => !p.is_deal).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          
                          {selectedProduct?.has_sizes && (
                            <select
                              value={item.size || ''}
                              onChange={(e) => {
                                const newItems = [...form.deal_items];
                                newItems[idx].size = e.target.value;
                                setForm({ ...form, deal_items: newItems });
                              }}
                              className="w-28 bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                            >
                              <option value="">-- Size --</option>
                              {selectedProduct.sizes.map((s, sIdx) => (
                                <option key={sIdx} value={s.name}>{s.name}</option>
                              ))}
                            </select>
                          )}
                          
                          <input
                            type="number"
                            placeholder="Qty"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...form.deal_items];
                              newItems[idx].quantity = e.target.value;
                              setForm({ ...form, deal_items: newItems });
                            }}
                            className="w-16 bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = form.deal_items.filter((_, i) => i !== idx);
                              setForm({ ...form, deal_items: newItems });
                            }}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, deal_items: [...form.deal_items, { product_id: '', quantity: 1, size: '' }] })}
                      className="text-[10px] font-black text-secondary hover:underline flex items-center gap-1 uppercase tracking-wider"
                    >
                      <Plus className="w-3 h-3" /> Add Item to Deal
                    </button>
                  </div>
                )}
              </div>

              {/* Sizes Feature */}
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-150 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-accent">Sizes</h5>
                    <p className="text-[9px] text-gray-450 font-bold">Enable to add different sizes and prices.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={form.has_sizes}
                      onChange={(e) => setForm({ ...form, has_sizes: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>

                {form.has_sizes && (
                  <div className="space-y-2">
                    {form.sizes.map((size, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Size Name (e.g. Medium)"
                          value={size.name}
                          onChange={(e) => {
                            const newSizes = [...form.sizes];
                            newSizes[idx].name = e.target.value;
                            setForm({ ...form, sizes: newSizes });
                          }}
                          className="flex-1 bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                        />
                        <input
                          type="number"
                          placeholder="Price (Rs.)"
                          value={size.price}
                          onChange={(e) => {
                            const newSizes = [...form.sizes];
                            newSizes[idx].price = e.target.value;
                            setForm({ ...form, sizes: newSizes });
                          }}
                          className="w-24 bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                        />
                        <input
                          type="number"
                          placeholder="Cost (Rs.)"
                          value={size.cost}
                          onChange={(e) => {
                            const newSizes = [...form.sizes];
                            newSizes[idx].cost = e.target.value;
                            setForm({ ...form, sizes: newSizes });
                          }}
                          className="w-24 bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newSizes = form.sizes.filter((_, i) => i !== idx);
                            setForm({ ...form, sizes: newSizes });
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, sizes: [...form.sizes, { name: '', price: '', cost: '' }] })}
                      className="text-[10px] font-black text-secondary hover:underline flex items-center gap-1 uppercase tracking-wider"
                    >
                      <Plus className="w-3 h-3" /> Add Size Option
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-gray-400">Food Category</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-black focus:outline-none pr-8 cursor-pointer"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-gray-400">Ingredients description</label>
                <textarea
                  placeholder="e.g. Double smash beef patties, melted cheddar, lettuce..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                />
              </div>

              {/* Branches scope */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-gray-400">Available at Branches</label>
                <div className="flex flex-wrap gap-2">
                  {branches.map(b => {
                    const isSelected = form.branch_ids.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleToggleBranch(b.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-secondary/15 text-accent border-secondary/35'
                            : 'bg-white border-gray-250 text-gray-450 hover:bg-gray-50'
                        }`}
                      >
                        {b.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Homepage categories */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-gray-400">Homepage Widgets / Sections</label>
                <div className="flex flex-wrap gap-2">
                  {homepageSections.filter(s => s.id !== 'explore-menu' && !s.name.toLowerCase().includes('explore menu')).map(s => {
                    const isSelected = form.homepage_sections.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleToggleSection(s.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-white border-gray-250 text-gray-450 hover:bg-gray-50'
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-3">
                <label className="block text-[10px] font-black uppercase text-gray-400">Product Image File</label>
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-2xl border border-accent/10 mb-2"
                  />
                )}
                <label className="flex items-center gap-2 bg-gray-50 border-2 border-dashed border-gray-300 p-4.5 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors justify-center font-bold text-gray-400">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                  <span>{file ? file.name : 'Choose product photo...'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-150 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4.5 py-2.5 bg-white border border-accent/15 text-accent font-black text-xs rounded-xl cursor-pointer hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-black text-xs rounded-xl comic-border-sm cursor-pointer transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Uploading & Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
