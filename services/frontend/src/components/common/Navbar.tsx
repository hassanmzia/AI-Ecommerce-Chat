import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  MessageSquare,
  User,
  Menu,
  X,
  Search,
  Package,
  Home,
  Shield,
  LogOut,
  Heart,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore';
import useCartStore from '@/store/cartStore';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const { user, isAuthenticated, logout } = useAuthStore();
  const totalItems = useCartStore((state) => state.totalItems);

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/chat', label: 'Chat', icon: MessageSquare },
    { to: '/orders', label: 'Orders', icon: Package },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  const isActiveLink = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-neutral-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              AI E-Commerce
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={clsx(
                  'flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                  isActiveLink(link.to)
                    ? 'bg-primary-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                )}
              >
                <link.icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="hidden lg:flex items-center flex-1 max-w-md mx-6"
          >
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </form>

          {/* Right side icons */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              title="Wishlist"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              title="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-20 animate-slide-down">
                      <div className="px-4 py-2 border-b border-neutral-100">
                        <p className="text-sm font-medium text-neutral-900">
                          {user?.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {user?.email}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                      >
                        <Package className="w-4 h-4" />
                        <span>My Orders</span>
                      </Link>
                      {user?.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Admin Dashboard</span>
                        </Link>
                      )}
                      <div className="border-t border-neutral-100 mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-primary text-sm py-2 px-4"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-800 animate-slide-down">
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </form>

          {/* Mobile nav links */}
          <div className="px-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={clsx(
                  'flex items-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActiveLink(link.to)
                    ? 'bg-primary-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800'
                )}
              >
                <link.icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            ))}
            <Link
              to="/cart"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-300 hover:bg-neutral-800"
            >
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5" />
                <span>Cart</span>
              </div>
              {totalItems > 0 && (
                <span className="bg-accent-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  {totalItems}
                </span>
              )}
            </Link>
            <Link
              to="/wishlist"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-300 hover:bg-neutral-800"
            >
              <Heart className="w-5 h-5" />
              <span>Wishlist</span>
            </Link>
          </div>

          {/* Mobile auth */}
          <div className="px-4 py-3 border-t border-neutral-800">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-3 px-2 py-2">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-sm font-bold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-neutral-400">{user?.email}</p>
                  </div>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 rounded-lg"
                >
                  Profile
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 rounded-lg"
                  >
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-neutral-800 rounded-lg"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex space-x-3">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 btn-primary text-center text-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 btn-secondary text-center text-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
