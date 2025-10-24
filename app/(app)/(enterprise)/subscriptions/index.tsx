import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, SafeAreaView, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SubscriptionService, { Plan } from '../../../../services/api/SubscriptionService';

export default function EnterpriseSubscriptions() {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // For now mock an active plan state (null = no subscription)
  const [activePlan, setActivePlan] = useState<Plan | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Chargement des plans entreprise...');
      const enterprisePlans = await SubscriptionService.getEnterprisePlans();
      setPlans(enterprisePlans);
      console.log(`✅ ${enterprisePlans.length} plans chargés`);
    } catch (err: any) {
      console.error('❌ Erreur chargement plans:', err);
      setError('Impossible de charger les plans. Veuillez réessayer.');
    } finally {
      setLoading(false);
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

  const renderSkeletons = () => {
    return (
      <ScrollView
        className="flex-1 -mt-6 rounded-t-[32px] bg-background-secondary px-5 pt-8"
        contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {!activePlan && (
          <View className="mb-6">
            <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '30%', marginBottom: 4 }} />
            <ShimmerBlock style={{ height: 20, borderRadius: 8, width: '50%' }} />
          </View>
        )}
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </ScrollView>
    );
  };

  const renderPlan = (plan: Plan) => {
    const isActive = activePlan?.id === plan.id;
    return (
      <View key={plan.id} className="bg-white rounded-3xl p-5 mb-5 border border-neutral-100 shadow-sm">
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-quicksand-bold" style={{ color: plan.color }}>{plan.name}</Text>
            <View className="flex-row items-baseline mt-1 flex-wrap">
              <Text className="text-xl font-quicksand-bold" style={{ color: plan.color }}>{plan.price}</Text>
              {plan.period ? <Text className="text-xs font-quicksand-semibold ml-1 text-neutral-500">{plan.period}</Text> : null}
            </View>
          </View>
          {plan.popular && (
            <View className="bg-amber-400 px-3 py-1 rounded-full">
              <Text className="text-[11px] font-quicksand-bold text-white tracking-wide">POPULAIRE</Text>
            </View>
          )}
        </View>
        <View className="mb-4">
          {plan.features.map(f => (
            <View key={f} className="flex-row items-start mb-2">
              <Ionicons name="checkmark-circle" size={18} color={plan.color} style={{ marginTop: 1 }} />
              <Text className="ml-2 text-[13px] font-quicksand-medium text-neutral-600 flex-1">{f}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          className={`${isActive ? 'bg-neutral-800' : 'bg-primary-500'} rounded-2xl py-3 items-center flex-row justify-center`}
          onPress={() => {
            if (!isActive) setActivePlan(plan); else setActivePlan(null); // toggle for demo
          }}
        >
          <Text className="text-white font-quicksand-semibold text-sm">{isActive ? 'Gérer mon abonnement' : 'Choisir ce plan'}</Text>
          {!isActive && plan.popular && <Ionicons name="trending-up" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {loading ? (
        <SafeAreaView className="flex-1 bg-background-secondary">
          <StatusBar backgroundColor="#10B981" barStyle="light-content" />
          <LinearGradient colors={['#10B981', '#34D399']} start={{ x:0, y:0}} end={{x:1,y:0}} className="px-6 pt-14 pb-10">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text className="text-xl font-quicksand-bold text-white">Abonnements</Text>
              <View className="w-10 h-10" />
            </View>
            {activePlan && (
              <View className="mt-6 bg-white/20 rounded-2xl p-4">
                <Text className="text-white font-quicksand-semibold text-xs mb-1">Plan actif</Text>
                <Text className="text-white font-quicksand-bold text-lg">{activePlan.name}</Text>
                <Text className="text-white/90 font-quicksand-medium text-[12px] mt-1">Renouvellement automatique le 12 Oct 2024</Text>
                <View className="flex-row mt-4">
                  <TouchableOpacity className="flex-1 bg-white rounded-xl py-3 items-center mr-3">
                    <Text className="text-primary-500 font-quicksand-semibold text-[13px]">Mettre à niveau</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="flex-1 bg-white/30 rounded-xl py-3 items-center">
                    <Text className="text-white font-quicksand-semibold text-[13px]">Annuler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </LinearGradient>
          {renderSkeletons()}
        </SafeAreaView>
      ) : (
        <SafeAreaView className="flex-1 bg-background-secondary">
          <StatusBar backgroundColor="#10B981" barStyle="light-content" />
          <LinearGradient colors={['#10B981', '#34D399']} start={{ x:0, y:0}} end={{x:1,y:0}} className="px-6 pt-14 pb-10">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text className="text-xl font-quicksand-bold text-white">Abonnements</Text>
              <View className="w-10 h-10" />
            </View>
            {activePlan && (
              <View className="mt-6 bg-white/20 rounded-2xl p-4">
                <Text className="text-white font-quicksand-semibold text-xs mb-1">Plan actif</Text>
                <Text className="text-white font-quicksand-bold text-lg">{activePlan.name}</Text>
                <Text className="text-white/90 font-quicksand-medium text-[12px] mt-1">Renouvellement automatique le 12 Oct 2024</Text>
                <View className="flex-row mt-4">
                  <TouchableOpacity className="flex-1 bg-white rounded-xl py-3 items-center mr-3">
                    <Text className="text-primary-500 font-quicksand-semibold text-[13px]">Mettre à niveau</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="flex-1 bg-white/30 rounded-xl py-3 items-center">
                    <Text className="text-white font-quicksand-semibold text-[13px]">Annuler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </LinearGradient>

          <ScrollView
            className="flex-1 -mt-6 rounded-t-[32px] bg-background-secondary px-5 pt-8"
            contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
          >
            {!activePlan && (
              <View className="mb-6">
                <Text className="text-neutral-500 font-quicksand-medium text-xs mb-1">Choisissez un plan</Text>
                <Text className="text-neutral-800 font-quicksand-bold text-lg">Boostez votre visibilité</Text>
              </View>
            )}

            {error ? (
              <View className="flex-1 justify-center items-center py-12">
                <Ionicons name="alert-circle" size={48} color="#EF4444" />
                <Text className="text-red-500 font-quicksand-medium text-center mt-4 px-4">{error}</Text>
                <TouchableOpacity
                  onPress={loadPlans}
                  className="bg-primary-500 px-6 py-3 rounded-xl mt-4"
                >
                  <Text className="text-white font-quicksand-semibold">Réessayer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              plans.map(renderPlan)
            )}

            {activePlan && (
              <View className="bg-white rounded-3xl p-5 border border-neutral-100 mt-6">
                <Text className="text-neutral-800 font-quicksand-bold text-base mb-4">Historique facturation (démo)</Text>
                {[1,2,3].map(i => (
                  <View key={i} className="flex-row items-center justify-between py-3 border-b border-neutral-100 last:border-b-0">
                    <View className="flex-1 mr-4">
                      <Text className="text-[13px] font-quicksand-semibold text-neutral-700">{activePlan.name} - Sept {2024 - i}</Text>
                      <Text className="text-[11px] font-quicksand-medium text-neutral-400 mt-0.5">Facturé le 12 Sept {2024 - i}</Text>
                    </View>
                    <Text className="text-[13px] font-quicksand-semibold text-neutral-800">{activePlan.price}</Text>
                  </View>
                ))}
                <TouchableOpacity className="mt-5 bg-primary-50 border border-primary-100 px-5 py-3 rounded-2xl flex-row items-center justify-center">
                  <Ionicons name="download-outline" size={18} color="#10B981" />
                  <Text className="ml-2 text-primary-500 font-quicksand-semibold text-sm">Exporter les factures</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      )}
    </>
  );
}
