import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Image, RefreshControl, SafeAreaView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  // Static mock for now; no setter required yet
  const [ads] = useState<DraftAd[]>(mockAds);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | DraftAd['status']>('all');

  const filteredAds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ads.filter(ad => {
      const okStatus = filterStatus === 'all' ? true : ad.status === filterStatus;
      const okQuery = q.length === 0 ? true : ad.title.toLowerCase().includes(q);
      return okStatus && okQuery;
    });
  }, [ads, searchQuery, filterStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const renderAd = ({ item }: { item: DraftAd }) => {
    const style = statusStyles[item.status];
    return (
      <TouchableOpacity className="bg-white rounded-2xl overflow-hidden mb-4 border border-neutral-100 active:opacity-90">
        {item.preview ? (
          <View className="relative">
            <Image source={{ uri: item.preview }} className="w-full h-36" resizeMode="cover" />
            <LinearGradient
              colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.35)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              className="absolute inset-0"
            />
            <View className="absolute top-3 left-3 px-2 py-1 rounded-full" style={{ backgroundColor: style.bg }}>
              <Text className="text-[11px] font-quicksand-semibold" style={{ color: style.text }}>
                {style.label}
              </Text>
            </View>
          </View>
        ) : (
          <View className="w-full h-36 bg-neutral-100 items-center justify-center">
            <Ionicons name="image-outline" size={26} color="#9CA3AF" />
          </View>
        )}

        <View className="p-4">
          <View className="flex-row items-start justify-between">
            <Text className="flex-1 text-base font-quicksand-semibold text-neutral-800 mr-3" numberOfLines={2}>
              {item.title}
            </Text>
            <TouchableOpacity className="w-8 h-8 rounded-full bg-neutral-100 items-center justify-center">
              <Ionicons name="ellipsis-horizontal" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center mt-3 justify-between">
            <Text className="text-xs text-neutral-500 font-quicksand-medium">
              Créée le {new Date(item.createdAt).toLocaleDateString('fr-FR')}
            </Text>
            <View className="flex-row items-center">
              <TouchableOpacity className="px-3 py-1.5 bg-primary-50 rounded-xl flex-row items-center mr-2">
                <Ionicons name="create-outline" size={16} color="#10B981" />
                <Text className="text-primary-600 font-quicksand-semibold text-xs ml-1">Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity className="px-3 py-1.5 bg-red-50 rounded-xl flex-row items-center">
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text className="text-red-600 font-quicksand-semibold text-xs ml-1">Supprimer</Text>
              </TouchableOpacity>
            </View>
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
      <LinearGradient colors={['#10B981', '#34D399']} start={{ x:0, y:0}} end={{x:1,y:0}} className="px-6 pt-14 pb-10">
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

        {/* Barre de recherche */}
        <View className="mt-5">
          <View className="relative">
            <View className="absolute left-3 top-3 z-10">
              <Ionicons name="search" size={18} color="rgba(156,163,175,0.9)" />
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher une publicité..."
              className="bg-white rounded-2xl pl-10 pr-10 py-3 text-neutral-800 font-quicksand-medium border border-neutral-200"
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity className="absolute right-3 top-3" onPress={() => setSearchQuery('')}>
                <Ionicons name="close" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

  <View className="flex-1 -mt-6 rounded-t-[32px] bg-background-secondary px-4 pt-8" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <FlatList
          data={filteredAds}
          keyExtractor={(item) => item.id}
          renderItem={renderAd}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} tintColor="#10B981" />}
          ListHeaderComponent={
            <View className="mb-4">
              <Text className="text-neutral-500 font-quicksand-medium text-xs mb-2">Résumé</Text>
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

              {/* Filtres par statut */}
              <View className="mt-4 flex-row flex-wrap gap-2">
                {[
                  { key: 'all', label: 'Toutes' },
                  { key: 'active', label: 'Actives' },
                  { key: 'pending', label: 'En attente' },
                  { key: 'draft', label: 'Brouillons' },
                  { key: 'rejected', label: 'Rejetées' },
                  { key: 'expired', label: 'Expirées' },
                ].map((s: any) => (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => setFilterStatus(s.key)}
                    className={`px-3 py-1.5 rounded-full border ${filterStatus === s.key ? 'bg-primary-500 border-primary-500' : 'bg-white border-neutral-200'}`}
                  >
                    <Text className={`text-xs font-quicksand-semibold ${filterStatus === s.key ? 'text-white' : 'text-neutral-700'}`}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Compteur de résultats */}
              <View className="mt-2">
                <Text className="text-xs text-neutral-500 font-quicksand-medium">
                  {filteredAds.length} élément{filteredAds.length > 1 ? 's' : ''} affiché{filteredAds.length > 1 ? 's' : ''}{searchQuery ? ` • Filtre: "${searchQuery}"` : ''}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center mt-20 px-8">
              <Ionicons name="image-outline" size={46} color="#9CA3AF" />
              <Text className="mt-4 text-neutral-700 font-quicksand-semibold">
                {searchQuery || filterStatus !== 'all' ? 'Aucun élément trouvé' : 'Aucune publicité'}
              </Text>
              <Text className="mt-2 text-neutral-500 font-quicksand-medium text-center text-sm">
                {searchQuery || filterStatus !== 'all'
                  ? 'Aucune publicité ne correspond à vos critères. Essayez d’ajuster votre recherche ou vos filtres.'
                  : 'Créez votre première bannière pour booster votre visibilité sur l’accueil.'}
              </Text>
              <TouchableOpacity className="mt-6 bg-primary-500 px-6 py-3 rounded-xl">
                <Text className="text-white font-quicksand-semibold">Créer une publicité</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
        />
      </View>
      </SafeAreaView>
    </>
  );
}
