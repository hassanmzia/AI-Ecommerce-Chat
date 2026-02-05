import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import orderService from '@/services/orderService';
import OrderCard from '@/components/orders/OrderCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getOrders(),
  });

  const orders = data?.data || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">My Orders</h1>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" label="Loading orders..." />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-neutral-300" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-700 mb-1">
            No Orders Yet
          </h3>
          <p className="text-sm text-neutral-500 mb-6">
            When you place your first order, it will appear here.
          </p>
          <Link to="/products" className="btn-primary">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
