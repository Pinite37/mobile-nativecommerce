import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Plan {
  id: string;
  name: string;
  key: string;
  price: string; // display only for now
  period: string; // /mois etc.
  color: string;
  features: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'akwaba',
    name: 'Akwaba',
    key: 'AKWABA',
    price: 'Gratuit',
    period: '',
    color: '#10B981',
    features: [
      'Présence basique',
      'Listing produits limité',
      'Statistiques simples',
    ],
  },
  {
    id: 'cauris',
    name: 'Cauris',
    key: 'CAURIS',
    price: '15 000 FCFA',
    period: '/mois',
    color: '#059669',
    popular: true,
    features: [
      'Mise en avant accueil',
      'Catalogue élargi',
      'Statistiques avancées',
      'Support prioritaire',
    ],
  },
  {
    id: 'lissa',
    name: 'Lissa',
    key: 'LISSA',
    price: '45 000 FCFA',
    period: '/mois',
    color: '#047857',
    features: [
      'Placement premium',
      'Catalogue illimité',
      'Analytics détaillés',
      'Gestion publicités',
      'Accompagnement dédié',
    ],
  },
];

export default function EnterpriseSubscriptions() {
  const insets = useSafeAreaInsets();
  // For now mock an active plan state (null = no subscription)
  const [activePlan, setActivePlan] = useState<Plan | null>(null);

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
        {plans.map(renderPlan)}
        {activePlan && (
          <View className="bg-white rounded-3xl p-5 border border-neutral-100">
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
    </>
  );
}
