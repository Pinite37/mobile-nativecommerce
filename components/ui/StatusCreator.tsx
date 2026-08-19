import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusService, { CreateStatusPayload } from '../../services/api/StatusService';

interface StatusCreatorProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TEXT_BG_OPTIONS = [
  { color: '#10B981', label: 'Vert' },
  { color: '#3B82F6', label: 'Bleu' },
  { color: '#8B5CF6', label: 'Violet' },
  { color: '#EF4444', label: 'Rouge' },
  { color: '#F59E0B', label: 'Ambre' },
  { color: '#1F2937', label: 'Sombre' },
];

type TabType = 'TEXT' | 'IMAGE' | 'IMAGE_TEXT';

export function StatusCreator({ visible, onClose, onCreated }: StatusCreatorProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<TabType>('TEXT');
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState('#10B981');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setText('');
    setBgColor('#10B981');
    setImageBase64(null);
    setImageUri(null);
    setTab('TEXT');
  };

  const handleClose = () => { reset(); onClose(); };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
      allowsEditing: true,
      aspect: [9, 16],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  const handleSubmit = async () => {
    if (tab === 'TEXT' && !text.trim()) return;
    if ((tab === 'IMAGE' || tab === 'IMAGE_TEXT') && !imageBase64) return;
    if (tab === 'IMAGE_TEXT' && !text.trim()) return;

    setSubmitting(true);
    try {
      const payload: CreateStatusPayload = {
        type: tab,
        text: text.trim() || undefined,
        imageBase64: imageBase64 || undefined,
        backgroundColor: bgColor,
        textColor: '#FFFFFF',
      };
      await StatusService.create(payload);
      reset();
      onCreated();
    } catch (e) {
      // silently ignore for now
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    (tab === 'TEXT' && text.trim().length > 0) ||
    (tab === 'IMAGE' && !!imageBase64) ||
    (tab === 'IMAGE_TEXT' && !!imageBase64 && text.trim().length > 0);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <TouchableOpacity onPress={handleClose} style={{ marginRight: 12 }}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontFamily: 'Quicksand-Bold', flex: 1 }}>
            Nouveau statut
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            style={{ backgroundColor: canSubmit ? '#10B981' : colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontFamily: 'Quicksand-Bold', fontSize: 14 }}>Publier</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Type tabs */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
          {(['TEXT', 'IMAGE', 'IMAGE_TEXT'] as TabType[]).map(t => {
            const labels = { TEXT: 'Texte', IMAGE: 'Image', IMAGE_TEXT: 'Image + légende' };
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: tab === t ? '#10B981' : (isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6'),
                }}
              >
                <Text style={{ color: tab === t ? '#fff' : colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 13 }}>
                  {labels[t]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

            {/* Image picker */}
            {(tab === 'IMAGE' || tab === 'IMAGE_TEXT') && (
              <TouchableOpacity
                onPress={pickImage}
                style={{
                  height: 220, borderRadius: 20, overflow: 'hidden',
                  backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                  justifyContent: 'center', alignItems: 'center',
                  borderWidth: imageUri ? 0 : 2, borderColor: colors.border, borderStyle: 'dashed',
                }}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="image-outline" size={40} color={colors.textTertiary} />
                    <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold', marginTop: 8 }}>
                      Choisir une image
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Text input */}
            {(tab === 'TEXT' || tab === 'IMAGE_TEXT') && (
              <View>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 13, marginBottom: 8 }}>
                  {tab === 'IMAGE_TEXT' ? 'Légende' : 'Votre message'}
                </Text>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={tab === 'IMAGE_TEXT' ? 'Ajoutez une légende...' : 'Écrivez votre statut...'}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  maxLength={500}
                  style={{
                    color: colors.textPrimary, backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                    borderRadius: 16, padding: 16, fontFamily: 'Quicksand-Medium', fontSize: 16,
                    minHeight: tab === 'TEXT' ? 140 : 80, textAlignVertical: 'top',
                    borderWidth: 1, borderColor: colors.border,
                  }}
                />
                <Text style={{ color: colors.textTertiary, fontSize: 12, fontFamily: 'Quicksand-Medium', textAlign: 'right', marginTop: 4 }}>
                  {text.length}/500
                </Text>
              </View>
            )}

            {/* Background color (TEXT only) */}
            {tab === 'TEXT' && (
              <View>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 13, marginBottom: 10 }}>
                  Couleur de fond
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {TEXT_BG_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.color}
                      onPress={() => setBgColor(opt.color)}
                      style={{
                        width: 36, height: 36, borderRadius: 18, backgroundColor: opt.color,
                        borderWidth: bgColor === opt.color ? 3 : 0, borderColor: '#fff',
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Aperçu (TEXT) */}
            {tab === 'TEXT' && text.trim().length > 0 && (
              <View>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 13, marginBottom: 10 }}>
                  Aperçu
                </Text>
                <View style={{ height: 160, borderRadius: 20, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                  <Text style={{ color: '#fff', fontFamily: 'Quicksand-Bold', fontSize: 20, textAlign: 'center' }}>
                    {text}
                  </Text>
                </View>
              </View>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
