'use client';

import React, { ReactNode } from 'react';
import Navigation from './Navigation';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const DashboardLayout = ({ children, title, subtitle }: DashboardLayoutProps) => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {(title || subtitle) && (
          <div className="px-4 py-6 sm:px-0">
            <div className="border-b border-gray-200 pb-4">
              {title && (
                <h1 className="text-3xl font-bold leading-tight text-gray-900">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-2 text-sm text-gray-600">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}
        
        <div className="px-4 sm:px-0">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
