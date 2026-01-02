import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import i18n from '../../i18n/i18n';
import { useToast } from './ToastManager';

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (imageData: { uri: string; base64: string; mimeType: string }) => void;
}

export default function ImagePickerModal({
  visible,
  onClose,
  onImageSelected,
}: ImagePickerModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();
  const { colors } = useTheme();

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        i18n.t('client.details.photo.modal.permissions.title'),
        i18n.t('client.details.photo.modal.permissions.gallery')
      );
      return false;
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        i18n.t('client.details.photo.modal.permissions.title'),
        i18n.t('client.details.photo.modal.permissions.camera')
      );
      return false;
    }
    return true;
  };

  const pickImageFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true, // Important: obtenir la version base64
      });

      if (!result.canceled && result.assets[0]) {
        handleImageSelected(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      toast.showError(i18n.t('client.details.photo.modal.errors.pickImage'), i18n.t('client.details.photo.modal.errors.pickImageMessage'));
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true, // Important: obtenir la version base64
      });

      if (!result.canceled && result.assets[0]) {
        handleImageSelected(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      toast.showError(i18n.t('client.details.photo.modal.errors.takePhoto'), i18n.t('client.details.photo.modal.errors.takePhotoMessage'));
    }
  };

  const handleImageSelected = (asset: ImagePicker.ImagePickerAsset) => {
    try {
      console.log('📷 Selected Image Asset:', {
        uri: asset.uri,
        type: asset.type,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
        width: asset.width,
        height: asset.height,
        hasBase64: !!asset.base64,
      });
      
      // Validation de base
      if (!asset.base64) {
        throw new Error('Impossible d\'obtenir l\'image en base64');
      }

      // Déterminer le type MIME correct
      let mimeType = asset.mimeType || 'image/jpeg';
      if (!mimeType && asset.uri) {
        const uri = asset.uri.toLowerCase();
        if (uri.includes('.png')) {
          mimeType = 'image/png';
        } else if (uri.includes('.jpg') || uri.includes('.jpeg')) {
          mimeType = 'image/jpeg';
        } else if (uri.includes('.webp')) {
          mimeType = 'image/webp';
        }
      }

      console.log('✅ Image selected, will be uploaded on save');
      
      // Retourner les données de l'image sans l'uploader
      onImageSelected({
        uri: asset.uri,
        base64: asset.base64,
        mimeType,
      });
      
      toast.showSuccess(
        i18n.t('client.details.photo.modal.success.title'),
        i18n.t('client.details.photo.modal.success.previewMessage')
      );
      onClose();
    } catch (error: any) {
      console.error('❌ Error selecting image:', error);
      toast.showError(
        i18n.t('client.details.photo.modal.errors.select'),
        error.message || i18n.t('client.details.photo.modal.errors.selectMessage')
      );
    }
  };

  const removeImage = () => {
    Alert.alert(
      i18n.t('client.details.photo.modal.remove.title'),
      i18n.t('client.details.photo.modal.remove.message'),
      [
        { text: i18n.t('client.details.photo.modal.remove.cancel'), style: 'cancel' },
        {
          text: i18n.t('client.details.photo.modal.remove.confirm'),
          style: 'destructive',
          onPress: () => {
            // Retourner une image vide pour marquer la suppression
            onImageSelected({
              uri: '',
              base64: '',
              mimeType: '',
            });
            toast.showSuccess(
              i18n.t('client.details.photo.modal.success.title'),
              i18n.t('client.details.photo.modal.remove.previewSuccess')
            );
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
        <View className="px-6 pt-4 pb-4" style={{ borderBottomColor: colors.border, borderBottomWidth: 1 }}>
          <View className="flex-row justify-between items-center">
            <Text className="text-xl font-quicksand-bold" style={{ color: colors.textPrimary }}>
              {i18n.t('client.details.photo.modal.title')}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.card }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {isUploading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#FE8C00" />
            <Text className="mt-4 font-quicksand" style={{ color: colors.textSecondary }}>
              {i18n.t('client.details.photo.modal.uploading')}
            </Text>
          </View>
        ) : (
          <View className="flex-1 px-6 pt-8">
            <TouchableOpacity
              onPress={takePhoto}
              className="rounded-xl p-4 mb-4 flex-row items-center"
              style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: colors.secondary }}>
                <Ionicons name="camera" size={24} color={colors.brandPrimary} />
              </View>
              <View>
                <Text className="text-lg font-quicksand-semibold" style={{ color: colors.textPrimary }}>
                  {i18n.t('client.details.photo.modal.takePhoto')}
                </Text>
                <Text className="text-sm font-quicksand" style={{ color: colors.textSecondary }}>
                  {i18n.t('client.details.photo.modal.takePhotoDescription')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={pickImageFromLibrary}
              className="rounded-xl p-4 mb-4 flex-row items-center"
              style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: colors.secondary }}>
                <Ionicons name="images" size={24} color="#3B82F6" />
              </View>
              <View>
                <Text className="text-lg font-quicksand-semibold" style={{ color: colors.textPrimary }}>
                  {i18n.t('client.details.photo.modal.pickFromGallery')}
                </Text>
                <Text className="text-sm font-quicksand" style={{ color: colors.textSecondary }}>
                  {i18n.t('client.details.photo.modal.pickFromGalleryDescription')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={removeImage}
              className="rounded-xl p-4 mb-4 flex-row items-center"
              style={{ backgroundColor: colors.card, borderColor: '#EF4444', borderWidth: 1 }}
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: '#FEE2E2' }}>
                <Ionicons name="trash" size={24} color="#EF4444" />
              </View>
              <View>
                <Text className="text-lg font-quicksand-semibold" style={{ color: '#DC2626' }}>
                  {i18n.t('client.details.photo.modal.removePhoto')}
                </Text>
                <Text className="text-sm font-quicksand" style={{ color: colors.textSecondary }}>
                  {i18n.t('client.details.photo.modal.removePhotoDescription')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}
