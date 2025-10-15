'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, Mail } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const { login, register, loginWithGoogle, isLoading, authMode } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const isFirebaseMode = authMode === 'firebase';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    const authFunction = isRegistering ? register : login;
    const result = await authFunction(formData);
    
    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || `${isRegistering ? 'Registration' : 'Login'} failed`);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isFirebaseMode) return;
    
    setError('');
    const result = await loginWithGoogle();
    
    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'Google sign-in failed');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Demo credentials helper
  const demoCredentials = [
    { username: 'mfg1', password: 'demo123', role: 'Manufacturer', description: 'Manufacturing Dashboard' },
    { username: 'sup1', password: 'demo123', role: 'Supplier', description: 'Supply Chain Dashboard' },
    { username: 'phm1', password: 'demo123', role: 'Pharmacist', description: 'Pharmacy Dashboard' },
    { username: 'admin', password: 'admin123', role: 'Admin', description: 'Admin Dashboard' },
  ];

  const fillDemoCredentials = (username: string, password: string) => {
    setFormData({ username, password });
  };

  const quickLogin = async (username: string, password: string) => {
    setError('');
    const result = await login({ username, password });
    
    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            PharmaTrust Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Pharmaceutical Supply Chain Management
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {isFirebaseMode 
                ? (isRegistering ? 'Create Account' : 'Sign in to your account')
                : 'Demo Login'
              }
            </CardTitle>
            <CardDescription>
              {isFirebaseMode 
                ? (isRegistering 
                    ? 'Create a new account to access the dashboard'
                    : 'Enter your credentials to access the dashboard'
                  )
                : 'Demo mode active - use demo credentials below'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  {isFirebaseMode ? 'Email' : 'Username'}
                </label>
                <Input
                  id="username"
                  name="username"
                  type={isFirebaseMode ? 'email' : 'text'}
                  required
                  value={formData.username}
                  onChange={handleChange}
                  placeholder={isFirebaseMode ? 'Enter your email' : 'Enter your username'}
                  className="mt-1"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isRegistering ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  isRegistering ? 'Create Account' : 'Sign in'
                )}
              </Button>

              {/* Firebase Google Sign-in */}
              {isFirebaseMode && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    Sign in with Google
                  </Button>

                  {/* Toggle between login and register */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError('');
                      }}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {isRegistering 
                        ? 'Already have an account? Sign in' 
                        : "Don't have an account? Create one"
                      }
                    </button>
                  </div>
                </>
              )}
            </form>

            {/* Demo credentials - only show in demo mode */}
            {!isFirebaseMode && (
              <div className="mt-6 border-t pt-6">
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-sm font-medium text-blue-800 mb-2">
                    🚀 Demo Mode Active - Quick Access
                  </p>
                  <p className="text-xs text-blue-600 mb-3">
                    Click any button below to instantly access different dashboards
                  </p>
                </div>
              
              <div className="space-y-2">
                {demoCredentials.map((cred) => (
                  <div key={cred.username} className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fillDemoCredentials(cred.username, cred.password)}
                      className="flex-1 text-xs justify-start"
                    >
                      Fill: {cred.role}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => quickLogin(cred.username, cred.password)}
                      disabled={isLoading}
                      aria-label={`Login as ${cred.role}`}
                      className="h-9 w-9 rounded-full p-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700"
                      title={`Login as ${cred.role}`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        // Simple login icon to indicate action
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 text-white"
                        >
                          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                          <polyline points="10 17 15 12 10 7" />
                          <line x1="15" y1="12" x2="3" y2="12" />
                        </svg>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
              
                <div className="mt-4 text-xs text-gray-500">
                  <p><strong>Manufacturer:</strong> Create and track medicine batches</p>
                  <p><strong>Supplier:</strong> Manage distribution and logistics</p>
                  <p><strong>Pharmacist:</strong> Verify and dispense medicines</p>
                  <p><strong>Admin:</strong> System administration and oversight</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;
