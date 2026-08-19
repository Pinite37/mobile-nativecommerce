import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = require('react-native').Dimensions.get('window');
const STATUS_DURATION = 15000;

interface StatusViewerProps {
  visible: boolean;
  groups: StatusGroup[];
  initialGroupIndex: number;
  currentUserId: string;
  onClose: () => void;
  onViewed: (statusId: string) => void;
  onDelete?: (statusId: string) => void;
  onReplyToStatus?: (status: StatusItem, enterpriseUserId: string, text: string) => Promise<{ conversationId: string }>;
}

export function StatusViewer({
  visible,
  groups,
  initialGroupIndex,
  currentUserId,
  onClose,
  onViewed,
  onDelete,
  onReplyToStatus,
}: StatusViewerProps) {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const viewerGroups = useMemo(
    () => groups.map(g => ({ ...g, statuses: [...g.statuses].reverse() })),
    [groups]
  );

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [statusIndex, setStatusIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const progress = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef(0);
  const startTimeRef = useRef(0);
  const isPausedRef = useRef(false);
  const inputRef = useRef<TextInput>(null);

  const currentGroup = viewerGroups[groupIndex];
  const currentStatus: StatusItem | undefined = currentGroup?.statuses[statusIndex];
  const isMyGroup = currentGroup && String(currentGroup.enterprise._id) === String(currentUserId);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const pauseProgress = useCallback(() => {
    if (isPausedRef.current) return;
    isPausedRef.current = true;
    const elapsed = Date.now() - startTimeRef.current + elapsedRef.current;
    elapsedRef.current = elapsed;
    cancelAnimation(progress);
    clearTimer();
  }, []);

  const resumeProgress = useCallback(() => {
    if (!isPausedRef.current) return;
    isPausedRef.current = false;
    const remaining = Math.max(STATUS_DURATION - elapsedRef.current, 0);
    const fromProgress = elapsedRef.current / STATUS_DURATION;
    startTimeRef.current = Date.now();
    progress.value = fromProgress;
    progress.value = withTiming(1, { duration: remaining });
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (!isPausedRef.current) goNext();
    }, remaining);
  }, []);

  const goNext = useCallback(() => {
    clearTimer();
    cancelAnimation(progress);
    setStatusIndex(si => {
      const group = viewerGroups[groupIndex];
      if (!group) return si;
      if (si < group.statuses.length - 1) return si + 1;
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

  useEffect(() => {
    if (!visible || !currentStatus) return;
    elapsedRef.current = 0;
    onViewed(currentStatus._id);
    startOrResume(STATUS_DURATION, 0);
    return () => { clearTimer(); cancelAnimation(progress); };
  }, [visible, groupIndex, statusIndex]);

  useEffect(() => {
    if (visible) { setGroupIndex(initialGroupIndex); setStatusIndex(0); setReplyText(''); }
  }, [visible, initialGroupIndex]);

  // Pause quand input est focus
  useEffect(() => {
    if (inputFocused) pauseProgress();
    else resumeProgress();
  }, [inputFocused]);

  // Gestion clavier
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: KeyboardEvent) => setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);
    const sub1 = Keyboard.addListener(showEvent, onShow);
    const sub2 = Keyboard.addListener(hideEvent, onHide);
    return () => { sub1.remove(); sub2.remove(); };
  }, []);

  const handlePressIn = () => {
    if (inputFocused) return;
    pauseProgress();
  };

  const handlePressOut = () => {
    if (inputFocused) return;
    resumeProgress();
  };

  const handlePress = (e: any) => {
    if (inputFocused) { Keyboard.dismiss(); return; }
    if (e.nativeEvent.pageX < SCREEN_WIDTH * 0.38) goPrev();
    else goNext();
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !currentStatus || !onReplyToStatus) return;
    const text = replyText.trim();
    const enterpriseUserId = String(currentGroup.enterprise._id);
    const preview = currentStatus.type === 'TEXT' ? (currentStatus.text || '') : 'IMAGE';
    setSending(true);
    try {
      const result = await onReplyToStatus(currentStatus, enterpriseUserId, text);
      setReplyText('');
      Keyboard.dismiss();
      onClose();
    } catch {}
    setSending(false);
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

  const bottomInset = insets.bottom > 0 ? insets.bottom : 16;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {renderContent()}

        {/* Zone tactile principale */}
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

        {/* Header */}
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

        {/* Bas : vues (si mon statut) ou input de réponse (si statut d'un autre) */}
        <View
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 12 : bottomInset, paddingHorizontal: 16, paddingTop: 12 }}
          pointerEvents="box-none"
        >
          {isMyGroup ? (
            /* Compteur de vues */
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Ionicons name="eye-outline" size={18} color="rgba(255,255,255,0.85)" />
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Quicksand-SemiBold', fontSize: 14 }}>
                {currentStatus.viewCount ?? 0} vue{(currentStatus.viewCount ?? 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : onReplyToStatus ? (
            /* Input de réponse */
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} pointerEvents="box-none">
              <TextInput
                ref={inputRef}
                value={replyText}
                onChangeText={setReplyText}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Répondre au statut..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: 24,
                  paddingHorizontal: 18,
                  paddingVertical: Platform.OS === 'ios' ? 12 : 8,
                  color: '#fff',
                  fontFamily: 'Quicksand-Medium',
                  fontSize: 15,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.25)',
                }}
                returnKeyType="send"
                onSubmitEditing={handleSendReply}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                onPress={handleSendReply}
                disabled={!replyText.trim() || sending}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: replyText.trim() ? '#10B981' : 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
