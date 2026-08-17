import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '../../contexts/SubscriptionContext';
import SubscriptionService, { Plan } from '../../services/api/SubscriptionService';
import { useToast as useReanimatedToast } from '../ui/ReanimatedToast/context';
import { ToastProvider } from '../ui/ReanimatedToast/toast-provider';

interface SubscriptionWelcomeModalProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
}

// Composant interne qui utilise les hooks de contexte
const ModalContent: React.FC<SubscriptionWelcomeModalProps> = ({
  visible,
  onClose,
  userName,
}) => {
  const { showToast } = useReanimatedToast();
  const { activateTrialPlan: activateTrialFromContext, loadSubscription } = useSubscription();
  const insets = useSafeAreaInsets();
  const isIosBillingRestricted = Platform.OS === 'ios';
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [trialPlan, setTrialPlan] = useState<Plan | null>(null);
  const [activationProgress, setActivationProgress] = useState<string>('');

  // Charger les plans et trouver le plan TRIAL
  useEffect(() => {
    if (!visible) {
      return;
    }

    if (isIosBillingRestricted) {
      setLoadingPlans(false);
      return;
    }

    if (visible) {
      loadTrialPlan();
    }
  }, [visible, isIosBillingRestricted]);

  const loadTrialPlan = async () => {
    try {
      setLoadingPlans(true);
      // Récupérer les plans backend bruts pour avoir accès au champ duration
      const backendPlans = await SubscriptionService.getBackendEnterprisePlans();
      
      // Trouver le plan avec duration === "TRIAL"
      const backendTrialPlan = backendPlans.find(plan => plan.duration === 'TRIAL');
      
      if (backendTrialPlan) {
        // Mapper les features du plan backend
        const features: string[] = [];
        
        if (backendTrialPlan.price.amount === 0) {
          features.push('1 mois d\'essai gratuit');
        }
        features.push(`${backendTrialPlan.features.maxProducts} produits maximum`);
        features.push(`${backendTrialPlan.features.maxImagesPerProduct} images par produit`);
        
        if (backendTrialPlan.features.phone) features.push('Support téléphonique');
        if (backendTrialPlan.features.sms) features.push('Notifications SMS');
        if (backendTrialPlan.features.whatsapp) features.push('Intégration WhatsApp');
        if (backendTrialPlan.features.messaging) features.push('Messagerie intégrée');
        if (backendTrialPlan.features.advertisements) features.push('Gestion des publicités');
        
        features.push('Aucune carte bancaire requise');
        
        setTrialPlan({
          id: backendTrialPlan._id,
          name: backendTrialPlan.name,
          key: backendTrialPlan.name,
          price: backendTrialPlan.price.amount === 0 ? 'Gratuit' : `${backendTrialPlan.price.amount} ${backendTrialPlan.price.currency}`,
          period: backendTrialPlan.duration === 'TRIAL' ? '• 1 mois offert' : '',
          color: '#10B981',
          features,
        });
      } else {
        // Fallback: chercher dans les plans mappés
        const plans = await SubscriptionService.getEnterprisePlans();
        const trial = plans.find(plan => 
          plan.key.toUpperCase() === 'TRIAL' || 
          plan.key.toUpperCase() === 'AKWABA' ||
          plan.price === 'Gratuit'
        );
        
        if (trial) {
          setTrialPlan(trial);
        } else {
          // Dernière option: valeurs par défaut
          setTrialPlan({
            id: 'trial-default',
            name: 'Essai Gratuit',
            key: 'TRIAL',
            price: 'Gratuit',
            period: '• 1 mois offert',
            color: '#10B981',
            features: [
              '1 mois d\'essai gratuit',
              '10 produits maximum',
              '3 images par produit',
              'Messagerie avec les clients',
              'Support téléphonique',
              'Aucune carte bancaire requise',
            ],
          });
        }
      }
    } catch (err: any) {
      console.error('❌ Erreur chargement plan TRIAL:', err);
      // Utiliser des valeurs par défaut en cas d'erreur
      setTrialPlan({
        id: 'trial-default',
        name: 'Essai Gratuit',
        key: 'TRIAL',
        price: 'Gratuit',
        period: '• 1 mois offert',
        color: '#10B981',
        features: [
          '1 mois d\'essai gratuit',
          '10 produits maximum',
          '3 images par produit',
          'Messagerie avec les clients',
          'Support téléphonique',
          'Aucune carte bancaire requise',
        ],
      });
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleStartTrial = async () => {
    if (isIosBillingRestricted) {
      return;
    }

    try {
      setLoading(true);
      setActivationProgress('Préparation de votre essai...');

      // Timeout pour gérer les requêtes longues (refresh token, etc.)
      const activationPromise = activateTrialFromContext();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La requête prend trop de temps')), 30000)
      );

      setActivationProgress('Activation en cours...');
      
      // Attendre l'activation avec timeout de 30 secondes
      await Promise.race([activationPromise, timeoutPromise]);

      // Recharger le contexte d'abonnement pour mettre à jour needsSubscription
      setActivationProgress('Finalisation...');
      await loadSubscription();
      
      // Fermer le modal
      onClose();
      
      // Afficher un toast de succès après fermeture du modal
      setTimeout(() => {
        showToast({
          title: 'Bienvenue !',
          subtitle: 'Votre essai gratuit est activé',
          autodismiss: true,
        });
        
        router.push('/(app)/(enterprise)/(tabs)/' as any);
      }, 300);

    } catch (err: any) {
      console.error('❌ Erreur activation plan d\'essai:', err);
      
      // Extraire le message d'erreur du backend
      let errorMessage = 'Erreur lors de l\'activation du plan d\'essai';
      
      if (err.message && err.message.includes('Timeout')) {
        errorMessage = 'La requête prend trop de temps. Veuillez réessayer.';
      } else if (err.response && err.response.data) {
        // Extraire le message depuis la réponse du backend
        const responseData = err.response.data;
        console.error('❌ API Response Error:', err.response.status, JSON.stringify(responseData));
        
        if (responseData.message) {
          errorMessage = responseData.message;
        } else if (typeof responseData === 'string') {
          errorMessage = responseData;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Afficher un toast d'erreur avec le message du backend
      showToast({
        title: 'Erreur',
        subtitle: errorMessage,
        autodismiss: true,
      });
      
      console.error('Détails erreur activation:', {
        message: err.message,
        status: err.status,
        response: err.response,
      });
    } finally {
      setLoading(false);
      setActivationProgress('');
    }
  };

  const handleRefreshAccess = async () => {
    try {
      setLoading(true);
      await loadSubscription();
      showToast({
        title: 'Accès actualisé',
        subtitle: 'Le statut du compte a été vérifié.',
        autodismiss: true,
      });
      onClose();
    } catch (err: any) {
      showToast({
        title: 'Erreur',
        subtitle: err?.message || 'Impossible de vérifier votre accès.',
        autodismiss: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewPlans = () => {
    // Fermer le modal d'abord pour permettre la navigation
    console.log('📋 Navigation vers la page des abonnements');
    onClose();
    // Naviguer après un délai pour laisser le modal se fermer
    setTimeout(() => {
      router.push('/(app)/(enterprise)/subscriptions' as any);
    }, 300);
  };

  if (isIosBillingRestricted) {
    return (
      <View className="flex-1 bg-white">
        <LinearGradient
          colors={['#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingTop: insets.top + 32,
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
            paddingBottom: 48,
          }}
        >
          <View className="items-center">
            <View className="bg-white/20 rounded-full mt-6 p-4 mb-4">
              <Ionicons name="shield-checkmark" size={44} color="#FFFFFF" />
            </View>
            <Text className="text-3xl font-quicksand-bold text-white text-center mb-2">
              Compte entreprise
            </Text>
            <Text className="text-white/90 font-quicksand-medium text-center text-base">
              Fonctionnalité réservée aux comptes entreprise actifs.
            </Text>
          </View>
        </LinearGradient>

        <ScrollView
          className="flex-1 -mt-6 rounded-t-[32px] bg-white px-6 pt-8"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200">
            <Text className="text-neutral-800 font-quicksand-bold text-base mb-2">
              Vérification du compte
            </Text>
            <Text className="text-neutral-600 font-quicksand-medium text-sm leading-6">
              Si votre abonnement est déjà actif, appuyez sur le bouton ci-dessous pour actualiser votre accès.
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleRefreshAccess}
            disabled={loading}
            className={`bg-primary-500 rounded-2xl py-4 mt-6 flex-row items-center justify-center ${
              loading ? 'opacity-70' : ''
            }`}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text className="ml-2 text-white font-quicksand-bold text-base">
                  Actualiser mon accès
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            disabled={loading}
            className="bg-white border border-neutral-300 rounded-2xl py-4 mt-4 flex-row items-center justify-center"
            activeOpacity={0.8}
          >
            <Text className="text-neutral-700 font-quicksand-bold text-base">
              Continuer
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
            {/* Header avec gradient */}
            <LinearGradient
          colors={['#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingTop: insets.top + 32,
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
            paddingBottom: 48
          }}
        >
          <View className="items-center">
            <View className="bg-white/20 rounded-full mt-6 p-4 mb-4">
              <Ionicons name="rocket" size={48} color="#FFFFFF" />
            </View>
            <Text className="text-3xl font-quicksand-bold text-white text-center mb-2">
              Bienvenue{userName ? ` ${userName}` : ''} !
            </Text>
            <Text className="text-white/90 font-quicksand-medium text-center text-base">
              Prêt à développer votre activité ?
            </Text>
          </View>
        </LinearGradient>

        <ScrollView
          className="flex-1 -mt-6 rounded-t-[32px] bg-white px-6 pt-8"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {loadingPlans ? (
            // Loader pendant le chargement du plan
            <View className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-3xl p-6 mb-6 border-2 border-primary-500">
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#10B981" />
                <Text className="text-neutral-600 font-quicksand-medium mt-4">
                  Chargement des informations...
                </Text>
              </View>
            </View>
          ) : (
            /* Essai gratuit avec les données du backend */
            <View className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-3xl p-6 mb-6 border-2 border-primary-500">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <View className="bg-primary-500 rounded-full px-3 py-1">
                      <Text className="text-white font-quicksand-bold text-xs">
                        RECOMMANDÉ
                      </Text>
                    </View>
                  </View>
                  <Text className="text-2xl font-quicksand-bold text-neutral-800 mb-1">
                    {trialPlan?.name || 'Essai Gratuit'}
                  </Text>
                  <Text className="text-lg font-quicksand-semibold text-primary-600">
                    {trialPlan?.price || 'Gratuit'} {trialPlan?.period ? `• ${trialPlan.period}` : '• 1 mois offert'}
                  </Text>
                </View>
                <Ionicons name="gift" size={40} color="#10B981" />
              </View>

              <View className="mb-4">
                <Text className="text-neutral-700 font-quicksand-medium mb-3">
                  Découvrez toutes les fonctionnalités sans engagement :
                </Text>
                {(trialPlan?.features || []).map((feature, index) => (
                  <View key={index} className="flex-row items-start mb-2">
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#10B981"
                      style={{ marginTop: 2 }}
                    />
                    <Text className="ml-2 text-neutral-700 font-quicksand-medium flex-1">
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleStartTrial}
                disabled={loading}
                className={`bg-primary-500 rounded-2xl py-4 flex-row items-center justify-center ${
                  loading ? 'opacity-70' : ''
                }`}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View className="flex-col items-center">
                    <View className="flex-row items-center mb-2">
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text className="ml-2 text-white font-quicksand-bold text-base">
                        Activation en cours...
                      </Text>
                    </View>
                    {activationProgress && (
                      <Text className="text-white/80 font-quicksand-medium text-xs">
                        {activationProgress}
                      </Text>
                    )}
                  </View>
                ) : (
                  <>
                    <Ionicons name="rocket" size={20} color="#FFFFFF" />
                    <Text className="ml-2 text-white font-quicksand-bold text-base">
                      Commencer l&apos;essai gratuit
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text className="text-neutral-500 font-quicksand-medium text-xs text-center mt-3">
                Aucun paiement requis • Annulez à tout moment
              </Text>

              {loading && (
                <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-3">
                  <View className="flex-row items-center">
                    <Ionicons name="information-circle" size={16} color="#3B82F6" />
                    <Text className="ml-2 text-blue-600 font-quicksand-medium text-xs flex-1">
                      L&apos;activation peut prendre quelques secondes. Merci de patienter...
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Divider */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-neutral-200" />
            <Text className="mx-4 text-neutral-500 font-quicksand-medium text-sm">
              OU
            </Text>
            <View className="flex-1 h-px bg-neutral-200" />
          </View>

          {/* Voir tous les plans */}
          <TouchableOpacity
            onPress={handleViewPlans}
            disabled={loading}
            className="bg-white border-2 border-primary-500 rounded-2xl py-4 flex-row items-center justify-center"
          >
            <Ionicons name="list" size={20} color="#10B981" />
            <Text className="ml-2 text-primary-500 font-quicksand-bold text-base">
              Voir tous les plans
            </Text>
          </TouchableOpacity>

          <Text className="text-neutral-500 font-quicksand-medium text-xs text-center mt-4">
            Choisissez le plan qui correspond le mieux à vos besoins
          </Text>

          {/* Info supplémentaire */}
          <View className="bg-neutral-50 rounded-2xl p-4 mt-6">
            <View className="flex-row items-start">
              <Ionicons
                name="information-circle"
                size={20}
                color="#10B981"
                style={{ marginTop: 2 }}
              />
              <Text className="ml-3 text-neutral-600 font-quicksand-medium text-sm flex-1">
                Vous pourrez changer de plan à tout moment depuis vos paramètres.
                Profitez de l&apos;essai gratuit pour tester la plateforme sans risque !
              </Text>
            </View>
          </View>
        </ScrollView>
          </View>
  );
};

// Composant principal qui enveloppe ModalContent avec les providers
export const SubscriptionWelcomeModal: React.FC<SubscriptionWelcomeModalProps> = ({
  visible,
  onClose,
  userName,
}) => {
  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ToastProvider>
        <ModalContent visible={visible} onClose={onClose} userName={userName} />
      </ToastProvider>
    </Modal>
  );
};
