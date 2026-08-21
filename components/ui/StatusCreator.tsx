import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library/legacy';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardEvent,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusService, { CreateStatusPayload } from '../../services/api/StatusService';
import { StatusImageEditor } from './StatusImageEditor';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMB_SIZE = Math.floor(SCREEN_WIDTH / 3);
const BG_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', '#1F2937'];

type Screen = 'gallery' | 'text_editor' | 'image_editing' | 'image_preview';

interface StatusCreatorProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function StatusCreator({ visible, onClose, onCreated }: StatusCreatorProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [screen, setScreen] = useState<Screen>('gallery');
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);

  const [rawPickedBase64, setRawPickedBase64] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageDisplayUri, setImageDisplayUri] = useState<string | null>(null);

  const [caption, setCaption] = useState('');
  const [statusText, setStatusText] = useState('');
  const [bgColor, setBgColor] = useState('#10B981');
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: KeyboardEvent) => setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);
    const s1 = Keyboard.addListener(showEvent, onShow);
    const s2 = Keyboard.addListener(hideEvent, onHide);
    return () => { s1.remove(); s2.remove(); };
  }, []);

  const reset = () => {
    setScreen('gallery');
    setAssets([]);
    setRawPickedBase64(null);
    setImageBase64(null);
    setImageDisplayUri(null);
    setCaption('');
    setStatusText('');
    setBgColor('#10B981');
    setSubmitting(false);
    setLoadingImage(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const loadGallery = useCallback(async () => {
    setLoadingGallery(true);
    const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
    setPermissionStatus(status);
    if (status === 'granted') {
      const { assets: a } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 60,
        sortBy: 'creationTime' as any,
      });
      setAssets(a);
    }
    setLoadingGallery(false);
  }, []);

  useEffect(() => {
    if (visible) {
      setScreen('gallery');
      loadGallery();
    } else {
      reset();
    }
  }, [visible]);

  const handleSelectAsset = async (asset: MediaLibrary.Asset) => {
    setLoadingImage(true);
    let b64: string | null = null;

    // 1er essai : expo-file-system (le plus fiable)
    try {
      const info = await MediaLibrary.getAssetInfoAsync(asset);
      const uri = info.localUri || asset.uri;
      b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {}

    // 2e essai : fetch + ArrayBuffer sur localUri (ph:// non fetchable, file:// oui)
    if (!b64) {
      try {
        const info2 = await MediaLibrary.getAssetInfoAsync(asset);
        const uri2 = info2.localUri || asset.uri;
        const response = await fetch(uri2);
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const chunk = 8192;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        b64 = btoa(binary);
      } catch {}
    }

    if (b64) {
      setRawPickedBase64(b64);
      setScreen('image_editing');
    }
    // Si les deux échouent on reste sur la galerie (rien ne se passe)
    setLoadingImage(false);
  };

  const handleEditorConfirm = (editedBase64: string) => {
    setImageBase64(editedBase64);
    setImageDisplayUri(`data:image/jpeg;base64,${editedBase64}`);
    setScreen('image_preview');
  };

  const handleEditorClose = () => {
    setRawPickedBase64(null);
    setScreen('gallery');
  };

  const handleSubmitText = async () => {
    if (!statusText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await StatusService.create({
        type: 'TEXT',
        text: statusText.trim(),
        backgroundColor: bgColor,
        textColor: '#FFFFFF',
      });
      reset(); onCreated();
    } catch {}
    setSubmitting(false);
  };

  const handleSubmitImage = async () => {
    if (!imageBase64 || submitting) return;
    setSubmitting(true);
    try {
      const payload: CreateStatusPayload = {
        type: caption.trim() ? 'IMAGE_TEXT' : 'IMAGE',
        text: caption.trim() || undefined,
        imageBase64,
        backgroundColor: bgColor,
        textColor: '#FFFFFF',
      };
      await StatusService.create(payload);
      reset(); onCreated();
    } catch {}
    setSubmitting(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>

      {/* ─── Éditeur dessin ─── */}
      {screen === 'image_editing' && rawPickedBase64 ? (
        <StatusImageEditor
          imageBase64={rawPickedBase64}
          onConfirm={handleEditorConfirm}
          onClose={handleEditorClose}
        />

      ) : screen === 'text_editor' ? (
        /* ─── Éditeur texte plein écran ─── */
        <View style={{ flex: 1, backgroundColor: bgColor }}>
          <View style={{
            paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 10,
            flexDirection: 'row', alignItems: 'center',
          }}>
            <TouchableOpacity onPress={() => setScreen('gallery')} style={{ padding: 8, marginRight: 8 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={handleSubmitText}
              disabled={!statusText.trim() || submitting}
              style={{
                backgroundColor: statusText.trim() ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
                borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10,
                borderWidth: 1.5,
                borderColor: statusText.trim() ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
              }}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ color: '#fff', fontFamily: 'Quicksand-Bold', fontSize: 15 }}>Publier</Text>}
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>
            <TextInput
              value={statusText}
              onChangeText={setStatusText}
              placeholder="Écrivez votre statut..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              multiline
              autoFocus
              maxLength={500}
              style={{
                color: '#fff', fontFamily: 'Quicksand-Bold', fontSize: 26,
                textAlign: 'center', textAlignVertical: 'center', lineHeight: 36,
              }}
            />
          </View>

          <View style={{
            paddingBottom: insets.bottom + 20, paddingHorizontal: 24,
            flexDirection: 'row', justifyContent: 'center', gap: 14,
          }}>
            {BG_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setBgColor(c)}
                style={{
                  width: 34, height: 34, borderRadius: 17, backgroundColor: c,
                  borderWidth: bgColor === c ? 3 : 1.5,
                  borderColor: bgColor === c ? '#fff' : 'rgba(255,255,255,0.35)',
                  transform: [{ scale: bgColor === c ? 1.18 : 1 }],
                }}
              />
            ))}
          </View>
        </View>

      ) : screen === 'image_preview' ? (
        /* ─── Aperçu image (tel que posté) ─── */
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <Image
            source={{ uri: imageDisplayUri! }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />
          <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16 }}>
            <TouchableOpacity
              onPress={() => setScreen('gallery')}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(0,0,0,0.45)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            paddingBottom: keyboardHeight > 0
              ? keyboardHeight + (Platform.OS === 'ios' ? 12 : 16)
              : insets.bottom + 14,
            paddingHorizontal: 16, paddingTop: 12,
            flexDirection: 'row', alignItems: 'center', gap: 10,
          }}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Ajoutez une légende..."
              placeholderTextColor="rgba(255,255,255,0.55)"
              maxLength={300}
              style={{
                flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: 24, paddingHorizontal: 18,
                paddingVertical: Platform.OS === 'ios' ? 12 : 8,
                color: '#fff', fontFamily: 'Quicksand-Medium', fontSize: 15,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
              }}
            />
            <TouchableOpacity
              onPress={handleSubmitImage}
              disabled={submitting}
              style={{
                width: 50, height: 50, borderRadius: 25,
                backgroundColor: '#10B981',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={22} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>

      ) : (
        /* ─── Galerie ─── */
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View style={{
            paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 12,
            flexDirection: 'row', alignItems: 'center',
            borderBottomWidth: 1, borderBottomColor: colors.border,
          }}>
            <TouchableOpacity onPress={handleClose} style={{ padding: 4, marginRight: 12 }}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontFamily: 'Quicksand-Bold', flex: 1 }}>
              Nouveau statut
            </Text>
          </View>

          {/* Contenu */}
          {loadingGallery ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#10B981" />
            </View>
          ) : permissionStatus !== 'granted' ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36 }}>
              <Ionicons name="images-outline" size={60} color={colors.textTertiary} />
              <Text style={{
                color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold',
                fontSize: 16, textAlign: 'center', marginTop: 18, lineHeight: 24,
              }}>
                Autorisez l'accès à votre galerie pour choisir une photo
              </Text>
              <TouchableOpacity
                onPress={loadGallery}
                style={{ marginTop: 22, backgroundColor: '#10B981', borderRadius: 22, paddingHorizontal: 26, paddingVertical: 11 }}
              >
                <Text style={{ color: '#fff', fontFamily: 'Quicksand-Bold', fontSize: 15 }}>Autoriser</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={assets}
              keyExtractor={a => a.id}
              numColumns={3}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectAsset(item)}
                  disabled={loadingImage}
                  style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
            />
          )}

          {/* Bouton "Aa Texte" flottant en bas */}
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            paddingBottom: insets.bottom + 10, paddingTop: 12, paddingHorizontal: 24,
            flexDirection: 'row', justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(10,10,10,0.85)' : 'rgba(255,255,255,0.92)',
            borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
          }}>
            <TouchableOpacity
              onPress={() => setScreen('text_editor')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: '#10B981',
                borderRadius: 26, paddingHorizontal: 28, paddingVertical: 13,
              }}
            >
              <Text style={{ color: '#fff', fontFamily: 'Quicksand-Bold', fontSize: 17 }}>Aa</Text>
              <Text style={{ color: '#fff', fontFamily: 'Quicksand-SemiBold', fontSize: 15 }}>Statut texte</Text>
            </TouchableOpacity>
          </View>

          {/* Overlay chargement photo sélectionnée */}
          {loadingImage && (
            <View style={[StyleSheet.absoluteFill, {
              backgroundColor: 'rgba(0,0,0,0.45)',
              justifyContent: 'center', alignItems: 'center',
            }]}>
              <ActivityIndicator size="large" color="#10B981" />
            </View>
          )}
        </View>
      )}
    </Modal>
  );
}
