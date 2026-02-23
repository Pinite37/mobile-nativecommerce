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
      console.log('⚡ Démarrage de vérification auth...');

      // Précharger toutes les données en cache avant de les utiliser
      await PreCacheService.preloadCriticalData();

      // Utiliser une seule méthode optimisée pour éviter les appels multiples
      const [tokens, storedUserData, storedRole] = await Promise.all([
        TokenStorageService.getTokens(),
        TokenStorageService.getUserData(),
        TokenStorageService.getUserRole()
      ]);

      StartupPerformanceMonitor.mark('AuthContext - Données en cache récupérées');
      console.log('⚡ Données récupérées du cache');

      // *** NETTOYAGE AUTOMATIQUE DES TOKENS MOCK ***
      if (tokens.accessToken && tokens.accessToken.includes('mock-access-token')) {
        console.log('🧹 Détection de tokens mock - nettoyage automatique');
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
        console.log('⚡ Démarrage rapide avec données en cache terminé');

        // Puis vérifier et rafraîchir en arrière-plan (sans bloquer)
        // Délai réduit pour un démarrage encore plus rapide
        setTimeout(() => {
          refreshUserDataInBackground(storedRole);
        }, 10); // Réduit de 100ms à 10ms

        // Vérifier les permissions de notifications après la connexion
        console.log('⏰ Planification vérification permissions dans 2 secondes...');
        setTimeout(() => {
          console.log('⏰ Exécution de checkNotificationPermissions maintenant...');
          checkNotificationPermissions();
        }, 2000); // Délai de 2 secondes pour laisser l'UI se charger complètement

      } else {
        // Pas de session valide complète
        console.log('❌ Session incomplète, nettoyage...');
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
      console.log('� ========================================');
      console.log('🔔 DÉBUT VÉRIFICATION PERMISSIONS NOTIFICATIONS');
      console.log('🔔 ========================================');

      const shouldShow = await NotificationPermissionService.shouldShowPermissionModal();

      console.log('🔔 Résultat shouldShowPermissionModal:', shouldShow);

      if (shouldShow) {
        console.log('✅ AFFICHAGE DU MODAL DE PERMISSIONS');
        setShowNotificationModal(true);
      } else {
        console.log('❌ Modal de permissions NON nécessaire');
      }

      console.log('🔔 ========================================');
      console.log('🔔 FIN VÉRIFICATION PERMISSIONS NOTIFICATIONS');
      console.log('🔔 ========================================');
    } catch (error) {
      console.error('❌ Erreur vérification permissions notifications:', error);
    }
  };

  // Fonction pour charger les données fraîches en arrière-plan
  const refreshUserDataInBackground = async (role: string) => {
    try {
      console.log('🔄 Rafraîchissement des données utilisateur en arrière-plan...');
      let userData: User | null = null;

      if (role === 'CLIENT') {
        userData = await CustomerService.getProfile();
      } else if (role === 'ENTERPRISE') {
        // Utiliser l'endpoint entreprise (évite l'erreur 400 'Accès réservé aux clients')
        const tokens = await TokenStorageService.getTokens();
        if (tokens.accessToken) {
          try {
            const enterpriseProfile = await EnterpriseService.getProfile();
            userData = enterpriseProfile.user; // Conserver seulement la partie user ici
          } catch (e) {
            console.warn('⚠️ Impossible de récupérer le profil entreprise en arrière-plan:', (e as any)?.message);
          }
        }
      }

      if (userData) {
        // Mettre à jour silencieusement les données
        setUser(userData);
        await TokenStorageService.setUserData(userData);
        console.log('✅ Données utilisateur rafraîchies');
      }
    } catch (error) {
      console.warn('⚠️ Erreur lors du rafraîchissement des données (ignorée):', error);
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
          } catch (e) {
            console.warn('⚠️ Échec chargement profil entreprise (loadFreshUserData):', (e as any)?.message);
            // Ne pas throw, on garde les données en cache
          }
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
          console.log('⚠️ Pas de nouvelles données, mais session en cache valide - conservation');
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
    } catch (apiError: any) {
      console.warn('⚠️ Erreur API lors du chargement des données:', apiError?.message);

      // NE PAS DÉCONNECTER en cas d'erreur réseau !
      // Vérifier si on a des données en cache
      const tokens = await TokenStorageService.getTokens();
      const cachedUser = await TokenStorageService.getUserData();

      if (tokens.accessToken && tokens.refreshToken && cachedUser) {
        console.log('✅ Erreur API mais session en cache valide - conservation de la session');
        setIsAuthenticated(true);
        setUser(cachedUser);
        setUserRole(role);
      } else {
        console.error('❌ Erreur API et aucune session en cache - Déconnexion');
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
      console.warn('No role found, redirecting to public marketplace');
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
    if (!userRole) {
      console.warn('No user role found, cannot refresh user data');
      return;
    }

    try {
      console.log('🔄 Forcing user data refresh...');
      await loadFreshUserData(userRole);
    } catch (error) {
      console.error('Error forcing user data refresh:', error);
    }
  };

  // Nouvelle méthode pour gérer l'état après inscription réussie
  const handlePostRegistration = async (userData: User, role: string) => {
    try {
      console.log('🎯 Traitement post-inscription pour:', userData.email);

      // Double vérification que les données sont bien stockées
      const tokens = await TokenStorageService.getTokens();
      const storedRole = await TokenStorageService.getUserRole();
      const storedUser = await TokenStorageService.getUserData();

      if (!tokens.accessToken || !storedRole || !storedUser) {
        console.warn('⚠️ Données manquantes après inscription, attente et nouvelle vérification...');

        // Attendre un peu et vérifier à nouveau
        await new Promise(resolve => setTimeout(resolve, 500));

        const retryTokens = await TokenStorageService.getTokens();
        const retryRole = await TokenStorageService.getUserRole();
        const retryUser = await TokenStorageService.getUserData();

        if (!retryTokens.accessToken || !retryRole || !retryUser) {
          console.error('❌ Données toujours manquantes après nouvelle tentative');
          // Forcer une re-vérification complète
          await checkAuthStatus();
          return;
        }
      }

      // Mettre à jour immédiatement l'état de l'authentification
      setIsAuthenticated(true);
      setUser(userData);
      setUserRole(role);
      setIsLoading(false);

      console.log('✅ État post-inscription mis à jour avec succès');
      console.log('🔍 État final - Authentifié:', true);
      console.log('🔍 État final - Utilisateur:', userData.email);
      console.log('🔍 État final - Rôle:', role);

      // Optionnel : charger des données fraîches en arrière-plan après un délai
      setTimeout(() => {
        refreshUserDataInBackground(role);
      }, 1000);

      // Vérifier les permissions de notifications après l'inscription
      setTimeout(() => {
        checkNotificationPermissions();
      }, 2000); // Délai de 2 secondes pour laisser l'utilisateur voir l'écran d'accueil d'abord

    } catch (error) {
      console.error('❌ Erreur lors du traitement post-inscription:', error);
      // En cas d'erreur, forcer une re-vérification complète
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
      console.log('🔔 Tokens invalidés détectés - déconnexion automatique');
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
        onPermissionGranted={() => {
          console.log('✅ Permissions de notifications accordées');
          setShowNotificationModal(false);
        }}
      />
    </AuthContext.Provider>
  );
};
