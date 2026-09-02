import { useState } from 'react';
import { Plus, Edit3, Trash2, X } from 'lucide-react';

export default function BranchManagement({ branches, saveBranch, deleteBranch }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const defaultZones = [{ maxRadius: 5, charge: 0 }, { maxRadius: 15, charge: 150 }];
  const [form, setForm] = useState({ id: '', name: '', address: '', lat: '', lng: '', maps_link: '', deliveryZones: defaultZones });

  const handleOpenModal = (branch = null) => {
    if (branch) {
      setEditingBranch(branch);
      setForm({ ...branch, deliveryZones: branch.deliveryZones || defaultZones });
    } else {
      setEditingBranch(null);
      setForm({ id: `branch-${Date.now()}`, name: '', address: '', lat: '', lng: '', maps_link: '', deliveryZones: defaultZones });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return;
    
    // Ensure zones are sorted by radius
    const sortedZones = [...form.deliveryZones].sort((a, b) => a.maxRadius - b.maxRadius);
    
    await saveBranch({
      ...form,
      lat: parseFloat(form.lat) || 0,
      lng: parseFloat(form.lng) || 0,
      deliveryZones: sortedZones
    });
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-3xl comic-border comic-shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-black text-accent uppercase tracking-wider">Branch Store Locations</h4>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-black text-xs rounded-xl comic-border-sm cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add New Branch
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-black uppercase text-gray-400">
              <th className="pb-3.5 pl-2">Branch Name</th>
              <th className="pb-3.5">Address</th>
              <th className="pb-3.5">Coordinates</th>
              <th className="pb-3.5 text-right pr-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-bold text-accent">
            {branches.length > 0 ? (
              branches.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 pl-2 font-black text-primary">{b.name}</td>
                  <td className="py-4 font-semibold text-gray-500">{b.address}</td>
                  <td className="py-4 text-gray-400 font-semibold">{b.lat.toFixed(4)}, {b.lng.toFixed(4)}</td>
                  <td className="py-4 text-right pr-2 space-x-2">
                    <button
                      onClick={() => handleOpenModal(b)}
                      className="p-2 hover:bg-secondary/15 rounded-xl text-secondary inline-flex items-center cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete branch ${b.name}?`)) deleteBranch(b.id);
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
                  No storefront locations registered
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl comic-border comic-shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-scale-up max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <h3 className="text-base font-black text-accent">
                {editingBranch ? 'Edit Storefront Location' : 'Register Storefront Location'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center border border-accent/15 cursor-pointer text-gray-500 transition-colors"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold text-accent overflow-y-auto">
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-gray-400">Store Name</label>
                <input
                  type="text"
                  placeholder="Sargodha main branch"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-gray-400">Street Address</label>
                <input
                  type="text"
                  placeholder="Chowk, Sargodha, Punjab..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400">Latitude</label>
                  <input
                    type="text"
                    placeholder="32.0836"
                    value={form.lat}
                    onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400">Longitude</label>
                  <input
                    type="text"
                    placeholder="72.6711"
                    value={form.lng}
                    onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-gray-400">Google Maps link (optional)</label>
                <input
                  type="text"
                  placeholder="https://maps.google.com/..."
                  value={form.maps_link}
                  onChange={(e) => setForm({ ...form, maps_link: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                />
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black uppercase text-gray-400">Delivery Zones (Radius & Charges)</label>
                  {branches.length > 0 && (
                    <select
                      className="bg-gray-50 border-2 border-accent px-2 py-1 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-[10px] cursor-pointer"
                      onChange={(e) => {
                        const selectedBranch = branches.find(b => b.id === e.target.value);
                        if (selectedBranch && selectedBranch.deliveryZones) {
                          setForm({ ...form, deliveryZones: JSON.parse(JSON.stringify(selectedBranch.deliveryZones)) });
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Copy from...</option>
                      {branches.filter(b => b.id !== form.id).map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                
                {form.deliveryZones.map((zone, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
                    <div className="flex-1 space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500">Max Radius (km)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={zone.maxRadius}
                        onChange={(e) => {
                          const newZones = [...form.deliveryZones];
                          newZones[idx].maxRadius = parseFloat(e.target.value) || 0;
                          setForm({ ...form, deliveryZones: newZones });
                        }}
                        className="w-full bg-white border border-gray-300 px-2 py-1.5 rounded-lg font-bold text-xs focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500">Delivery Fee (Rs)</label>
                      <input
                        type="number"
                        value={zone.charge}
                        onChange={(e) => {
                          const newZones = [...form.deliveryZones];
                          newZones[idx].charge = parseInt(e.target.value, 10) || 0;
                          setForm({ ...form, deliveryZones: newZones });
                        }}
                        className="w-full bg-white border border-gray-300 px-2 py-1.5 rounded-lg font-bold text-xs focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newZones = form.deliveryZones.filter((_, i) => i !== idx);
                        setForm({ ...form, deliveryZones: newZones });
                      }}
                      className="p-1.5 mt-5 text-gray-400 hover:text-primary transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => {
                    const lastRadius = form.deliveryZones.length > 0 ? form.deliveryZones[form.deliveryZones.length - 1].maxRadius : 0;
                    setForm({
                      ...form,
                      deliveryZones: [...form.deliveryZones, { maxRadius: lastRadius + 5, charge: 100 }]
                    });
                  }}
                  className="flex items-center gap-1 text-[10px] font-black text-secondary hover:text-secondary/80 transition-colors uppercase cursor-pointer"
                >
                  <Plus className="w-3 h-3 stroke-[3]" /> Add Delivery Zone
                </button>
                <p className="text-[10px] text-gray-400 leading-tight font-semibold">
                  * The maximum radius determines the delivery limit. Any order outside the highest radius will be rejected.
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-150 flex justify-end gap-2.5 shrink-0">
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
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
