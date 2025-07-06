import React, { createContext, useContext, useEffect, useState } from 'react';
import ApiService from '../services/api/ApiService';
import TokenStorageService from '../services/TokenStorageService';
import { User } from '../types/auth';
import { NavigationHelper } from '../utils/NavigationHelper';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  userRole: string | null;
  isLoading: boolean;
  checkAuthStatus: () => Promise<void>;
  logout: () => Promise<void>;
  redirectToRoleBasedHome: (role?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is logged in
      const isLoggedIn = await TokenStorageService.isLoggedIn();
      
      if (isLoggedIn) {
        // Get user role
        const role = await ApiService.getUserRole();
        const userData = await TokenStorageService.getUserData();
        
        if (role && userData) {
          setIsAuthenticated(true);
          setUser(userData);
          setUserRole(role);
        } else {
          // Clear invalid session
          await TokenStorageService.clearAll();
          setIsAuthenticated(false);
          setUser(null);
          setUserRole(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await TokenStorageService.clearAll();
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
      NavigationHelper.navigateToAuth();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const redirectToRoleBasedHome = (role?: string) => {
    const targetRole = role || userRole;
    
    if (!targetRole) {
      console.warn('No role found, redirecting to auth');
      NavigationHelper.navigateToAuth();
      return;
    }

    try {
      NavigationHelper.navigateToRoleHome(targetRole);
    } catch (error) {
      console.error('Error redirecting to role-based home:', error);
      NavigationHelper.navigateToAuth();
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    user,
    userRole,
    isLoading,
    checkAuthStatus,
    logout,
    redirectToRoleBasedHome,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
