import { Link } from 'react-router-dom';
import { MessageSquare, Mail, Github, Twitter, Linkedin } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function Footer() {
  const [email, setEmail] = useState('');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      toast.success('Successfully subscribed to newsletter!');
      setEmail('');
    }
  };

  return (
    <footer className="bg-neutral-900 text-neutral-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                AI E-Commerce
              </span>
            </Link>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Your AI-powered shopping assistant. Get personalized
              recommendations, track orders, and manage your shopping experience
              with intelligent chat.
            </p>
            <div className="flex space-x-3">
              <a
                href="#"
                className="p-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="p-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="p-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { to: '/products', label: 'Products' },
                { to: '/chat', label: 'AI Chat Assistant' },
                { to: '/orders', label: 'Order Tracking' },
                { to: '/cart', label: 'Shopping Cart' },
                { to: '/wishlist', label: 'Wishlist' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              {[
                { label: 'Help Center', href: '#' },
                { label: 'Shipping Info', href: '#' },
                { label: 'Returns & Exchanges', href: '#' },
                { label: 'Privacy Policy', href: '#' },
                { label: 'Terms of Service', href: '#' },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-white font-semibold mb-4">Stay Updated</h3>
            <p className="text-sm text-neutral-400 mb-4">
              Subscribe to our newsletter for the latest deals and updates.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full btn-primary text-sm"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <p className="text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} AI E-Commerce Chat. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
              Privacy
            </a>
            <a href="#" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
              Terms
            </a>
            <a href="#" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
