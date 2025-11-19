import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KkiapayPayment from '../../../../components/subscription/KkiapayPayment';
import StatusModal from '../../../../components/subscription/StatusModal';
import UpgradeConfirmationModal from '../../../../components/subscription/UpgradeConfirmationModal';
import { useAuth } from '../../../../contexts/AuthContext';
import { useSubscription } from '../../../../contexts/SubscriptionContext';
import PaymentService from '../../../../services/api/PaymentService';
import SubscriptionService, { Plan } from '../../../../services/api/SubscriptionService';

function EnterpriseSubscriptionsContent() {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscription, loadSubscription } = useSubscription();
  const { user } = useAuth();
  
  // Modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  
  // Status modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [statusTitle, setStatusTitle] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Payment state
  const [currentIntentId, setCurrentIntentId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showKkiapayWidget, setShowKkiapayWidget] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{
    amount: number;
    email: string;
    phone: string;
    name: string;
    reason: string;
  } | null>(null);

  // Animation pour les points de chargement
  const pulseAnim = useState(new Animated.Value(0))[0];

  // Démarrer l'animation quand le modal de traitement est affiché
  useEffect(() => {
    if (processingPayment) {
      const startPulseAnimation = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 0,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      startPulseAnimation();
    } else {
      pulseAnim.setValue(0);
    }
  }, [processingPayment, pulseAnim]);

  // Callback KKiaPay success
  const handlePaymentSuccess = async (data: any) => {
    console.log('✅ KKiaPay SUCCESS:', data);
    setShowKkiapayWidget(false);
    setProcessingPayment(true);
    
    try {
      // Confirmer le paiement avec le backend
      if (currentIntentId && data.transactionId) {
        const confirmResult = await PaymentService.confirmPayment({
          intentId: currentIntentId,
          transactionId: data.transactionId,
        });

        console.log('✅ Paiement confirmé par le backend:', confirmResult);

        // Recharger la souscription
        await loadSubscription();
        await loadData();

        // Réinitialiser les états
        setCurrentIntentId(null);
        setShowUpgradeModal(false);
        setSelectedPlan(null);
        setPaymentConfig(null);

        // Afficher le succès
        setStatusType('success');
        setStatusTitle('Paiement réussi !');
        setStatusMessage(
          `Votre abonnement ${confirmResult.data.subscription ? 'a été activé' : 'est maintenant actif'}. Merci !`
        );
        setShowStatusModal(true);
      } else {
        throw new Error('Intention de paiement ou transaction ID manquant');
      }
    } catch (error: any) {
      console.error('❌ Erreur confirmation paiement:', error);
      setStatusType('error');
      setStatusTitle('Erreur');
      setStatusMessage(
        error.response?.data?.message || 'Impossible de confirmer le paiement. Contactez le support.'
      );
      setShowStatusModal(true);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Callback KKiaPay failed
  const handlePaymentFailed = (data: any) => {
    console.log('❌ KKiaPay FAILED:', data);
    setShowKkiapayWidget(false);
    setProcessingPayment(false);
    setCurrentIntentId(null);
    setPaymentConfig(null);
    
    setStatusType('error');
    setStatusTitle('❌ Paiement échoué');
    setStatusMessage('Le paiement a échoué. Veuillez réessayer.');
    setShowStatusModal(true);
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Chargement des plans et souscription...');
      
      // Charger les plans disponibles et la souscription active en parallèle
      await Promise.all([
        loadPlans(),
        loadSubscription()
      ]);
      
      console.log('✅ Données chargées');
    } catch (err: any) {
      console.error('❌ Erreur chargement:', err);
      setError('Impossible de charger les données. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const enterprisePlans = await SubscriptionService.getEnterprisePlans();
      setPlans(enterprisePlans);
    } catch (err: any) {
      console.error('❌ Erreur chargement plans:', err);
      throw err;
    }
  };

  // Handle plan selection
  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  // Handle upgrade confirmation
  const handleConfirmUpgrade = async () => {
    if (!selectedPlan || !user) return;

    try {
      setUpgradeLoading(true);
      console.log('🔄 Upgrade vers le plan:', selectedPlan.name);

      const isFree = selectedPlan.price === 'Gratuit';

      if (isFree) {
        // Plan gratuit - Activer le trial directement
        await SubscriptionService.activateTrialPlan();
        console.log('✅ Plan d\'essai activé');

        // Recharger les données
        await loadSubscription();
        await loadData();

        // Fermer le modal et afficher le succès
        setShowUpgradeModal(false);
        setSelectedPlan(null);
        
        setStatusType('success');
        setStatusTitle('🎉 Succès !');
        setStatusMessage(`Votre période d'essai a été activée avec succès.`);
        setShowStatusModal(true);
      } else {
        // Plan payant - Créer une intention de paiement
        const amount = parseFloat(selectedPlan.price.replace(/[^0-9]/g, ''));
        
        console.log('🔄 Création intention de paiement pour:', amount, 'FCFA');
        
        const intentResponse = await PaymentService.createPaymentIntent({
          subscriptionType: 'ENTERPRISE',
          planId: selectedPlan.id,
          metadata: {
            source: 'mobile',
            planName: selectedPlan.name,
          },
        });

        console.log('✅ Intention créée:', intentResponse.data.intentId);
        
        // Stocker l'intentId pour le callback KKiaPay
        setCurrentIntentId(intentResponse.data.intentId);

        // Fermer le modal de confirmation
        setShowUpgradeModal(false);

        // Préparer la configuration du paiement
        console.log('🔄 Préparation widget KKiaPay...');
        setPaymentConfig({
          amount: amount,
          email: user.email || 'client@example.com',
          phone: user.phone || '',
          name: `${user.firstName} ${user.lastName}`,
          reason: `Abonnement ${selectedPlan.name}`,
        });
        
        // Afficher le widget KKiaPay
        setShowKkiapayWidget(true);
        console.log('✅ Widget KKiaPay prêt');
      }
    } catch (err: any) {
      console.error('❌ Erreur upgrade:', err);
      
      setStatusType('error');
      setStatusTitle('❌ Erreur');
      setStatusMessage(err.response?.data?.message || 'Impossible de lancer le paiement. Veuillez réessayer.');
      setShowStatusModal(true);
      
      // Réinitialiser l'intent en cas d'erreur
      setCurrentIntentId(null);
    } finally {
      setUpgradeLoading(false);
    }
  };

  // Handle modal cancel
  const handleCancelUpgrade = () => {
    if (!upgradeLoading) {
      setShowUpgradeModal(false);
      setSelectedPlan(null);
    }
  };

  // Skeleton Loader Component
  const ShimmerBlock = ({ style }: { style?: any }) => {
    const shimmer = React.useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }, [shimmer]);
    const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-150, 150] });
    return (
      <View style={[{ backgroundColor: '#E5E7EB', overflow: 'hidden' }, style]}>
        <Animated.View style={{
          position: 'absolute', top: 0, bottom: 0, width: 120,
          transform: [{ translateX }],
          backgroundColor: 'rgba(255,255,255,0.35)',
          opacity: 0.7,
        }} />
      </View>
    );
  };

  const SkeletonCard = () => (
    <View className="bg-white rounded-3xl p-5 mb-5 border border-neutral-100 shadow-sm">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <ShimmerBlock style={{ height: 20, borderRadius: 8, width: '40%', marginBottom: 8 }} />
          <ShimmerBlock style={{ height: 24, borderRadius: 8, width: '60%' }} />
        </View>
        <ShimmerBlock style={{ height: 24, borderRadius: 12, width: 80 }} />
      </View>
      <View className="mb-4">
        {[1, 2, 3, 4].map(i => (
          <View key={i} className="flex-row items-start mb-2">
            <ShimmerBlock style={{ width: 18, height: 18, borderRadius: 9, marginRight: 8, marginTop: 1 }} />
            <ShimmerBlock style={{ height: 14, borderRadius: 6, width: '80%' }} />
          </View>
        ))}
      </View>
      <ShimmerBlock style={{ height: 44, borderRadius: 22, width: '100%' }} />
    </View>
  );

  const renderPlan = (plan: Plan) => {
    const isCurrentPlan = subscription?.plan?._id === plan.id || subscription?.plan?.name === plan.name;
    const isTrialExpired = subscription && subscription.endDate && new Date(subscription.endDate) < new Date();
    
    return (
      <View key={plan.id} className="bg-white rounded-2xl mb-4 overflow-hidden border border-neutral-100 shadow-lg">
        {/* Plan Header */}
        <View className="p-5 pb-4 border-b border-neutral-100">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1">
              <View 
                className="w-12 h-12 rounded-full items-center justify-center mr-3" 
                style={{ backgroundColor: `${plan.color}15` }}
              >
                <Ionicons 
                  name={isCurrentPlan ? "checkmark-circle" : "diamond-outline"} 
                  size={24} 
                  color={plan.color} 
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-lg font-quicksand-bold text-neutral-800">{plan.name}</Text>
                  {isCurrentPlan && (
                    <View className="bg-green-100 px-2 py-0.5 rounded-full ml-2">
                      <Text className="text-[10px] font-quicksand-bold text-green-700">ACTIF</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-baseline mt-0.5">
                  <Text className="text-2xl font-quicksand-bold" style={{ color: plan.color }}>
                    {plan.price}
                  </Text>
                  {plan.period && (
                    <Text className="text-xs font-quicksand-semibold ml-1 text-neutral-500">
                      {plan.period}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            {plan.popular && !isCurrentPlan && (
              <View className="absolute -top-2 -right-2">
                <View className="bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 rounded-full">
                  <Text className="text-[10px] font-quicksand-bold text-white tracking-wider">
                    POPULAIRE
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Features List */}
        <View className="p-5 pt-4 pb-4">
          {plan.features.map((f, idx) => (
            <View key={idx} className="flex-row items-start mb-3 last:mb-0">
              <View 
                className="w-5 h-5 rounded-full items-center justify-center mt-0.5 mr-3" 
                style={{ backgroundColor: `${plan.color}20` }}
              >
                <Ionicons name="checkmark" size={14} color={plan.color} style={{ fontWeight: 'bold' }} />
              </View>
              <Text className="flex-1 text-[13px] font-quicksand-medium text-neutral-700 leading-5">
                {f}
              </Text>
            </View>
          ))}
        </View>

                  {/* Action Button */}
        <View className="px-5 pb-5">
          {isCurrentPlan && !isTrialExpired ? (
            <View className="rounded-xl py-3.5 items-center flex-row justify-center bg-green-50 border border-green-200">
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text className="text-green-700 font-quicksand-bold text-sm ml-2">
                Plan actif
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              className="rounded-xl py-3.5 items-center flex-row justify-center shadow-sm"
              style={{ backgroundColor: plan.color }}
              onPress={() => handleSelectPlan(plan)}
              activeOpacity={0.7}
            >
              <Text className="text-white font-quicksand-bold text-sm">
                {isTrialExpired ? 'Renouveler' : `Passer à ${plan.name}`}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  };

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!subscription?.endDate) return null;
    const endDate = new Date(subscription.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Check if trial is expiring soon (less than 7 days)
  const isExpiringSoon = () => {
    const daysRemaining = getDaysRemaining();
    return daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7;
  };

  // Check if subscription is expired
  const isExpired = () => {
    const daysRemaining = getDaysRemaining();
    return daysRemaining !== null && daysRemaining < 0;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-neutral-50">
        <ExpoStatusBar style="light" translucent />

        {/* Dynamic Header */}
        <LinearGradient
          colors={subscription ? ['#10B981', '#059669'] : ['#0D9488', '#0F766E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: 24,
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
          }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-xl font-quicksand-bold text-white">Abonnements</Text>
            <TouchableOpacity className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
              <Ionicons name="help-circle-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Content Section */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-neutral-50 pt-6 px-5">
            {/* Active Subscription Card - Moved to content */}
            {subscription && subscription.isActive && (
              <View className="mb-6">
                <View className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
                  {/* Status Badge */}
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <View className={`w-2 h-2 rounded-full mr-2 ${isExpired() ? 'bg-red-400' : isExpiringSoon() ? 'bg-amber-400' : 'bg-green-400'}`} />
                      <Text className="text-neutral-700 font-quicksand-semibold text-xs uppercase tracking-wide">
                        {isExpired() ? 'Expiré' : isExpiringSoon() ? 'Expire bientôt' : 'Plan actif'}
                      </Text>
                    </View>
                    {isExpiringSoon() && (
                      <View className="bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                        <Text className="text-amber-700 font-quicksand-bold text-[10px]">
                          {getDaysRemaining()} jours restants
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Plan Name */}
                  <Text className="text-neutral-800 font-quicksand-bold text-2xl mb-2">
                    {subscription.plan.name}
                  </Text>
                  <Text className="text-neutral-600 font-quicksand-medium text-sm mb-4 leading-5">
                    {subscription.plan.description}
                  </Text>

                  {/* Stats Grid */}
                  <View className="flex-row mb-4">
                    <View className="flex-1 bg-primary-50 rounded-xl p-3 mr-2 border border-primary-100">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-primary-700 font-quicksand-medium text-[11px]">Produits</Text>
                        <Ionicons name="cube-outline" size={14} color="#059669" />
                      </View>
                      <Text className="text-neutral-800 font-quicksand-bold text-lg">
                        {subscription.usage.currentProducts}
                      </Text>
                      <Text className="text-neutral-500 font-quicksand-medium text-[10px]">
                        sur {subscription.plan.features.maxProducts}
                      </Text>
                    </View>

                    <View className="flex-1 bg-blue-50 rounded-xl p-3 ml-2 border border-blue-100">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-blue-700 font-quicksand-medium text-[11px]">Expiration</Text>
                        <Ionicons name="calendar-outline" size={14} color="#3B82F6" />
                      </View>
                      <Text className="text-neutral-800 font-quicksand-bold text-sm">
                        {formatDate(subscription.endDate).split(' ').slice(0, 2).join(' ')}
                      </Text>
                      <Text className="text-neutral-500 font-quicksand-medium text-[10px]">
                        {getDaysRemaining()! > 0 ? `${getDaysRemaining()} jours` : 'Expiré'}
                      </Text>
                    </View>
                  </View>

                  {/* Quick Actions */}
                  {isExpired() && (
                    <TouchableOpacity 
                      className="bg-red-500 rounded-xl py-3.5 items-center shadow-sm"
                      onPress={() => {
                        // Scroll to plans section
                        const premiumPlan = plans.find(p => p.name.toLowerCase().includes('premium'));
                        if (premiumPlan) {
                          handleSelectPlan(premiumPlan);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-white font-quicksand-bold text-sm">Renouveler maintenant</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Section Title */}
            <View className="mb-5">
              <Text className="text-neutral-400 font-quicksand-semibold text-xs uppercase tracking-wider mb-1">
                {subscription ? 'Autres plans disponibles' : 'Nos plans'}
              </Text>
              <Text className="text-neutral-800 font-quicksand-bold text-2xl">
                {subscription && isExpired() ? 'Renouvelez votre abonnement' : 'Choisissez votre plan'}
              </Text>
            </View>

            {/* Plans List */}
            {loading ? (
              // Afficher les skeletons pendant le chargement
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </>
            ) : error ? (
              <View className="flex-1 justify-center items-center py-16 bg-white rounded-2xl">
                <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-4">
                  <Ionicons name="alert-circle" size={40} color="#EF4444" />
                </View>
                <Text className="text-red-600 font-quicksand-bold text-base mb-2">Erreur de chargement</Text>
                <Text className="text-neutral-500 font-quicksand-medium text-sm text-center px-8 mb-6">
                  {error}
                </Text>
                <TouchableOpacity
                  onPress={loadData}
                  className="bg-primary-500 px-8 py-3 rounded-xl shadow-sm"
                >
                  <Text className="text-white font-quicksand-bold text-sm">Réessayer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              plans.map(renderPlan)
            )}

            {/* Subscription Details Section */}
            {subscription && (
              <View className="mt-2 mb-4">
                <View className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
                  <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center mr-3">
                      <Ionicons name="information-circle" size={24} color="#10B981" />
                    </View>
                    <Text className="text-neutral-800 font-quicksand-bold text-lg">
                      Détails de l&apos;abonnement
                    </Text>
                  </View>

                  {/* Payment Info */}
                  <View className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl p-4 mb-4">
                    <Text className="text-neutral-700 font-quicksand-bold text-sm mb-3">
                      Informations de paiement
                    </Text>
                    <View className="flex-row items-center justify-between mb-2.5">
                      <Text className="text-neutral-600 font-quicksand-medium text-xs">Montant</Text>
                      <Text className="text-neutral-900 font-quicksand-bold text-base">
                        {subscription.payment.amount ? `${subscription.payment.amount.toLocaleString()} ${subscription.plan.price.currency}` : 'N/A'}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between mb-2.5">
                      <Text className="text-neutral-600 font-quicksand-medium text-xs">Méthode</Text>
                      <View className="bg-white px-3 py-1 rounded-lg">
                        <Text className="text-neutral-800 font-quicksand-semibold text-xs">
                          {subscription.payment.method === 'TRIAL' ? 'Essai gratuit' : subscription.payment.method}
                        </Text>
                      </View>
                    </View>
                    {subscription.payment.reference && (
                      <View className="flex-row items-center justify-between">
                        <Text className="text-neutral-600 font-quicksand-medium text-xs">Référence</Text>
                        <Text className="text-neutral-700 font-quicksand-medium text-xs font-mono">
                          {subscription.payment.reference}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Features Grid */}
                  <View className="bg-gradient-to-br from-primary-50 to-emerald-50 rounded-xl p-4">
                    <Text className="text-neutral-700 font-quicksand-bold text-sm mb-3">
                      Fonctionnalités activées
                    </Text>
                    <View className="flex-row flex-wrap">
                      {[
                        { key: 'phone', label: 'Appels', icon: 'call' },
                        { key: 'sms', label: 'SMS', icon: 'chatbox' },
                        { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
                        { key: 'messaging', label: 'Messages', icon: 'mail' },
                        { key: 'advertisements', label: 'Publicités', icon: 'megaphone' },
                      ].map(({ key, label, icon }) => (
                        <View 
                          key={key} 
                          className={`flex-row items-center px-3 py-2 rounded-lg mr-2 mb-2 ${
                            subscription.plan.features[key] ? 'bg-green-100' : 'bg-neutral-100'
                          }`}
                        >
                          <Ionicons 
                            name={subscription.plan.features[key] ? "checkmark-circle" : "close-circle"} 
                            size={14} 
                            color={subscription.plan.features[key] ? "#059669" : "#737373"}
                          />
                          <Text className={`ml-1.5 font-quicksand-semibold text-xs ${
                            subscription.plan.features[key] ? 'text-green-800' : 'text-neutral-500'
                          }`}>
                            {label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Help Section */}
            <View className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 mb-4 border border-blue-100">
              <View className="flex-row items-start">
                <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                  <Ionicons name="help-circle" size={24} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-neutral-800 font-quicksand-bold text-base mb-1">
                    Besoin d&apos;aide ?
                  </Text>
                  <Text className="text-neutral-600 font-quicksand-medium text-xs mb-3 leading-5">
                    Notre équipe est là pour vous accompagner dans le choix de votre plan
                  </Text>
                  <TouchableOpacity className="bg-blue-500 self-start px-4 py-2 rounded-lg shadow-sm">
                    <Text className="text-white font-quicksand-semibold text-xs">Contacter le support</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Upgrade Confirmation Modal */}
      <UpgradeConfirmationModal
        visible={showUpgradeModal}
        plan={selectedPlan}
        currentPlanName={subscription?.plan?.name}
        onConfirm={handleConfirmUpgrade}
        onCancel={handleCancelUpgrade}
        loading={upgradeLoading}
      />

      {/* Status Modal */}
      <StatusModal
        visible={showStatusModal}
        type={statusType}
        title={statusTitle}
        message={statusMessage}
        onClose={() => setShowStatusModal(false)}
      />

      {/* Processing Payment Modal */}
      {processingPayment && (
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <View className="bg-white rounded-3xl p-8 items-center" style={{ maxWidth: 300 }}>
            <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="card" size={32} color="#10B981" />
            </View>
            <Text className="text-neutral-800 font-quicksand-bold text-lg mb-2 text-center">
              Traitement du paiement
            </Text>
            <Text className="text-neutral-600 font-quicksand-medium text-sm text-center mb-4">
              Veuillez patienter pendant que nous vérifions votre paiement...
            </Text>
            <View className="flex-row items-center">
              <Animated.View
                className="w-2 h-2 bg-primary-500 rounded-full mr-2"
                style={{
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                  }),
                }}
              />
              <Animated.View
                className="w-2 h-2 bg-primary-400 rounded-full mr-2"
                style={{
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                  }),
                }}
              />
              <Animated.View
                className="w-2 h-2 bg-primary-300 rounded-full"
                style={{
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                  }),
                }}
              />
            </View>
          </View>
        </View>
      )}

      {/* KKiaPay Widget */}
      {showKkiapayWidget && paymentConfig && (
        <KkiapayPayment
          amount={paymentConfig.amount}
          email={paymentConfig.email}
          phone={paymentConfig.phone}
          name={paymentConfig.name}
          reason={paymentConfig.reason}
          apiKey={process.env.EXPO_PUBLIC_KKIAPAY_PUBLIC_API_KEY || ''}
          sandbox={true}
          onSuccess={handlePaymentSuccess}
          onFailed={handlePaymentFailed}
        />
      )}
    </>
  );
}

export default EnterpriseSubscriptionsContent;
