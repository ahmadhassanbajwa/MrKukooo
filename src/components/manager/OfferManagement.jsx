import { useState } from 'react';
import { Plus, Edit3, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '../../supabase';

export default function OfferManagement({
  offers,
  branches,
  saveOffer,
  deleteOffer
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    id: '',
    title: '',
    promo_image_url: '',
    active_status: true,
    redirect_type: 'none',
    redirect_target: '',
    branch_ids: []
  });

  const handleOpenModal = (offer = null) => {
    setFile(null);
    if (offer) {
      setEditingOffer(offer);
      setForm({
        ...offer,
        branch_ids: offer.branch_ids || []
      });
    } else {
      setEditingOffer(null);
      setForm({
        id: Date.now().toString(),
        title: '',
        promo_image_url: '',
        active_status: true,
        redirect_type: 'none',
        redirect_target: '',
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

  const handleToggleActive = async (offer) => {
    await saveOffer({
      ...offer,
      active_status: !offer.active_status
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setIsUploading(true);
    let uploadedUrl = form.promo_image_url;
    if (file) {
      try {
        uploadedUrl = await uploadImage(file, 'offers');
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }

    await saveOffer({
      ...form,
      promo_image_url: uploadedUrl
    });

    setIsUploading(false);
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-3xl comic-border comic-shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-black text-accent uppercase tracking-wider">Promo Banner Offers</h4>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-black text-xs rounded-xl comic-border-sm cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add New Offer
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-black uppercase text-gray-400">
              <th className="pb-3.5 pl-2">Banner</th>
              <th className="pb-3.5">Title</th>
              <th className="pb-3.5">Redirect Info</th>
              <th className="pb-3.5">Status</th>
              <th className="pb-3.5 text-right pr-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-bold text-accent">
            {offers.length > 0 ? (
              offers.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 pl-2">
                    <img
                      src={o.promo_image_url || '/logo.png'}
                      alt={o.title}
                      className="w-16 h-10 object-cover rounded-lg border border-accent/10"
                    />
                  </td>
                  <td className="py-3 font-black text-accent">{o.title}</td>
                  <td className="py-3 text-gray-500 font-semibold uppercase">
                    {o.redirect_type !== 'none' ? `${o.redirect_type}: ${o.redirect_target}` : 'No redirect'}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => handleToggleActive(o)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer border ${
                        o.active_status
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-primary border-red-200'
                      }`}
                    >
                      {o.active_status ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-3 text-right pr-2 space-x-2">
                    <button
                      onClick={() => handleOpenModal(o)}
                      className="p-2 hover:bg-secondary/15 rounded-xl text-secondary inline-flex items-center cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete offer ${o.title}?`)) deleteOffer(o.id);
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
                <td colSpan="5" className="text-center py-12 text-gray-400 uppercase font-black">
                  No promotional offers running
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl comic-border comic-shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-base font-black text-accent">
                {editingOffer ? 'Edit Banner Offer' : 'Create Banner Offer'}
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
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-gray-400">Offer Title</label>
                <input
                  type="text"
                  placeholder="e.g. Burger Festival - 20% Off!"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400">Redirection Handling</label>
                  <select
                    value={form.redirect_type}
                    onChange={(e) => setForm({ ...form, redirect_type: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-black focus:outline-none pr-8 cursor-pointer"
                  >
                    <option value="none">No Redirect</option>
                    <option value="category">Redirect to Category</option>
                    <option value="product">Redirect to Product Modal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400">Target Value (ID/Name)</label>
                  <input
                    type="text"
                    placeholder="e.g. Burgers or product ID"
                    value={form.redirect_target}
                    onChange={(e) => setForm({ ...form, redirect_target: e.target.value })}
                    disabled={form.redirect_type === 'none'}
                    className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs disabled:opacity-50"
                  />
                </div>
              </div>

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

              <div className="space-y-2 border-t border-gray-100 pt-3">
                <label className="block text-[10px] font-black uppercase text-gray-400">Banner Promo Image</label>
                {form.promo_image_url && (
                  <img
                    src={form.promo_image_url}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-2xl border border-accent/10 mb-2"
                  />
                )}
                <label className="flex items-center gap-2 bg-gray-50 border-2 border-dashed border-gray-300 p-4.5 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors justify-center font-bold text-gray-400">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                  <span>{file ? file.name : 'Choose offer banner image...'}</span>
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
                {isUploading ? 'Uploading & Saving...' : 'Save Offer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
