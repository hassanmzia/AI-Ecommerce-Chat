import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { formatCurrency } from '@/utils/formatters';
import useCartStore from '@/store/cartStore';
import type { Product } from '@/types';
import toast from 'react-hot-toast';
import { generateId } from '@/utils/formatters';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: generateId(),
      productId: product.id,
      productName: product.name,
      productImage: product.thumbnail || product.images[0],
      price: product.price,
      quantity: 1,
      stock: product.stock,
    });
    toast.success(`${product.name} added to cart`);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    toast.success(
      isWishlisted ? 'Removed from wishlist' : 'Added to wishlist'
    );
  };

  const discount = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100
      )
    : 0;

  return (
    <Link to={`/products/${product.id}`} className="group">
      <div className="card overflow-hidden transition-all duration-300 group-hover:shadow-card-hover group-hover:-translate-y-1">
        {/* Image */}
        <div className="relative aspect-square bg-neutral-100 overflow-hidden">
          {product.thumbnail || product.images[0] ? (
            <img
              src={product.thumbnail || product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
              <ShoppingCart className="w-12 h-12 text-neutral-300" />
            </div>
          )}

          {/* Discount badge */}
          {discount > 0 && (
            <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
              -{discount}%
            </div>
          )}

          {/* Wishlist button */}
          <button
            onClick={handleToggleWishlist}
            className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all"
          >
            <Heart
              className={clsx(
                'w-4 h-4 transition-colors',
                isWishlisted
                  ? 'fill-red-500 text-red-500'
                  : 'text-neutral-400 hover:text-red-500'
              )}
            />
          </button>

          {/* Quick add to cart */}
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="w-full btn-primary text-sm py-2.5 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          {product.category && (
            <p className="text-xs text-primary-600 font-medium mb-1">
              {product.category}
            </p>
          )}
          <h3 className="text-sm font-semibold text-neutral-800 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={clsx(
                    'w-3.5 h-3.5',
                    star <= Math.round(product.rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-neutral-200'
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-neutral-500">
              ({product.reviewCount})
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-neutral-900">
              {formatCurrency(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-neutral-400 line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
          </div>

          {/* Stock indicator */}
          {product.stock > 0 && product.stock <= 5 && (
            <p className="text-xs text-amber-600 mt-1.5 font-medium">
              Only {product.stock} left in stock
            </p>
          )}
          {product.stock === 0 && (
            <p className="text-xs text-red-500 mt-1.5 font-medium">
              Out of stock
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
