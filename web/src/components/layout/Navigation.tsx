"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Package,
  Thermometer,
  UserCheck,
  Settings,
  LogOut,
  Activity,
  RadioTower,
  Smartphone,
} from "lucide-react";

const Navigation = () => {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  const getRoleBasedNavItems = () => {
    const commonItems = [
      { href: "/iot-test", label: "IoT Monitor", icon: RadioTower },
    ];

    switch (user.role) {
      case "manufacturer":
        return [
          { href: "/manufacturer", label: "Dashboard", icon: Package },
          { href: "/manufacturer/batches", label: "My Batches", icon: Package },
          ...commonItems,
        ];
      case "supplier":
        return [
          { href: "/supplier", label: "Dashboard", icon: Thermometer },
          ...commonItems,
        ];
      case "pharmacist":
        return [
          { href: "/pharmacist", label: "Dashboard", icon: UserCheck },
          {
            href: "/pharmacist/verification",
            label: "Batch Verification",
            icon: Shield,
          },
          ...commonItems,
        ];
      case "admin":
        return [
          { href: "/admin", label: "Dashboard", icon: Settings },
          { href: "/admin/batches", label: "All Batches", icon: Package },
          { href: "/admin/users", label: "User Management", icon: UserCheck },
          { href: "/admin/system", label: "System Status", icon: Activity },
          { href: "/admin/mobile", label: "Mobile Preview", icon: Smartphone },
          { href: "/blockchain-demo", label: "Blockchain Demo", icon: Shield },
          ...commonItems,
        ];
      default:
        return commonItems;
    }
  };

  const navItems = getRoleBasedNavItems();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                PharmaTrust
              </span>
            </Link>

            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent transition-colors"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="inline-flex items-center"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-l-4 border-transparent hover:border-gray-300"
              >
                <div className="flex items-center">
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
