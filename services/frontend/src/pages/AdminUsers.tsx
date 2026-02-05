import { useState } from 'react';
import {
  Search,
  Users,
  Mail,
  Shield,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { formatDate, generateAvatar, getAvatarColor } from '@/utils/formatters';

// Mock data for admin users view
const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'customer',
    orders: 12,
    totalSpent: 1456.78,
    createdAt: '2024-01-15T10:00:00Z',
    status: 'active',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'customer',
    orders: 8,
    totalSpent: 892.5,
    createdAt: '2024-01-10T10:00:00Z',
    status: 'active',
  },
  {
    id: '3',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    role: 'admin',
    orders: 0,
    totalSpent: 0,
    createdAt: '2024-01-05T10:00:00Z',
    status: 'active',
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice@example.com',
    role: 'customer',
    orders: 24,
    totalSpent: 3210.0,
    createdAt: '2023-12-20T10:00:00Z',
    status: 'active',
  },
  {
    id: '5',
    name: 'Charlie Davis',
    email: 'charlie@example.com',
    role: 'customer',
    orders: 3,
    totalSpent: 199.99,
    createdAt: '2024-01-12T10:00:00Z',
    status: 'inactive',
  },
];

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-8 bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900">Users</h1>
            <p className="text-neutral-500 mt-1">
              Manage platform users and roles
            </p>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900">
                  {mockUsers.length}
                </p>
                <p className="text-xs text-neutral-500">Total Users</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900">
                  {mockUsers.filter((u) => u.status === 'active').length}
                </p>
                <p className="text-xs text-neutral-500">Active Users</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900">
                  {mockUsers.filter((u) => u.role === 'admin').length}
                </p>
                <p className="text-xs text-neutral-500">Admins</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              <div className="flex gap-1">
                {['all', 'customer', 'admin'].map((role) => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                      roleFilter === role
                        ? 'bg-primary-600 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                      User
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                      Role
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                      Orders
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                      Total Spent
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                      Joined
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-6 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 ${getAvatarColor(
                              user.name
                            )} rounded-full flex items-center justify-center text-white text-xs font-bold`}
                          >
                            {generateAvatar(user.name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-800">
                              {user.name}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-neutral-500">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`badge text-xs capitalize ${
                            user.role === 'admin'
                              ? 'badge-info'
                              : 'badge-neutral'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        {user.orders}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-neutral-800">
                        ${user.totalSpent.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`badge text-xs ${
                            user.status === 'active'
                              ? 'badge-success'
                              : 'badge-neutral'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Simple pagination indicator */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50">
              <p className="text-sm text-neutral-500">
                Showing {filteredUsers.length} users
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled
                  className="p-2 rounded-lg border border-neutral-200 opacity-50 cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled
                  className="p-2 rounded-lg border border-neutral-200 opacity-50 cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
