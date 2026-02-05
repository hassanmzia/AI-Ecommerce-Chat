import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import productService from '@/services/productService';
import { formatCurrency } from '@/utils/formatters';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function AdminProducts() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, searchQuery],
    queryFn: () =>
      productService.getProducts({ page, limit: 10, search: searchQuery || undefined }),
  });

  const products = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-8 bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Products</h1>
              <p className="text-neutral-500 mt-1">Manage your product catalog</p>
            </div>
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>

          {/* Search */}
          <div className="card p-4 mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner label="Loading products..." />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Package className="w-12 h-12 text-neutral-300 mb-3" />
                <p className="text-neutral-500">No products found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                        Product
                      </th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                        SKU
                      </th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                        Category
                      </th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                        Price
                      </th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                        Stock
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
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {product.thumbnail || product.images[0] ? (
                                <img
                                  src={product.thumbnail || product.images[0]}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-4 h-4 text-neutral-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-neutral-800 truncate max-w-[200px]">
                                {product.name}
                              </p>
                              {product.brand && (
                                <p className="text-xs text-neutral-500">
                                  {product.brand}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600 font-mono">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">
                          {product.category}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-neutral-800">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-sm font-medium ${
                              product.stock === 0
                                ? 'text-red-600'
                                : product.stock <= 10
                                ? 'text-amber-600'
                                : 'text-neutral-700'
                            }`}
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`badge text-xs ${
                              product.isActive
                                ? 'badge-success'
                                : 'badge-neutral'
                            }`}
                          >
                            {product.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
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
