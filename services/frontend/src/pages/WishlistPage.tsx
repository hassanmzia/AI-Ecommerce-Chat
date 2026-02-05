import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import ProductGrid from '@/components/products/ProductGrid';
import type { Product } from '@/types';

// In a real app, this would come from a wishlist store/API
const mockWishlistProducts: Product[] = [];

export default function WishlistPage() {
  const products = mockWishlistProducts;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">My Wishlist</h1>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-neutral-300" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-700 mb-1">
            Your Wishlist is Empty
          </h3>
          <p className="text-sm text-neutral-500 mb-6">
            Save items you love for later by clicking the heart icon on any
            product.
          </p>
          <Link
            to="/products"
            className="btn-primary inline-flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            Browse Products
          </Link>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
