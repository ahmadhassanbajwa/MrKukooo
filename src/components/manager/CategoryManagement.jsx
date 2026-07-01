import { useState } from 'react';
import { Plus, Edit3, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '../../firebase';

export default function CategoryManagement({ categories, saveCategory, deleteCategory }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({ id: '', name: '', image_url: '' });
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleOpenModal = (category = null) => {
    setFile(null);
    if (category) {
      setEditingCategory(category);
      setForm({ ...category });
    } else {
      setEditingCategory(null);
      setForm({ id: `cat-${Date.now()}`, name: '', image_url: '' });
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setIsUploading(true);
    let uploadedUrl = form.image_url;
    if (file) {
      try {
        uploadedUrl = await uploadImage(file, 'categories');
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }

    try {
      await saveCategory(form.id, form.name, uploadedUrl);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save category:", err);
      alert("Failed to save category. If you are not connected to Firebase, your browser's local storage might be full. Error: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl comic-border comic-shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-black text-accent uppercase tracking-wider">Food Categories</h4>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-black text-xs rounded-xl comic-border-sm cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add New Category
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-black uppercase text-gray-400">
              <th className="pb-3.5 pl-2">Icon / Thumbnail</th>
              <th className="pb-3.5">Category Title</th>
              <th className="pb-3.5">Reference Key</th>
              <th className="pb-3.5 text-right pr-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-bold text-accent">
            {categories.length > 0 ? (
              categories.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 pl-2">
                    <img
                      src={c.image_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=100'}
                      alt={c.name}
                      className="w-10 h-10 object-cover rounded-xl border border-accent/10"
                    />
                  </td>
                  <td className="py-3 font-black text-accent">{c.name}</td>
                  <td className="py-3 text-gray-400 font-semibold">{c.id}</td>
                  <td className="py-3 text-right pr-2 space-x-2">
                    <button
                      onClick={() => handleOpenModal(c)}
                      className="p-2 hover:bg-secondary/15 rounded-xl text-secondary inline-flex items-center cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete category ${c.name}?`)) deleteCategory(c.id);
                      }}
                      className="p-2 hover:bg-primary/10 rounded-xl text-primary inline-flex items-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-12 text-gray-400 uppercase font-black">
                  No categories defined
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl comic-border comic-shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-base font-black text-accent">
                {editingCategory ? 'Edit Menu Category' : 'Create Menu Category'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center border border-accent/15 cursor-pointer text-gray-500 transition-colors"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold text-accent">
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-gray-400">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pizzas"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-gray-400">Image Icon File</label>
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-2xl border border-accent/10 mb-2"
                  />
                )}
                <label className="flex items-center gap-2 bg-gray-50 border-2 border-dashed border-gray-300 p-4.5 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors justify-center font-bold text-gray-400">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                  <span>{file ? file.name : 'Choose category image...'}</span>
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
                {isUploading ? 'Uploading & Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
