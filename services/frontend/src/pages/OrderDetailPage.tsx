import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Package } from 'lucide-react';
import orderService from '@/services/orderService';
import OrderTimeline from '@/components/orders/OrderTimeline';
import {
  formatCurrency,
  formatDate,
  formatOrderId,
  getStatusColor,
} from '@/utils/formatters';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getOrder(id!),
    enabled: !!id,
  });

  const { data: tracking } = useQuery({
    queryKey: ['order-tracking', id],
    queryFn: () => orderService.trackOrder(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" label="Loading order details..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">
          Order Not Found
        </h2>
        <p className="text-neutral-500 mb-6">
          The order you are looking for does not exist.
        </p>
        <Link to="/orders" className="btn-primary">
          View Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
        <Link to="/orders" className="hover:text-primary-600">
          My Orders
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-neutral-700 font-medium">
          {formatOrderId(order.id)}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Order {formatOrderId(order.id)}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <span className={`badge text-sm ${getStatusColor(order.status)}`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>

      {/* Timeline */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-neutral-800 mb-6">
          Order Status
        </h2>
        <OrderTimeline
          status={order.status}
          trackingUpdates={tracking?.updates}
        />
        {tracking?.trackingNumber && (
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <p className="text-sm text-neutral-500">
              Tracking Number:{' '}
              <span className="font-medium text-primary-600">
                {tracking.trackingNumber}
              </span>
            </p>
            {tracking.estimatedDelivery && (
              <p className="text-sm text-neutral-500 mt-1">
                Estimated Delivery:{' '}
                <span className="font-medium text-neutral-700">
                  {tracking.estimatedDelivery}
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Order items */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-neutral-800 mb-4">Items</h2>
        <div className="divide-y divide-neutral-100">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-4">
              <div className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                {item.productImage ? (
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-6 h-6 text-neutral-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/products/${item.productId}`}
                  className="text-sm font-medium text-neutral-800 hover:text-primary-600"
                >
                  {item.productName}
                </Link>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Qty: {item.quantity} x {formatCurrency(item.price)}
                </p>
              </div>
              <p className="text-sm font-semibold text-neutral-900">
                {formatCurrency(item.total)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Order summary */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Shipping */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-neutral-800 mb-3">
            Shipping Address
          </h2>
          <div className="text-sm text-neutral-600 space-y-1">
            <p>{order.shippingAddress.street}</p>
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.zipCode}
            </p>
            <p>{order.shippingAddress.country}</p>
          </div>
        </div>

        {/* Payment summary */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-neutral-800 mb-3">
            Payment Summary
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Subtotal</span>
              <span className="text-neutral-800">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Shipping</span>
              <span className="text-neutral-800">
                {order.shipping === 0
                  ? 'Free'
                  : formatCurrency(order.shipping)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Tax</span>
              <span className="text-neutral-800">
                {formatCurrency(order.tax)}
              </span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-emerald-600">Discount</span>
                <span className="text-emerald-600">
                  -{formatCurrency(order.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-neutral-200 font-semibold text-base">
              <span className="text-neutral-800">Total</span>
              <span className="text-neutral-900">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100">
            <p className="text-xs text-neutral-500">
              Payment Method:{' '}
              <span className="font-medium text-neutral-700 capitalize">
                {order.payment.method.replace('_', ' ')}
              </span>
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Status:{' '}
              <span
                className={`font-medium capitalize ${
                  order.payment.status === 'completed'
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                }`}
              >
                {order.payment.status}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
