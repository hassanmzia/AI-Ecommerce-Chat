import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Eye, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminSidebar from '@/components/admin/AdminSidebar';
import orderService from '@/services/orderService';
import { formatCurrency, formatDate, formatOrderId, getStatusColor } from '@/utils/formatters';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import clsx from 'clsx';

const statusFilters = [
  'all',
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export default function AdminOrders() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, statusFilter],
    queryFn: () =>
      orderService.getAllOrders(
        page,
        15,
        statusFilter === 'all' ? undefined : statusFilter
      ),
  });

  const orders = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-8 bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900">Orders</h1>
            <p className="text-neutral-500 mt-1">Manage customer orders</p>
          </div>

          {/* Filters */}
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {statusFilters.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setPage(1);
                    }}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize',
                      statusFilter === status
                        ? 'bg-primary-600 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner label="Loading orders..." />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <ShoppingBag className="w-12 h-12 text-neutral-300 mb-3" />
                <p className="text-neutral-500">No orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                        Order
                      </th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                        Date
                      </th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                        Items
                      </th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                        Total
                      </th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                        Payment
                      </th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                        Status
                      </th>
                      <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-primary-600">
                            {formatOrderId(order.id)}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">
                          {order.items.length} items
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-neutral-800">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`badge text-xs capitalize ${
                              order.payment.status === 'completed'
                                ? 'badge-success'
                                : 'badge-warning'
                            }`}
                          >
                            {order.payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`badge text-xs capitalize ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end">
                            <Link
                              to={`/orders/${order.id}`}
                              className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50">
                <p className="text-sm text-neutral-500">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={!pagination.hasPrev}
                    className="p-2 rounded-lg border border-neutral-200 disabled:opacity-50 hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!pagination.hasNext}
                    className="p-2 rounded-lg border border-neutral-200 disabled:opacity-50 hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
