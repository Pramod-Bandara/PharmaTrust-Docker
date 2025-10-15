'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/forms/LoginForm';

export default function Home() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect to appropriate dashboard based on user role
      switch (user.role) {
        case 'manufacturer':
          router.push('/manufacturer');
          break;
        case 'supplier':
          router.push('/supplier');
          break;
        case 'pharmacist':
          router.push('/pharmacist');
          break;
        case 'admin':
          router.push('/admin');
          break;
        default:
          router.push('/manufacturer'); // Default fallback
      }
    }
  }, [isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <LoginForm />;
}
