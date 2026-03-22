import { useState, useEffect } from 'react';
import { Download, DollarSign, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TaxReportData {
  booking_type: string;
  month: string;
  booking_count: number;
  total_subtotal: number;
  total_sales_tax: number;
  total_surtax: number;
  total_lodging_tax: number;
  total_tax_collected: number;
}

export function TaxReport() {
  const [reportData, setReportData] = useState<TaxReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'all' | 'year' | 'quarter' | 'month'>('year');

  useEffect(() => {
    fetchTaxReport();
  }, [dateRange]);

  const fetchTaxReport = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('tax_report')
        .select('*')
        .order('month', { ascending: false });

      const now = new Date();
      if (dateRange === 'year') {
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        query = query.gte('month', yearAgo.toISOString());
      } else if (dateRange === 'quarter') {
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        query = query.gte('month', quarterAgo.toISOString());
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
        query = query.gte('month', monthAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setReportData(data || []);
    } catch (error) {
      console.error('Error fetching tax report:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    return reportData.reduce(
      (acc, row) => ({
        bookings: acc.bookings + row.booking_count,
        subtotal: acc.subtotal + Number(row.total_subtotal),
        salesTax: acc.salesTax + Number(row.total_sales_tax),
        surtax: acc.surtax + Number(row.total_surtax),
        lodgingTax: acc.lodgingTax + Number(row.total_lodging_tax),
        totalTax: acc.totalTax + Number(row.total_tax_collected),
      }),
      { bookings: 0, subtotal: 0, salesTax: 0, surtax: 0, lodgingTax: 0, totalTax: 0 }
    );
  };

  const exportTaxReport = () => {
    const totals = calculateTotals();

    const csv = [
      ['Tax Collection Report', '', '', '', '', '', '', ''],
      ['Generated:', new Date().toLocaleDateString()],
      ['Period:', dateRange === 'all' ? 'All Time' : dateRange === 'year' ? 'Last 12 Months' : dateRange === 'quarter' ? 'Last 3 Months' : 'Current Month'],
      [''],
      ['Month', 'Booking Type', 'Count', 'Subtotal', 'Sales Tax (6.5%)', 'Surtax (0.5%)', 'Lodging Tax (5%)', 'Total Tax Collected'].join(','),
      ...reportData.map(row => [
        new Date(row.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        row.booking_type === 'jet_ski' ? 'Jet Ski Rental' : 'Vacation Rental',
        row.booking_count,
        `$${Number(row.total_subtotal).toFixed(2)}`,
        `$${Number(row.total_sales_tax).toFixed(2)}`,
        `$${Number(row.total_surtax).toFixed(2)}`,
        `$${Number(row.total_lodging_tax).toFixed(2)}`,
        `$${Number(row.total_tax_collected).toFixed(2)}`,
      ].join(',')),
      [''],
      ['TOTALS', '', totals.bookings, `$${totals.subtotal.toFixed(2)}`, `$${totals.salesTax.toFixed(2)}`, `$${totals.surtax.toFixed(2)}`, `$${totals.lodgingTax.toFixed(2)}`, `$${totals.totalTax.toFixed(2)}`].join(','),
      [''],
      ['TAX REMITTANCE BREAKDOWN'],
      ['State Sales Tax (6.5%)', `$${totals.salesTax.toFixed(2)}`],
      ['Local Surtax (0.5%)', `$${totals.surtax.toFixed(2)}`],
      ['Lodging Tax (5%)', `$${totals.lodgingTax.toFixed(2)}`],
      ['Total Tax to Remit', `$${totals.totalTax.toFixed(2)}`],
    ].map(row => Array.isArray(row) ? row.join(',') : row).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatMonth = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tax Collection Report</h2>
          <p className="text-gray-600 mt-1">
            Track sales tax, lodging tax, and surtax collections for tax filing
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          >
            <option value="month">Current Month</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">Last 12 Months</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={exportTaxReport}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Sales Tax (6.5%)</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.salesTax)}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-green-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">State tax for both rentals</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Lodging Tax (5%)</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totals.lodgingTax)}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-blue-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Vacation rentals only</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Surtax (0.5%)</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(totals.surtax)}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-orange-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Jet ski rentals only</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Tax Collected</p>
              <p className="text-2xl font-bold text-cyan-600">
                {formatCurrency(totals.totalTax)}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-cyan-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">{totals.bookings} paid bookings</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Monthly Breakdown</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
            <p className="mt-4 text-gray-600">Loading tax report...</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No tax data available for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Subtotal
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Sales Tax (6.5%)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Surtax (0.5%)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Lodging Tax (5%)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Total Tax
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatMonth(row.month)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {row.booking_type === 'jet_ski' ? 'Jet Ski' : 'Vacation Rental'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {row.booking_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(Number(row.total_subtotal))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(Number(row.total_sales_tax))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(Number(row.total_surtax))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(Number(row.total_lodging_tax))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-cyan-600 text-right">
                      {formatCurrency(Number(row.total_tax_collected))}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-6 py-4 text-sm text-gray-900" colSpan={2}>
                    TOTAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {totals.bookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(totals.subtotal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(totals.salesTax)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(totals.surtax)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(totals.lodgingTax)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-600 text-right">
                    {formatCurrency(totals.totalTax)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-amber-900 mb-3">Tax Remittance Breakdown</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">State Sales Tax (6.5%):</span>
            <span className="font-semibold text-gray-900">{formatCurrency(totals.salesTax)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Local Surtax (0.5% on jet ski rentals):</span>
            <span className="font-semibold text-gray-900">{formatCurrency(totals.surtax)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Lodging Tax (5% on vacation rentals):</span>
            <span className="font-semibold text-gray-900">{formatCurrency(totals.lodgingTax)}</span>
          </div>
          <div className="border-t border-amber-300 pt-2 mt-2 flex justify-between">
            <span className="font-bold text-gray-900">Total Tax to Remit:</span>
            <span className="font-bold text-amber-900">{formatCurrency(totals.totalTax)}</span>
          </div>
        </div>
        <p className="text-xs text-amber-800 mt-4">
          Work with your accountant to ensure proper filing and remittance to state and county authorities.
          This report includes only paid bookings.
        </p>
      </div>
    </div>
  );
}
