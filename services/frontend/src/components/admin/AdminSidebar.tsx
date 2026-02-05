import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  BarChart3,
  Bot,
  ChevronLeft,
} from 'lucide-react';
import clsx from 'clsx';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/agents', label: 'AI Agents', icon: Bot },
];

export default function AdminSidebar() {
  const location = useLocation();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-64 bg-white border-r border-neutral-200 min-h-[calc(100vh-4rem)] p-4">
      {/* Back link */}
      <Link
        to="/"
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Store
      </Link>

      {/* Admin title */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4 px-3">
        Admin Panel
      </h2>

      {/* Navigation */}
      <nav className="space-y-1">
        {adminLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              isActive(link.to, link.exact)
                ? 'bg-primary-50 text-primary-700 shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
            )}
          >
            <link.icon
              className={clsx(
                'w-5 h-5',
                isActive(link.to, link.exact)
                  ? 'text-primary-600'
                  : 'text-neutral-400'
              )}
            />
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
