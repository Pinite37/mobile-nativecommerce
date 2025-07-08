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
import CustomerService from '../../services/api/CustomerService';
import { useToast } from './ToastManager';

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onImageUpdated: (imageUrl: string) => void;
}

export default function ImagePickerModal({
  visible,
  onClose,
  onImageUpdated,
}: ImagePickerModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Nous avons besoin de l\'autorisation pour accéder à vos photos.'
      );
      return false;
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Nous avons besoin de l\'autorisation pour utiliser votre caméra.'
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
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      toast.showError('Erreur', 'Impossible de sélectionner l\'image');
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
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      toast.showError('Erreur', 'Impossible de prendre la photo');
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      setIsUploading(true);

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

      console.log('📤 Updating profile with base64 image, type:', mimeType);

      // Utiliser la nouvelle méthode qui envoie l'image en base64
      const response = await CustomerService.updateProfileWithImage(
        {}, // Données du profil (vide pour juste l'image)
        asset.base64,
        mimeType
      );
      
      // Extraire l'URL de l'image de la réponse
      const imageUrl = response.profileImage || asset.uri;
      
      onImageUpdated(imageUrl);
      toast.showSuccess('Succès', 'Photo de profil mise à jour');
      onClose();
    } catch (error: any) {
      console.error('❌ Error uploading image:', error);
      console.error('❌ Error details:', error.response?.data);
      toast.showError('Erreur', error.message || 'Impossible de télécharger l\'image');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = async () => {
    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer votre photo de profil ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUploading(true);
              await CustomerService.removeProfileImage();
              onImageUpdated('');
              toast.showSuccess('Succès', 'Photo de profil supprimée');
              onClose();
            } catch (error: any) {
              console.error('Error removing image:', error);
              toast.showError('Erreur', error.message || 'Impossible de supprimer l\'image');
            } finally {
              setIsUploading(false);
            }
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
      <View className="flex-1 bg-white">
        <View className="px-6 pt-4 pb-4 border-b border-gray-200">
          <View className="flex-row justify-between items-center">
            <Text className="text-xl font-quicksand-bold text-gray-900">
              Photo de profil
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {isUploading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#FE8C00" />
            <Text className="text-gray-600 mt-4 font-quicksand">
              Téléchargement en cours...
            </Text>
          </View>
        ) : (
          <View className="flex-1 px-6 pt-8">
            <TouchableOpacity
              onPress={takePhoto}
              className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex-row items-center"
            >
              <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-4">
                <Ionicons name="camera" size={24} color="#FE8C00" />
              </View>
              <View>
                <Text className="text-lg font-quicksand-semibold text-gray-900">
                  Prendre une photo
                </Text>
                <Text className="text-sm font-quicksand text-gray-600">
                  Utiliser la caméra
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={pickImageFromLibrary}
              className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex-row items-center"
            >
              <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-4">
                <Ionicons name="images" size={24} color="#3B82F6" />
              </View>
              <View>
                <Text className="text-lg font-quicksand-semibold text-gray-900">
                  Choisir dans la galerie
                </Text>
                <Text className="text-sm font-quicksand text-gray-600">
                  Sélectionner une photo existante
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={removeImage}
              className="bg-white border border-red-200 rounded-xl p-4 mb-4 flex-row items-center"
            >
              <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center mr-4">
                <Ionicons name="trash" size={24} color="#EF4444" />
              </View>
              <View>
                <Text className="text-lg font-quicksand-semibold text-red-600">
                  Supprimer la photo
                </Text>
                <Text className="text-sm font-quicksand text-gray-600">
                  Retirer la photo de profil actuelle
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}
