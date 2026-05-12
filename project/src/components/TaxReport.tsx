import { useState, useEffect } from 'react';
import { Download, DollarSign, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TaxReportRow {
  id: string;
  booking_id: string;
  tax_amount: number;
  created_at: string;
}

export function TaxReport() {
  const [reportData, setReportData] = useState<TaxReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaxReport();
  }, []);

  const fetchTaxReport = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('tax_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReportData(data || []);
    } catch (error) {
      console.error(
        'Error fetching tax report:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const totalTaxCollected =
    reportData.reduce(
      (sum, row) =>
        sum +
        Number(row.tax_amount || 0),
      0
    );

  const exportTaxReport = () => {
    const csv = [
      ['Tax Collection Report'],
      ['Generated:', new Date().toLocaleDateString()],
      [''],
      ['Date', 'Booking ID', 'Tax Amount'].join(','),

      ...reportData.map((row) =>
        [
          new Date(
            row.created_at
          ).toLocaleDateString(),

          row.booking_id,

          `$${Number(
            row.tax_amount
          ).toFixed(2)}`,
        ].join(',')
      ),

      [''],
      [
        'TOTAL',
        '',
        `$${totalTaxCollected.toFixed(
          2
        )}`,
      ].join(','),
    ].join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv',
    });

    const url =
      window.URL.createObjectURL(blob);

    const a =
      document.createElement('a');

    a.href = url;

    a.download = `tax-report-${new Date()
      .toISOString()
      .split('T')[0]}.csv`;

    a.click();
  };

  const formatCurrency = (
    amount: number
  ) => {
    return new Intl.NumberFormat(
      'en-US',
      {
        style: 'currency',
        currency: 'USD',
      }
    ).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Tax Collection Report
          </h2>

          <p className="text-gray-600 mt-1">
            Live Stripe tax collection data
          </p>
        </div>

        <button
          onClick={exportTaxReport}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">
                Total Tax Collected
              </p>

              <p className="text-3xl font-bold text-cyan-600">
                {formatCurrency(
                  totalTaxCollected
                )}
              </p>
            </div>

            <TrendingUp className="w-10 h-10 text-cyan-600" />
          </div>

          <p className="text-xs text-gray-500 mt-2">
            {reportData.length} paid transactions
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">
                Average Tax Per Sale
              </p>

              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(
                  reportData.length > 0
                    ? totalTaxCollected /
                        reportData.length
                    : 0
                )}
              </p>
            </div>

            <DollarSign className="w-10 h-10 text-green-600" />
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Based on Stripe checkout totals
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            Tax Transactions
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>

            <p className="mt-4 text-gray-600">
              Loading tax report...
            </p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />

            <p>
              No tax data available yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Date
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Booking ID
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Tax Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {reportData.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(
                        row.created_at
                      ).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {row.booking_id}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-cyan-600 text-right">
                      {formatCurrency(
                        Number(
                          row.tax_amount
                        )
                      )}
                    </td>
                  </tr>
                ))}

                <tr className="bg-gray-100 font-semibold">
                  <td
                    className="px-6 py-4 text-sm text-gray-900"
                    colSpan={2}
                  >
                    TOTAL
                  </td>

                  <td className="px-6 py-4 text-sm text-cyan-600 text-right">
                    {formatCurrency(
                      totalTaxCollected
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}