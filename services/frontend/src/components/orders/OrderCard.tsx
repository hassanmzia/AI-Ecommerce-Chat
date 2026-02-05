import { Link } from 'react-router-dom';
import { Package, ChevronRight, Calendar } from 'lucide-react';
import { formatCurrency, formatDate, formatOrderId, getStatusColor } from '@/utils/formatters';
import type { Order } from '@/types';

interface OrderCardProps {
  order: Order;
}

export default function OrderCard({ order }: OrderCardProps) {
  return (
    <Link to={`/orders/${order.id}`} className="block">
      <div className="card p-5 hover:shadow-card-hover transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-800">
                Order {formatOrderId(order.id)}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3 h-3 text-neutral-400" />
                <p className="text-xs text-neutral-500">
                  {formatDate(order.createdAt)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge ${getStatusColor(order.status)}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-neutral-500">Items</p>
              <p className="text-sm font-medium text-neutral-700">
                {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            {order.trackingNumber && (
              <div>
                <p className="text-xs text-neutral-500">Tracking</p>
                <p className="text-sm font-medium text-primary-600">
                  {order.trackingNumber}
                </p>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500">Total</p>
            <p className="text-lg font-bold text-neutral-900">
              {formatCurrency(order.total)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
