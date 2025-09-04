import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Image, RefreshControl, SafeAreaView, StatusBar, Text, TouchableOpacity, View } from 'react-native';

interface DraftAd {
  id: string;
  title: string;
  status: 'draft' | 'pending' | 'active' | 'rejected' | 'expired';
  preview?: string;
  createdAt: string;
}

const mockAds: DraftAd[] = [
  { id: '1', title: 'Promo Rentrée -30%', status: 'active', preview: 'https://via.placeholder.com/300x140/10B981/FFFFFF?text=Rentrée', createdAt: new Date().toISOString() },
  { id: '2', title: 'Nouveau produit premium', status: 'pending', preview: 'https://via.placeholder.com/300x140/34D399/FFFFFF?text=Produit', createdAt: new Date().toISOString() },
  { id: '3', title: 'Stock limité - Dépêchez-vous', status: 'draft', createdAt: new Date().toISOString() },
];

const statusStyles: Record<DraftAd['status'], { label: string; bg: string; text: string }> = {
  draft: { label: 'Brouillon', bg: '#E5E7EB', text: '#374151' },
  pending: { label: 'En attente', bg: '#FEF3C7', text: '#B45309' },
  active: { label: 'Active', bg: '#D1FAE5', text: '#047857' },
  rejected: { label: 'Rejetée', bg: '#FEE2E2', text: '#B91C1C' },
  expired: { label: 'Expirée', bg: '#F3F4F6', text: '#6B7280' },
};

export default function EnterpriseAdvertisements() {
  // Static mock for now; no setter required yet
  const [ads] = useState<DraftAd[]>(mockAds);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const renderAd = ({ item }: { item: DraftAd }) => {
    const style = statusStyles[item.status];
    return (
      <TouchableOpacity className="bg-white rounded-2xl p-4 mb-4 border border-neutral-100 active:opacity-80">
        {item.preview && (
          <Image source={{ uri: item.preview }} className="w-full h-36 rounded-xl mb-4" resizeMode="cover" />
        )}
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 text-base font-quicksand-semibold text-neutral-800 mr-3" numberOfLines={2}>{item.title}</Text>
          <View className="px-2 py-1 rounded-full" style={{ backgroundColor: style.bg }}>
            <Text className="text-[11px] font-quicksand-semibold" style={{ color: style.text }}>{style.label}</Text>
          </View>
        </View>
        <View className="flex-row items-center mt-3 justify-between">
          <Text className="text-xs text-neutral-500 font-quicksand-medium">Créée le {new Date(item.createdAt).toLocaleDateString('fr-FR')}</Text>
          <View className="flex-row items-center space-x-4">
            <TouchableOpacity>
              <Ionicons name="create-outline" size={18} color="#10B981" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background-secondary">
      <StatusBar backgroundColor="#10B981" barStyle="light-content" />
      <LinearGradient colors={['#10B981', '#34D399']} start={{ x:0, y:0}} end={{x:1,y:0}} className="px-6 pt-14 pb-8">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-xl font-quicksand-bold text-white">Publicités</Text>
          <View className="w-10 h-10" />
        </View>
        <View className="mt-6 flex-row">
          <TouchableOpacity className="flex-1 bg-white/20 rounded-2xl py-3 flex-row items-center justify-center mr-3">
            <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
            <Text className="text-white font-quicksand-semibold ml-2 text-sm">Importer</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-white rounded-2xl py-3 flex-row items-center justify-center">
            <Ionicons name="add" size={20} color="#10B981" />
            <Text className="text-primary-500 font-quicksand-semibold ml-2 text-sm">Nouvelle</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View className="flex-1 -mt-6 rounded-t-[32px] bg-background-secondary px-4 pt-6">
        <FlatList
          data={ads}
          keyExtractor={(item) => item.id}
          renderItem={renderAd}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} tintColor="#10B981" />}
          ListHeaderComponent={
            <View className="mb-4">
              <Text className="text-neutral-500 font-quicksand-medium text-xs mb-1">Résumé</Text>
              <View className="flex-row gap-3">
                <View className="flex-1 bg-white rounded-2xl p-4 border border-neutral-100">
                  <Text className="text-[11px] text-neutral-500 font-quicksand-medium">Actives</Text>
                  <Text className="text-xl font-quicksand-bold text-primary-500 mt-1">{ads.filter(a=>a.status==='active').length}</Text>
                </View>
                <View className="flex-1 bg-white rounded-2xl p-4 border border-neutral-100">
                  <Text className="text-[11px] text-neutral-500 font-quicksand-medium">En attente</Text>
                  <Text className="text-xl font-quicksand-bold text-amber-500 mt-1">{ads.filter(a=>a.status==='pending').length}</Text>
                </View>
                <View className="flex-1 bg-white rounded-2xl p-4 border border-neutral-100">
                  <Text className="text-[11px] text-neutral-500 font-quicksand-medium">Brouillons</Text>
                  <Text className="text-xl font-quicksand-bold text-neutral-700 mt-1">{ads.filter(a=>a.status==='draft').length}</Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Ionicons name="image-outline" size={46} color="#9CA3AF" />
              <Text className="mt-4 text-neutral-700 font-quicksand-semibold">Aucune publicité</Text>
              <Text className="mt-2 text-neutral-500 font-quicksand-medium text-center px-8 text-sm">Créez votre première bannière pour booster votre visibilité sur l&apos;accueil.</Text>
              <TouchableOpacity className="mt-6 bg-primary-500 px-6 py-3 rounded-xl">
                <Text className="text-white font-quicksand-semibold">Créer une publicité</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 60 }}
        />
      </View>
      </SafeAreaView>
    </>
  );
}
