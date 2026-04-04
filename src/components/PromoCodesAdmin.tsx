import { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, CreditCard as Edit2, Save, X, Percent, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
  applies_to: 'all' | 'properties' | 'activities';
  active: boolean;
  valid_from: string;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  created_at: string;
}

export function PromoCodesAdmin() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount_percentage: 10,
    applies_to: 'all' as 'all' | 'properties' | 'activities',
    active: true,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    max_uses: '',
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToSubmit = {
        code: formData.code.toUpperCase().trim(),
        discount_percentage: formData.discount_percentage,
        applies_to: formData.applies_to,
        active: formData.active,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('promo_codes')
          .update(dataToSubmit)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('promo_codes')
          .insert([dataToSubmit]);

        if (error) throw error;
      }

      setFormData({
        code: '',
        discount_percentage: 10,
        applies_to: 'all',
        active: true,
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: '',
        max_uses: '',
      });
      setShowNewForm(false);
      setEditingId(null);
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error saving promo code:', error);
      alert(error.message || 'Failed to save promo code');
    }
  };

  const handleEdit = (promoCode: PromoCode) => {
    setFormData({
      code: promoCode.code,
      discount_percentage: promoCode.discount_percentage,
      applies_to: promoCode.applies_to,
      active: promoCode.active,
      valid_from: promoCode.valid_from,
      valid_until: promoCode.valid_until || '',
      max_uses: promoCode.max_uses?.toString() || '',
    });
    setEditingId(promoCode.id);
    setShowNewForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchPromoCodes();
    } catch (error) {
      console.error('Error deleting promo code:', error);
      alert('Failed to delete promo code');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchPromoCodes();
    } catch (error) {
      console.error('Error toggling promo code:', error);
    }
  };

  const getAppliestoLabel = (appliesTo: string) => {
    const labels = {
      all: 'All Bookings',
      properties: 'Properties Only',
      activities: 'Activities Only',
    };
    return labels[appliesTo as keyof typeof labels] || appliesTo;
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const isMaxedOut = (maxUses: number | null, currentUses: number) => {
    if (!maxUses) return false;
    return currentUses >= maxUses;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="mt-4 text-gray-600">Loading promo codes...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-7 h-7 text-green-600" />
            Promo Codes Manager
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Create and manage discount codes for your checkout
          </p>
        </div>
        <button
          onClick={() => {
            setShowNewForm(!showNewForm);
            setEditingId(null);
            setFormData({
              code: '',
              discount_percentage: 10,
              applies_to: 'all',
              active: true,
              valid_from: new Date().toISOString().split('T')[0],
              valid_until: '',
              max_uses: '',
            });
          }}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all shadow-lg"
        >
          {showNewForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showNewForm ? 'Cancel' : 'New Promo Code'}
        </button>
      </div>

      {showNewForm && (
        <form onSubmit={handleSubmit} className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Promo Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2024"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase font-bold text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Letters, numbers, and hyphens only</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Discount Percentage <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10"
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Applies To <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.applies_to}
                onChange={(e) => setFormData({ ...formData, applies_to: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Bookings</option>
                <option value="properties">Properties Only</option>
                <option value="activities">Activities Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Max Uses (Optional)
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                placeholder="Unlimited"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited uses</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Valid From <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Valid Until (Optional)
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for no expiration</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm font-semibold text-gray-700">
                Active (code can be used immediately)
              </span>
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
            >
              <Save className="w-5 h-5" />
              {editingId ? 'Update Promo Code' : 'Create Promo Code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewForm(false);
                setEditingId(null);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        {promoCodes.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Tag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-semibold">No promo codes yet</p>
            <p className="text-sm mt-2">Create your first promo code to offer discounts at checkout</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Applies To
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Validity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Uses
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {promoCodes.map((promo) => {
                const expired = isExpired(promo.valid_until);
                const maxedOut = isMaxedOut(promo.max_uses, promo.current_uses);
                const isValid = promo.active && !expired && !maxedOut;

                return (
                  <tr key={promo.id} className={`hover:bg-gray-50 ${!isValid ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-green-600" />
                        <span className="font-bold text-lg text-gray-900">{promo.code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-green-600">{promo.discount_percentage}%</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{getAppliestoLabel(promo.applies_to)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(promo.valid_from).toLocaleDateString()}
                        </div>
                        {promo.valid_until && (
                          <div className={`flex items-center gap-1 ${expired ? 'text-red-600 font-semibold' : ''}`}>
                            → {new Date(promo.valid_until).toLocaleDateString()}
                            {expired && ' (Expired)'}
                          </div>
                        )}
                        {!promo.valid_until && <div className="text-gray-400">No expiration</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className={`font-semibold ${maxedOut ? 'text-red-600' : 'text-gray-900'}`}>
                          {promo.current_uses}
                        </span>
                        <span className="text-gray-500">
                          {promo.max_uses ? ` / ${promo.max_uses}` : ' / ∞'}
                        </span>
                        {maxedOut && <div className="text-red-600 font-semibold text-xs">Max reached</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(promo.id, promo.active)}
                        className="flex items-center gap-1 text-sm font-semibold"
                      >
                        {isValid ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-green-600">Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-gray-400" />
                            <span className="text-gray-500">
                              {expired ? 'Expired' : maxedOut ? 'Maxed Out' : 'Inactive'}
                            </span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(promo)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(promo.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
