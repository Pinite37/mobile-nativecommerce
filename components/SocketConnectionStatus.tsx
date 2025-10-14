import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSocketContext } from '../contexts/SocketContext';
import { useSocket } from '../hooks/useSocket';

export const SocketConnectionStatus: React.FC = () => {
  const { isConnected, connectionStatus, error } = useSocketContext();
  const { reconnect } = useSocket();

  const handleReconnect = async () => {
    try {
      await reconnect();
    } catch (error) {
      console.error('Erreur reconnexion:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.status, { color: isConnected ? 'green' : 'red' }]}>
        🔌 Socket.IO: {isConnected ? 'Connecté' : 'Déconnecté'}
      </Text>

      {connectionStatus.socketId && (
        <Text style={styles.socketId}>
          ID: {connectionStatus.socketId.substring(0, 8)}...
        </Text>
      )}

      {error && (
        <Text style={styles.error}>
          ❌ Erreur: {error}
        </Text>
      )}

      {!isConnected && (
        <TouchableOpacity style={styles.reconnectButton} onPress={handleReconnect}>
          <Text style={styles.reconnectText}>Reconnecter</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.attempts}>
        Tentatives: {connectionStatus.reconnectAttempts}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 10,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  socketId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  error: {
    fontSize: 12,
    color: 'red',
    marginTop: 5,
  },
  reconnectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  reconnectText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  attempts: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
});