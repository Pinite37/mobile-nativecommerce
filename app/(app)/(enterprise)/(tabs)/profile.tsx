import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuth } from '../../../../contexts/AuthContext';
import EnterpriseService, { Enterprise, EnterpriseProfile, SocialLink } from '../../../../services/api/EnterpriseService';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (userData: any, imageBase64?: string) => void;
  initialData: EnterpriseProfile;
  loading: boolean;
}

interface EditEnterpriseModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (enterpriseData: any, logoBase64?: string) => void;
  initialData: Enterprise;
  loading: boolean;
}

interface AddPartnerModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (partnerId: string) => void;
  loading: boolean;
}

// Composant pour éditer le profil utilisateur
const EditProfileModal: React.FC<EditProfileModalProps> = ({ visible, onClose, onSave, initialData, loading }) => {
  const [firstName, setFirstName] = useState(initialData.user.firstName || '');
  const [lastName, setLastName] = useState(initialData.user.lastName || '');
  const [phone, setPhone] = useState(initialData.user.phone || '');
  const [address, setAddress] = useState(initialData.user.address || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission requise", "Vous devez autoriser l'accès à la galerie pour sélectionner une image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  const handleSave = () => {
    const userData = {
      firstName,
      lastName,
      phone,
      address,
    };
    onSave(userData, imageBase64 || undefined);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="px-6 py-4 border-b border-neutral-200">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={onClose}>
                <Text className="text-primary-500 font-quicksand-medium">Annuler</Text>
              </TouchableOpacity>
              <Text className="text-lg font-quicksand-bold">Modifier le profil</Text>
              <TouchableOpacity onPress={handleSave} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FE8C00" />
                ) : (
                  <Text className="text-primary-500 font-quicksand-medium">Sauvegarder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAwareScrollView className="flex-1 px-6 py-6">
            {/* Photo de profil */}
            <View className="items-center mb-6">
              <TouchableOpacity onPress={pickImage} className="relative">
                {selectedImage || initialData.user.profileImage ? (
                  <Image
                    source={{ uri: selectedImage || initialData.user.profileImage }}
                    className="w-24 h-24 rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-24 h-24 rounded-full bg-primary-500 items-center justify-center">
                    <Text className="text-white font-quicksand-bold text-2xl">
                      {`${initialData.user.firstName?.[0] || ''}${initialData.user.lastName?.[0] || ''}`.toUpperCase()}
                    </Text>
                  </View>
                )}
                <View className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-500 rounded-full items-center justify-center">
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text className="text-neutral-600 text-sm mt-2">Touchez pour changer</Text>
            </View>

            {/* Formulaire */}
            <View className="space-y-4">
              <View>
                <Text className="text-neutral-700 font-quicksand-medium mb-2">Prénom</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-quicksand-regular"
                  placeholder="Votre prénom"
                />
              </View>

              <View>
                <Text className="text-neutral-700 font-quicksand-medium mb-2">Nom</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-quicksand-regular"
                  placeholder="Votre nom"
                />
              </View>

              <View>
                <Text className="text-neutral-700 font-quicksand-medium mb-2">Téléphone</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-quicksand-regular"
                  placeholder="Votre téléphone"
                  keyboardType="phone-pad"
                />
              </View>

              <View>
                <Text className="text-neutral-700 font-quicksand-medium mb-2">Adresse</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-quicksand-regular"
                  placeholder="Votre adresse"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// Composant pour éditer les informations entreprise
const EditEnterpriseModal: React.FC<EditEnterpriseModalProps> = ({ visible, onClose, onSave, initialData, loading }) => {
  const [companyName, setCompanyName] = useState(initialData.companyName || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(initialData.socialLinks || []);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const pickLogo = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission requise", "Vous devez autoriser l'accès à la galerie pour sélectionner un logo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedLogo(result.assets[0].uri);
      setLogoBase64(result.assets[0].base64 || null);
    }
  };

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: '', url: '' }]);
  };

  const updateSocialLink = (index: number, field: 'platform' | 'url', value: string) => {
    const updated = [...socialLinks];
    updated[index][field] = value;
    setSocialLinks(updated);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const enterpriseData = {
      companyName,
      description,
      socialLinks: socialLinks.filter(link => link.platform && link.url),
    };
    onSave(enterpriseData, logoBase64 || undefined);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="px-6 py-4 border-b border-neutral-200">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={onClose}>
                <Text className="text-primary-500 font-quicksand-medium">Annuler</Text>
              </TouchableOpacity>
              <Text className="text-lg font-quicksand-bold">Modifier l&apos;entreprise</Text>
              <TouchableOpacity onPress={handleSave} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FE8C00" />
                ) : (
                  <Text className="text-primary-500 font-quicksand-medium">Sauvegarder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAwareScrollView className="flex-1 px-6 py-6">
            {/* Logo */}
            <View className="items-center mb-6">
              <TouchableOpacity onPress={pickLogo} className="relative">
                {selectedLogo || initialData.logo ? (
                  <Image
                    source={{ uri: selectedLogo || initialData.logo }}
                    className="w-24 h-24 rounded-xl"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-24 h-24 rounded-xl bg-primary-500 items-center justify-center">
                    <Text className="text-white font-quicksand-bold text-2xl">
                      {initialData.companyName?.[0]?.toUpperCase() || 'E'}
                    </Text>
                  </View>
                )}
                <View className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-500 rounded-full items-center justify-center">
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text className="text-neutral-600 text-sm mt-2">Touchez pour changer le logo</Text>
            </View>

            {/* Formulaire */}
            <View className="space-y-4">
              <View>
                <Text className="text-neutral-700 font-quicksand-medium mb-2">Nom de l&apos;entreprise</Text>
                <TextInput
                  value={companyName}
                  onChangeText={setCompanyName}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-quicksand-regular"
                  placeholder="Nom de votre entreprise"
                />
              </View>

              <View>
                <Text className="text-neutral-700 font-quicksand-medium mb-2">Description</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-quicksand-regular"
                  placeholder="Décrivez votre entreprise"
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Liens sociaux */}
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-neutral-700 font-quicksand-medium">Liens sociaux</Text>
                  <TouchableOpacity onPress={addSocialLink}>
                    <Ionicons name="add-circle" size={24} color="#FE8C00" />
                  </TouchableOpacity>
                </View>
                {socialLinks.map((link, index) => (
                  <View key={index} className="flex-row items-center mb-3">
                    <View className="flex-1 mr-3">
                      <TextInput
                        value={link.platform}
                        onChangeText={(value) => updateSocialLink(index, 'platform', value)}
                        className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-quicksand-regular mb-2"
                        placeholder="Plateforme (ex: Facebook)"
                      />
                      <TextInput
                        value={link.url}
                        onChangeText={(value) => updateSocialLink(index, 'url', value)}
                        className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-quicksand-regular"
                        placeholder="URL complète"
                        keyboardType="url"
                      />
                    </View>
                    <TouchableOpacity onPress={() => removeSocialLink(index)}>
                      <Ionicons name="trash" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// Composant pour ajouter un partenaire
const AddPartnerModal: React.FC<AddPartnerModalProps> = ({ visible, onClose, onAdd, loading }) => {
  const [partnerId, setPartnerId] = useState('');

  const handleAdd = () => {
    if (partnerId.trim()) {
      onAdd(partnerId.trim());
      setPartnerId('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-6 py-4 border-b border-neutral-200">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-primary-500 font-quicksand-medium">Annuler</Text>
            </TouchableOpacity>
            <Text className="text-lg font-quicksand-bold">Ajouter un partenaire</Text>
            <TouchableOpacity onPress={handleAdd} disabled={loading || !partnerId.trim()}>
              {loading ? (
                <ActivityIndicator size="small" color="#FE8C00" />
              ) : (
                <Text className="text-primary-500 font-quicksand-medium">Ajouter</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-6 py-6">
          <View>
            <Text className="text-neutral-700 font-quicksand-medium mb-2">ID du partenaire</Text>
            <TextInput
              value={partnerId}
              onChangeText={setPartnerId}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-quicksand-regular"
              placeholder="ID du partenaire de livraison"
            />
            <Text className="text-neutral-500 text-sm mt-2">
              Entrez l&apos;ID du partenaire de livraison que vous voulez ajouter.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Composant principal du profil entreprise
function EnterpriseProfilePage() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<EnterpriseProfile | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Modals
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditEnterprise, setShowEditEnterprise] = useState(false);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Charger les données du profil
  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await EnterpriseService.getProfile();
      setProfileData(data);
    } catch (error: any) {
      console.error('❌ Erreur chargement profil:', error);
      Alert.alert('Erreur', error.message || 'Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  };

  // Rafraîchir les données
  const refreshProfile = async () => {
    try {
      setRefreshing(true);
      const data = await EnterpriseService.getProfile();
      setProfileData(data);
    } catch (error: any) {
      console.error('❌ Erreur refresh profil:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Charger les données au montage
  useEffect(() => {
    loadProfile();
  }, []);

  // Gérer la mise à jour du profil utilisateur
  const handleUpdateProfile = async (userData: any, imageBase64?: string) => {
    try {
      setEditLoading(true);
      const updatedUser = await EnterpriseService.updateUserProfileWithImage(userData, imageBase64);
      
      // Mettre à jour les données locales
      if (profileData) {
        setProfileData({
          ...profileData,
          user: updatedUser
        });
      }
      
      setShowEditProfile(false);
      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour profil:', error);
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour le profil');
    } finally {
      setEditLoading(false);
    }
  };

  // Gérer la mise à jour des informations entreprise
  const handleUpdateEnterprise = async (enterpriseData: any, logoBase64?: string) => {
    try {
      setEditLoading(true);
      const updatedEnterprise = await EnterpriseService.updateEnterpriseInfoWithLogo(enterpriseData, logoBase64);
      
      // Mettre à jour les données locales
      if (profileData) {
        setProfileData({
          ...profileData,
          enterprise: updatedEnterprise
        });
      }
      
      setShowEditEnterprise(false);
      Alert.alert('Succès', 'Informations entreprise mises à jour avec succès');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour entreprise:', error);
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour les informations entreprise');
    } finally {
      setEditLoading(false);
    }
  };

  // Gérer l'ajout d'un partenaire
  const handleAddPartner = async (partnerId: string) => {
    try {
      setEditLoading(true);
      const updatedEnterprise = await EnterpriseService.addDeliveryPartner(partnerId);
      
      // Mettre à jour les données locales
      if (profileData) {
        setProfileData({
          ...profileData,
          enterprise: updatedEnterprise
        });
      }
      
      setShowAddPartner(false);
      Alert.alert('Succès', 'Partenaire ajouté avec succès');
    } catch (error: any) {
      console.error('❌ Erreur ajout partenaire:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'ajouter le partenaire');
    } finally {
      setEditLoading(false);
    }
  };

  // Gérer la suppression d'un partenaire
  const handleRemovePartner = async (partnerId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer ce partenaire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            setLoading(true);
            const updatedEnterprise = await EnterpriseService.removeDeliveryPartner(partnerId);
            
            // Mettre à jour les données locales
            if (profileData) {
              setProfileData({
                ...profileData,
                enterprise: updatedEnterprise
              });
            }
            
            Alert.alert('Succès', 'Partenaire supprimé avec succès');
          } catch (error: any) {
            console.error('❌ Erreur suppression partenaire:', error);
            Alert.alert('Erreur', error.message || 'Impossible de supprimer le partenaire');
          } finally {
            setLoading(false);
          }
        }}
      ]
    );
  };

  // Gérer l'activation/désactivation de l'entreprise
  const handleToggleStatus = async () => {
    const newStatus = profileData?.enterprise.isActive ? 'désactiver' : 'activer';
    
    Alert.alert(
      `Changer le statut`,
      `Voulez-vous vraiment ${newStatus} votre entreprise ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: async () => {
          try {
            setLoading(true);
            const updatedEnterprise = await EnterpriseService.toggleActiveStatus();
            
            // Mettre à jour les données locales
            if (profileData) {
              setProfileData({
                ...profileData,
                enterprise: updatedEnterprise
              });
            }
            
            Alert.alert('Succès', `Entreprise ${updatedEnterprise.isActive ? 'activée' : 'désactivée'} avec succès`);
          } catch (error: any) {
            console.error('❌ Erreur changement statut:', error);
            Alert.alert('Erreur', error.message || 'Impossible de changer le statut');
          } finally {
            setLoading(false);
          }
        }}
      ]
    );
  };

  

  // Gérer la déconnexion
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnecter', style: 'destructive', onPress: () => {
          logout();
          router.replace('/(auth)/welcome');
        }}
      ]
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading && !profileData) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FE8C00" />
          <Text className="mt-4 text-neutral-600 font-quicksand-medium">Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profileData) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text className="mt-4 text-neutral-800 font-quicksand-bold text-lg text-center">
            Impossible de charger le profil
          </Text>
          <Text className="mt-2 text-neutral-600 font-quicksand-medium text-center">
            Une erreur s&apos;est produite lors du chargement des données.
          </Text>
          <TouchableOpacity
            onPress={loadProfile}
            className="mt-6 bg-primary-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-quicksand-semibold">Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshProfile}
            colors={['#FE8C00']}
            tintColor="#FE8C00"
          />
        }
      >
        {/* Header avec profil utilisateur et entreprise */}
        <View className="bg-white px-6 pt-20 py-8">
          <View className="flex-row items-center">
            <View className="relative">
              {profileData.user.profileImage ? (
                <Image
                  source={{ uri: profileData.user.profileImage }}
                  className="w-20 h-20 rounded-2xl"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-20 h-20 rounded-2xl bg-primary-500 items-center justify-center">
                  <Text className="text-white font-quicksand-bold text-2xl">
                    {`${profileData.user.firstName?.[0] || ''}${profileData.user.lastName?.[0] || ''}`.toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="absolute -top-1 -right-1 w-6 h-6 bg-success-500 rounded-full justify-center items-center">
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-xl font-quicksand-bold text-neutral-800">
                {profileData.user.firstName} {profileData.user.lastName}
              </Text>
              <Text className="text-sm text-neutral-600 mt-1">
                {profileData.enterprise.companyName}
              </Text>
              <Text className="text-sm text-neutral-600">
                {profileData.user.email}
              </Text>
              <Text className="text-xs text-neutral-500 mt-2">
                Membre depuis {formatDate(profileData.enterprise.createdAt)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowEditProfile(true)}>
              <Ionicons name="create-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Statut de l'entreprise */}
        <View className="px-4 py-4">
          <View className={`${profileData.enterprise.isActive ? 'bg-success-500' : 'bg-neutral-500'} rounded-2xl p-4 shadow-sm`}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <View className={`w-3 h-3 rounded-full mr-2 ${profileData.enterprise.isActive ? 'bg-white' : 'bg-neutral-300'}`} />
                  <Text className="text-white font-quicksand-bold text-lg">
                    {profileData.enterprise.isActive ? 'Entreprise Active' : 'Entreprise Inactive'}
                  </Text>
                </View>
                <Text className="text-white opacity-90 text-sm ml-5">
                  {profileData.enterprise.isActive ? 'Visible aux clients' : 'Invisible aux clients'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleToggleStatus}
                className={`${profileData.enterprise.isActive ? 'bg-white' : 'bg-primary-500'} rounded-xl px-4 py-2`}
              >
                <Text className={`${profileData.enterprise.isActive ? 'text-success-500' : 'text-white'} font-quicksand-semibold`}>
                  {profileData.enterprise.isActive ? 'Désactiver' : 'Activer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Statistiques */}
        <View className="px-4 py-4">
          <View className="flex-row flex-wrap justify-between">
            <View className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
              <Text className="text-2xl font-quicksand-bold text-primary-500">
                {profileData.enterprise.stats.totalSales ? formatPrice(profileData.enterprise.stats.totalSales) : '0 FCFA'}
              </Text>
              <Text className="text-sm font-quicksand-medium text-neutral-600">
                Ventes totales
              </Text>
            </View>
            
            <View className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
              <Text className="text-2xl font-quicksand-bold text-success-500">
                {profileData.enterprise.stats.totalOrders || 0}
              </Text>
              <Text className="text-sm font-quicksand-medium text-neutral-600">
                Commandes
              </Text>
            </View>
            
            <View className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons name="star" size={16} color="#FE8C00" />
                <Text className="text-2xl font-quicksand-bold text-warning-500 ml-1">
                  {profileData.enterprise.stats.averageRating || 0}
                </Text>
              </View>
              <Text className="text-sm font-quicksand-medium text-neutral-600">
                Note moyenne
              </Text>
            </View>
            
            <View className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
              <Text className="text-2xl font-quicksand-bold text-secondary-500">
                {profileData.enterprise.stats.totalReviews || 0}
              </Text>
              <Text className="text-sm font-quicksand-medium text-neutral-600">
                Avis clients
              </Text>
            </View>
          </View>
        </View>

        {/* Informations entreprise */}
        <View className="px-4 py-4">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-quicksand-bold text-neutral-800">
                Informations entreprise
              </Text>
              <TouchableOpacity onPress={() => setShowEditEnterprise(true)}>
                <Ionicons name="create-outline" size={20} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <View className="flex-row items-center mb-3">
              {profileData.enterprise.logo ? (
                <Image
                  source={{ uri: profileData.enterprise.logo }}
                  className="w-12 h-12 rounded-xl mr-3"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-12 h-12 rounded-xl bg-primary-500 items-center justify-center mr-3">
                  <Text className="text-white font-quicksand-bold text-lg">
                    {profileData.enterprise.companyName?.[0]?.toUpperCase() || 'E'}
                  </Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="font-quicksand-semibold text-neutral-800">
                  {profileData.enterprise.companyName}
                </Text>
                <Text className="text-sm text-neutral-600">
                  {profileData.enterprise.description || 'Aucune description'}
                </Text>
              </View>
            </View>

            {/* Liens sociaux */}
            {profileData.enterprise.socialLinks && profileData.enterprise.socialLinks.length > 0 && (
              <View className="mt-4">
                <Text className="font-quicksand-medium text-neutral-700 mb-2">Liens sociaux</Text>
                {profileData.enterprise.socialLinks.map((link, index) => (
                  <View key={index} className="flex-row items-center mb-2">
                    <Ionicons name="link" size={16} color="#6B7280" />
                    <Text className="text-sm text-neutral-600 ml-2 font-quicksand-medium">
                      {link.platform}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Partenaires de livraison */}
        <View className="px-4 py-4">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-quicksand-bold text-neutral-800">
                Partenaires de livraison
              </Text>
              <TouchableOpacity onPress={() => setShowAddPartner(true)}>
                <Ionicons name="add-circle" size={24} color="#FE8C00" />
              </TouchableOpacity>
            </View>
            
            {profileData.enterprise.deliveryPartners && profileData.enterprise.deliveryPartners.length > 0 ? (
              profileData.enterprise.deliveryPartners.map((partner, index) => (
                <View key={partner._id} className="flex-row items-center justify-between py-3 border-b border-neutral-100">
                  <View className="flex-1">
                    <Text className="font-quicksand-semibold text-neutral-800">
                      {partner.firstName} {partner.lastName}
                    </Text>
                    <Text className="text-sm text-neutral-600">
                      {partner.email}
                    </Text>
                    <Text className="text-sm text-neutral-600">
                      {partner.phone}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemovePartner(partner._id)}>
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text className="text-neutral-500 text-center py-4">
                Aucun partenaire de livraison
              </Text>
            )}
          </View>
        </View>

        {/* Actions rapides */}
        <View className="px-4 py-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4">
            Actions rapides
          </Text>
          <View className="flex-row flex-wrap justify-between">
            <TouchableOpacity className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
              <View className="w-12 h-12 bg-primary-100 rounded-full justify-center items-center mb-3">
                <Ionicons name="storefront" size={24} color="#FE8C00" />
              </View>
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-1">
                Mes produits
              </Text>
              <Text className="text-sm text-neutral-600">
                Gérer vos produits
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
              <View className="w-12 h-12 bg-success-100 rounded-full justify-center items-center mb-3">
                <Ionicons name="receipt" size={24} color="#10B981" />
              </View>
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-1">
                Commandes
              </Text>
              <Text className="text-sm text-neutral-600">
                Voir les commandes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
              <View className="w-12 h-12 bg-warning-100 rounded-full justify-center items-center mb-3">
                <Ionicons name="analytics" size={24} color="#F59E0B" />
              </View>
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-1">
                Statistiques
              </Text>
              <Text className="text-sm text-neutral-600">
                Voir les analyses
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
              <View className="w-12 h-12 bg-secondary-100 rounded-full justify-center items-center mb-3">
                <Ionicons name="settings" size={24} color="#8B5CF6" />
              </View>
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-1">
                Paramètres
              </Text>
              <Text className="text-sm text-neutral-600">
                Configurer votre compte
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View className="px-4 py-4">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 bg-background-secondary rounded-full justify-center items-center">
                  <Ionicons name="notifications-outline" size={20} color="#374151" />
                </View>
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Notifications
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                thumbColor="#FFFFFF"
                trackColor={{ false: "#D1D5DB", true: "#FE8C00" }}
              />
            </View>
          </View>
        </View>

        {/* Bouton de déconnexion */}
        <View className="px-4 py-6">
          <TouchableOpacity
            className="bg-error-500 rounded-2xl py-4"
            onPress={handleLogout}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              <Text className="text-white font-quicksand-semibold ml-2">
                Se déconnecter
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View className="px-6 py-4">
          <Text className="text-center text-xs text-neutral-500 font-quicksand-medium">
            NativeCommerce Business v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Modals */}
      {profileData && (
        <>
          <EditProfileModal
            visible={showEditProfile}
            onClose={() => setShowEditProfile(false)}
            onSave={handleUpdateProfile}
            initialData={profileData}
            loading={editLoading}
          />
          <EditEnterpriseModal
            visible={showEditEnterprise}
            onClose={() => setShowEditEnterprise(false)}
            onSave={handleUpdateEnterprise}
            initialData={profileData.enterprise}
            loading={editLoading}
          />
          <AddPartnerModal
            visible={showAddPartner}
            onClose={() => setShowAddPartner(false)}
            onAdd={handleAddPartner}
            loading={editLoading}
          />
        </>
      )}
    </SafeAreaView>
  );
}

export default EnterpriseProfilePage;
