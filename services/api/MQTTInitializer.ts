import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import mqttClient from './MQTTClient';

export const useMQTTInitializer = () => {
  const { user } = useAuth();

  useEffect(() => {
    const initializeMQTT = async () => {
      try {
        console.log('🚀 Initialisation MQTT au démarrage de l\'app');

        if (user?._id) {
          console.log('👤 Connexion MQTT avec utilisateur:', user._id);
          await mqttClient.connect(user._id);
          mqttClient.setCurrentUserId(user._id);
        } else {
          console.log('⚠️ Aucun utilisateur connecté, connexion MQTT anonyme');
          await mqttClient.connect();
        }

        console.log('✅ MQTT initialisé avec succès');
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation MQTT:', error);
      }
    };

    initializeMQTT();

    // Cleanup lors du démontage
    return () => {
      console.log('🧹 Cleanup MQTT initializer');
      mqttClient.disconnect();
    };
  }, [user?._id]);
};

// Fonction pour initialiser MQTT sans hook (pour utilisation dans App.tsx)
export const initializeMQTT = async (userId?: string) => {
  try {
    console.log('🚀 Initialisation manuelle MQTT');

    if (userId) {
      console.log('👤 Connexion MQTT avec utilisateur:', userId);
      await mqttClient.connect(userId);
      mqttClient.setCurrentUserId(userId);
    } else {
      console.log('⚠️ Connexion MQTT anonyme');
      await mqttClient.connect();
    }

    console.log('✅ MQTT initialisé manuellement avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation manuelle MQTT:', error);
  }
};

// Fonction pour déconnecter MQTT
export const disconnectMQTT = () => {
  console.log('🔌 Déconnexion MQTT');
  mqttClient.disconnect();
};

export default mqttClient;
