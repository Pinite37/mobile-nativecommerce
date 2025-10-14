import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import socketService from '../services/socket/SocketService';
import TokenStorageService from '../services/TokenStorageService';
import { useAuth } from './AuthContext';

interface SocketContextType {
  isConnected: boolean;
  connectionStatus: {
    connected: boolean;
    socketId?: string;
    userId: string | null;
    currentConversation: string | null;
    reconnectAttempts: number;
  };
  error: string | null;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  connectionStatus: {
    connected: false,
    userId: null,
    currentConversation: null,
    reconnectAttempts: 0,
  },
  error: null,
});

export const useSocketContext = () => useContext(SocketContext);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState(socketService.getConnectionStatus());

  useEffect(() => {
    if (!isAuthenticated || !user?._id) {
      console.log('⚠️ Utilisateur non authentifié, pas de connexion Socket.IO');
      return;
    }

    console.log('🚀 Initialisation Socket.IO depuis SocketProvider');

    let mounted = true;

    // Fonction pour tenter la connexion avec vérification du token
    const attemptConnection = async () => {
      try {
        // Vérifier que le token est bien disponible avec plusieurs tentatives
        let token = null;
        let attempts = 0;
        const maxAttempts = 5;

        while (!token && attempts < maxAttempts && mounted) {
          token = await TokenStorageService.getAccessToken();
          if (!token) {
            console.log(`⏳ Token pas encore disponible (tentative ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
          }
        }

        if (!token) {
          console.error('❌ Token toujours manquant après plusieurs tentatives');
          setError('Token d\'authentification manquant');
          return;
        }

        if (!mounted) return;

        console.log('✅ Token trouvé, connexion Socket.IO...');

        await socketService.connect(user._id);
        
        if (mounted) {
          setIsConnected(true);
          setError(null);
          setConnectionStatus(socketService.getConnectionStatus());
        }
      } catch (err: any) {
        console.error('❌ Erreur connexion Socket.IO:', err);
        if (mounted) {
          setError(err.message || 'Erreur de connexion');
          setIsConnected(false);
          setConnectionStatus(socketService.getConnectionStatus());
        }
      }
    };

    attemptConnection();

    // Écouter les événements de connexion
    const handleConnect = () => {
      console.log('✅ Socket.IO connecté (SocketProvider)');
      setIsConnected(true);
      setError(null);
      setConnectionStatus(socketService.getConnectionStatus());
    };

    const handleDisconnect = (data: any) => {
      console.log('❌ Socket.IO déconnecté (SocketProvider):', data.reason);
      setIsConnected(false);
      setConnectionStatus(socketService.getConnectionStatus());
    };

    const handleConnectError = (data: any) => {
      console.error('❌ Erreur connexion Socket.IO (SocketProvider):', data.classified?.message);
      setError(data.classified?.message || 'Erreur de connexion');
      setIsConnected(false);
      setConnectionStatus(socketService.getConnectionStatus());
    };

    const handleError = (data: any) => {
      console.error('❌ Erreur Socket.IO (SocketProvider):', data);
      setError(data.classified?.message || 'Une erreur est survenue');
    };

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('connect_error', handleConnectError);
    socketService.on('error', handleError);

    // Gestion des changements d'état de l'app (foreground/background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 AppState changé:', nextAppState);

      if (nextAppState === 'active' && !socketService.getConnectionStatus().connected && user?._id) {
        console.log('🔄 App revenue au foreground, vérification connexion Socket.IO');
        // Vérifier et reconnecter si nécessaire
        socketService.connect(user._id).catch((error) => {
          console.error('❌ Erreur reconnexion Socket.IO au foreground:', error);
        });
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      mounted = false;
      console.log('🧹 Cleanup SocketProvider');
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('connect_error', handleConnectError);
      socketService.off('error', handleError);
      appStateSubscription.remove();
    };
  }, [user?._id, isAuthenticated]);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        connectionStatus,
        error,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
