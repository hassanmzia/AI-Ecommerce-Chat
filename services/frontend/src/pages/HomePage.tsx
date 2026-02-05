import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  ShoppingBag,
  Truck,
  Shield,
  Star,
  ArrowRight,
  Sparkles,
  Zap,
  Bot,
  Search,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import productService from '@/services/productService';
import ProductGrid from '@/components/products/ProductGrid';

const stats = [
  { label: 'Products Available', value: '10,000+' },
  { label: 'Happy Customers', value: '50,000+' },
  { label: 'AI Conversations', value: '1M+' },
  { label: 'Order Accuracy', value: '99.9%' },
];

const features = [
  {
    icon: Bot,
    title: 'AI Shopping Assistant',
    description:
      'Chat with our intelligent AI assistant to find products, track orders, and get personalized recommendations.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Search,
    title: 'Smart Product Search',
    description:
      'Describe what you need in natural language and let our AI find the perfect products for you.',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: Truck,
    title: 'Real-time Order Tracking',
    description:
      'Ask the AI about your order status and get instant updates on shipping and delivery.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: Shield,
    title: 'Secure & Validated',
    description:
      'Every transaction is validated through our multi-agent system ensuring accuracy and security.',
    color: 'from-amber-500 to-amber-600',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Start a Chat',
    description:
      'Open the AI chat and describe what you are looking for or ask about your orders.',
  },
  {
    step: '02',
    title: 'AI Processes Your Request',
    description:
      'Our multi-agent system routes your request to specialized AI agents for the best response.',
  },
  {
    step: '03',
    title: 'Get Instant Results',
    description:
      'Receive personalized product recommendations, order updates, or helpful information in seconds.',
  },
];

export default function HomePage() {
  const { data: featuredProducts, isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productService.getFeatured(),
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-neutral-900 via-primary-950 to-neutral-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
                <Sparkles className="w-4 h-4 text-accent-400" />
                <span className="text-sm font-medium text-white/90">
                  Powered by Multi-Agent AI
                </span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-extrabold leading-tight mb-6">
                AI-Powered{' '}
                <span className="text-gradient bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                  Shopping Assistant
                </span>
              </h1>
              <p className="text-lg text-neutral-300 max-w-lg mb-8 leading-relaxed">
                Experience the future of online shopping. Chat with our AI
                assistant to find products, track orders, and get personalized
                recommendations instantly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/chat"
                  className="btn-primary inline-flex items-center justify-center gap-2 text-base py-3.5 px-8"
                >
                  <MessageSquare className="w-5 h-5" />
                  Start Chatting
                </Link>
                <Link
                  to="/products"
                  className="btn-secondary inline-flex items-center justify-center gap-2 text-base py-3.5 px-8 bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Browse Products
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="relative">
                {/* Mock chat window */}
                <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md ml-auto">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-neutral-100">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-800">
                        AI Assistant
                      </p>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="text-xs text-neutral-500">Online</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="chat-bubble-assistant text-neutral-800 text-sm">
                      <p>
                        Hello! I am your AI shopping assistant. How can I help you
                        today?
                      </p>
                    </div>
                    <div className="chat-bubble-user ml-auto text-sm">
                      <p>I am looking for wireless headphones under $100</p>
                    </div>
                    <div className="chat-bubble-assistant text-neutral-800 text-sm">
                      <p>
                        I found 12 wireless headphones under $100. Here are the
                        top picks based on ratings and reviews...
                      </p>
                    </div>
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-primary-500/20 rounded-2xl blur-xl" />
                <div className="absolute -top-4 -right-4 w-32 h-32 bg-accent-500/20 rounded-full blur-xl" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <p className="text-3xl font-extrabold text-neutral-900">
                  {stat.value}
                </p>
                <p className="text-sm text-neutral-500 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-neutral-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-neutral-900 mb-3">
              Why Choose AI E-Commerce?
            </h2>
            <p className="text-neutral-500 max-w-2xl mx-auto">
              Our platform combines the power of multiple AI agents with a
              seamless shopping experience.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="card p-6"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-semibold text-neutral-800 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-extrabold text-neutral-900 mb-2">
                Featured Products
              </h2>
              <p className="text-neutral-500">
                Handpicked by our AI for you
              </p>
            </div>
            <Link
              to="/products"
              className="hidden sm:flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <ProductGrid
            products={featuredProducts || []}
            isLoading={isLoading}
          />
          <div className="mt-8 text-center sm:hidden">
            <Link
              to="/products"
              className="btn-primary inline-flex items-center gap-2"
            >
              View All Products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Chat CTA Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-4">
              Chat with Our AI Assistant
            </h2>
            <p className="text-primary-100 max-w-2xl mx-auto mb-8 text-lg">
              Get instant help with product recommendations, order tracking,
              returns, and more. Our AI assistant is available 24/7.
            </p>
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold py-3.5 px-8 rounded-xl hover:bg-primary-50 transition-all shadow-lg hover:shadow-xl"
            >
              <MessageSquare className="w-5 h-5" />
              Start a Conversation
            </Link>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-neutral-900 mb-3">
              How It Works
            </h2>
            <p className="text-neutral-500">
              Getting started is easy - just three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-extrabold text-primary-600">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-neutral-800 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed max-w-xs mx-auto">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-neutral-50 py-12 border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 text-neutral-400">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Secure Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              <span className="text-sm font-medium">Free Shipping</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              <span className="text-sm font-medium">4.9 Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm font-medium">24/7 AI Support</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
