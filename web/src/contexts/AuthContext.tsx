'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { apiClient, LoginRequest } from '@/lib/api-client';
import { User } from '@/types';
import { getFirebaseAuth, googleAuthProvider } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; error?: string }>;
  register: (credentials: LoginRequest) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  authMode: 'firebase' | 'demo';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authInitialized = useRef(false);

  const authMode = useMemo<'firebase' | 'demo'>(() => {
    const modeFromEnv = process.env.NEXT_PUBLIC_AUTH_MODE as 'firebase' | 'demo' | undefined;
    if (modeFromEnv === 'firebase' || modeFromEnv === 'demo') {
      return modeFromEnv;
    }
    return process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'firebase' : 'demo';
  }, []);

  const isFirebaseAuth = authMode === 'firebase';

  const coerceUserToTyped = (maybeUser: any): User => {
    const allowedRoles = ['manufacturer', 'supplier', 'pharmacist', 'admin'] as const;
    const role = allowedRoles.includes(maybeUser?.role) ? (maybeUser.role as User['role']) : 'manufacturer';
    return {
      _id: String(maybeUser?._id || ''),
      username: String(maybeUser?.username || maybeUser?.email || ''),
      role,
      entityName: String(maybeUser?.entityName || '')
    };
  };

  const syncBackendSessionWithFirebaseUser = async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      await apiClient.logout();
      setUser(null);
      return;
    }

    try {
      const idToken = await firebaseUser.getIdToken();
      const providerId = firebaseUser.providerData[0]?.providerId ?? 'password';
      const provider: 'email' | 'google' = providerId === 'google.com' ? 'google' : 'email';

      const response = await apiClient.loginWithFirebaseIdToken({
        idToken,
        provider,
      });

      if (response.success && response.data?.user) {
        setUser(coerceUserToTyped(response.data.user));
        return;
      }

      // If backend sync fails, ensure token is cleared
      await apiClient.logout();
      setUser(null);
    } catch (error) {
      console.error('Failed to synchronize Firebase session:', error);
      await apiClient.logout();
      setUser(null);
    }
  };

  const checkAuth = async () => {
    if (isFirebaseAuth) {
      if (authInitialized.current) return;
      authInitialized.current = true;
      try {
        const auth = await getFirebaseAuth();
        onAuthStateChanged(auth, async (firebaseUser) => {
          await syncBackendSessionWithFirebaseUser(firebaseUser);
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Failed to initialize Firebase auth listener:', error);
        setIsLoading(false);
      }
      return;
    }

    try {
      const token = apiClient.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await apiClient.verifyToken();
      if (response.success && response.data?.user) {
        setUser(coerceUserToTyped(response.data.user));
      } else {
        apiClient.logout();
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to check authentication:', error);
      apiClient.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    
    if (isFirebaseAuth) {
      try {
        const auth = await getFirebaseAuth();
        const email = credentials.username;
        const result = await signInWithEmailAndPassword(auth, email, credentials.password);
        await syncBackendSessionWithFirebaseUser(result.user);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    }

    try {
      const response = await apiClient.login(credentials);
      if (response.success && response.data?.user) {
        setUser(coerceUserToTyped(response.data.user));
        return { success: true };
      }
      return { success: false, error: response.error || 'Login failed' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: LoginRequest) => {
    if (!isFirebaseAuth) {
      return { success: false, error: 'Registration is only available with Firebase authentication.' };
    }

    setIsLoading(true);
    try {
      const auth = await getFirebaseAuth();
      const email = credentials.username;
      const result = await createUserWithEmailAndPassword(auth, email, credentials.password);
      await syncBackendSessionWithFirebaseUser(result.user);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    if (!isFirebaseAuth) {
      return { success: false, error: 'Google login is only available with Firebase authentication.' };
    }

    setIsLoading(true);
    try {
      const auth = await getFirebaseAuth();
      const credential = await signInWithPopup(auth, googleAuthProvider);
      await syncBackendSessionWithFirebaseUser(credential.user);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (isFirebaseAuth) {
      getFirebaseAuth()
        .then(auth => signOut(auth))
        .catch(error => console.error('Firebase logout failed:', error))
        .finally(() => {
          apiClient.logout();
          setUser(null);
        });
      return;
    }

    apiClient.logout();
    setUser(null);
  };

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirebaseAuth]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    loginWithGoogle,
    logout,
    checkAuth,
    authMode,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Authentication Required
            </h1>
            <p className="text-gray-600">
              Please log in to access this page.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Role-based access control hook
export function useRoleCheck(allowedRoles: string[]) {
  const { user, isAuthenticated } = useAuth();
  
  const hasAccess = isAuthenticated && user && allowedRoles.includes(user.role);
  
  return {
    hasAccess,
    userRole: user?.role,
    isAuthenticated,
  };
}
