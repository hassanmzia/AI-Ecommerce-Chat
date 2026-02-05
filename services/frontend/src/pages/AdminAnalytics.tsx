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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { formatCurrency } from '@/utils/formatters';

const monthlyRevenue = [
  { month: 'Jan', revenue: 42000, orders: 340, customers: 120 },
  { month: 'Feb', revenue: 38000, orders: 298, customers: 98 },
  { month: 'Mar', revenue: 55000, orders: 412, customers: 145 },
  { month: 'Apr', revenue: 48000, orders: 378, customers: 132 },
  { month: 'May', revenue: 62000, orders: 456, customers: 167 },
  { month: 'Jun', revenue: 58000, orders: 423, customers: 155 },
  { month: 'Jul', revenue: 72000, orders: 534, customers: 198 },
  { month: 'Aug', revenue: 68000, orders: 501, customers: 184 },
  { month: 'Sep', revenue: 78000, orders: 578, customers: 210 },
  { month: 'Oct', revenue: 82000, orders: 612, customers: 225 },
  { month: 'Nov', revenue: 95000, orders: 689, customers: 267 },
  { month: 'Dec', revenue: 110000, orders: 798, customers: 312 },
];

const categoryRevenue = [
  { name: 'Electronics', value: 45000 },
  { name: 'Clothing', value: 32000 },
  { name: 'Home & Garden', value: 28000 },
  { name: 'Sports', value: 18000 },
  { name: 'Books', value: 12000 },
  { name: 'Beauty', value: 15000 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const dailyOrders = [
  { day: 'Mon', orders: 45, returns: 3 },
  { day: 'Tue', orders: 52, returns: 2 },
  { day: 'Wed', orders: 48, returns: 4 },
  { day: 'Thu', orders: 61, returns: 1 },
  { day: 'Fri', orders: 73, returns: 5 },
  { day: 'Sat', orders: 89, returns: 3 },
  { day: 'Sun', orders: 67, returns: 2 },
];

const topProducts = [
  { name: 'Wireless Headphones Pro', sales: 234, revenue: 23400 },
  { name: 'Smart Watch Ultra', sales: 189, revenue: 47250 },
  { name: 'Organic Cotton T-Shirt', sales: 156, revenue: 4680 },
  { name: 'Yoga Mat Premium', sales: 143, revenue: 5720 },
  { name: 'LED Desk Lamp', sales: 128, revenue: 7680 },
];

const metrics = [
  {
    label: 'Total Revenue',
    value: formatCurrency(807000),
    change: 23.5,
    icon: DollarSign,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    label: 'Total Orders',
    value: '6,019',
    change: 18.2,
    icon: ShoppingBag,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    label: 'Total Customers',
    value: '2,213',
    change: 12.8,
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    label: 'Avg Order Value',
    value: formatCurrency(134.07),
    change: -2.3,
    icon: TrendingUp,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
];

export default function AdminAnalytics() {
  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-8 bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-neutral-900">Analytics</h1>
            <p className="text-neutral-500 mt-1">
              Detailed performance metrics and insights
            </p>
          </div>

          {/* Metrics */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric) => (
              <div key={metric.label} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 ${metric.bg} rounded-xl flex items-center justify-center`}
                  >
                    <metric.icon className={`w-5 h-5 ${metric.color}`} />
                  </div>
                  <div
                    className={`flex items-center gap-0.5 text-xs font-medium ${
                      metric.change >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {metric.change >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(metric.change)}%
                  </div>
                </div>
                <p className="text-2xl font-bold text-neutral-900">
                  {metric.value}
                </p>
                <p className="text-sm text-neutral-500 mt-0.5">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>

          {/* Revenue Chart */}
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold text-neutral-800 mb-6">
              Revenue & Orders Trend
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                <YAxis
                  yAxisId="left"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Revenue' : 'Orders',
                  ]}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  fill="url(#colorRevenue2)"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#10b981"
                  fill="url(#colorOrders)"
                  strokeWidth={2}
                  name="Orders"
                />
                <defs>
                  <linearGradient
                    id="colorRevenue2"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#3b82f6"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="95%"
                      stopColor="#3b82f6"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="colorOrders"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#10b981"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="95%"
                      stopColor="#10b981"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Daily Orders */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-neutral-800 mb-6">
                Daily Orders (This Week)
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dailyOrders}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="orders"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    name="Orders"
                  />
                  <Bar
                    dataKey="returns"
                    fill="#ef4444"
                    radius={[6, 6, 0, 0]}
                    name="Returns"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Distribution */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-neutral-800 mb-6">
                Revenue by Category
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryRevenue}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {categoryRevenue.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Customer Growth */}
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold text-neutral-800 mb-6">
              Customer Growth
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="customers"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                  name="New Customers"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4">
              Top Selling Products
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-3">
                      #
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-3">
                      Product
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-3">
                      Units Sold
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-3">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {topProducts.map((product, index) => (
                    <tr key={product.name} className="hover:bg-neutral-50">
                      <td className="py-3 text-sm font-medium text-neutral-400">
                        {index + 1}
                      </td>
                      <td className="py-3 text-sm font-medium text-neutral-800">
                        {product.name}
                      </td>
                      <td className="py-3 text-sm text-neutral-600">
                        {product.sales}
                      </td>
                      <td className="py-3 text-sm font-medium text-neutral-800">
                        {formatCurrency(product.revenue)}
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
