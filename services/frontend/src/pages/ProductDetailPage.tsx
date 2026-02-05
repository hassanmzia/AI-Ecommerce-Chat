import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Star,
  ShoppingCart,
  Heart,
  Truck,
  Shield,
  RotateCcw,
  Minus,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import productService from '@/services/productService';
import useCartStore from '@/store/cartStore';
import { formatCurrency, generateId } from '@/utils/formatters';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ProductGrid from '@/components/products/ProductGrid';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.getProduct(id!),
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ['product-reviews', id],
    queryFn: () => productService.getReviews(id!),
    enabled: !!id,
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ['related-products', id],
    queryFn: () => productService.getRelatedProducts(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" label="Loading product..." />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">
          Product Not Found
        </h2>
        <p className="text-neutral-500 mb-6">
          The product you are looking for does not exist.
        </p>
        <Link to="/products" className="btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem({
      id: generateId(),
      productId: product.id,
      productName: product.name,
      productImage: product.thumbnail || product.images[0],
      price: product.price,
      quantity,
      stock: product.stock,
    });
    toast.success(`Added ${quantity} x ${product.name} to cart`);
  };

  const discount = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100
      )
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
        <Link to="/" className="hover:text-primary-600">
          Home
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/products" className="hover:text-primary-600">
          Products
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-neutral-700 font-medium">{product.name}</span>
      </nav>

      {/* Product details */}
      <div className="grid lg:grid-cols-2 gap-10 mb-16">
        {/* Images */}
        <div>
          <div className="aspect-square bg-neutral-100 rounded-2xl overflow-hidden mb-4">
            {product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingCart className="w-20 h-20 text-neutral-300" />
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.slice(0, 4).map((img, index) => (
                <div
                  key={index}
                  className="aspect-square bg-neutral-100 rounded-xl overflow-hidden border-2 border-transparent hover:border-primary-500 cursor-pointer transition-colors"
                >
                  <img
                    src={img}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.brand && (
            <p className="text-sm text-primary-600 font-medium mb-1">
              {product.brand}
            </p>
          )}
          <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-3">
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={clsx(
                    'w-5 h-5',
                    star <= Math.round(product.rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-neutral-200'
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-neutral-600">
              {product.rating.toFixed(1)} ({product.reviewCount} reviews)
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-extrabold text-neutral-900">
              {formatCurrency(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <>
                <span className="text-lg text-neutral-400 line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
                <span className="badge bg-red-100 text-red-700">
                  -{discount}%
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-neutral-600 leading-relaxed mb-6">
            {product.description}
          </p>

          {/* Quantity & Add to cart */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border border-neutral-300 rounded-xl">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-3 hover:bg-neutral-50 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() =>
                  setQuantity(Math.min(product.stock, quantity + 1))
                }
                className="p-3 hover:bg-neutral-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-5 h-5" />
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button
              onClick={() => {
                setIsWishlisted(!isWishlisted);
                toast.success(
                  isWishlisted ? 'Removed from wishlist' : 'Added to wishlist'
                );
              }}
              className="p-3 border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors"
            >
              <Heart
                className={clsx(
                  'w-5 h-5',
                  isWishlisted
                    ? 'fill-red-500 text-red-500'
                    : 'text-neutral-400'
                )}
              />
            </button>
          </div>

          {/* Stock status */}
          <div className="mb-6">
            {product.stock > 0 ? (
              <p className="text-sm text-emerald-600 font-medium">
                In Stock ({product.stock} available)
              </p>
            ) : (
              <p className="text-sm text-red-500 font-medium">Out of Stock</p>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 py-6 border-t border-neutral-200">
            <div className="text-center">
              <Truck className="w-5 h-5 text-neutral-400 mx-auto mb-1" />
              <p className="text-xs text-neutral-600 font-medium">
                Free Shipping
              </p>
            </div>
            <div className="text-center">
              <Shield className="w-5 h-5 text-neutral-400 mx-auto mb-1" />
              <p className="text-xs text-neutral-600 font-medium">
                1 Year Warranty
              </p>
            </div>
            <div className="text-center">
              <RotateCcw className="w-5 h-5 text-neutral-400 mx-auto mb-1" />
              <p className="text-xs text-neutral-600 font-medium">
                30-Day Returns
              </p>
            </div>
          </div>

          {/* Specifications */}
          {Object.keys(product.specifications).length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-neutral-800 mb-3">
                Specifications
              </h3>
              <div className="space-y-2">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between py-2 border-b border-neutral-100 text-sm"
                  >
                    <span className="text-neutral-500">{key}</span>
                    <span className="text-neutral-800 font-medium">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      {reviews && reviews.data && reviews.data.length > 0 && (
        <div className="mb-16">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">
            Customer Reviews
          </h2>
          <div className="space-y-4">
            {reviews.data.map((review) => (
              <div key={review.id} className="card p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">
                      {review.userName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={clsx(
                              'w-3.5 h-3.5',
                              s <= review.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-neutral-200'
                            )}
                          />
                        ))}
                      </div>
                      {review.isVerifiedPurchase && (
                        <span className="badge badge-success text-[10px]">
                          Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400">
                    {review.createdAt}
                  </span>
                </div>
                {review.title && (
                  <h4 className="text-sm font-medium text-neutral-800 mb-1">
                    {review.title}
                  </h4>
                )}
                <p className="text-sm text-neutral-600">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-neutral-900 mb-6">
            Related Products
          </h2>
          <ProductGrid products={relatedProducts} />
        </div>
      )}
    </div>
  );
}
