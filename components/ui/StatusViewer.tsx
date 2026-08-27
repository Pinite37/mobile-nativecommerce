import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import { ConfirmModal } from './ConfirmModal';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  ActivityIndicator,
  Easing,
  Keyboard,
  KeyboardEvent,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing as ReanimatedEasing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusService, { StatusGroup, StatusItem } from '../../services/api/StatusService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = require('react-native').Dimensions.get('window');
const STATUS_DURATION = 15000;
// Durée à partir de laquelle un appui est considéré comme "long" (pause) plutôt qu'un tap de navigation
const LONG_PRESS_THRESHOLD = 180;

interface StatusViewerProps {
  visible: boolean;
  groups: StatusGroup[];
  initialGroupIndex: number;
  currentUserId: string;
  onClose: () => void;
  onViewed: (statusId: string) => void;
  onDelete?: (statusId: string) => void;
  onReplyToStatus?: (status: StatusItem, enterpriseUserId: string, text: string) => Promise<{ conversationId: string }>;
  onNeedAuth?: () => void;
  onStatusUpdated?: () => void;
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
  onNeedAuth,
  onStatusUpdated,
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
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editText, setEditText] = useState('');
  const [localCaption, setLocalCaption] = useState<string | null>(null);
  const [savingCaption, setSavingCaption] = useState(false);

  const progress = useSharedValue(0);
  // Opacité des barres de progression : masquées pendant un appui long
  const barsOpacity = useSharedValue(1);
  const hideBarsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef(0);
  const startTimeRef = useRef(0);
  const isPausedRef = useRef(false);
  const inputRef = useRef<TextInput>(null);

  // ── Gestion du groupe voisin pendant la transition ──
  const [neighborIndex, setNeighborIndex] = useState<number | null>(null);
  const groupIndexRef = useRef(groupIndex);
  const viewerGroupsLengthRef = useRef(viewerGroups.length);

  // Gesture animated values
  const slideY = useRef(new RNAnimated.Value(0)).current;
  const groupAnimX = useRef(new RNAnimated.Value(0)).current;
  // Offset du voisin : SCREEN_WIDTH quand il arrive par la droite, -SCREEN_WIDTH par la gauche
  const neighborOffsetAnim = useRef(new RNAnimated.Value(SCREEN_WIDTH)).current;
  // Position effective du voisin = groupAnimX + offset
  const neighborPosX = useRef(RNAnimated.add(groupAnimX, neighborOffsetAnim)).current;

  const gestureDir = useRef<'v' | 'h' | null>(null);
  const editingCaptionRef = useRef(false);
  const inputFocusedRef = useRef(false);
  // Utilisé pour réinitialiser groupAnimX APRÈS le re-render (évite le snap-back)
  const pendingResetRef = useRef(false);

  // Fond noir fixe qui s'efface à mesure que le statut glisse vers le bas
  const bgBlackOpacity = slideY.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.72],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // ── Rotation autour de Point G (bas du téléphone) ──
  // θ = posX / SCREEN_HEIGHT  (en radians)
  // Pour une rotation autour du bas :
  //   translateX = (H/2) * sin(θ)
  //   translateY = (H/2) * (1 - cos(θ))   [le centre descend légèrement vers les bords]
  //   rotate = θ
  // Le bas de l'écran reste fixe, le haut trace un arc de disque.
  const R = SCREEN_HEIGHT / 2; // rayon du disque = demi-hauteur
  const discInputRange = [-SCREEN_WIDTH * 2, -SCREEN_WIDTH, 0, SCREEN_WIDTH, SCREEN_WIDTH * 2];
  const makeDiscTx = (posX: RNAnimated.Value | RNAnimated.AnimatedAddition<number>) =>
    posX.interpolate({
      inputRange: discInputRange,
      outputRange: discInputRange.map(x => R * Math.sin(x / SCREEN_HEIGHT)),
      extrapolate: 'clamp',
    });
  const makeDiscTy = (posX: RNAnimated.Value | RNAnimated.AnimatedAddition<number>) =>
    posX.interpolate({
      inputRange: discInputRange,
      outputRange: discInputRange.map(x => R * (1 - Math.cos(x / SCREEN_HEIGHT))),
      extrapolate: 'clamp',
    });
  const makeDiscRot = (posX: RNAnimated.Value | RNAnimated.AnimatedAddition<number>) =>
    posX.interpolate({
      inputRange: discInputRange,
      outputRange: discInputRange.map(x => `${(x / SCREEN_HEIGHT).toFixed(5)}rad`),
      extrapolate: 'clamp',
    });
  const makeDiscOpacity = (posX: RNAnimated.Value | RNAnimated.AnimatedAddition<number>) =>
    posX.interpolate({
      inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      outputRange: [0.55, 1, 0.55],
      extrapolate: 'clamp',
    });

  const currentTx = makeDiscTx(groupAnimX);
  const currentTy = makeDiscTy(groupAnimX);
  const currentRot = makeDiscRot(groupAnimX);
  const currentOpacity = makeDiscOpacity(groupAnimX);

  const neighborTx = makeDiscTx(neighborPosX);
  const neighborTy = makeDiscTy(neighborPosX);
  const neighborRot = makeDiscRot(neighborPosX);
  const neighborOpacity = makeDiscOpacity(neighborPosX);

  const navigateGroupRef = useRef<(dir: 1 | -1) => void>(() => {});
  useEffect(() => {
    groupIndexRef.current = groupIndex;
    viewerGroupsLengthRef.current = viewerGroups.length;
  }, [groupIndex, viewerGroups.length]);

  useEffect(() => {
    navigateGroupRef.current = (dir: 1 | -1) => {
      const target = groupIndexRef.current + dir;
      if (target < 0 || target >= viewerGroupsLengthRef.current) {
        // Pas de voisin dans ce sens — rebond
        RNAnimated.spring(groupAnimX, { toValue: 0, useNativeDriver: true, tension: 200, friction: 12 }).start();
        setNeighborIndex(null);
        return;
      }
      // S'assurer que le voisin est prêt (peut déjà être positionné depuis le geste)
      const exitX = dir === 1 ? -SCREEN_WIDTH * 1.05 : SCREEN_WIDTH * 1.05;
      neighborOffsetAnim.setValue(dir === 1 ? SCREEN_WIDTH : -SCREEN_WIDTH);
      setNeighborIndex(target);

      // Le groupe courant pivote et sort, le voisin arrive automatiquement au centre
      RNAnimated.timing(groupAnimX, {
        toValue: exitX,
        duration: 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        // Ne PAS resetGroupAnimX ici : le setState déclenche un re-render,
        // puis useLayoutEffect reset groupAnimX à 0 AVANT le paint natif.
        // Cela évite le snap-back de l'ancien contenu au centre.
        pendingResetRef.current = true;
        setGroupIndex(target);
        setStatusIndex(0);
        setNeighborIndex(null);
      });
    };
  }, [groupIndex, viewerGroups.length]);

  // Reset groupAnimX après le re-render (nouveau contenu en place) → pas de snap-back visible
  useLayoutEffect(() => {
    if (pendingResetRef.current) {
      pendingResetRef.current = false;
      groupAnimX.setValue(0);
    }
  }, [groupIndex]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    // Phase capture : on vole le geste au Pressable dès qu'il y a un mouvement significatif
    onMoveShouldSetPanResponderCapture: (_, gs) => {
      if (editingCaptionRef.current || inputFocusedRef.current) return false;
      const absX = Math.abs(gs.dx);
      const absY = Math.abs(gs.dy);
      if (absX < 8 && absY < 8) return false;
      gestureDir.current = absY > absX * 1.1 ? 'v' : 'h';

      if (gestureDir.current === 'h') {
        // Préparer le voisin selon la direction du geste
        const dir = gs.dx < 0 ? 1 : -1; // gauche → prochain (1), droite → précédent (-1)
        const ni = groupIndexRef.current + dir;
        if (ni >= 0 && ni < viewerGroupsLengthRef.current) {
          neighborOffsetAnim.setValue(dir === 1 ? SCREEN_WIDTH : -SCREEN_WIDTH);
          setNeighborIndex(ni);
        }
      }
      return true;
    },
    onPanResponderGrant: () => {},
    onPanResponderMove: (_, gs) => {
      if (gestureDir.current === 'v') {
        if (gs.dy > 0) slideY.setValue(gs.dy);
      } else if (gestureDir.current === 'h') {
        groupAnimX.setValue(gs.dx);
      }
    },
    onPanResponderRelease: (_, gs) => {
      const dir = gestureDir.current;
      gestureDir.current = null;
      if (dir === 'v') {
        if (gs.dy > 90 || gs.vy > 0.7) {
          RNAnimated.timing(slideY, { toValue: SCREEN_HEIGHT, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true })
            .start(() => { onClose(); });
        } else if (gs.dy < -55 || gs.vy < -0.5) {
          RNAnimated.spring(slideY, { toValue: 0, useNativeDriver: true }).start();
          setTimeout(() => inputRef.current?.focus(), 50);
        } else {
          RNAnimated.spring(slideY, { toValue: 0, useNativeDriver: true }).start();
        }
      } else if (dir === 'h') {
        const THRESHOLD = SCREEN_WIDTH * 0.28;
        if (gs.dx < -THRESHOLD || gs.vx < -0.55) navigateGroupRef.current(1);
        else if (gs.dx > THRESHOLD || gs.vx > 0.55) navigateGroupRef.current(-1);
        else {
          RNAnimated.spring(groupAnimX, { toValue: 0, useNativeDriver: true, tension: 200, friction: 12 }).start();
          setNeighborIndex(null);
        }
      }
    },
    onPanResponderTerminate: () => {
      gestureDir.current = null;
      RNAnimated.spring(slideY, { toValue: 0, useNativeDriver: true }).start();
      RNAnimated.spring(groupAnimX, { toValue: 0, useNativeDriver: true }).start();
      setNeighborIndex(null);
    },
  })).current;

  const currentGroup = viewerGroups[groupIndex];
  const currentStatus: StatusItem | undefined = currentGroup?.statuses[statusIndex];
  const isMyGroup = currentGroup && String(currentGroup.enterprise._id) === String(currentUserId);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const barsStyle = useAnimatedStyle(() => ({
    opacity: barsOpacity.value,
  }));

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const clearHideBarsTimer = () => {
    if (hideBarsTimerRef.current) { clearTimeout(hideBarsTimerRef.current); hideBarsTimerRef.current = null; }
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
    setLocalImageUri(null);
    setEditingCaption(false);
    setEditText('');
    setLocalCaption(null);
    if (currentStatus.type !== 'TEXT' && currentStatus.imageUrl) {
      console.log('[StatusViewer] imageUrl:', currentStatus.imageUrl);
      const dest = `${FileSystem.cacheDirectory}status_${currentStatus._id}.jpg`;
      FileSystem.downloadAsync(currentStatus.imageUrl, dest)
        .then(({ uri }) => {
          console.log('[StatusViewer] download OK → localUri:', uri);
          return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        })
        .then(b64 => {
          const dataUri = `data:image/jpeg;base64,${b64}`;
          console.log('[StatusViewer] data URI ready, longueur base64:', b64.length);
          setLocalImageUri(dataUri);
        })
        .catch(err => {
          console.warn('[StatusViewer] download/read error → fallback HTTPS:', err?.message);
          setLocalImageUri(currentStatus.imageUrl!);
        });
    }
    onViewed(currentStatus._id);
    startOrResume(STATUS_DURATION, 0);
    // Les barres sont toujours visibles à l'ouverture d'un nouveau statut
    clearHideBarsTimer();
    barsOpacity.value = 1;
    return () => { clearTimer(); clearHideBarsTimer(); cancelAnimation(progress); };
  }, [visible, groupIndex, statusIndex]);

  useEffect(() => {
    if (visible) {
      setGroupIndex(initialGroupIndex);
      setStatusIndex(0);
      setReplyText('');
      slideY.setValue(0); // s'assurer que slideY est à 0 à l'ouverture
    } else {
      // Reset après fermeture — le Modal est déjà caché, pas de snap visible
      slideY.setValue(0);
    }
  }, [visible, initialGroupIndex]);

  // Pause quand input est focus ou en édition de légende
  useEffect(() => {
    editingCaptionRef.current = editingCaption;
    if (inputFocused || editingCaption) pauseProgress();
    else resumeProgress();
  }, [inputFocused, editingCaption]);

  useEffect(() => { inputFocusedRef.current = inputFocused; }, [inputFocused]);

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
    pressStartTimeRef.current = Date.now();
    pauseProgress();
    // Masquer les barres + header seulement si l'appui se prolonge (évite le clignotement sur un tap)
    clearHideBarsTimer();
    hideBarsTimerRef.current = setTimeout(() => {
      barsOpacity.value = withTiming(0, {
        duration: 320,
        easing: ReanimatedEasing.out(ReanimatedEasing.quad),
      });
    }, LONG_PRESS_THRESHOLD);
  };

  const handlePressOut = () => {
    if (inputFocused) return;
    resumeProgress();
    clearHideBarsTimer();
    barsOpacity.value = withTiming(1, {
      duration: 160,
      easing: ReanimatedEasing.out(ReanimatedEasing.quad),
    });
  };

  const handlePress = (e: any) => {
    if (inputFocused || editingCaption) { Keyboard.dismiss(); return; }
    // Un appui long (relâché après le seuil) ne doit pas déclencher la navigation
    if (Date.now() - pressStartTimeRef.current > LONG_PRESS_THRESHOLD) return;
    if (e.nativeEvent.pageX < SCREEN_WIDTH * 0.38) goPrev();
    else goNext();
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !currentStatus) return;
    if (!onReplyToStatus) {
      // Pas connecté → demander la connexion
      onNeedAuth?.();
      return;
    }
    const text = replyText.trim();
    const enterpriseUserId = String(currentGroup.enterprise._id);
    setSending(true);
    try {
      await onReplyToStatus(currentStatus, enterpriseUserId, text);
      setReplyText('');
      Keyboard.dismiss();
      onClose();
    } catch {}
    setSending(false);
  };

  if (!currentGroup || !currentStatus) return null;

  const captionText = localCaption ?? currentStatus.text ?? '';
  const canEditCaption = isMyGroup &&
    currentStatus.type === 'IMAGE_TEXT' &&
    (Date.now() - new Date(currentStatus.createdAt).getTime()) < 15 * 60 * 1000;
  const captionBottom = editingCaption && keyboardHeight > 0 ? keyboardHeight + 10 : 80 + insets.bottom;

  const handleSaveCaption = async () => {
    if (!editText.trim() || savingCaption) return;
    setSavingCaption(true);
    try {
      await StatusService.updateText(currentStatus._id, editText.trim());
      setLocalCaption(editText.trim());
      setEditingCaption(false);
      Keyboard.dismiss();
      onStatusUpdated?.();
    } catch {}
    setSavingCaption(false);
  };

  // Rendu léger du groupe voisin pendant la transition (image ou couleur du premier statut)
  const renderNeighborContent = (idx: number) => {
    const group = viewerGroups[idx];
    if (!group) return null;
    const status = group.statuses[0];
    if (!status) return null;
    if (status.type === 'TEXT') {
      return (
        <View style={{ flex: 1, backgroundColor: status.backgroundColor, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ color: status.textColor, fontSize: 28, fontFamily: 'Poppins-Bold', textAlign: 'center', lineHeight: 38 }}>
            {status.text}
          </Text>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {status.imageUrl && (
          <Image source={{ uri: status.imageUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (currentStatus.type === 'TEXT') {
      return (
        <View style={{ flex: 1, backgroundColor: currentStatus.backgroundColor, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ color: currentStatus.textColor, fontSize: 28, fontFamily: 'Poppins-Bold', textAlign: 'center', lineHeight: 38 }}>
            {currentStatus.text}
          </Text>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {localImageUri ? (
          <Image
            source={{ uri: localImageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />
        ) : (
          <ActivityIndicator
            size="large"
            color="rgba(255,255,255,0.5)"
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>
    );
  };

  const bottomInset = insets.bottom > 0 ? insets.bottom : 16;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar style="light" />
      {/* Fond noir fixe : s'estompe quand le statut glisse vers le bas, révélant la page en-dessous */}
      <RNAnimated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: bgBlackOpacity }]}
        pointerEvents="none"
      />
      {/* Wrapper glissant : gère uniquement le slide-down pour fermer */}
      <RNAnimated.View
        style={{ flex: 1, transform: [{ translateY: slideY }] }}
        {...panResponder.panHandlers}
      >
        {/* Groupe voisin : apparaît en arrière-plan, arrive depuis le côté */}
        {neighborIndex !== null && viewerGroups[neighborIndex] && (
          <RNAnimated.View
            style={[
              StyleSheet.absoluteFill,
              {
                transform: [
                  { translateX: neighborTx },
                  { translateY: neighborTy },
                  { rotate: neighborRot },
                ],
                opacity: neighborOpacity,
              },
            ]}
          >
            {renderNeighborContent(neighborIndex)}
          </RNAnimated.View>
        )}

        {/* Groupe courant : pivote et sort pendant la transition */}
        <RNAnimated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                { translateX: currentTx },
                { translateY: currentTy },
                { rotate: currentRot },
              ],
              opacity: currentOpacity,
            },
          ]}
        >
        {renderContent()}

        {/* Zone tactile principale */}
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
        />

        {/* Légende — rendue après la Pressable (z-order supérieur) */}
        {currentStatus.type === 'IMAGE_TEXT' && captionText && !editingCaption ? (
          <View style={{ position: 'absolute', bottom: captionBottom, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {canEditCaption && (
                  <TouchableOpacity onPress={() => { setEditText(captionText); setEditingCaption(true); }} style={{ padding: 3 }}>
                    <Ionicons name="pencil" size={14} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                )}
                <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Poppins-SemiBold', textAlign: 'center', flexShrink: 1 }}>
                  {captionText}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Input d'édition de légende — même style que la réponse au statut */}
        {editingCaption && (
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + (Platform.OS === 'ios' ? 12 : 24) : bottomInset,
            paddingHorizontal: 16, paddingTop: 12,
            flexDirection: 'row', alignItems: 'center', gap: 10,
          }}>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              autoFocus
              multiline
              maxLength={300}
              placeholder="Modifier la légende..."
              placeholderTextColor="rgba(255,255,255,0.55)"
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.45)',
                borderRadius: 24,
                paddingHorizontal: 18,
                paddingVertical: Platform.OS === 'ios' ? 12 : 8,
                color: '#fff',
                fontFamily: 'Poppins-Medium',
                fontSize: 15,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)',
              }}
            />
            <TouchableOpacity
              onPress={handleSaveCaption}
              disabled={savingCaption}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}
            >
              {savingCaption
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="checkmark" size={22} color="#fff" />}
            </TouchableOpacity>
          </View>
        )}

        {/* Barres de progression */}
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: insets.top + 8, left: 8, right: 8, flexDirection: 'row', gap: 3 }, barsStyle]}
        >
          {currentGroup.statuses.map((_, i) => (
            <View key={i} style={{ flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' }}>
              {i < statusIndex && <View style={{ flex: 1, backgroundColor: '#fff' }} />}
              {i === statusIndex && (
                <Animated.View style={[{ height: '100%', backgroundColor: '#fff', borderRadius: 2 }, progressStyle]} />
              )}
            </View>
          ))}
        </Animated.View>

        {/* Header */}
        <Animated.View style={[{ position: 'absolute', top: insets.top + 20, left: 12, right: 12, flexDirection: 'row', alignItems: 'center' }, barsStyle]}>
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
            <Text style={{ color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 14 }}>
              {currentGroup.enterprise.companyName || `${currentGroup.enterprise.firstName} ${currentGroup.enterprise.lastName}`}
            </Text>
          </View>
          {isMyGroup && onDelete && (
            <TouchableOpacity
              onPress={() => setConfirmDeleteVisible(true)}
              style={{ padding: 6 }}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Bas : vues (si mon statut) ou input de réponse (si statut d'un autre) */}
        <View
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: keyboardHeight > 0 ? keyboardHeight + (Platform.OS === 'android' ? 24 : 12) : bottomInset, paddingHorizontal: 16, paddingTop: 12 }}
          pointerEvents="box-none"
        >
          {!editingCaption && isMyGroup ? (
            /* Compteur de vues */
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Ionicons name="eye-outline" size={18} color="rgba(255,255,255,0.85)" />
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Poppins-SemiBold', fontSize: 14 }}>
                {currentStatus.viewCount ?? 0} vue{(currentStatus.viewCount ?? 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : !editingCaption && (onReplyToStatus || onNeedAuth) ? (
            /* Input de réponse */
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} pointerEvents="box-none">
              <TextInput
                ref={inputRef}
                value={replyText}
                onChangeText={setReplyText}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Répondre au statut..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  borderRadius: 24,
                  paddingHorizontal: 18,
                  paddingVertical: Platform.OS === 'ios' ? 12 : 8,
                  color: '#fff',
                  fontFamily: 'Poppins-Medium',
                  fontSize: 15,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.3)',
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
        </RNAnimated.View>{/* fin groupe courant */}
      </RNAnimated.View>{/* fin wrapper externe */}

      <ConfirmModal
        visible={confirmDeleteVisible}
        title="Supprimer ce statut ?"
        message="Cette action est irréversible."
        onConfirm={() => {
          setConfirmDeleteVisible(false);
          onDelete!(currentStatus._id);
          goNext();
        }}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
    </Modal>
  );
}
