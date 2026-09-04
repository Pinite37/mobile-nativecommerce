import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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

  // sessionId : incrémenté à chaque login/logout pour invalider les callbacks asynchrones
  // d'une session précédente (refreshUserDataInBackground, etc.)
  const sessionIdRef = useRef(0);

  const checkAuthStatus = async () => {
    try {
      StartupPerformanceMonitor.mark('AuthContext - Début vérification');

      // Migration et préchargement sont des à-côtés, pas la source de vérité
      // sur la session. Avant, une exception ici (l'une ou l'autre) tombait
      // dans le catch global tout en bas, qui force `isAuthenticated: false`
      // — un livreur avec des tokens parfaitement valides en stockage se
      // retrouvait déconnecté à cause d'un souci de préchargement sans
      // aucun rapport avec son authentification. Isolées ici, leurs erreurs
      // ne peuvent plus atteindre la décision d'authentification.
      try {
        // Migration depuis les anciennes clés séparées (une seule fois)
        await TokenStorageService.migrateFromLegacy();
      } catch (e) {
        console.warn('⚠️ AuthContext - Migration ignorée après échec:', (e as any)?.message);
      }
      try {
        await PreCacheService.preloadCriticalData();
      } catch (e) {
        console.warn('⚠️ AuthContext - Préchargement ignoré après échec:', (e as any)?.message);
      }

      const [tokens, storedUserData, storedRole, storedUserId] = await Promise.all([
        TokenStorageService.getTokens(),
        TokenStorageService.getUserData(),
        TokenStorageService.getUserRole(),
        TokenStorageService.getUserId(),
      ]);

      StartupPerformanceMonitor.mark('AuthContext - Données en cache récupérées');

      if (tokens.accessToken && tokens.accessToken.includes('mock-access-token')) {
        await TokenStorageService.clearAll();
        setIsAuthenticated(false);
        setUser(null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      if (tokens.accessToken && storedUserData && storedRole) {
        // Nouveau sessionId pour cette session — invalide tout refresh background antérieur
        const sid = ++sessionIdRef.current;

        setIsAuthenticated(true);
        setUser(storedUserData);
        setUserRole(storedRole);
        setIsLoading(false);

        StartupPerformanceMonitor.mark('AuthContext - Session restaurée (cache)');

        setTimeout(() => { refreshUserDataInBackground(storedRole, storedUserId, sid); }, 10);
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
  // sid = sessionId capturé au moment du lancement — si la session a changé entretemps, on abandonne
  const refreshUserDataInBackground = async (role: string, expectedUserId: string | null, sid: number) => {
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
          } catch { /* garde le cache si le profil est indisponible */ }
        }
      }

      // Gardes de sécurité : abandonner si la session a changé pendant l'appel
      if (sid !== sessionIdRef.current) return;
      if (!userData) return;

      // Vérifier que les données retournées appartiennent bien à la session en cours
      const fetchedId = userData._id ?? (userData as any).id ?? '';
      if (expectedUserId && fetchedId && String(fetchedId) !== String(expectedUserId)) {
        console.error('[Auth] ❌ Mismatch userId dans refreshBackground — session ignorée');
        return;
      }

      // Vérifier que le rôle n'a pas changé (ne devrait jamais changer côté API)
      if (userData.role && userData.role !== role) {
        console.error('[Auth] ❌ Mismatch role dans refreshBackground — session ignorée');
        return;
      }

      setUser(userData);
      await TokenStorageService.setUserData(userData);
    } catch {
      // Silencieux — ne pas affecter l'état de l'app
    }
  };

  const logout = async () => {
    // Invalider tout refresh background en cours avant de vider la session
    sessionIdRef.current++;
    try {
      await TokenStorageService.clearAll();
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
      NavigationHelper.navigateToPublicMarketplace();
    } catch (error) {
      console.error('Error during logout:', error);
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
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

  // Forcer le rafraîchissement des données (bloquant, ex: après modification de profil)
  const refreshUserData = async () => {
    if (!userRole || !user) return;
    const sid = sessionIdRef.current;
    const userId = user._id ?? (user as any).id ?? null;
    await refreshUserDataInBackground(userRole, userId, sid);
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

      const sid = ++sessionIdRef.current;
      setIsAuthenticated(true);
      setUser(userData);
      setUserRole(role);
      setIsLoading(false);

      const userId = userData._id ?? (userData as any).id ?? null;
      setTimeout(() => { refreshUserDataInBackground(role, userId, sid); }, 1000);
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
      {showNotificationModal && (
        <NotificationPermissionModal
          visible={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          onPermissionGranted={() => setShowNotificationModal(false)}
        />
      )}
    </AuthContext.Provider>
  );
};
