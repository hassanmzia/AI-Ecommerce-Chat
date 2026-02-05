import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Mail, Phone, MapPin, Save, Loader2 } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import authService from '@/services/authService';
import orderService from '@/services/orderService';
import OrderCard from '@/components/orders/OrderCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || '',
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => orderService.getOrders(1, 3),
  });

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatedUser = await authService.updateProfile({
        name: formData.name,
        phone: formData.phone,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
        },
      });
      setUser(updatedUser);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">My Profile</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="md:col-span-1">
          <div className="card p-6 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-neutral-900">
              {user?.name}
            </h2>
            <p className="text-sm text-neutral-500">{user?.email}</p>
            <span className="inline-block badge badge-info mt-2 capitalize">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Profile form */}
        <div className="md:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-800">
                Personal Information
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary text-sm py-1.5"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={!isEditing}
                    className="input-field pl-10 disabled:bg-neutral-50 disabled:text-neutral-500"
                  />
                </div>
              </div>

              {/* Email (readonly) */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="input-field pl-10 bg-neutral-50 text-neutral-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="(555) 000-0000"
                    className="input-field pl-10 disabled:bg-neutral-50 disabled:text-neutral-500"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Address
                </label>
                <div className="relative mb-2">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) =>
                      setFormData({ ...formData, street: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="Street address"
                    className="input-field pl-10 disabled:bg-neutral-50 disabled:text-neutral-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="City"
                    className="input-field disabled:bg-neutral-50 disabled:text-neutral-500"
                  />
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="State"
                    className="input-field disabled:bg-neutral-50 disabled:text-neutral-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) =>
                      setFormData({ ...formData, zipCode: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="ZIP Code"
                    className="input-field disabled:bg-neutral-50 disabled:text-neutral-500"
                  />
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="Country"
                    className="input-field disabled:bg-neutral-50 disabled:text-neutral-500"
                  />
                </div>
              </div>

              {/* Save buttons */}
              {isEditing && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-primary flex items-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-neutral-900 mb-4">
          Recent Orders
        </h2>
        {ordersLoading ? (
          <LoadingSpinner label="Loading orders..." />
        ) : recentOrders?.data && recentOrders.data.length > 0 ? (
          <div className="space-y-4">
            {recentOrders.data.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 text-sm">No orders yet.</p>
        )}
      </div>
    </div>
  );
}
