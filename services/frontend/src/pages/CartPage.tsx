import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Tag,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import { useState } from 'react';
import useCartStore from '@/store/cartStore';
import { formatCurrency } from '@/utils/formatters';
import toast from 'react-hot-toast';

export default function CartPage() {
  const [couponInput, setCouponInput] = useState('');
  const {
    items,
    totalItems,
    totalPrice,
    discount,
    couponCode,
    updateQuantity,
    removeItem,
    clearCart,
    setCoupon,
  } = useCartStore();

  const handleApplyCoupon = () => {
    if (couponInput.trim()) {
      setCoupon(couponInput.trim(), totalPrice * 0.1);
      toast.success('Coupon applied successfully!');
      setCouponInput('');
    }
  };

  const shipping = totalPrice > 50 ? 0 : 9.99;
  const tax = (totalPrice - discount) * 0.08;
  const grandTotal = totalPrice - discount + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-10 h-10 text-neutral-300" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">
          Your Cart is Empty
        </h2>
        <p className="text-neutral-500 mb-6">
          Looks like you have not added anything to your cart yet.
        </p>
        <Link to="/products" className="btn-primary inline-flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">
          Shopping Cart ({totalItems} items)
        </h1>
        <button
          onClick={() => {
            clearCart();
            toast.success('Cart cleared');
          }}
          className="text-sm text-red-500 hover:text-red-600 font-medium"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="card p-5 flex items-center gap-4"
            >
              {/* Image */}
              <div className="w-20 h-20 bg-neutral-100 rounded-xl flex-shrink-0 overflow-hidden">
                {item.productImage ? (
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-neutral-300" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link
                  to={`/products/${item.productId}`}
                  className="text-sm font-semibold text-neutral-800 hover:text-primary-600 line-clamp-2"
                >
                  {item.productName}
                </Link>
                <p className="text-sm font-bold text-neutral-900 mt-1">
                  {formatCurrency(item.price)}
                </p>
              </div>

              {/* Quantity */}
              <div className="flex items-center border border-neutral-300 rounded-xl">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="p-2 hover:bg-neutral-50 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-medium">
                  {item.quantity}
                </span>
                <button
                  onClick={() =>
                    updateQuantity(
                      item.id,
                      Math.min(item.stock, item.quantity + 1)
                    )
                  }
                  className="p-2 hover:bg-neutral-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Subtotal */}
              <p className="text-sm font-bold text-neutral-900 w-24 text-right">
                {formatCurrency(item.price * item.quantity)}
              </p>

              {/* Remove */}
              <button
                onClick={() => {
                  removeItem(item.id);
                  toast.success('Item removed from cart');
                }}
                className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-20">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4">
              Order Summary
            </h2>

            {/* Coupon */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Coupon Code
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter code"
                    className="input-field pl-9 text-sm py-2"
                  />
                </div>
                <button
                  onClick={handleApplyCoupon}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  Apply
                </button>
              </div>
              {couponCode && (
                <p className="text-xs text-emerald-600 mt-1">
                  Coupon &quot;{couponCode}&quot; applied
                </p>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal</span>
                <span className="text-neutral-800 font-medium">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-emerald-600">Discount</span>
                  <span className="text-emerald-600 font-medium">
                    -{formatCurrency(discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-500">Shipping</span>
                <span className="text-neutral-800 font-medium">
                  {shipping === 0 ? (
                    <span className="text-emerald-600">Free</span>
                  ) : (
                    formatCurrency(shipping)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Tax</span>
                <span className="text-neutral-800 font-medium">
                  {formatCurrency(tax)}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-neutral-200">
                <span className="text-base font-semibold text-neutral-800">
                  Total
                </span>
                <span className="text-xl font-bold text-neutral-900">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {totalPrice < 50 && (
              <p className="text-xs text-amber-600 mt-3">
                Add {formatCurrency(50 - totalPrice)} more for free shipping
              </p>
            )}

            <button className="w-full btn-primary mt-6 flex items-center justify-center gap-2 py-3">
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              to="/products"
              className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium mt-3"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
