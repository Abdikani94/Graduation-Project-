import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';

const methods = ['Method', 'EVC PLUS', 'Zaad', 'eDahab', 'Bank', 'Cash', 'Card'];
const money = (value, currency = 'USD') => `${currency === 'USD' ? '$' : ''}${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'Not provided';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ totalCollected: 0, todayCollected: 0, transactions: 0 });
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('Method');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const result = await api.get('/payments', { page, limit: 10, search, method });
      setPayments(result.data || []);
      setSummary(result.summary || { totalCollected: 0, todayCollected: 0, transactions: 0 });
      setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      setToast({ type: 'error', title: 'Payments error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [page, search, method]);

  useEffect(() => {
    setPage(1);
  }, [search, method]);

  const exportCsv = async () => {
    try {
      await api.downloadCsv('/payments/export/csv', 'payments.csv', { search, method });
    } catch (error) {
      setToast({ type: 'error', title: 'Export failed', message: error.message });
    }
  };

  const getMethodBadge = (method) => {
    switch (method) {
      case 'EVC PLUS':
        return (
          <span className="px-4 py-1.5 rounded-full text-[11px] font-semibold border text-[#2D368D] bg-[#2D368D]/10 border-[#2D368D]/20 inline-flex items-center justify-center">
            EVC PLUS
          </span>
        );
      case 'Zaad':
        return (
          <span className="px-4 py-1.5 rounded-full text-[11px] font-semibold border text-[#00A451] bg-[#00A451]/10 border-[#00A451]/20 inline-flex items-center justify-center">
            Zaad
          </span>
        );
      case 'eDahab':
        return (
          <span className="px-4 py-1.5 rounded-full text-[11px] font-semibold border text-[#fb923c] bg-[#fb923c]/10 border-[#fb923c]/20 inline-flex items-center justify-center">
            eDahab
          </span>
        );
      default:
        return (
          <span className="px-4 py-1.5 rounded-full text-[11px] font-semibold border text-gray-400 bg-gray-400/10 border-gray-400/20 inline-flex items-center justify-center">
            {method}
          </span>
        );
    }
  };

  return (
    <PageLayout>
      <Toast toast={toast} onClose={() => setToast(null)} />
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[15px]">
        <StatCard icon={DollarSign} title="Total Collected" value={money(summary.totalCollected)} color="#00A451" iconColor="#00A451" />
        <StatCard icon={DollarSign} title="Today" value={money(summary.todayCollected)} color="#fb923c" iconColor="#fb923c" />
        <StatCard icon={DollarSign} title="Transactions" value={summary.transactions.toLocaleString()} color="#fb923c" iconColor="#fb923c" />
      </div>

      {/* Filters */}
      <Card className="flex items-center gap-[15px] p-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search for transaction"
            className="w-full bg-[#070211] border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none focus:border-primary transition-colors placeholder-gray-600"
          />
        </div>
        <div className="relative min-w-[160px]">
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            className="w-full bg-[#070211] border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none appearance-none pr-10 cursor-pointer"
            style={{
              backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 16px center'
            }}
          >
            {methods.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <button onClick={exportCsv} className="bg-primary hover:bg-opacity-90 text-white rounded-xl px-6 py-3.5 text-[13px] font-medium transition-colors ml-auto whitespace-nowrap cursor-pointer">
          Export csv
        </button>
      </Card>

      {/* Table */}
      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">REFERENCE</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">AMOUNT</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">METHOD</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">TRANSACTION</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">DATE</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={5}>Loading payments...</td></tr>}
              {!isLoading && payments.length === 0 && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={5}>No payments found.</td></tr>}
              {!isLoading && payments.map((item) => (
                <tr key={item.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4 text-[13px] font-medium text-gray-300">
                    {item.reference}
                  </td>
                  <td className="px-6 py-4 text-[13px] text-gray-300 font-semibold">
                    {money(item.amount, item.currency)}
                  </td>
                  <td className="px-6 py-4">
                    {getMethodBadge(item.method)}
                  </td>
                  <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">
                    {item.transactionCode || '-'}
                  </td>
                  <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">
                    {formatDate(item.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-6 mt-auto border-t border-white/5">
          <div className="text-[13px] font-medium text-gray-500">Page {pagination.page} of {pagination.pages} - {pagination.total} transactions</div>
          <div className="flex gap-3">
            <button disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="px-5 py-2 rounded-full border border-white/10 text-gray-500 text-[13px] font-medium hover:text-white hover:border-white/20 transition-all bg-transparent cursor-pointer disabled:opacity-40">
              Previous
            </button>
            <button disabled={page >= pagination.pages || isLoading} onClick={() => setPage((value) => Math.min(value + 1, pagination.pages))} className="px-5 py-2 rounded-full border border-primary bg-primary text-white text-[13px] font-semibold cursor-pointer disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
};

export default Payments;
