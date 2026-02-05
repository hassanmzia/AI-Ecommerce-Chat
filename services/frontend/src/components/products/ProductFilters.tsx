import { useState } from 'react';
import { ChevronDown, ChevronUp, X, SlidersHorizontal } from 'lucide-react';
import { Star } from 'lucide-react';
import clsx from 'clsx';
import type { ProductFilters as ProductFiltersType } from '@/types';

interface ProductFiltersProps {
  filters: ProductFiltersType;
  onFilterChange: (filters: ProductFiltersType) => void;
  categories?: string[];
}

export default function ProductFilters({
  filters,
  onFilterChange,
  categories = [],
}: ProductFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    category: true,
    price: true,
    rating: true,
    sort: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const defaultCategories = categories.length > 0 ? categories : [
    'Electronics',
    'Clothing',
    'Home & Garden',
    'Sports',
    'Books',
    'Toys',
    'Beauty',
    'Automotive',
  ];

  const sortOptions = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'newest', label: 'Newest First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
  ];

  const priceRanges = [
    { min: 0, max: 25, label: 'Under $25' },
    { min: 25, max: 50, label: '$25 to $50' },
    { min: 50, max: 100, label: '$50 to $100' },
    { min: 100, max: 200, label: '$100 to $200' },
    { min: 200, max: undefined, label: '$200 & Above' },
  ];

  const hasActiveFilters =
    filters.category ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.minRating !== undefined;

  const clearFilters = () => {
    onFilterChange({
      sortBy: filters.sortBy,
      page: 1,
      limit: filters.limit,
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-neutral-600" />
          <h3 className="font-semibold text-neutral-800">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            <X className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Category */}
      <div className="border-b border-neutral-200 pb-4">
        <button
          onClick={() => toggleSection('category')}
          className="flex items-center justify-between w-full py-1 text-sm font-medium text-neutral-700"
        >
          Category
          {expandedSections.category ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {expandedSections.category && (
          <div className="mt-2 space-y-1">
            {defaultCategories.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    category: filters.category === cat ? undefined : cat,
                    page: 1,
                  })
                }
                className={clsx(
                  'block w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors',
                  filters.category === cat
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="border-b border-neutral-200 pb-4">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full py-1 text-sm font-medium text-neutral-700"
        >
          Price Range
          {expandedSections.price ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {expandedSections.price && (
          <div className="mt-2 space-y-1">
            {priceRanges.map((range) => (
              <button
                key={range.label}
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    minPrice:
                      filters.minPrice === range.min &&
                      filters.maxPrice === range.max
                        ? undefined
                        : range.min,
                    maxPrice:
                      filters.minPrice === range.min &&
                      filters.maxPrice === range.max
                        ? undefined
                        : range.max,
                    page: 1,
                  })
                }
                className={clsx(
                  'block w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors',
                  filters.minPrice === range.min &&
                    filters.maxPrice === range.max
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Rating */}
      <div className="border-b border-neutral-200 pb-4">
        <button
          onClick={() => toggleSection('rating')}
          className="flex items-center justify-between w-full py-1 text-sm font-medium text-neutral-700"
        >
          Rating
          {expandedSections.rating ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {expandedSections.rating && (
          <div className="mt-2 space-y-1">
            {[4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    minRating:
                      filters.minRating === rating ? undefined : rating,
                    page: 1,
                  })
                }
                className={clsx(
                  'flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-lg transition-colors',
                  filters.minRating === rating
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50'
                )}
              >
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={clsx(
                        'w-3.5 h-3.5',
                        s <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-neutral-200'
                      )}
                    />
                  ))}
                </div>
                <span>& Up</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sort By */}
      <div>
        <button
          onClick={() => toggleSection('sort')}
          className="flex items-center justify-between w-full py-1 text-sm font-medium text-neutral-700"
        >
          Sort By
          {expandedSections.sort ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {expandedSections.sort && (
          <div className="mt-2 space-y-1">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    sortBy: option.value as ProductFiltersType['sortBy'],
                    page: 1,
                  })
                }
                className={clsx(
                  'block w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors',
                  filters.sortBy === option.value
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
