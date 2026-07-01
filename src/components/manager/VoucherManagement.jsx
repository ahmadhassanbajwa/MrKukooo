import { useState } from 'react';
import { Plus, Edit3, Trash2, X } from 'lucide-react';

export default function VoucherManagement({
  vouchers,
  branches,
  saveVoucher,
  deleteVoucher
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [form, setForm] = useState({
    code: '',
    discount_type: 'percentage',
    value: '',
    expiry_date: '',
    usage_count: 0,
    max_total_usage: '',
    min_order_amount: '',
    one_use_per_phone: false,
    branch_ids: []
  });

  const handleOpenModal = (voucher = null) => {
    if (voucher) {
      setEditingVoucher(voucher);
      setForm({
        ...voucher,
        value: voucher.value.toString(),
        min_order_amount: voucher.min_order_amount ? voucher.min_order_amount.toString() : '',
        max_total_usage: voucher.max_total_usage ? voucher.max_total_usage.toString() : '',
        branch_ids: voucher.branch_ids || []
      });
    } else {
      setEditingVoucher(null);
      setForm({
        code: '',
        discount_type: 'percentage',
        value: '',
        expiry_date: '',
        usage_count: 0,
        max_total_usage: '',
        min_order_amount: '',
        one_use_per_phone: false,
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
    if (!form.code.trim() || !form.value.trim()) return;

    await saveVoucher({
      ...form,
      code: form.code.trim().toUpperCase(),
      value: parseFloat(form.value) || 0,
      min_order_amount: parseFloat(form.min_order_amount) || 0,
      max_total_usage: form.max_total_usage ? parseInt(form.max_total_usage, 10) : null
    });

    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-3xl comic-border comic-shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-black text-accent uppercase tracking-wider">Discount Coupon Vouchers</h4>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-black text-xs rounded-xl comic-border-sm cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add New Voucher
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-black uppercase text-gray-400">
              <th className="pb-3.5 pl-2">Voucher Code</th>
              <th className="pb-3.5">Discount</th>
              <th className="pb-3.5">Min Order</th>
              <th className="pb-3.5">Uses Count</th>
              <th className="pb-3.5">Expiry</th>
              <th className="pb-3.5 text-right pr-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-bold text-accent">
            {vouchers.length > 0 ? (
              vouchers.map(v => (
                <tr key={v.code} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 pl-2 font-black text-primary uppercase">{v.code}</td>
                  <td className="py-4 font-black">
                    {v.discount_type === 'percentage' ? `${v.value}% OFF` : `Rs. ${v.value} OFF`}
                  </td>
                  <td className="py-4 text-gray-500">Rs. {v.min_order_amount || 0}</td>
                  <td className="py-4 text-gray-450">
                    {v.usage_count} {v.max_total_usage ? `/ ${v.max_total_usage} max` : 'uses'}
                  </td>
                  <td className="py-4 font-semibold text-gray-400">
                    {v.expiry_date || v.expiry || 'No Expiry'}
                  </td>
                  <td className="py-4 text-right pr-2 space-x-2">
                    <button
                      onClick={() => handleOpenModal(v)}
                      className="p-2 hover:bg-secondary/15 rounded-xl text-secondary inline-flex items-center cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete voucher ${v.code}?`)) deleteVoucher(v.code);
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
                <td colSpan="6" className="text-center py-12 text-gray-400 uppercase font-black">
                  No vouchers created
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
                {editingVoucher ? 'Edit Discount Voucher' : 'Create Discount Voucher'}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400">Voucher Code</label>
                  <input
                    type="text"
                    placeholder="e.g. KUKOOO20"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    disabled={!!editingVoucher}
                    className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold uppercase focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400">Discount Type</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-black focus:outline-none pr-8 cursor-pointer"
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="flat">Flat Cash Discount (Rs.)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400">Value (Amt / %)</label>
                  <input
                    type="number"
                    placeholder="e.g. 20"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400">Min Order Amount (Rs.)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={form.min_order_amount}
                    onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400">Max Usage Cap (Optional)</label>
                  <input
                    type="number"
                    placeholder="Unlimited"
                    value={form.max_total_usage}
                    onChange={(e) => setForm({ ...form, max_total_usage: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-150">
                <input
                  type="checkbox"
                  id="one_use_per_phone"
                  checked={form.one_use_per_phone}
                  onChange={(e) => setForm({ ...form, one_use_per_phone: e.target.checked })}
                  className="w-4.5 h-4.5 text-primary focus:ring-secondary border-accent rounded cursor-pointer"
                />
                <label htmlFor="one_use_per_phone" className="text-[10px] font-black uppercase text-accent cursor-pointer select-none">
                  Limit to Single Use Per Phone Number
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-gray-400">Eligible Branches</label>
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
                Save Voucher
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
