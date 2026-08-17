import React, { createContext, useContext, useEffect, useState } from 'react';
import { NotificationPermissionModal } from '../components/NotificationPermissionModal';
import CustomerService from '../services/api/CustomerService';
import EnterpriseService from '../services/api/EnterpriseService';
import NotificationPermissionService from '../services/NotificationPermissionService';
import PreCacheService from '../services/PreCacheService';
import TokenStorageService from '../services/TokenStorageService';
import { User } from '../types/auth';
import AuthEventEmitter from '../utils/AuthEventEmitter';
import { NavigationHelper } from '../utils/NavigationHelper';
import StartupPerformanceMonitor from '../utils/StartupPerformanceMonitor';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  userRole: string | null;
  isLoading: boolean;
  checkAuthStatus: () => Promise<void>;
  refreshUserData: () => Promise<void>; // Nouvelle méthode pour forcer le rafraîchissement
  logout: () => Promise<void>;
  redirectToRoleBasedHome: (role?: string) => void;
  handlePostRegistration: (userData: User, role: string) => Promise<void>; // Nouvelle méthode
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
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const checkAuthStatus = async () => {
    try {
      // DÉMARRAGE ULTRA-RAPIDE : Précharger les données puis les utiliser
      StartupPerformanceMonitor.mark('AuthContext - Début vérification');

      // Précharger toutes les données en cache avant de les utiliser
      await PreCacheService.preloadCriticalData();

      // Utiliser une seule méthode optimisée pour éviter les appels multiples
      const [tokens, storedUserData, storedRole] = await Promise.all([
        TokenStorageService.getTokens(),
        TokenStorageService.getUserData(),
        TokenStorageService.getUserRole()
      ]);

      StartupPerformanceMonitor.mark('AuthContext - Données en cache récupérées');

      // *** NETTOYAGE AUTOMATIQUE DES TOKENS MOCK ***
      if (tokens.accessToken && tokens.accessToken.includes('mock-access-token')) {
        await TokenStorageService.clearAll();
        setIsAuthenticated(false);
        setUser(null);
        setUserRole(null);
        setIsLoading(false);
        StartupPerformanceMonitor.mark('AuthContext - Nettoyage tokens mock terminé');
        return;
      }

      // Vérification rapide : si on a des tokens, des données utilisateur et un rôle
      if (tokens.accessToken && storedUserData && storedRole) {
        // Charger immédiatement avec les données disponibles
        setIsAuthenticated(true);
        setUser(storedUserData);
        setUserRole(storedRole);
        setIsLoading(false); // Stopper le loading immédiatement

        StartupPerformanceMonitor.mark('AuthContext - Session restaurée (cache)');

        setTimeout(() => { refreshUserDataInBackground(storedRole); }, 10);
        setTimeout(() => { checkNotificationPermissions(); }, 2000);

      } else {
        await TokenStorageService.clearAll();
        setIsAuthenticated(false);
        setUser(null);
        setUserRole(null);
        setIsLoading(false);
        StartupPerformanceMonitor.mark('AuthContext - Session nettoyée');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
      setIsLoading(false);
      StartupPerformanceMonitor.mark('AuthContext - Erreur de vérification');
    }
  };

  // Fonction pour vérifier les permissions de notifications
  const checkNotificationPermissions = async () => {
    try {
      const shouldShow = await NotificationPermissionService.shouldShowPermissionModal();
      if (shouldShow) setShowNotificationModal(true);
    } catch (error) {
      console.error('Erreur vérification permissions notifications:', error);
    }
  };

  // Fonction pour charger les données fraîches en arrière-plan
  const refreshUserDataInBackground = async (role: string) => {
    try {
      let userData: User | null = null;

      if (role === 'CLIENT') {
        userData = await CustomerService.getProfile();
      } else if (role === 'ENTERPRISE') {
        const tokens = await TokenStorageService.getTokens();
        if (tokens.accessToken) {
          try {
            const enterpriseProfile = await EnterpriseService.getProfile();
            userData = enterpriseProfile.user;
          } catch { /* profil entreprise indisponible, on garde le cache */ }
        }
      }

      if (userData) {
        setUser(userData);
        await TokenStorageService.setUserData(userData);
      }
    } catch {
      // Ne pas affecter l'état de l'app si le rafraîchissement échoue
    }
  };

  // Fonction pour charger les données fraîches (bloquante)
  const loadFreshUserData = async (role: string) => {
    try {
      let userData: User | null = null;

      if (role === 'CLIENT') {
        userData = await CustomerService.getProfile();
      } else if (role === 'ENTERPRISE') {
        const tokens = await TokenStorageService.getTokens();
        if (tokens.accessToken) {
          try {
            const enterpriseProfile = await EnterpriseService.getProfile();
            userData = enterpriseProfile.user;
          } catch { /* garde les données en cache */ }
        }
      }

      if (userData) {
        setIsAuthenticated(true);
        setUser(userData);
        setUserRole(role);
        await TokenStorageService.setUserData(userData);
      } else {
        // Si on n'a pas de données utilisateur MAIS qu'on a des tokens valides
        // On garde la session active (les données sont peut-être déjà en cache)
        const tokens = await TokenStorageService.getTokens();
        const cachedUser = await TokenStorageService.getUserData();

        if (tokens.accessToken && tokens.refreshToken && cachedUser) {
          setIsAuthenticated(true);
          setUser(cachedUser);
          setUserRole(role);
        } else {
          console.error('❌ Aucune donnée utilisateur disponible - Session invalide');
          await TokenStorageService.clearAll();
          setIsAuthenticated(false);
          setUser(null);
          setUserRole(null);
        }
      }
    } catch {
      const tokens = await TokenStorageService.getTokens();
      const cachedUser = await TokenStorageService.getUserData();

      if (tokens.accessToken && tokens.refreshToken && cachedUser) {
        setIsAuthenticated(true);
        setUser(cachedUser);
        setUserRole(role);
      } else {
        await TokenStorageService.clearAll();
        setIsAuthenticated(false);
        setUser(null);
        setUserRole(null);
      }
    }
  };

  const logout = async () => {
    try {
      await TokenStorageService.clearAll();
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
      NavigationHelper.navigateToPublicMarketplace();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const redirectToRoleBasedHome = (role?: string) => {
    const targetRole = role || userRole;

    if (!targetRole) {
      NavigationHelper.navigateToPublicMarketplace();
      return;
    }

    try {
      NavigationHelper.navigateToRoleHome(targetRole);
    } catch (error) {
      console.error('Error redirecting to role-based home:', error);
      NavigationHelper.navigateToPublicMarketplace();
    }
  };

  // Nouvelle méthode pour forcer le rafraîchissement des données
  const refreshUserData = async () => {
    if (!userRole) return;

    try {
      await loadFreshUserData(userRole);
    } catch (error) {
      console.error('Error forcing user data refresh:', error);
    }
  };

  // Nouvelle méthode pour gérer l'état après inscription réussie
  const handlePostRegistration = async (userData: User, role: string) => {
    try {
      const tokens = await TokenStorageService.getTokens();
      const storedRole = await TokenStorageService.getUserRole();
      const storedUser = await TokenStorageService.getUserData();

      if (!tokens.accessToken || !storedRole || !storedUser) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const retryTokens = await TokenStorageService.getTokens();
        const retryRole = await TokenStorageService.getUserRole();
        const retryUser = await TokenStorageService.getUserData();

        if (!retryTokens.accessToken || !retryRole || !retryUser) {
          await checkAuthStatus();
          return;
        }
      }

      setIsAuthenticated(true);
      setUser(userData);
      setUserRole(role);
      setIsLoading(false);

      setTimeout(() => { refreshUserDataInBackground(role); }, 1000);
      setTimeout(() => { checkNotificationPermissions(); }, 2000);

    } catch (error) {
      console.error('Erreur lors du traitement post-inscription:', error);
      await checkAuthStatus();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      await checkAuthStatus();
    };
    initAuth();

    // Écouter les événements de tokens invalidés
    const handleTokenInvalidated = async () => {
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
      setIsLoading(false);

      // Rediriger vers le marketplace public
      setTimeout(() => {
        NavigationHelper.navigateToPublicMarketplace();
      }, 100);
    };

    AuthEventEmitter.onTokenInvalidated(handleTokenInvalidated);

    // Nettoyer les listeners à la destruction du composant
    return () => {
      AuthEventEmitter.removeAllAuthListeners();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value: AuthContextType = {
    isAuthenticated,
    user,
    userRole,
    isLoading,
    checkAuthStatus,
    refreshUserData, // Ajout de la nouvelle méthode ici
    logout,
    redirectToRoleBasedHome,
    handlePostRegistration, // Ajout de la nouvelle méthode ici
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <NotificationPermissionModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onPermissionGranted={() => setShowNotificationModal(false)}
      />
    </AuthContext.Provider>
  );
};
