import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, FlatList, Image, RefreshControl, SafeAreaView, ScrollView, StatusBar, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ConfirmationModal from "../../../../../components/ui/ConfirmationModal";
import NotificationModal, { useNotification } from "../../../../../components/ui/NotificationModal";
import DeliveryService, { DeliveryOffer } from "../../../../../services/api/DeliveryService";

const FILTERS: { id: 'ALL' | 'OPEN' | 'ASSIGNED' | 'CANCELLED' | 'EXPIRED'; label: string }[] = [
  { id: 'ALL', label: 'Toutes' },
  { id: 'OPEN', label: 'Ouvertes' },
  { id: 'ASSIGNED', label: 'Attribuées' },
  { id: 'CANCELLED', label: 'Annulées' },
  { id: 'EXPIRED', label: 'Expirées' },
];

function formatPrice(n?: number) {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function EnterpriseOffersScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isTablet = width >= 768;
  const barBaseHeight = isTablet ? 68 : isSmallPhone ? 58 : 62;
  const bottomSpacer = barBaseHeight + insets.bottom + 16; // ensure content clears the custom tab bar
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'ASSIGNED' | 'CANCELLED' | 'EXPIRED'>('ALL');
  const [offers, setOffers] = useState<DeliveryOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notification, showNotification, hideNotification } = useNotification();

  // Confirmation state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<DeliveryOffer | null>(null);

  const fetchOffers = useCallback(async (withSpinner = true) => {
    try {
      if (withSpinner) setLoading(true);
      setError(null);
      const status = filter === 'ALL' ? undefined : filter;
      const list = await DeliveryService.listEnterpriseOffers(status as any);
      setOffers(list);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      if (withSpinner) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchOffers(true);
  }, [fetchOffers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchOffers(false);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOffers]);

  // Skeleton Loader Component
  const ShimmerBlock = ({ style }: { style?: any }) => {
    const shimmer = useRef(new Animated.Value(0)).current;
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
    <View className="bg-white rounded-2xl p-4 mx-4 mb-4 shadow-sm border border-neutral-100">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 8 }} />
          <View className="ml-3">
            <ShimmerBlock style={{ height: 16, borderRadius: 8, width: 120, marginBottom: 4 }} />
            <ShimmerBlock style={{ height: 12, borderRadius: 6, width: 80 }} />
          </View>
        </View>
        <ShimmerBlock style={{ height: 24, borderRadius: 12, width: 80 }} />
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <ShimmerBlock style={{ height: 12, borderRadius: 6, width: 40, marginBottom: 4 }} />
          <ShimmerBlock style={{ height: 14, borderRadius: 6, width: 100 }} />
        </View>
        <View className="items-end">
          <ShimmerBlock style={{ height: 12, borderRadius: 6, width: 40, marginBottom: 4 }} />
          <ShimmerBlock style={{ height: 14, borderRadius: 6, width: 80 }} />
        </View>
      </View>

      <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-neutral-100">
        <ShimmerBlock style={{ height: 18, borderRadius: 8, width: 100 }} />
        <View className="flex-row">
          <ShimmerBlock style={{ height: 32, borderRadius: 8, width: 60, marginRight: 8 }} />
          <ShimmerBlock style={{ height: 32, borderRadius: 8, width: 120 }} />
        </View>
      </View>
    </View>
  );

  const renderSkeletons = () => {
    return (
      <FlatList
        data={Array.from({ length: 4 }).map((_, i) => i.toString())}
        renderItem={() => <SkeletonCard />}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderItem = ({ item }: { item: DeliveryOffer }) => {
    const product = typeof item.product === 'string' ? { _id: item.product } : (item.product || {});
    const customer = typeof item.customer === 'string' ? { _id: item.customer } : (item.customer || {});
    const status = item.status;

    const statusPill = (() => {
      switch (status) {
        case 'OPEN': return { color: '#10B981', bg: '#D1FAE5', text: 'Ouverte', icon: 'alert' };
        case 'ASSIGNED': return { color: '#3B82F6', bg: '#DBEAFE', text: 'Attribuée', icon: 'person' };
        case 'CANCELLED': return { color: '#EF4444', bg: '#FEE2E2', text: 'Annulée', icon: 'close' };
        case 'EXPIRED': return { color: '#6B7280', bg: '#E5E7EB', text: 'Expirée', icon: 'time' };
        default: return { color: '#6B7280', bg: '#F3F4F6', text: status, icon: 'information-circle' };
      }
    })();

    return (
      <TouchableOpacity className="bg-white rounded-2xl p-4 mx-4 mb-4 shadow-sm border border-neutral-100">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Image source={{ uri: (product as any).images?.[0] || 'https://via.placeholder.com/40x40/CCCCCC/FFFFFF?text=PD' }} className="w-10 h-10 rounded-lg" />
            <View className="ml-3">
              <Text className="text-sm font-quicksand-semibold text-neutral-800" numberOfLines={1}>
                {(product as any).name || 'Produit'}
              </Text>
              <Text className="text-xs text-neutral-600">{formatPrice((product as any).price)}</Text>
            </View>
          </View>
          <View className="flex-row items-center px-3 py-1 rounded-full" style={{ backgroundColor: statusPill.bg }}>
            <Ionicons name={statusPill.icon as any} size={14} color={statusPill.color} />
            <Text className="text-xs font-quicksand-semibold ml-1" style={{ color: statusPill.color }}>{statusPill.text}</Text>
          </View>
        </View>

        {/* Details */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-xs text-neutral-500">Client</Text>
            <Text className="text-sm font-quicksand-medium text-neutral-800" numberOfLines={1}>
              {customer.firstName || customer.lastName ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : customer._id}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-neutral-500">Expire</Text>
            <Text className="text-sm font-quicksand-semibold text-neutral-800">{formatDateTime(item.expiresAt)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-neutral-100">
          <Text className="text-base font-quicksand-bold text-primary-600">{formatPrice(item.deliveryFee)}</Text>
          <View className="flex-row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {status === 'OPEN' && (
              <>
                <TouchableOpacity className="bg-primary-500 rounded-lg px-3 py-2 mr-2 mb-2" activeOpacity={0.8}>
                  <Text className="text-sm font-quicksand-semibold text-white">Inviter des livreurs</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-red-50 rounded-lg px-3 py-2 mb-2"
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedOffer(item);
                    setConfirmVisible(true);
                  }}
                >
                  <Text className="text-sm font-quicksand-semibold" style={{ color: '#EF4444' }}>Supprimer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['#10B981', '#34D399']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      className="px-6 py-4 pt-16"
    >
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-quicksand-bold text-white">
          Mes offres
        </Text>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 6 }}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilter(f.id)}
            className={`mr-2 px-4 py-2 rounded-full ${
              filter === f.id ? 'bg-white/30' : 'bg-white/20'
            }`}
            activeOpacity={0.8}
          >
            <Text className={`text-sm font-quicksand-medium text-white`}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="flex-row justify-between items-center mt-4">
        <Text className="text-white/80 font-quicksand-medium text-sm">
          {offers.length} offre{offers.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </LinearGradient>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar backgroundColor="#10B981" barStyle="light-content" />
        {/* Header avec gradient */}
        <LinearGradient
          colors={['#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="px-6 py-4 pt-16"
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-quicksand-bold text-white">
              Mes offres
            </Text>
            <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full justify-center items-center">
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Skeleton filters */}
          <View className="flex-row mb-4">
            {FILTERS.map((f, index) => (
              <View
                key={f.id}
                className="mr-2 px-4 py-2 rounded-full bg-white/20"
              >
                <Text className="text-sm font-quicksand-medium text-white">{f.label}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row justify-between items-center">
            <ShimmerBlock style={{ height: 14, borderRadius: 6, width: 80 }} />
          </View>
        </LinearGradient>

        {/* Conteneur du contenu avec fond blanc */}
        <View className="flex-1 bg-white">
          {renderSkeletons()}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar backgroundColor="#10B981" barStyle="light-content" />
        {renderHeader()}
        <View className="flex-1 bg-white justify-center items-center px-6">
          <Ionicons name="warning" size={80} color="#EF4444" />
          <Text className="text-neutral-800 font-quicksand-bold text-lg mt-4 mb-2">Erreur</Text>
          <Text className="text-neutral-600 font-quicksand-medium text-center mt-1">{error}</Text>
          <TouchableOpacity onPress={() => fetchOffers(true)} className="mt-4 bg-primary-500 rounded-xl px-4 py-2">
            <Text className="text-white font-quicksand-semibold">Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar backgroundColor="#10B981" barStyle="light-content" />
      {renderHeader()}
      
      <View className="flex-1 bg-white">
        <FlatList
          data={offers}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#10B981"]} />
          }
          ListFooterComponent={offers.length > 0 ? (
            <View style={{ height: bottomSpacer }} />
          ) : null}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center px-6 mt-20">
              <Ionicons name="bicycle" size={80} color="#D1D5DB" />
              <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 mb-2">Aucune offre</Text>
              <Text className="text-center text-neutral-600 font-quicksand-medium">Créez une offre depuis une conversation produit pour la voir ici.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            flexGrow: 1,
            paddingTop: 8,
            paddingBottom: 8
          }}
        />
      </View>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmVisible}
        title="Supprimer l'offre ?"
        message="Cette action est irréversible. Seules les offres ouvertes peuvent être supprimées."
        confirmText="Supprimer"
        confirmColor="#EF4444"
        isDestructive
        loading={confirmLoading}
        onCancel={() => {
          setConfirmVisible(false);
          setSelectedOffer(null);
        }}
        onConfirm={async () => {
          if (!selectedOffer) return;
          setConfirmLoading(true);
          try {
            await DeliveryService.deleteOffer(selectedOffer._id);
            // Retirer localement sans recharger toute la liste
            setOffers(prev => prev.filter(o => o._id !== selectedOffer._id));
            setConfirmVisible(false);
            setSelectedOffer(null);
            showNotification('success', 'Offre supprimée', 'Votre offre a été supprimée avec succès.');
          } catch (e: any) {
            showNotification('error', 'Échec de la suppression', e.message || "Impossible de supprimer l'offre");
          } finally {
            setConfirmLoading(false);
          }
        }}
      />

      {/* Notification toast/modal */}
      <NotificationModal
        visible={!!notification}
        type={notification?.type || 'info'}
        title={notification?.title || ''}
        message={notification?.message || ''}
        onClose={hideNotification}
      />
    </SafeAreaView>
  );
}
