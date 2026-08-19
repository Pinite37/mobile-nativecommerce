import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusGroup, StatusItem } from '../../services/api/StatusService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STATUS_DURATION = 15000;

interface StatusViewerProps {
  visible: boolean;
  groups: StatusGroup[];
  initialGroupIndex: number;
  currentUserId: string;
  onClose: () => void;
  onViewed: (statusId: string) => void;
  onDelete?: (statusId: string) => void;
}

export function StatusViewer({
  visible,
  groups,
  initialGroupIndex,
  currentUserId,
  onClose,
  onViewed,
  onDelete,
}: StatusViewerProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Inverser les statuses dans le viewer : du plus ancien au plus récent.
  // Le backend envoie newest-first (utile pour le preview dans StatusBar),
  // mais en lecture on part du premier posté et on avance vers le plus récent.
  const viewerGroups = useMemo(
    () => groups.map(g => ({ ...g, statuses: [...g.statuses].reverse() })),
    [groups]
  );

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [statusIndex, setStatusIndex] = useState(0);

  const progress = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Pour la pause : on stocke le temps écoulé au moment du pressIn
  const elapsedRef = useRef(0);
  const startTimeRef = useRef(0);
  const isPausedRef = useRef(false);

  const currentGroup = viewerGroups[groupIndex];
  const currentStatus: StatusItem | undefined = currentGroup?.statuses[statusIndex];
  const isMyGroup = currentGroup && String(currentGroup.enterprise._id) === String(currentUserId);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const goNext = useCallback(() => {
    clearTimer();
    cancelAnimation(progress);
    setStatusIndex(si => {
      const group = viewerGroups[groupIndex];
      if (!group) return si;
      if (si < group.statuses.length - 1) return si + 1;
      // Groupe suivant
      setGroupIndex(gi => {
        if (gi < viewerGroups.length - 1) return gi + 1;
        onClose();
        return gi;
      });
      return 0;
    });
  }, [groupIndex, viewerGroups, onClose]);

  const goPrev = useCallback(() => {
    clearTimer();
    cancelAnimation(progress);
    if (statusIndex > 0) {
      setStatusIndex(i => i - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(g => g - 1);
      setStatusIndex(0);
    }
  }, [groupIndex, statusIndex]);

  // Démarre (ou reprend) l'animation et le timer
  const startOrResume = useCallback((remainingMs: number, fromProgress: number) => {
    isPausedRef.current = false;
    startTimeRef.current = Date.now();
    progress.value = fromProgress;
    progress.value = withTiming(1, { duration: remainingMs });
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (!isPausedRef.current) goNext();
    }, remainingMs);
  }, [goNext]);

  // Quand le statut courant change, on repart de 0
  useEffect(() => {
    if (!visible || !currentStatus) return;
    elapsedRef.current = 0;
    onViewed(currentStatus._id);
    startOrResume(STATUS_DURATION, 0);
    return () => { clearTimer(); cancelAnimation(progress); };
  }, [visible, groupIndex, statusIndex]);

  // Sync groupIndex à l'ouverture
  useEffect(() => {
    if (visible) { setGroupIndex(initialGroupIndex); setStatusIndex(0); }
  }, [visible, initialGroupIndex]);

  // ── Pause / reprise ──────────────────────────────────────────
  const handlePressIn = () => {
    if (isPausedRef.current) return;
    isPausedRef.current = true;
    const elapsed = Date.now() - startTimeRef.current + elapsedRef.current;
    elapsedRef.current = elapsed;
    cancelAnimation(progress);
    clearTimer();
  };

  const handlePressOut = () => {
    if (!isPausedRef.current) return;
    const remaining = Math.max(STATUS_DURATION - elapsedRef.current, 0);
    const fromProgress = elapsedRef.current / STATUS_DURATION;
    startOrResume(remaining, fromProgress);
  };

  // Tap gauche / droite pour naviguer
  const handlePress = (e: any) => {
    if (e.nativeEvent.pageX < SCREEN_WIDTH * 0.38) {
      goPrev();
    } else {
      goNext();
    }
  };

  if (!currentGroup || !currentStatus) return null;

  const renderContent = () => {
    if (currentStatus.type === 'TEXT') {
      return (
        <View style={{ flex: 1, backgroundColor: currentStatus.backgroundColor, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ color: currentStatus.textColor, fontSize: 28, fontFamily: 'Quicksand-Bold', textAlign: 'center', lineHeight: 38 }}>
            {currentStatus.text}
          </Text>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image
          source={{ uri: currentStatus.imageUrl! }}
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          contentFit="contain"
        />
        {currentStatus.type === 'IMAGE_TEXT' && currentStatus.text && (
          <View style={{ position: 'absolute', bottom: 80 + insets.bottom, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 20, paddingVertical: 14 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Quicksand-SemiBold', textAlign: 'center' }}>
              {currentStatus.text}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {renderContent()}

        {/* Zone tactile principale : pause au pressIn, reprise au pressOut, navigation au tap */}
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
        />

        {/* Barres de progression */}
        <View style={{ position: 'absolute', top: insets.top + 8, left: 8, right: 8, flexDirection: 'row', gap: 3 }}>
          {currentGroup.statuses.map((_, i) => (
            <View key={i} style={{ flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' }}>
              {i < statusIndex && <View style={{ flex: 1, backgroundColor: '#fff' }} />}
              {i === statusIndex && (
                <Animated.View style={[{ height: '100%', backgroundColor: '#fff', borderRadius: 2 }, progressStyle]} />
              )}
            </View>
          ))}
        </View>

        {/* Header : avatar + nom + actions */}
        <View style={{ position: 'absolute', top: insets.top + 20, left: 12, right: 12, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', backgroundColor: '#333', marginRight: 10 }}>
            {currentGroup.enterprise.profileImage ? (
              <Image source={{ uri: currentGroup.enterprise.profileImage }} style={{ width: 36, height: 36 }} contentFit="cover" />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="business" size={18} color="#10B981" />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontFamily: 'Quicksand-Bold', fontSize: 14 }}>
              {currentGroup.enterprise.companyName || `${currentGroup.enterprise.firstName} ${currentGroup.enterprise.lastName}`}
            </Text>
          </View>
          {isMyGroup && onDelete && (
            <TouchableOpacity
              onPress={() => { onDelete(currentStatus._id); goNext(); }}
              style={{ marginRight: 8, padding: 6 }}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
