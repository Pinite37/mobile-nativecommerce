import React from 'react';
import { Text, View } from 'react-native';
import { useMQTTContext } from '../contexts/MQTTContext';

interface MQTTStatusIndicatorProps {
  showDetails?: boolean;
}

export const MQTTStatusIndicator: React.FC<MQTTStatusIndicatorProps> = ({
  showDetails = false
}) => {
  const { isConnected, isConnecting, error } = useMQTTContext();

  if (!showDetails) {
    // Indicateur simple (juste un point coloré)
    return (
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: isConnected ? '#4CAF50' : isConnecting ? '#FF9800' : '#F44336',
          marginLeft: 8,
        }}
      />
    );
  }

  // Indicateur détaillé
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: isConnected ? '#4CAF50' : isConnecting ? '#FF9800' : '#F44336',
          marginRight: 8,
        }}
      />
      <Text style={{ fontSize: 12, color: '#666' }}>
        {isConnecting ? 'Connexion...' :
         isConnected ? 'MQTT connecté' :
         error ? 'Erreur MQTT' : 'MQTT déconnecté'}
      </Text>
    </View>
  );
};

export default MQTTStatusIndicator;
