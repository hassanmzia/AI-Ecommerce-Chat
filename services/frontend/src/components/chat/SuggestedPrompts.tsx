import {
  Package,
  Search,
  CreditCard,
  UserCircle,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

const prompts = [
  {
    icon: Package,
    label: 'Track my order',
    prompt: 'Can you help me track my latest order?',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Search,
    label: 'Search for products',
    prompt: 'I am looking for product recommendations. Can you help me find something?',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: CreditCard,
    label: 'View payment info',
    prompt: 'Can you show me my payment information and recent transactions?',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: UserCircle,
    label: 'Customer account info',
    prompt: 'Can you help me with my account details?',
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: Sparkles,
    label: 'Product recommendations',
    prompt: 'Can you recommend some popular products based on current trends?',
    color: 'from-pink-500 to-pink-600',
  },
  {
    icon: HelpCircle,
    label: 'Return policy',
    prompt: 'What is your return and refund policy?',
    color: 'from-cyan-500 to-cyan-600',
  },
];

export default function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 max-w-3xl mx-auto">
      {prompts.map((item) => (
        <button
          key={item.label}
          onClick={() => onSelect(item.prompt)}
          className="group flex items-start gap-3 p-4 bg-white border border-neutral-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all duration-200 text-left"
        >
          <div
            className={`flex-shrink-0 w-10 h-10 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}
          >
            <item.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-800 group-hover:text-primary-700 transition-colors">
              {item.label}
            </h4>
            <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
              {item.prompt}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
