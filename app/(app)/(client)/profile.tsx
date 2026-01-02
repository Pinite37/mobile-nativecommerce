import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import ImagePickerModal from '../../../components/ui/ImagePickerModal';
import { useToast } from '../../../components/ui/ToastManager';
import { useAuth } from '../../../contexts/AuthContext';
import CustomerService, { UpdateProfileRequest } from '../../../services/api/CustomerService';
import { User } from '../../../types/auth';

export default function ProfileScreen() {
  const { logout, checkAuthStatus } = useAuth();
  const toast = useToast();
  const [profileData, setProfileData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  useEffect(() => {
    loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const profile = await CustomerService.getProfile();
      setProfileData(profile);
      
      // Initialize form with current data
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
      setNotifications(profile.preferences?.notifications || {
        email: true,
        push: true,
        sms: false,
      });
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.showError('Erreur', 'Impossible de charger le profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProfile();
    setIsRefreshing(false);
  };

  const handleSaveProfile = async () => {
    try {
      if (!firstName.trim() || !lastName.trim()) {
        toast.showError('Erreur', 'Prénom et nom sont requis');
        return;
      }

      setIsLoading(true);
      
      const updateData: UpdateProfileRequest = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      };

      const updatedProfile = await CustomerService.updateProfile(updateData);
      setProfileData(updatedProfile);
      setIsEditing(false);
      
      // Update auth context
      await checkAuthStatus();
      
      toast.showSuccess('Succès', 'Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.showError('Erreur', error.message || 'Impossible de mettre à jour le profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateNotifications = async () => {
    try {
      setIsLoading(true);
      const updatedProfile = await CustomerService.updatePreferences({
        notifications,
      });
      setProfileData(updatedProfile);
      toast.showSuccess('Succès', 'Préférences mises à jour');
    } catch (error: any) {
      console.error('Error updating notifications:', error);
      toast.showError('Erreur', 'Impossible de mettre à jour les préférences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const formatUserInitials = (user: User) => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  const handleImageSelected = async (imageData: { uri: string; base64: string; mimeType: string }) => {
    try {
      if (!imageData.uri) {
        // Suppression d'image
        await CustomerService.removeProfileImage();
        if (profileData) {
          setProfileData({
            ...profileData,
            profileImage: undefined,
          });
        }
        toast.showSuccess('Succès', 'Photo de profil supprimée');
      } else {
        // Upload immédiat de l'image
        const response = await CustomerService.updateProfileWithImage(
          {},
          imageData.base64,
          imageData.mimeType
        );
        
        if (profileData) {
          setProfileData({
            ...profileData,
            profileImage: response.profileImage || imageData.uri,
          });
        }
        toast.showSuccess('Succès', 'Photo de profil mise à jour');
      }
    } catch (error: any) {
      console.error('Error updating profile image:', error);
      toast.showError('Erreur', 'Impossible de mettre à jour la photo');
    }
  };

  if (isLoading && !profileData) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#FE8C00" />
        <Text className="text-gray-600 mt-4 font-quicksand">Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View className="bg-white px-6 pt-16 pb-8">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-quicksand-bold text-gray-900">
              Profil
            </Text>
            <TouchableOpacity
              onPress={() => setShowSettingsModal(true)}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            >
              <Ionicons name="settings-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Profile Image */}
          <View className="items-center mb-6">
            {profileData?.profileImage ? (
              <Image
                source={{ uri: profileData.profileImage }}
                className="w-24 h-24 rounded-full bg-gray-200"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-primary items-center justify-center">
                <Text className="text-white font-quicksand-bold text-2xl">
                  {profileData ? formatUserInitials(profileData) : 'U'}
                </Text>
              </View>
            )}
            <TouchableOpacity 
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary items-center justify-center"
              onPress={() => setShowImagePicker(true)}
            >
              <Ionicons name="camera" size={16} color="white" />
            </TouchableOpacity>
          </View>

          {/* User Info */}
          <View className="items-center">
            <Text className="text-xl font-quicksand-bold text-gray-900">
              {profileData?.firstName} {profileData?.lastName}
            </Text>
            <Text className="text-sm font-quicksand text-gray-600 mt-1">
              {profileData?.email}
            </Text>
          </View>
        </View>

        {/* Profile Form */}
        <View className="bg-white mx-4 rounded-2xl p-6 mt-4">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-lg font-quicksand-bold text-gray-900">
              Informations personnelles
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (isEditing) {
                  handleSaveProfile();
                } else {
                  setIsEditing(true);
                }
              }}
              className="px-4 py-2 rounded-lg bg-primary"
            >
              <Text className="text-white font-quicksand-semibold text-sm">
                {isEditing ? 'Sauvegarder' : 'Modifier'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View className="space-y-4">
            {/* First Name */}
            <View>
              <Text className="text-sm font-quicksand-medium text-gray-700 mb-2">
                Prénom
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Entrez votre prénom"
                editable={isEditing}
                className={`border rounded-xl px-4 py-3 text-base font-quicksand ${
                  isEditing ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'
                }`}
              />
            </View>

            {/* Last Name */}
            <View>
              <Text className="text-sm font-quicksand-medium text-gray-700 mb-2">
                Nom
              </Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Entrez votre nom"
                editable={isEditing}
                className={`border rounded-xl px-4 py-3 text-base font-quicksand ${
                  isEditing ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'
                }`}
              />
            </View>

            {/* Phone */}
            <View>
              <Text className="text-sm font-quicksand-medium text-gray-700 mb-2">
                Téléphone
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Entrez votre numéro"
                keyboardType="phone-pad"
                editable={isEditing}
                className={`border rounded-xl px-4 py-3 text-base font-quicksand ${
                  isEditing ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'
                }`}
              />
            </View>

            {/* Address */}
            <View>
              <Text className="text-sm font-quicksand-medium text-gray-700 mb-2">
                Adresse
              </Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Entrez votre adresse"
                multiline
                numberOfLines={3}
                editable={isEditing}
                className={`border rounded-xl px-4 py-3 text-base font-quicksand ${
                  isEditing ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'
                }`}
                style={{ textAlignVertical: 'top' }}
              />
            </View>
          </View>

          {isEditing && (
            <TouchableOpacity
              onPress={() => setIsEditing(false)}
              className="mt-4 px-4 py-2 rounded-lg bg-gray-200"
            >
              <Text className="text-gray-700 font-quicksand-semibold text-sm text-center">
                Annuler
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View className="bg-white mx-4 rounded-2xl p-6 mt-4">
          <Text className="text-lg font-quicksand-bold text-gray-900 mb-4">
            Actions rapides
          </Text>
          
          <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color="#6B7280" />
              <Text className="text-base font-quicksand text-gray-900 ml-3">
                Notifications
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={20} color="#6B7280" />
              <Text className="text-base font-quicksand text-gray-900 ml-3">
                Adresse de livraison
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="card-outline" size={20} color="#6B7280" />
              <Text className="text-base font-quicksand text-gray-900 ml-3">
                Méthodes de paiement
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center">
              <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
              <Text className="text-base font-quicksand text-gray-900 ml-3">
                Aide & Support
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View className="mx-4 mt-6 mb-8">
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-500 rounded-xl py-4 items-center"
          >
            <Text className="text-white font-quicksand-semibold text-base">
              Se déconnecter
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View className="flex-1 bg-white">
          <View className="px-6 pt-4 pb-4 border-b border-gray-200">
            <View className="flex-row justify-between items-center">
              <Text className="text-xl font-quicksand-bold text-gray-900">
                Paramètres
              </Text>
              <TouchableOpacity
                onPress={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 px-6 pt-6">
            <Text className="text-lg font-quicksand-bold text-gray-900 mb-4">
              Notifications
            </Text>

            <View className="space-y-4">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-base font-quicksand text-gray-900">
                    Notifications par email
                  </Text>
                  <Text className="text-sm font-quicksand text-gray-600">
                    Recevoir des notifications par email
                  </Text>
                </View>
                <Switch
                  value={notifications.email}
                  onValueChange={(value) => {
                    setNotifications(prev => ({ ...prev, email: value }));
                    handleUpdateNotifications();
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#FE8C00' }}
                />
              </View>

              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-base font-quicksand text-gray-900">
                    Notifications push
                  </Text>
                  <Text className="text-sm font-quicksand text-gray-600">
                    Recevoir des notifications push
                  </Text>
                </View>
                <Switch
                  value={notifications.push}
                  onValueChange={(value) => {
                    setNotifications(prev => ({ ...prev, push: value }));
                    handleUpdateNotifications();
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#FE8C00' }}
                />
              </View>

              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-base font-quicksand text-gray-900">
                    Notifications SMS
                  </Text>
                  <Text className="text-sm font-quicksand text-gray-600">
                    Recevoir des notifications par SMS
                  </Text>
                </View>
                <Switch
                  value={notifications.sms}
                  onValueChange={(value) => {
                    setNotifications(prev => ({ ...prev, sms: value }));
                    handleUpdateNotifications();
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#FE8C00' }}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Image Picker Modal */}
      <ImagePickerModal
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelected={handleImageSelected}
      />

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            {/* Icône */}
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full justify-center items-center">
                <Ionicons name="log-out-outline" size={32} color="#EF4444" />
              </View>
            </View>

            {/* Titre */}
            <Text className="text-xl font-quicksand-bold text-neutral-800 mb-2 text-center">
              Déconnexion
            </Text>

            {/* Message */}
            <Text className="text-base text-neutral-600 font-quicksand-medium mb-6 text-center">
              Êtes-vous sûr de vouloir vous déconnecter ?
            </Text>

            {/* Boutons */}
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-neutral-100 rounded-xl py-3"
                onPress={() => setShowLogoutModal(false)}
              >
                <Text className="text-neutral-700 font-quicksand-semibold text-center">
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-500 rounded-xl py-3"
                onPress={confirmLogout}
              >
                <Text className="text-white font-quicksand-semibold text-center">
                  Déconnecter
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
