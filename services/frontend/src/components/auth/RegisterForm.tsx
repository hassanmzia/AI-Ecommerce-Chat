import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Loader2 } from 'lucide-react';

interface RegisterFormProps {
  onSubmit: (data: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  isLoading: boolean;
  error?: string;
}

export default function RegisterForm({
  onSubmit,
  isLoading,
  error,
}: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password =
        'Password must include uppercase, lowercase, and a number';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ name: name.trim(), email: email.trim(), password });
  };

  const clearError = (field: string) => {
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Full Name
        </label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError('name');
            }}
            placeholder="John Doe"
            className="input-field pl-10"
            autoComplete="name"
          />
        </div>
        {formErrors.name && (
          <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="reg-email"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError('email');
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
        <label
          htmlFor="reg-password"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError('password');
            }}
            placeholder="Create a strong password"
            className="input-field pl-10 pr-10"
            autoComplete="new-password"
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

      {/* Confirm Password */}
      <div>
        <label
          htmlFor="confirm-password"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              clearError('confirmPassword');
            }}
            placeholder="Confirm your password"
            className="input-field pl-10"
            autoComplete="new-password"
          />
        </div>
        {formErrors.confirmPassword && (
          <p className="text-xs text-red-500 mt-1">
            {formErrors.confirmPassword}
          </p>
        )}
      </div>

      {/* Terms */}
      <p className="text-xs text-neutral-500">
        By creating an account, you agree to our{' '}
        <a href="#" className="text-primary-600 hover:underline">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="#" className="text-primary-600 hover:underline">
          Privacy Policy
        </a>
        .
      </p>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full btn-primary flex items-center justify-center gap-2 py-3"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </button>

      {/* Login link */}
      <p className="text-center text-sm text-neutral-600">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
