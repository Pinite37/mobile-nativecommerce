import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import SubscriptionService, { Plan } from '../../services/api/SubscriptionService';

interface SubscriptionWelcomeModalProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
}

export const SubscriptionWelcomeModal: React.FC<SubscriptionWelcomeModalProps> = ({
  visible,
  onClose,
  userName,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trialPlan, setTrialPlan] = useState<Plan | null>(null);

  // Charger les plans et trouver le plan TRIAL
  useEffect(() => {
    if (visible) {
      loadTrialPlan();
    }
  }, [visible]);

  const loadTrialPlan = async () => {
    try {
      setLoadingPlans(true);
      console.log('🔄 Chargement du plan TRIAL depuis le backend...');
      
      // Récupérer les plans backend bruts pour avoir accès au champ duration
      const backendPlans = await SubscriptionService.getBackendEnterprisePlans();
      
      // Trouver le plan avec duration === "TRIAL"
      const backendTrialPlan = backendPlans.find(plan => plan.duration === 'TRIAL');
      
      if (backendTrialPlan) {
        console.log('✅ Plan TRIAL trouvé depuis backend:', backendTrialPlan);
        
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
        console.warn('⚠️ Aucun plan TRIAL trouvé dans le backend, fallback vers plans mappés');
        
        // Fallback: chercher dans les plans mappés
        const plans = await SubscriptionService.getEnterprisePlans();
        const trial = plans.find(plan => 
          plan.key.toUpperCase() === 'TRIAL' || 
          plan.key.toUpperCase() === 'AKWABA' ||
          plan.price === 'Gratuit'
        );
        
        if (trial) {
          setTrialPlan(trial);
          console.log('✅ Plan TRIAL trouvé depuis plans mappés:', trial);
        } else {
          // Dernière option: valeurs par défaut
          console.warn('⚠️ Utilisation des valeurs par défaut');
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
    try {
      setLoading(true);
      setError(null);
      console.log('🎉 Activation du plan d\'essai gratuit');

      await SubscriptionService.activateTrialPlan();

      console.log('✅ Plan d\'essai activé avec succès');
      onClose();
      
      // Rediriger vers le tableau de bord entreprise
      router.replace('/(app)/(enterprise)/(tabs)/' as any);
    } catch (err: any) {
      console.error('❌ Erreur activation plan d\'essai:', err);
      setError(err.message || 'Erreur lors de l\'activation du plan d\'essai');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPlans = () => {
    onClose();
    router.push('/(app)/(enterprise)/subscriptions' as any);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView className="flex-1 bg-white">
        {/* Header avec gradient */}
        <LinearGradient
          colors={['#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="px-6 pt-8 pb-12"
        >
          <View className="items-center">
            <View className="bg-white/20 rounded-full mt-6 p-4 mb-4">
              <Ionicons name="rocket" size={48} color="#FFFFFF" />
            </View>
            <Text className="text-3xl font-quicksand-bold text-white text-center mb-2">
              Bienvenue{userName ? ` ${userName}` : ''} ! 🎉
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

              {error && (
                <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <Text className="text-red-600 font-quicksand-medium text-sm text-center">
                    {error}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleStartTrial}
                disabled={loading}
                className={`bg-primary-500 rounded-2xl py-4 flex-row items-center justify-center ${
                  loading ? 'opacity-70' : ''
                }`}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="ml-2 text-white font-quicksand-bold text-base">
                      Activation en cours...
                    </Text>
                  </>
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
      </SafeAreaView>
    </Modal>
  );
};
