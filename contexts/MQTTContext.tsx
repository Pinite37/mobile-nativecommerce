import React, { createContext, useContext, useEffect, useState } from 'react';
import mqttClient from '../services/api/MQTTClient';
import { useAuth } from './AuthContext';
// Watcher supprimé: connexion seulement après authentification

interface MQTTContextType {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

const MQTTContext = createContext<MQTTContextType | undefined>(undefined);

export const useMQTTContext = () => {
  const context = useContext(MQTTContext);
  if (context === undefined) {
    throw new Error('useMQTTContext must be used within a MQTTProvider');
  }
  return context;
};

interface MQTTProviderProps {
  children: React.ReactNode;
}

export const MQTTProvider: React.FC<MQTTProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
  let retryInterval: ReturnType<typeof setInterval> | null = null;

    // Si pas d'utilisateur => ne pas tenter de connexion
    if (!user?._id) {
      setIsConnected(false);
      setIsConnecting(false);
      return () => { isMounted = false; };
    }

    const connectForUser = async () => {
      try {
        if (isMounted) {
          setIsConnecting(true);
          setError(null);
        }
        console.log('� Initialisation MQTT après authentification');
        await mqttClient.connect(user._id);
        mqttClient.setCurrentUserId(user._id);
        if (isMounted) {
          setIsConnected(true);
          setIsConnecting(false);
        }
        console.log('✅ MQTT connecté (utilisateur)');
      } catch (err) {
        console.error('❌ Erreur connexion MQTT (user):', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erreur MQTT');
          setIsConnecting(false);
        }
      }
    };

    connectForUser();

    // Écouter les changements d'état de connexion
    const handleConnected = () => {
      if (isMounted) {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      }
    };

    const handleDisconnected = () => {
      if (isMounted) {
        setIsConnected(false);
        setIsConnecting(false);
      }
    };

    const handleError = (err: any) => {
      if (isMounted) {
        setError(err?.message || 'Erreur MQTT');
        setIsConnecting(false);
      }
    };

    // S'abonner aux événements MQTT
    mqttClient.on('connected', handleConnected);
    mqttClient.on('disconnected', handleDisconnected);
    mqttClient.on('error', handleError);

    // Cleanup
    return () => {
      isMounted = false;
      if (retryInterval) clearInterval(retryInterval);
      mqttClient.off('connected', handleConnected);
      mqttClient.off('disconnected', handleDisconnected);
      mqttClient.off('error', handleError);
      mqttClient.disconnect();
    };
  }, [user?._id]);

  // Reconnexion périodique simple si utilisateur présent mais pas connecté
  useEffect(() => {
    if (!user?._id) return;
    if (isConnected) return; // déjà connecté
    const id = setInterval(() => {
      if (!isConnected && !isConnecting) {
        console.log('🔁 MQTTContext: tentative reconnect périodique');
        (mqttClient as any).ensureConnected?.();
      }
    }, 5000);
    return () => clearInterval(id);
  }, [user?._id, isConnected, isConnecting]);

  const value: MQTTContextType = {
    isConnected,
    isConnecting,
    error,
  };

  return (
    <MQTTContext.Provider value={value}>
      {children}
    </MQTTContext.Provider>
  );
};
