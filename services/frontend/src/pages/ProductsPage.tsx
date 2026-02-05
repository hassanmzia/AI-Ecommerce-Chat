import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import productService from '@/services/productService';
import ProductGrid from '@/components/products/ProductGrid';
import ProductFilters from '@/components/products/ProductFilters';
import type { ProductFilters as ProductFiltersType } from '@/types';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const filters: ProductFiltersType = {
    search: searchParams.get('search') || undefined,
    category: searchParams.get('category') || undefined,
    minPrice: searchParams.get('minPrice')
      ? Number(searchParams.get('minPrice'))
      : undefined,
    maxPrice: searchParams.get('maxPrice')
      ? Number(searchParams.get('maxPrice'))
      : undefined,
    minRating: searchParams.get('minRating')
      ? Number(searchParams.get('minRating'))
      : undefined,
    sortBy:
      (searchParams.get('sortBy') as ProductFiltersType['sortBy']) || 'popular',
    page: Number(searchParams.get('page')) || 1,
    limit: 12,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productService.getProducts(filters),
  });

  const handleFilterChange = (newFilters: ProductFiltersType) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    setSearchParams(params);
  };

  const handlePageChange = (page: number) => {
    handleFilterChange({ ...filters, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const products = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Products</h1>
          {filters.search && (
            <p className="text-sm text-neutral-500 mt-1">
              Search results for &quot;{filters.search}&quot;
            </p>
          )}
          {pagination && (
            <p className="text-sm text-neutral-500 mt-1">
              Showing {products.length} of {pagination.total} products
            </p>
          )}
        </div>
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="lg:hidden btn-secondary flex items-center gap-2 text-sm"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      <div className="flex gap-8">
        {/* Desktop Filters */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-20 card p-5">
            <ProductFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>

        {/* Mobile Filters */}
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setShowMobileFilters(false)}
            />
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-xl p-5 overflow-y-auto animate-slide-in-right">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-800">Filters</h3>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ProductFilters
                filters={filters}
                onFilterChange={(f) => {
                  handleFilterChange(f);
                  setShowMobileFilters(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1">
          <ProductGrid products={products} isLoading={isLoading} />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="p-2 rounded-lg border border-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  const current = pagination.page;
                  return (
                    page === 1 ||
                    page === pagination.totalPages ||
                    Math.abs(page - current) <= 2
                  );
                })
                .map((page, index, arr) => {
                  const showEllipsis =
                    index > 0 && page - arr[index - 1] > 1;

                  return (
                    <div key={page} className="flex items-center gap-2">
                      {showEllipsis && (
                        <span className="text-neutral-400 px-1">...</span>
                      )}
                      <button
                        onClick={() => handlePageChange(page)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          page === pagination.page
                            ? 'bg-primary-600 text-white'
                            : 'border border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="p-2 rounded-lg border border-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
