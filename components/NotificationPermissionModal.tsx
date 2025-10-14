import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Dimensions, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  visible,
  onClose,
  onPermissionGranted,
}) => {
  const { requestPermissions, setupNotifications, isLoading, error } = useNotifications();

  // Responsive design
  const { width: screenWidth } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 380;
  const isTablet = screenWidth >= 768;

  const handleRequestPermission = async () => {
    try {
      console.log('🔔 Utilisateur demande les permissions de notifications...');
      
      // Demander d'abord les permissions système
      const permissionGranted = await requestPermissions();

      if (permissionGranted) {
        console.log('✅ Permissions accordées, configuration en cours...');
        
        // Si accordées, configurer complètement les notifications
        const result = await setupNotifications();

        if (result.success) {
          console.log('✅ Configuration réussie, token:', result.token);
          onPermissionGranted?.();
          onClose();
        } else {
          console.error('❌ Échec configuration:', result.message);
          Alert.alert(
            'Erreur',
            'Une erreur s\'est produite lors de la configuration des notifications. Vous pouvez réessayer plus tard.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Permission refusée
        console.log('❌ Permissions refusées par l\'utilisateur');
        Alert.alert(
          'Permission refusée',
          'Vous pouvez activer les notifications plus tard dans les paramètres de votre appareil.',
          [
            { text: 'Plus tard', style: 'cancel', onPress: () => onClose() },
            {
              text: 'Paramètres',
              onPress: () => {
                // Ici on pourrait ouvrir les paramètres de l'app
                // Mais pour l'instant on ferme juste le modal
                onClose();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Erreur lors de la demande de permission:', error);
      Alert.alert(
        'Erreur',
        'Une erreur s\'est produite. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSkip = () => {
    console.log('⏭️ Utilisateur passe les notifications');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <View style={{
          backgroundColor: 'white',
          borderRadius: 20,
          padding: isTablet ? 32 : 24,
          width: '90%',
          maxWidth: 400,
          maxHeight: '80%',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}>
          {/* Icône de notification */}
          <View style={{
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#A7F3D0',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="notifications" size={isSmallScreen ? 40 : 48} color="#10B981" />
            </View>

            {/* Titre */}
            <Text style={{
              fontSize: isTablet ? 24 : 20,
              fontFamily: 'Quicksand-SemiBold',
              color: '#333',
              textAlign: 'center',
              marginBottom: 8,
            }}>
              Restez informé !
            </Text>

            {/* Description */}
            <Text style={{
              fontSize: isTablet ? 16 : 14,
              fontFamily: 'Quicksand-Regular',
              color: '#666',
              textAlign: 'center',
              lineHeight: 20,
            }}>
              Activez les notifications pour recevoir des mises à jour importantes sur vos commandes, messages et offres spéciales.
            </Text>
          </View>

          {/* Avantages */}
          <View style={{ marginBottom: 32 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
              paddingHorizontal: 8,
            }}>
              <Ionicons name="checkmark-circle" size={isSmallScreen ? 18 : 20} color="#10B981" />
              <Text style={{
                fontSize: isTablet ? 16 : 14,
                fontFamily: 'Quicksand-Regular',
                color: '#333',
                flex: 1,
                lineHeight: 20,
                marginLeft: 12,
              }} numberOfLines={2}>
                Suivi de vos commandes en temps réel
              </Text>
            </View>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
              paddingHorizontal: 8,
            }}>
              <Ionicons name="checkmark-circle" size={isSmallScreen ? 18 : 20} color="#10B981" />
              <Text style={{
                fontSize: isTablet ? 16 : 14,
                fontFamily: 'Quicksand-Regular',
                color: '#333',
                flex: 1,
                lineHeight: 20,
                marginLeft: 12,
              }} numberOfLines={2}>
                Messages des vendeurs et livreurs
              </Text>
            </View>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
              paddingHorizontal: 8,
            }}>
              <Ionicons name="checkmark-circle" size={isSmallScreen ? 18 : 20} color="#10B981" />
              <Text style={{
                fontSize: isTablet ? 16 : 14,
                fontFamily: 'Quicksand-Regular',
                color: '#333',
                flex: 1,
                lineHeight: 20,
                marginLeft: 12,
              }} numberOfLines={0}>
                Offres exclusives et promotions
              </Text>
            </View>
          </View>

          {/* Boutons */}
          <View style={{
            flexDirection: 'row',
            gap: 12,
            marginTop: 8,
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#F2F2F7',
                borderRadius: 12,
                paddingVertical: isSmallScreen ? 12 : 14,
                paddingHorizontal: isSmallScreen ? 16 : 20,
                flex: 1,
                alignItems: 'center',
              }}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text style={{
                color: '#10B981',
                fontSize: isSmallScreen ? 14 : 16,
                fontFamily: 'Quicksand-SemiBold',
              }}>
                Plus tard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#10B981',
                borderRadius: 12,
                paddingVertical: isSmallScreen ? 12 : 14,
                paddingHorizontal: isSmallScreen ? 16 : 20,
                flex: 1,
                alignItems: 'center',
                opacity: isLoading ? 0.6 : 1,
              }}
              onPress={handleRequestPermission}
              disabled={isLoading}
            >
              <Text style={{
                color: 'white',
                fontSize: isSmallScreen ? 14 : 16,
                fontFamily: 'Quicksand-SemiBold',
              }} numberOfLines={1}>
                {isLoading ? 'Configuration...' : 'Activer'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Message d'erreur si nécessaire */}
          {error && (
            <Text style={{
              color: '#FF3B30',
              fontSize: 14,
              fontFamily: 'Quicksand-Regular',
              textAlign: 'center',
              marginTop: 8,
            }}>
              {error}
            </Text>
          )}

          {/* Note de confidentialité */}
          <Text style={{
            fontSize: 12,
            fontFamily: 'Quicksand-Regular',
            color: '#999',
            textAlign: 'center',
            lineHeight: 16,
            marginTop: 16,
          }}>
            Nous respectons votre vie privée. Vous pouvez désactiver les notifications à tout moment dans les paramètres.
          </Text>
        </View>
      </View>
    </Modal>
  );
};
