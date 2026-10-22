import { useState, useMemo } from 'react';
import { 
  Ticket, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Percent, 
  DollarSign, 
  Eye, 
  EyeOff, 
  Sparkles 
} from 'lucide-react';

export default function VoucherManagement({
  vouchers = [],
  saveVoucher,
  deleteVoucher,
  voucherSettings = { customer_vouchers_enabled: false },
  saveVoucherSettings
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive' | 'exhausted'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);

  // Modal Form State
  const [formData, setFormData] = useState({
    code: '',
    type: 'price', // 'price' | 'percentage'
    value: '',
    min_order: '',
    max_uses: '50',
    is_active: true
  });
  const [formError, setFormError] = useState('');

  // Global Customer Field Status
  const isCustomerFieldEnabled = !!voucherSettings?.customer_vouchers_enabled;

  const handleToggleCustomerField = async () => {
    const updated = {
      ...voucherSettings,
      customer_vouchers_enabled: !isCustomerFieldEnabled
    };
    await saveVoucherSettings(updated);
  };

  // Filtered Vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const codeMatches = (v.code || '').toLowerCase().includes(searchQuery.trim().toLowerCase());
      if (!codeMatches) return false;

      const isExhausted = Number(v.max_uses) > 0 && Number(v.times_used || 0) >= Number(v.max_uses);

      if (filterStatus === 'active') return v.is_active && !isExhausted;
      if (filterStatus === 'inactive') return !v.is_active;
      if (filterStatus === 'exhausted') return isExhausted;
      return true;
    }).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  }, [vouchers, searchQuery, filterStatus]);

  const openCreateModal = () => {
    setEditingVoucher(null);
    setFormData({
      code: '',
      type: 'price',
      value: '',
      min_order: '',
      max_uses: '50',
      is_active: true
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (voucher) => {
    setEditingVoucher(voucher);
    setFormData({
      code: voucher.code || '',
      type: voucher.type || 'price',
      value: voucher.value?.toString() || '',
      min_order: voucher.min_order?.toString() || '',
      max_uses: voucher.max_uses?.toString() || '50',
      is_active: voucher.is_active !== false
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleToggleVoucherActive = async (voucher) => {
    await saveVoucher({
      ...voucher,
      is_active: !voucher.is_active
    });
  };

  const handleDelete = async (voucher) => {
    if (window.confirm(`Are you sure you want to delete voucher "${voucher.code}"?`)) {
      await deleteVoucher(voucher.id);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanCode = formData.code.trim().toUpperCase();
    if (!cleanCode) {
      setFormError('Voucher code is required.');
      return;
    }

    const numericValue = parseFloat(formData.value);
    if (isNaN(numericValue) || numericValue <= 0) {
      setFormError('Please enter a valid discount value greater than 0.');
      return;
    }

    if (formData.type === 'percentage' && numericValue > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    const maxUses = parseInt(formData.max_uses, 10);
    if (isNaN(maxUses) || maxUses <= 0) {
      setFormError('Please specify a maximum redemption limit (at least 1).');
      return;
    }

    // Check duplicate code if creating or renaming
    const existing = vouchers.find(v => 
      v.code?.trim().toUpperCase() === cleanCode && (!editingVoucher || v.id !== editingVoucher.id)
    );
    if (existing) {
      setFormError(`A voucher with code "${cleanCode}" already exists.`);
      return;
    }

    const payload = {
      id: editingVoucher ? editingVoucher.id : `vouch-${Date.now()}`,
      code: cleanCode,
      type: formData.type,
      value: numericValue,
      min_order: parseFloat(formData.min_order) || 0,
      max_uses: maxUses,
      times_used: editingVoucher ? (editingVoucher.times_used || 0) : 0,
      is_active: formData.is_active
    };

    await saveVoucher(payload);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-primary font-black uppercase tracking-wider flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5" /> Promotions &amp; Discounts
          </span>
          <h2 className="text-2xl font-black text-accent tracking-tight mt-0.5">
            Discount Vouchers
          </h2>
          <p className="text-xs text-gray-500 font-semibold mt-1">
            Create fixed amount or percentage vouchers with custom redemption quotas.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover active:scale-95 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Create New Voucher
        </button>
      </div>

      {/* Global Setting Banner: Customer Cart Voucher Input Field */}
      <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
        isCustomerFieldEnabled 
          ? 'bg-emerald-50/70 border-emerald-300 shadow-xs' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isCustomerFieldEnabled 
                ? 'bg-emerald-500 text-white border-emerald-600' 
                : 'bg-gray-100 text-gray-400 border-gray-200'
            }`}>
              {isCustomerFieldEnabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-accent">
                  Customer Cart Voucher Input Field
                </h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                  isCustomerFieldEnabled 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : 'bg-gray-100 text-gray-600 border-gray-300'
                }`}>
                  {isCustomerFieldEnabled ? '● Turned ON (Visible to Customers)' : '○ Turned OFF (Hidden)'}
                </span>
              </div>
              <p className="text-xs text-gray-600 font-semibold mt-1">
                {isCustomerFieldEnabled 
                  ? 'The promo code input box is currently VISIBLE in the customer checkout cart. Customers can enter valid codes.'
                  : 'The promo code input box is currently HIDDEN from customer carts. POS staff can still apply discounts in the POS terminal.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleCustomerField}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer shrink-0 border shadow-2xs ${
              isCustomerFieldEnabled
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
            }`}
          >
            {isCustomerFieldEnabled ? (
              <>
                <ToggleRight className="w-5 h-5 text-white" />
                <span>Field is Active</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5 text-gray-400" />
                <span>Turn Field ON</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by voucher code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 pl-9 pr-4 py-2 rounded-xl text-xs font-bold text-accent focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Vouchers' },
            { id: 'active', label: 'Active' },
            { id: 'inactive', label: 'Inactive' },
            { id: 'exhausted', label: 'Limit Reached' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-secondary text-accent border border-secondary-hover/50 shadow-2xs'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vouchers List Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-200 text-[11px] font-black uppercase text-gray-500 tracking-wider">
                <th className="py-3 px-4">Voucher Code</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Min. Order</th>
                <th className="py-3 px-4">Redemption Quota</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredVouchers.map(v => {
                const maxUses = Number(v.max_uses) || 0;
                const timesUsed = Number(v.times_used) || 0;
                const isExhausted = maxUses > 0 && timesUsed >= maxUses;
                const percentageUsed = maxUses > 0 ? Math.min(100, Math.round((timesUsed / maxUses) * 100)) : 0;

                return (
                  <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Code */}
                    <td className="py-3.5 px-4 font-black">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-accent/5 text-accent border border-accent/20 px-2.5 py-1 rounded-lg tracking-wider font-extrabold">
                          {v.code}
                        </span>
                        {v.type === 'percentage' && (
                          <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-black">
                            %
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Discount Value */}
                    <td className="py-3.5 px-4 font-bold text-accent">
                      {v.type === 'percentage' ? (
                        <span className="text-primary font-black text-sm">{v.value}% OFF</span>
                      ) : (
                        <span className="text-emerald-700 font-black text-sm">Rs. {v.value} OFF</span>
                      )}
                    </td>

                    {/* Min Order */}
                    <td className="py-3.5 px-4 font-semibold text-gray-600">
                      {Number(v.min_order) > 0 ? `Rs. ${v.min_order}` : <span className="text-gray-400">None</span>}
                    </td>

                    {/* Redemption Quota */}
                    <td className="py-3.5 px-4 min-w-[160px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className={isExhausted ? 'text-red-600 font-black' : 'text-gray-600'}>
                            {timesUsed} / {maxUses} used
                          </span>
                          <span className="text-gray-400">{percentageUsed}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isExhausted ? 'bg-red-500' : percentageUsed > 75 ? 'bg-amber-500' : 'bg-primary'
                            }`}
                            style={{ width: `${percentageUsed}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {isExhausted ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 border border-red-200 text-[10px] font-black px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3" /> Limit Reached
                        </span>
                      ) : !v.is_active ? (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 border border-gray-300 text-[10px] font-black px-2 py-0.5 rounded-md">
                          Deactivated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-md">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>

                    {/* Active Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleVoucherActive(v)}
                        className="cursor-pointer transition-transform active:scale-95 inline-block"
                        title={v.is_active ? 'Deactivate this voucher' : 'Activate this voucher'}
                      >
                        {v.is_active ? (
                          <ToggleRight className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-300" />
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(v)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-accent transition-colors cursor-pointer"
                          title="Edit voucher"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(v)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete voucher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredVouchers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 font-bold text-xs">
                    {searchQuery ? 'No vouchers match your search.' : 'No vouchers found. Click "+ Create New Voucher" above to add one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 animate-scale-up">
            {/* Modal Header */}
            <div className="bg-accent px-5 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-secondary" />
                <h3 className="font-heading font-black text-base text-secondary">
                  {editingVoucher ? 'Edit Discount Voucher' : 'Create Discount Voucher'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs font-bold text-accent">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Code */}
              <div>
                <label className="block text-gray-700 mb-1">Voucher Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KUKOOO100, MEAL10"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 font-mono text-sm uppercase tracking-wider focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">
                  Letters and numbers only. Case-insensitive during customer checkout.
                </span>
              </div>

              {/* Discount Type Selector */}
              <div>
                <label className="block text-gray-700 mb-1">Discount Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'price' })}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-black transition-all cursor-pointer ${
                      formData.type === 'price'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Fixed Price (Rs.)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'percentage' })}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-black transition-all cursor-pointer ${
                      formData.type === 'percentage'
                        ? 'bg-primary/10 border-primary text-primary shadow-2xs'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <Percent className="w-4 h-4 text-primary" />
                    <span>Percentage (%)</span>
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-gray-700 mb-1">
                  {formData.type === 'percentage' ? 'Discount Percentage (%) *' : 'Discount Amount (Rs.) *'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={formData.type === 'percentage' ? '100' : undefined}
                  required
                  placeholder={formData.type === 'percentage' ? 'e.g. 15 (for 15%)' : 'e.g. 150 (for Rs. 150 off)'}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-primary"
                />
              </div>

              {/* Minimum Order Amount */}
              <div>
                <label className="block text-gray-700 mb-1">Minimum Order Amount (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 500 (leave 0 or empty for no minimum)"
                  value={formData.min_order}
                  onChange={(e) => setFormData({ ...formData, min_order: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-primary"
                />
              </div>

              {/* Max Redemption Limit */}
              <div>
                <label className="block text-gray-700 mb-1">Redemption Limit (Total Uses) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 50"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">
                  Once this number of orders use this voucher, it automatically becomes unavailable.
                </span>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <span className="font-black text-accent block">Enable Voucher</span>
                  <span className="text-[10px] text-gray-500 font-semibold block">
                    Allow this voucher to be redeemed immediately
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className="cursor-pointer"
                >
                  {formData.is_active ? (
                    <ToggleRight className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-300" />
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-black shadow-xs transition-colors cursor-pointer"
                >
                  {editingVoucher ? 'Update Voucher' : 'Create Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
