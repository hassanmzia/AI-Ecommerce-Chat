import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error?: string;
}

export default function LoginForm({
  onSubmit,
  isLoading,
  error,
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (formErrors.email) {
                setFormErrors((prev) => ({ ...prev, email: '' }));
              }
            }}
            placeholder="you@example.com"
            className="input-field pl-10"
            autoComplete="email"
          />
        </div>
        {formErrors.email && (
          <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-neutral-700"
          >
            Password
          </label>
          <a
            href="#"
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Forgot password?
          </a>
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (formErrors.password) {
                setFormErrors((prev) => ({ ...prev, password: '' }));
              }
            }}
            placeholder="Enter your password"
            className="input-field pl-10 pr-10"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {formErrors.password && (
          <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full btn-primary flex items-center justify-center gap-2 py-3"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </button>

      {/* Register link */}
      <p className="text-center text-sm text-neutral-600">
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
