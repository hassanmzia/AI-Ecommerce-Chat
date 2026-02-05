import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import RegisterForm from '@/components/auth/RegisterForm';
import authService from '@/services/authService';
import useAuthStore from '@/store/authStore';

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleRegister = async (data: {
    name: string;
    email: string;
    password: string;
  }) => {
    try {
      setIsLoading(true);
      setError('');
      const response = await authService.register({
        name: data.name,
        email: data.email,
        password: data.password,
        confirmPassword: data.password,
      });
      login(response.user, response.accessToken, response.refreshToken);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message ||
          'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-neutral-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Create an Account
          </h1>
          <p className="text-neutral-500 mt-1">
            Join AI E-Commerce and start shopping smarter
          </p>
        </div>

        {/* Form Card */}
        <div className="card p-8">
          <RegisterForm
            onSubmit={handleRegister}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
