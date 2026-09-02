import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import notificationPermissionService from '../services/NotificationPermissionService';
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
  const insets = useSafeAreaInsets();

  // États pour les modals internes
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: ''
  });
  const [permissionDeniedModal, setPermissionDeniedModal] = useState(false);

  // Responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
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
          setErrorModal({
            visible: true,
            message: 'Une erreur s\'est produite lors de la configuration des notifications. Vous pouvez réessayer plus tard.'
          });
        }
      } else {
        // Permission refusée
        console.log('❌ Permissions refusées par l\'utilisateur');
        setPermissionDeniedModal(true);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la demande de permission:', error);
      setErrorModal({
        visible: true,
        message: 'Une erreur s\'est produite. Veuillez réessayer.'
      });
    }
  };

  const handleSkip = () => {
    console.log('⏭️ Utilisateur passe les notifications');
    notificationPermissionService.markPermissionAsked();
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
        paddingHorizontal: 20,
        paddingTop: Math.max(insets.top, 20),
        paddingBottom: Math.max(insets.bottom, 20),
      }}>
        <View style={{
          backgroundColor: 'white',
          borderRadius: 20,
          width: '100%',
          maxWidth: isTablet ? 480 : 400,
          maxHeight: screenHeight * 0.85,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: isTablet ? 32 : isSmallScreen ? 20 : 24,
            }}
          >
            {/* Icône de notification */}
            <View style={{
              alignItems: 'center',
              marginBottom: 24,
            }}>
              <View style={{
                width: isSmallScreen ? 64 : 80,
                height: isSmallScreen ? 64 : 80,
                borderRadius: isSmallScreen ? 32 : 40,
                backgroundColor: '#A7F3D0',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <Ionicons name="notifications" size={isSmallScreen ? 32 : 48} color="#10B981" />
              </View>

              {/* Titre */}
              <Text style={{
                fontSize: isTablet ? 24 : isSmallScreen ? 18 : 20,
                fontFamily: 'PlusJakartaSans-SemiBold',
                color: '#333',
                textAlign: 'center',
                marginBottom: 8,
              }}>
                Restez informé !
              </Text>

              {/* Description */}
              <Text style={{
                fontSize: isTablet ? 16 : isSmallScreen ? 13 : 14,
                fontFamily: 'PlusJakartaSans-Regular',
                color: '#666',
                textAlign: 'center',
                lineHeight: isSmallScreen ? 18 : 20,
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
                  fontFamily: 'PlusJakartaSans-Regular',
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
                  fontFamily: 'PlusJakartaSans-Regular',
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
                  fontFamily: 'PlusJakartaSans-Regular',
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
              flexDirection: isSmallScreen ? 'column' : 'row',
              gap: 12,
              marginTop: 8,
            }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#F2F2F7',
                  borderRadius: 12,
                  paddingVertical: isSmallScreen ? 12 : 14,
                  paddingHorizontal: isSmallScreen ? 16 : 20,
                  flex: isSmallScreen ? undefined : 1,
                  width: isSmallScreen ? '100%' : undefined,
                  alignItems: 'center',
                }}
                onPress={handleSkip}
                disabled={isLoading}
              >
                <Text style={{
                  color: '#10B981',
                  fontSize: isSmallScreen ? 14 : 16,
                  fontFamily: 'PlusJakartaSans-SemiBold',
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
                  flex: isSmallScreen ? undefined : 1,
                  width: isSmallScreen ? '100%' : undefined,
                  alignItems: 'center',
                  opacity: isLoading ? 0.6 : 1,
                }}
                onPress={handleRequestPermission}
                disabled={isLoading}
              >
                <Text style={{
                  color: 'white',
                  fontSize: isSmallScreen ? 14 : 16,
                  fontFamily: 'PlusJakartaSans-SemiBold',
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
                fontFamily: 'PlusJakartaSans-Regular',
                textAlign: 'center',
                marginTop: 8,
              }}>
                {error}
              </Text>
            )}

            {/* Note de confidentialité */}
            <Text style={{
              fontSize: isSmallScreen ? 11 : 12,
              fontFamily: 'PlusJakartaSans-Regular',
              color: '#999',
              textAlign: 'center',
              lineHeight: isSmallScreen ? 14 : 16,
              marginTop: 16,
            }}>
              Nous respectons votre vie privée. Vous pouvez désactiver les notifications à tout moment dans les paramètres.
            </Text>
          </ScrollView>
        </View>
      </View>

      {/* Modal d'erreur */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModal({ visible: false, message: '' })}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            alignItems: 'center',
          }}>
            {/* Icône d'erreur */}
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#FEE2E2',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="alert-circle" size={32} color="#EF4444" />
            </View>

            {/* Titre */}
            <Text style={{
              fontSize: 20,
              fontFamily: 'PlusJakartaSans-Bold',
              color: '#333',
              marginBottom: 8,
              textAlign: 'center',
            }}>
              Erreur
            </Text>

            {/* Message */}
            <Text style={{
              fontSize: 14,
              fontFamily: 'PlusJakartaSans-Regular',
              color: '#666',
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 20,
            }}>
              {errorModal.message}
            </Text>

            {/* Bouton OK */}
            <TouchableOpacity
              onPress={() => setErrorModal({ visible: false, message: '' })}
              style={{
                backgroundColor: '#EF4444',
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
                width: '100%',
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontFamily: 'PlusJakartaSans-SemiBold',
              }}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal permission refusée */}
      <Modal
        visible={permissionDeniedModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPermissionDeniedModal(false);
          onClose();
        }}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            alignItems: 'center',
          }}>
            {/* Icône d'info */}
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#DBEAFE',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="information-circle" size={32} color="#3B82F6" />
            </View>

            {/* Titre */}
            <Text style={{
              fontSize: 20,
              fontFamily: 'PlusJakartaSans-Bold',
              color: '#333',
              marginBottom: 8,
              textAlign: 'center',
            }}>
              Permission refusée
            </Text>

            {/* Message */}
            <Text style={{
              fontSize: 14,
              fontFamily: 'PlusJakartaSans-Regular',
              color: '#666',
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 20,
            }}>
              Vous pouvez activer les notifications plus tard dans les paramètres de votre appareil.
            </Text>

            {/* Boutons */}
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              {/* Bouton Plus tard */}
              <TouchableOpacity
                onPress={() => {
                  setPermissionDeniedModal(false);
                  onClose();
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#F3F4F6',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >
                <Text style={{
                  color: '#666',
                  fontSize: 16,
                  fontFamily: 'PlusJakartaSans-SemiBold',
                }}>
                  Plus tard
                </Text>
              </TouchableOpacity>

              {/* Bouton Paramètres */}
              <TouchableOpacity
                onPress={() => {
                  setPermissionDeniedModal(false);
                  onClose();
                  Linking.openSettings();
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#10B981',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >
                <Text style={{
                  color: 'white',
                  fontSize: 16,
                  fontFamily: 'PlusJakartaSans-SemiBold',
                }}>
                  Paramètres
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};
