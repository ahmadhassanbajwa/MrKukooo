import { useState } from 'react';
import { Plus, Edit3, Trash2, X } from 'lucide-react';

export default function AddonManagement({
  addons,
  branches,
  saveAddon,
  deleteAddon
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [form, setForm] = useState({
    id: '',
    name: '',
    price: '',
    type: 'extras',
    branch_ids: []
  });

  const handleOpenModal = (addon = null) => {
    if (addon) {
      setEditingAddon(addon);
      setForm({
        ...addon,
        price: addon.price.toString(),
        branch_ids: addon.branch_ids || []
      });
    } else {
      setEditingAddon(null);
      setForm({
        id: `add-${Date.now()}`,
        name: '',
        price: '',
        type: 'extras',
        branch_ids: branches.map(b => b.id)
      });
    }
    setIsModalOpen(true);
  };

  const handleToggleBranch = (branchId) => {
    setForm(prev => {
      const ids = prev.branch_ids.includes(branchId)
        ? prev.branch_ids.filter(id => id !== branchId)
        : [...prev.branch_ids, branchId];
      return { ...prev, branch_ids: ids };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price.trim()) return;

    await saveAddon({
      ...form,
      price: parseFloat(form.price) || 0
    });

    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-3xl comic-border comic-shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-black text-accent uppercase tracking-wider">Product Customize Add-ons</h4>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-black text-xs rounded-xl comic-border-sm cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add New Add-on
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-black uppercase text-gray-400">
              <th className="pb-3.5 pl-2">Add-on Item</th>
              <th className="pb-3.5">Category Type</th>
              <th className="pb-3.5">Additional Price</th>
              <th className="pb-3.5 text-right pr-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-bold text-accent">
            {addons.length > 0 ? (
              addons.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 pl-2 font-black text-primary">{a.name}</td>
                  <td className="py-4 font-semibold text-gray-500 uppercase">{a.type}</td>
                  <td className="py-4 font-black text-accent">Rs. {a.price}</td>
                  <td className="py-4 text-right pr-2 space-x-2">
                    <button
                      onClick={() => handleOpenModal(a)}
                      className="p-2 hover:bg-secondary/15 rounded-xl text-secondary inline-flex items-center cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete add-on ${a.name}?`)) deleteAddon(a.id);
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
                  No add-on extras defined
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
                {editingAddon ? 'Edit Extra Add-on' : 'Create Extra Add-on'}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400">Add-on Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Extra Cheese"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400">Price (Rs.)</label>
                  <input
                    type="number"
                    placeholder="e.g. 150"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-gray-400">Add-on Type Category</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-black focus:outline-none pr-8 cursor-pointer"
                >
                  <option value="drinks">beverage / cold drinks</option>
                  <option value="sauces">dip sauces</option>
                  <option value="extras">extras (meat, cheese, toppings)</option>
                </select>
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
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-black text-xs rounded-xl comic-border-sm cursor-pointer transition-colors"
              >
                Save Add-on
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
