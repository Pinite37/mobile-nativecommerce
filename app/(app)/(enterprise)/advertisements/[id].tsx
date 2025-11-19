import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NotificationModal, { useNotification } from '../../../../components/ui/NotificationModal';
import AdvertisementService, { Advertisement } from '../../../../services/api/AdvertisementService';

export default function AdvertisementDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { notification, showNotification, hideNotification } = useNotification();
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    type: 'pause' | 'delete' | 'activate';
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
  } | null>(null);

  // Shimmer components
  const Shimmer: React.FC<{ style?: any }> = ({ style }) => {
    const translateX = React.useRef(new Animated.Value(-150)).current;
    React.useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(translateX, { toValue: 300, duration: 1300, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: -150, duration: 0, useNativeDriver: true })
        ])
      );
      loop.start();
      return () => loop.stop();
    }, [translateX]);
    return (
      <View style={[{ backgroundColor: '#E5E7EB', overflow: 'hidden' }, style]}>
        <Animated.View style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 150,
          transform: [{ translateX }]
        }}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.65)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>
    );
  };

  const SkeletonDetail: React.FC = () => (
    <ScrollView
      className="-mt-6 rounded-t-[32px] bg-background-secondary"
      contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Image Skeleton */}
      <View className="mx-4 mt-8 bg-white rounded-3xl overflow-hidden border border-neutral-100">
        <Shimmer style={{ height: 192, width: '100%' }} />
        <View className="p-5 gap-4">
          <Shimmer style={{ height: 20, borderRadius: 6, width: '80%' }} />
          <Shimmer style={{ height: 16, borderRadius: 6, width: '100%' }} />
          <Shimmer style={{ height: 16, borderRadius: 6, width: '60%' }} />
          <View className="flex-row gap-2">
            <Shimmer style={{ height: 24, borderRadius: 12, width: 80 }} />
            <Shimmer style={{ height: 24, borderRadius: 12, width: 120 }} />
          </View>
          <View className="border-t border-neutral-100 pt-4 flex-row justify-between">
            <View className="items-center">
              <Shimmer style={{ height: 12, borderRadius: 4, width: 40 }} />
              <Shimmer style={{ height: 14, borderRadius: 4, width: 60, marginTop: 4 }} />
            </View>
            <View className="items-center">
              <Shimmer style={{ height: 12, borderRadius: 4, width: 30 }} />
              <Shimmer style={{ height: 14, borderRadius: 4, width: 60, marginTop: 4 }} />
            </View>
          </View>
          <View className="flex-row gap-4">
            <View className="flex-1 bg-neutral-50 rounded-2xl p-4 border border-neutral-100">
              <Shimmer style={{ height: 11, borderRadius: 4, width: 30 }} />
              <Shimmer style={{ height: 18, borderRadius: 4, width: 40, marginTop: 4 }} />
            </View>
            <View className="flex-1 bg-neutral-50 rounded-2xl p-4 border border-neutral-100">
              <Shimmer style={{ height: 11, borderRadius: 4, width: 25 }} />
              <Shimmer style={{ height: 18, borderRadius: 4, width: 35, marginTop: 4 }} />
            </View>
          </View>
        </View>
      </View>

      {/* Actions Skeleton */}
      <View className="mx-4 mt-6">
        <View className="flex-row gap-3">
          <Shimmer style={{ height: 48, borderRadius: 16, flex: 1 }} />
          <Shimmer style={{ height: 48, borderRadius: 16, width: 56 }} />
        </View>
      </View>
    </ScrollView>
  );

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await AdvertisementService.getById(id);
      setAd(data);
    } catch (e: any) {
      showNotification('error', 'Erreur de chargement', e?.message || 'Impossible de charger la publicité');
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, showNotification]);

  const loadRef = useRef(load);

  // Update ref when load changes
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useFocusEffect(useCallback(() => { loadRef.current(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); };

  const showConfirmation = (type: 'pause' | 'delete' | 'activate') => {
    let title = '';
    let message = '';
    let confirmText = '';
    let confirmColor = '';

    switch (type) {
      case 'pause':
        title = 'Couper la publicité';
        message = 'La publicité ne sera plus affichée chez les clients mais pourra être réactivée plus tard.';
        confirmText = 'Couper';
        confirmColor = '#F59E0B';
        break;
      case 'delete':
        title = 'Supprimer la publicité';
        message = 'Cette action est irréversible. La publicité sera définitivement supprimée.';
        confirmText = 'Supprimer';
        confirmColor = '#EF4444';
        break;
      case 'activate':
        title = 'Réactiver la publicité';
        message = 'La publicité sera remise en ligne et visible par les clients.';
        confirmText = 'Réactiver';
        confirmColor = '#10B981';
        break;
    }

    setConfirmationAction({ type, title, message, confirmText, confirmColor });
    setConfirmationVisible(true);
  };

  const closeConfirmation = () => {
    setConfirmationVisible(false);
    setConfirmationAction(null);
  };

  const executeConfirmedAction = async () => {
    if (!confirmationAction || !ad) return;

    const { type } = confirmationAction;
    closeConfirmation();

    try {
      switch (type) {
        case 'pause':
          const pauseRes = await AdvertisementService.deactivate(ad._id);
          setAd(pauseRes);
          break;
        case 'delete':
          await AdvertisementService.delete(ad._id);
          showNotification('success', 'Supprimée', 'La publicité a été supprimée.');
          router.back();
          break;
        case 'activate':
          const activateRes = await AdvertisementService.activate(ad._id);
          setAd(activateRes);
          break;
      }
    } catch (err: any) {
      showNotification('error', 'Erreur', err?.message || `Échec de l'action`);
    }
  };

  const statusInfo = React.useMemo(() => {
    if (!ad) return null;
    const now = Date.now();
    const end = new Date(ad.endDate).getTime();
    let label = 'Active';
    let color = '#047857';
    if (end < now) { label = 'Expirée'; color = '#6B7280'; }
    else if (!ad.isActive) { label = 'Coupée'; color = '#B45309'; }
    return { label, color };
  }, [ad]);

  return (
    <View className="flex-1 bg-background-secondary">
      <ExpoStatusBar style="light" translucent />
      <LinearGradient
        colors={['#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 40,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-xl font-quicksand-bold text-white" numberOfLines={1}>Détail</Text>
          <View className="w-10 h-10" />
        </View>
      </LinearGradient>

      {loading ? (
        <SkeletonDetail />
      ) : !ad ? null : (
        <ScrollView
          className="-mt-6 rounded-t-[32px] bg-background-secondary"
          contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} tintColor="#10B981" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Image */}
          <View className="mx-4 mt-8 bg-white rounded-3xl overflow-hidden border border-neutral-100">
            {ad.images && ad.images.length > 0 ? (
              <View className="relative">
                <Image source={{ uri: ad.images[0] }} className="w-full h-48" resizeMode="cover" />
                {statusInfo && (
                  <View className="absolute top-3 left-3 px-3 py-1 rounded-full" style={{ backgroundColor: statusInfo.color + '22' }}>
                    <Text className="text-xs font-quicksand-semibold" style={{ color: statusInfo.color }}>{statusInfo.label}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View className="w-full h-48 bg-neutral-200 items-center justify-center">
                <Ionicons name="image-outline" size={42} color="#9CA3AF" />
              </View>
            )}
            <View className="p-5">
              <Text className="text-lg font-quicksand-bold text-neutral-800" numberOfLines={3}>{ad.title}</Text>
              <Text className="mt-3 text-neutral-600 font-quicksand-medium leading-relaxed text-sm">{ad.description}</Text>
              <View className="mt-5 flex-row flex-wrap gap-2">
                <View className="px-3 py-1.5 bg-primary-50 rounded-full">
                  <Text className="text-primary-600 font-quicksand-semibold text-xs">{ad.type}</Text>
                </View>
                <View className="px-3 py-1.5 bg-emerald-50 rounded-full">
                  <Text className="text-emerald-600 font-quicksand-semibold text-xs">Audience: {ad.targetAudience}</Text>
                </View>
              </View>
              <View className="mt-5 border-t border-neutral-100 pt-4 flex-row justify-between">
                <View>
                  <Text className="text-xs text-neutral-500 font-quicksand-medium">Début</Text>
                  <Text className="text-sm font-quicksand-semibold text-neutral-800 mt-0.5">{new Date(ad.startDate).toLocaleString('fr-FR')}</Text>
                </View>
                <View>
                  <Text className="text-xs text-neutral-500 font-quicksand-medium">Fin</Text>
                  <Text className="text-sm font-quicksand-semibold text-neutral-800 mt-0.5">{new Date(ad.endDate).toLocaleString('fr-FR')}</Text>
                </View>
              </View>
              <View className="mt-5 flex-row gap-4">
                <View className="flex-1 bg-neutral-50 rounded-2xl p-4 border border-neutral-100">
                  <Text className="text-[11px] text-neutral-500 font-quicksand-medium">Vues</Text>
                  <Text className="text-lg font-quicksand-bold text-primary-600 mt-1">{ad.views ?? 0}</Text>
                </View>
                <View className="flex-1 bg-neutral-50 rounded-2xl p-4 border border-neutral-100">
                  <Text className="text-[11px] text-neutral-500 font-quicksand-medium">Clics</Text>
                  <Text className="text-lg font-quicksand-bold text-amber-600 mt-1">{ad.clicks ?? 0}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View className="mx-4 mt-6">
            <View className="flex-row gap-3">
              {ad.isActive ? (
                <TouchableOpacity
                  onPress={() => showConfirmation('pause')}
                  className="flex-1 bg-amber-500 rounded-2xl py-4 items-center"
                >
                  <Text className="text-white font-quicksand-semibold">Couper</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => showConfirmation('activate')}
                  className="flex-1 bg-emerald-500 rounded-2xl py-4 items-center"
                >
                  <Text className="text-white font-quicksand-semibold">Activer</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => showConfirmation('delete')}
                className="w-14 bg-red-500 rounded-2xl items-center justify-center"
              >
                <Ionicons name="trash" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Modern Confirmation Modal */}
      <Modal
        visible={confirmationVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeConfirmation}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={closeConfirmation}
        >
          <View className="flex-1 justify-center items-center px-6">
            <TouchableOpacity
              className="bg-white rounded-3xl w-full max-w-sm"
              activeOpacity={1}
              onPress={() => {}}
            >
              {/* Icon */}
              <View className="items-center pt-8 pb-4">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{ backgroundColor: confirmationAction?.confirmColor + '20' }}
                >
                  <Ionicons
                    name={
                      confirmationAction?.type === 'delete' ? 'trash' :
                      confirmationAction?.type === 'pause' ? 'pause' : 'play'
                    }
                    size={28}
                    color={confirmationAction?.confirmColor}
                  />
                </View>
              </View>

              {/* Content */}
              <View className="px-6 pb-6">
                <Text className="text-xl font-quicksand-bold text-neutral-800 text-center mb-2">
                  {confirmationAction?.title}
                </Text>
                <Text className="text-base text-neutral-600 font-quicksand-medium text-center leading-5">
                  {confirmationAction?.message}
                </Text>
              </View>

              {/* Actions */}
              <View className="flex-row px-6 pb-6 gap-3">
                <TouchableOpacity
                  onPress={closeConfirmation}
                  className="flex-1 bg-neutral-100 py-4 rounded-2xl items-center"
                >
                  <Text className="text-base font-quicksand-semibold text-neutral-700">
                    Annuler
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={executeConfirmedAction}
                  className="flex-1 py-4 rounded-2xl items-center"
                  style={{ backgroundColor: confirmationAction?.confirmColor }}
                >
                  <Text className="text-base font-quicksand-semibold text-white">
                    {confirmationAction?.confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notification Modal */}
      {notification && (
        <NotificationModal
          visible={notification.visible}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={hideNotification}
        />
      )}
    </View>
  );
}
