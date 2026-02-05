import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  TrendingUp,
  Bot,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import AdminSidebar from '@/components/admin/AdminSidebar';
import StatsCard from '@/components/dashboard/StatsCard';
import { formatCurrency, getStatusColor } from '@/utils/formatters';

const revenueData = [
  { name: 'Jan', revenue: 4000, orders: 240 },
  { name: 'Feb', revenue: 3000, orders: 198 },
  { name: 'Mar', revenue: 5000, orders: 305 },
  { name: 'Apr', revenue: 4500, orders: 278 },
  { name: 'May', revenue: 6000, orders: 389 },
  { name: 'Jun', revenue: 5500, orders: 345 },
  { name: 'Jul', revenue: 7000, orders: 420 },
];

const categoryData = [
  { name: 'Electronics', value: 35 },
  { name: 'Clothing', value: 25 },
  { name: 'Home', value: 20 },
  { name: 'Sports', value: 12 },
  { name: 'Other', value: 8 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const recentOrders = [
  {
    id: 'ORD-001',
    customer: 'John Doe',
    total: 129.99,
    status: 'delivered',
    date: '2024-01-15',
  },
  {
    id: 'ORD-002',
    customer: 'Jane Smith',
    total: 89.5,
    status: 'shipped',
    date: '2024-01-15',
  },
  {
    id: 'ORD-003',
    customer: 'Bob Wilson',
    total: 249.0,
    status: 'processing',
    date: '2024-01-14',
  },
  {
    id: 'ORD-004',
    customer: 'Alice Brown',
    total: 59.99,
    status: 'pending',
    date: '2024-01-14',
  },
  {
    id: 'ORD-005',
    customer: 'Charlie Davis',
    total: 199.99,
    status: 'confirmed',
    date: '2024-01-13',
  },
];

const agentStatuses = [
  { name: 'Order Management', status: 'online', tasks: 45 },
  { name: 'Product Search', status: 'online', tasks: 128 },
  { name: 'Customer Service', status: 'busy', tasks: 23 },
  { name: 'Payment Processing', status: 'online', tasks: 67 },
  { name: 'Analytics', status: 'online', tasks: 12 },
];

export default function AdminDashboard() {
  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-8 bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
            <p className="text-neutral-500 mt-1">
              Overview of your e-commerce platform
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              icon={DollarSign}
              label="Total Revenue"
              value={formatCurrency(124500)}
              change={12.5}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
            <StatsCard
              icon={ShoppingBag}
              label="Total Orders"
              value="1,285"
              change={8.2}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <StatsCard
              icon={Users}
              label="Total Customers"
              value="3,420"
              change={15.3}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
            />
            <StatsCard
              icon={Package}
              label="Active Products"
              value="856"
              change={-2.1}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Revenue Chart */}
            <div className="lg:col-span-2 card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-neutral-800">
                  Revenue Overview
                </h2>
                <div className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                  <TrendingUp className="w-4 h-4" />
                  +12.5%
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#3b82f6"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Category Distribution */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-neutral-800 mb-6">
                Sales by Category
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {categoryData.map((cat, index) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <span className="text-neutral-600">{cat.name}</span>
                    </div>
                    <span className="font-medium text-neutral-800">
                      {cat.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Orders Chart */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-neutral-800 mb-6">
                Orders Trend
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                    }}
                  />
                  <Bar dataKey="orders" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* AI Agent Status */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-neutral-800">
                  AI Agent Status
                </h2>
                <Bot className="w-5 h-5 text-neutral-400" />
              </div>
              <div className="space-y-3">
                {agentStatuses.map((agent) => (
                  <div
                    key={agent.name}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          agent.status === 'online'
                            ? 'bg-emerald-500'
                            : agent.status === 'busy'
                            ? 'bg-amber-500'
                            : 'bg-neutral-400'
                        }`}
                      />
                      <span className="text-sm font-medium text-neutral-700">
                        {agent.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-neutral-500">
                        {agent.tasks} tasks
                      </span>
                      <span
                        className={`badge text-xs ${getStatusColor(
                          agent.status
                        )}`}
                      >
                        {agent.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4">
              Recent Orders
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-3">
                      Order ID
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-3">
                      Customer
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-3">
                      Date
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-3">
                      Total
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50">
                      <td className="py-3 text-sm font-medium text-primary-600">
                        {order.id}
                      </td>
                      <td className="py-3 text-sm text-neutral-700">
                        {order.customer}
                      </td>
                      <td className="py-3 text-sm text-neutral-500">
                        {order.date}
                      </td>
                      <td className="py-3 text-sm font-medium text-neutral-800">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`badge text-xs ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
