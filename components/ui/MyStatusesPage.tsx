import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ConfirmModal } from './ConfirmModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusService, { StatusItem } from '../../services/api/StatusService';
import { StatusViewer } from './StatusViewer';

const THUMB_W = 62;
const THUMB_H = 93;

interface MyStatusesPageProps {
  visible: boolean;
  onClose: () => void;
  onOpenCreator: () => void;
  currentUserId: string;
}

function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}j`;
  if (h >= 1) return `il y a ${h}h`;
  if (m >= 1) return `il y a ${m}min`;
  return "à l'instant";
}

export function MyStatusesPage({ visible, onClose, onOpenCreator, currentUserId }: MyStatusesPageProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewerStatus, setViewerStatus] = useState<StatusItem | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const selectionAnim = useRef(new Animated.Value(0)).current;
  const checkboxAnims = useRef(new Map<string, Animated.Value>()).current;

  const getCheckAnim = useCallback((id: string) => {
    if (!checkboxAnims.has(id)) checkboxAnims.set(id, new Animated.Value(0));
    return checkboxAnims.get(id)!;
  }, [checkboxAnims]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await StatusService.getMine();
      setStatuses([...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible) {
      load();
    } else {
      setSelectionMode(false);
      setSelectedIds(new Set());
      selectionAnim.setValue(0);
      checkboxAnims.forEach(a => a.setValue(0));
      setViewerStatus(null);
    }
  }, [visible]);

  const exitSelection = useCallback(() => {
    Animated.timing(selectionAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setSelectionMode(false);
      setSelectedIds(new Set());
      checkboxAnims.forEach(a => a.setValue(0));
    });
  }, [selectionAnim, checkboxAnims]);

  const enterSelection = useCallback((firstId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([firstId]));
    Animated.spring(selectionAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }).start();
    Animated.spring(getCheckAnim(firstId), { toValue: 1, tension: 220, friction: 5, useNativeDriver: true }).start();
  }, [selectionAnim, getCheckAnim]);

  const toggleItem = useCallback((id: string) => {
    const anim = getCheckAnim(id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        Animated.spring(anim, { toValue: 0, tension: 220, friction: 5, useNativeDriver: true }).start();
        if (next.size === 0) exitSelection();
      } else {
        next.add(id);
        Animated.spring(anim, { toValue: 1, tension: 220, friction: 5, useNativeDriver: true }).start();
      }
      return next;
    });
  }, [getCheckAnim, exitSelection]);

  const handlePress = useCallback((status: StatusItem) => {
    if (selectionMode) {
      toggleItem(status._id);
    } else {
      setViewerStatus(status);
    }
  }, [selectionMode, toggleItem]);

  const handleLongPress = useCallback((id: string) => {
    if (!selectionMode) enterSelection(id);
  }, [selectionMode, enterSelection]);

  const confirmDelete = useCallback(() => {
    setConfirmVisible(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setConfirmVisible(false);
    await Promise.all([...selectedIds].map(id => StatusService.remove(id).catch(() => {})));
    exitSelection();
    load();
  }, [selectedIds, exitSelection, load]);

  const renderItem = useCallback(({ item }: { item: StatusItem }) => {
    const checkAnim = getCheckAnim(item._id);
    const isSelected = selectedIds.has(item._id);

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item._id)}
        delayLongPress={370}
        style={[styles.item, { borderBottomColor: colors.border }]}
      >
        {/* Miniature */}
        <View style={[styles.thumb, { backgroundColor: colors.surface }]}>
          {item.type === 'TEXT' ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: item.backgroundColor, justifyContent: 'center', alignItems: 'center', padding: 5 }]}>
              <Text style={{ color: item.textColor, fontSize: 8, fontFamily: 'Quicksand-Bold', textAlign: 'center' }} numberOfLines={5}>
                {item.text}
              </Text>
            </View>
          ) : item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : null}

          {/* Overlay de sélection */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.selectOverlay, { opacity: selectionAnim }]}>
            <Animated.View style={[
              styles.checkbox,
              isSelected && styles.checkboxSelected,
              { transform: [{ scale: checkAnim }] },
            ]}>
              {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
            </Animated.View>
          </Animated.View>
        </View>

        {/* Infos */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textTertiary, fontSize: 12, fontFamily: 'Quicksand-SemiBold', marginBottom: 5 }}>
            {relativeTime(item.createdAt)}
          </Text>
          {(item.type === 'TEXT' || item.type === 'IMAGE_TEXT') && item.text ? (
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontFamily: 'Quicksand-Medium', marginBottom: 7, lineHeight: 20 }} numberOfLines={2}>
              {item.text}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="eye-outline" size={14} color="#10B981" />
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'Quicksand-Bold' }}>
              {item.viewCount ?? 0} vue{(item.viewCount ?? 0) !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, selectionAnim, selectedIds, handlePress, handleLongPress, getCheckAnim]);

  const viewerGroup = viewerStatus ? [{
    enterprise: viewerStatus.enterprise as any,
    statuses: [viewerStatus],
    hasUnviewed: false,
  }] : [];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={selectionMode ? exitSelection : onClose}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 6, borderBottomColor: colors.border }]}>
          {selectionMode ? (
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={exitSelection} style={styles.headerBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.textPrimary, flex: 1 }]}>
                {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </Text>
              <TouchableOpacity onPress={confirmDelete} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.deleteBtnText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.textPrimary, flex: 1 }]}>Mes statuts</Text>
              <TouchableOpacity onPress={onOpenCreator} style={styles.addBtn}>
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Contenu */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : statuses.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
            <Ionicons name="albums-outline" size={56} color={colors.textTertiary} />
            <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 16, textAlign: 'center', marginTop: 18, lineHeight: 24 }}>
              Vous n'avez aucun statut actif
            </Text>
            <TouchableOpacity onPress={onOpenCreator} style={styles.createBtn}>
              <Text style={{ color: '#fff', fontFamily: 'Quicksand-Bold', fontSize: 15 }}>Créer un statut</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={statuses}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          />
        )}
      </View>

      {/* Confirmation suppression */}
      <ConfirmModal
        visible={confirmVisible}
        title={`Supprimer ${selectedIds.size} statut${selectedIds.size > 1 ? 's' : ''} ?`}
        message="Cette action est irréversible."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmVisible(false)}
      />

      {/* StatusViewer pour visualiser le statut cliqué */}
      {viewerStatus && (
        <StatusViewer
          visible={!!viewerStatus}
          groups={viewerGroup}
          initialGroupIndex={0}
          currentUserId={currentUserId}
          onClose={() => setViewerStatus(null)}
          onViewed={() => {}}
          onStatusUpdated={load}
          onDelete={async (statusId) => {
            await StatusService.remove(statusId).catch(() => {});
            setViewerStatus(null);
            load();
          }}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Quicksand-Bold',
  },
  headerBtn: {
    padding: 6,
    marginRight: 10,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  deleteBtnText: {
    color: '#EF4444',
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 14,
  },
  selectOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  createBtn: {
    marginTop: 22,
    backgroundColor: '#10B981',
    borderRadius: 22,
    paddingHorizontal: 26,
    paddingVertical: 11,
  },
});
