import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { useToast } from '../../../../components/ui/ToastManager';
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

interface EnterpriseDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  enterprise: Enterprise;
}

// Composant pour éditer le profil utilisateur
const EditProfileModal: React.FC<EditProfileModalProps> = ({ visible, onClose, onSave, initialData, loading }) => {
  const toast = useToast();
  const [firstName, setFirstName] = useState(initialData.user.firstName || '');
  const [lastName, setLastName] = useState(initialData.user.lastName || '');
  const [phone, setPhone] = useState(initialData.user.phone || '');
  const [address, setAddress] = useState(initialData.user.address || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      toast.showWarning("Permission requise", "Vous devez autoriser l'accès à la galerie pour sélectionner une image.");
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
  const toast = useToast();
  const [companyName, setCompanyName] = useState(initialData.companyName || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [website, setWebsite] = useState(initialData.website || '');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [address, setAddress] = useState(initialData.address || '');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(initialData.socialLinks || []);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const pickLogo = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      toast.showWarning("Permission requise", "Vous devez autoriser l'accès à la galerie pour sélectionner un logo.");
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
    if (!companyName.trim()) {
      toast.showWarning("Champ requis", "Le nom de l'entreprise est requis");
      return;
    }
    
    const enterpriseData = {
      companyName,
      description,
      website,
      phone,
      address,
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
                    className="w-24 h-24 rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-24 h-24 rounded-full bg-primary-500 items-center justify-center">
                    <Text className="text-white font-quicksand-bold text-2xl">
                      {initialData.companyName?.[0]?.toUpperCase() || 'E'}
                    </Text>
                  </View>
                )}
                <View className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-full items-center justify-center border-2 border-white">
                  <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text className="text-primary-600 font-quicksand-medium mt-2">Modifier le logo</Text>
            </View>

            {/* Formulaire */}
            <View className="space-y-4">
              {/* Nom de l'entreprise */}
              <View>
                <Text className="text-neutral-700 font-quicksand-semibold mb-2 pl-1">
                  Nom de l&apos;entreprise*
                </Text>
                <TextInput
                  value={companyName}
                  onChangeText={setCompanyName}
                  className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 font-quicksand-regular"
                  placeholder="Nom de votre entreprise"
                />
              </View>

              {/* Description */}
              <View>
                <Text className="text-neutral-700 font-quicksand-semibold mb-2 pl-1">
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Description de votre entreprise"
                  multiline
                  numberOfLines={4}
                  className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 font-quicksand-regular"
                  textAlignVertical="top"
                />
              </View>

              {/* Coordonnées */}
              <View className="pt-2">
                <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
                  Coordonnées
                </Text>
                
                <View className="mb-4">
                  <Text className="text-neutral-700 font-quicksand-semibold mb-2 pl-1">
                    Site web
                  </Text>
                  <TextInput
                    value={website}
                    onChangeText={setWebsite}
                    placeholder="https://www.votreentreprise.com"
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 font-quicksand-regular"
                  />
                </View>
                
                <View className="mb-4">
                  <Text className="text-neutral-700 font-quicksand-semibold mb-2 pl-1">
                    Téléphone
                  </Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Numéro de téléphone"
                    keyboardType="phone-pad"
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 font-quicksand-regular"
                  />
                </View>
                
                <View className="mb-4">
                  <Text className="text-neutral-700 font-quicksand-semibold mb-2 pl-1">
                    Adresse
                  </Text>
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Adresse de votre entreprise"
                    multiline
                    numberOfLines={3}
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 font-quicksand-regular"
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Liens sociaux */}
              <View className="pt-2">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg font-quicksand-bold text-neutral-800 pl-1">Réseaux sociaux</Text>
                  <TouchableOpacity onPress={addSocialLink} className="flex-row items-center">
                    <Ionicons name="add-circle" size={20} color="#FE8C00" />
                    <Text className="text-primary-500 font-quicksand-medium ml-1">Ajouter</Text>
                  </TouchableOpacity>
                </View>
                
                {socialLinks.map((link, index) => (
                  <View key={index} className="flex-row items-center mb-3">
                    <TextInput
                      value={link.platform}
                      onChangeText={(value) => updateSocialLink(index, 'platform', value)}
                      placeholder="Plateforme (ex: Facebook)"
                      className="flex-1 bg-white border border-neutral-200 rounded-l-xl px-4 py-3 text-neutral-800 font-quicksand-regular"
                    />
                    <TextInput
                      value={link.url}
                      onChangeText={(value) => updateSocialLink(index, 'url', value)}
                      placeholder="URL"
                      className="flex-2 bg-white border-t border-r border-b border-neutral-200 rounded-r-xl px-4 py-3 text-neutral-800 font-quicksand-regular"
                      style={{ flex: 2 }}
                    />
                    <TouchableOpacity 
                      onPress={() => removeSocialLink(index)}
                      className="ml-2 w-8 h-8 bg-error-100 rounded-full justify-center items-center"
                    >
                      <Ionicons name="close" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                
                {socialLinks.length === 0 && (
                  <Text className="text-neutral-500 font-quicksand-regular italic pl-1 mb-4">
                    Aucun réseau social ajouté
                  </Text>
                )}
              </View>
            </View>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// Composant pour afficher les détails complets de l'entreprise
const EnterpriseDetailsModal: React.FC<EnterpriseDetailsModalProps> = ({ visible, onClose, enterprise }) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-6 py-4 border-b border-neutral-200">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-primary-500 font-quicksand-medium">Fermer</Text>
            </TouchableOpacity>
            <Text className="text-lg font-quicksand-bold">Détails de l&apos;entreprise</Text>
            <View style={{ width: 70 }} />
          </View>
        </View>

        <ScrollView className="flex-1 px-6 py-6">
          {/* Logo et nom */}
          <View className="items-center mb-6">
            {enterprise.logo ? (
              <Image
                source={{ uri: enterprise.logo }}
                className="w-24 h-24 rounded-full mb-4"
                resizeMode="cover"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-primary-500 items-center justify-center mb-4">
                <Text className="text-white font-quicksand-bold text-2xl">
                  {enterprise.companyName?.[0]?.toUpperCase() || 'E'}
                </Text>
              </View>
            )}
            <Text className="text-xl font-quicksand-bold text-neutral-800 text-center">
              {enterprise.companyName}
            </Text>
            <View className="flex-row items-center mt-2">
              <View className={`w-3 h-3 rounded-full mr-2 ${enterprise.isActive ? 'bg-success-500' : 'bg-neutral-400'}`} />
              <Text className={`${enterprise.isActive ? 'text-success-500' : 'text-neutral-500'} font-quicksand-medium`}>
                {enterprise.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {/* Informations */}
          <View className="mb-6">
            <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3">
              À propos
            </Text>
            <View className="bg-neutral-50 rounded-xl p-4">
              <Text className="text-neutral-700 font-quicksand-regular">
                {enterprise.description || "Aucune description disponible pour cette entreprise."}
              </Text>
            </View>
          </View>
          
          {/* Coordonnées */}
          <View className="mb-6">
            <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3">
              Coordonnées
            </Text>
            <View className="bg-neutral-50 rounded-xl p-4 space-y-3">
              {enterprise.website && (
                <View className="flex-row items-center">
                  <Ionicons name="globe-outline" size={20} color="#FE8C00" />
                  <Text className="text-neutral-700 font-quicksand-medium ml-3">
                    {enterprise.website}
                  </Text>
                </View>
              )}
              
              {enterprise.phone && (
                <View className="flex-row items-center">
                  <Ionicons name="call-outline" size={20} color="#FE8C00" />
                  <Text className="text-neutral-700 font-quicksand-medium ml-3">
                    {enterprise.phone}
                  </Text>
                </View>
              )}
              
              {enterprise.address && (
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={20} color="#FE8C00" />
                  <Text className="text-neutral-700 font-quicksand-medium ml-3">
                    {enterprise.address}
                  </Text>
                </View>
              )}
              
              {!enterprise.website && !enterprise.phone && !enterprise.address && (
                <Text className="text-neutral-600 font-quicksand-regular italic">
                  Aucune coordonnée disponible
                </Text>
              )}
            </View>
          </View>

          {/* Statistiques */}
          <View className="mb-6">
            <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3">
              Statistiques
            </Text>
            <View className="bg-neutral-50 rounded-xl p-4 space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-neutral-600 font-quicksand-medium">Ventes totales</Text>
                <Text className="text-primary-500 font-quicksand-bold">
                  {enterprise.stats?.totalSales ? new Intl.NumberFormat('fr-FR').format(enterprise.stats.totalSales) + ' FCFA' : '0 FCFA'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-neutral-600 font-quicksand-medium">Commandes</Text>
                <Text className="text-success-500 font-quicksand-bold">{enterprise.stats?.totalOrders || 0}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-neutral-600 font-quicksand-medium">Note moyenne</Text>
                <View className="flex-row items-center">
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text className="text-warning-500 font-quicksand-bold ml-1">{enterprise.stats?.averageRating || 0}</Text>
                </View>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-neutral-600 font-quicksand-medium">Avis clients</Text>
                <Text className="text-secondary-500 font-quicksand-bold">{enterprise.stats?.totalReviews || 0}</Text>
              </View>
            </View>
          </View>

          {/* Liens sociaux */}
          {enterprise.socialLinks && enterprise.socialLinks.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3">
                Liens sociaux
              </Text>
              <View className="bg-neutral-50 rounded-xl p-4 space-y-3">
                {enterprise.socialLinks.map((link, index) => (
                  <View key={index} className="flex-row justify-between">
                    <Text className="text-neutral-600 font-quicksand-medium">{link.platform}</Text>
                    <Text className="text-primary-500 font-quicksand-medium">{link.url}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Date de création */}
          <View className="mb-6">
            <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3">
              Informations supplémentaires
            </Text>
            <View className="bg-neutral-50 rounded-xl p-4 space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-neutral-600 font-quicksand-medium">Date de création</Text>
                <Text className="text-neutral-700 font-quicksand-medium">
                  {new Date(enterprise.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-neutral-600 font-quicksand-medium">ID de l&apos;entreprise</Text>
                <Text className="text-neutral-700 font-quicksand-medium">{enterprise._id?.substring(0, 8) || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// Composant pour ajouter un partenaire
const AddPartnerModal: React.FC<AddPartnerModalProps> = ({ visible, onClose, onAdd, loading }) => {
  const toast = useToast();
  const [partnerId, setPartnerId] = useState('');

  const handleAdd = () => {
    if (partnerId.trim()) {
      onAdd(partnerId.trim());
      setPartnerId('');
    } else {
      toast.showWarning('Attention', 'Veuillez entrer un ID de partenaire valide');
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
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<EnterpriseProfile | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Modals
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditEnterprise, setShowEditEnterprise] = useState(false);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [showEnterpriseDetails, setShowEnterpriseDetails] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Charger les données du profil
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await EnterpriseService.getProfile();
      setProfileData(data);
    } catch (error: any) {
      console.error('❌ Erreur chargement profil:', error);
      toast.showError('Erreur', error.message || 'Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
  }, [loadProfile]);

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
      toast.showSuccess('Succès', 'Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour profil:', error);
      toast.showError('Erreur', error.message || 'Impossible de mettre à jour le profil');
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
      toast.showSuccess('Succès', 'Informations entreprise mises à jour avec succès');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour entreprise:', error);
      toast.showError('Erreur', error.message || 'Impossible de mettre à jour les informations entreprise');
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
      toast.showSuccess('Succès', 'Partenaire ajouté avec succès');
    } catch (error: any) {
      console.error('❌ Erreur ajout partenaire:', error);
      toast.showError('Erreur', error.message || 'Impossible d\'ajouter le partenaire');
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
            
            toast.showSuccess('Succès', 'Partenaire supprimé avec succès');
          } catch (error: any) {
            console.error('❌ Erreur suppression partenaire:', error);
            toast.showError('Erreur', error.message || 'Impossible de supprimer le partenaire');
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
            
            toast.showSuccess('Succès', `Entreprise ${updatedEnterprise.isActive ? 'activée' : 'désactivée'} avec succès`);
          } catch (error: any) {
            console.error('❌ Erreur changement statut:', error);
            toast.showError('Erreur', error.message || 'Impossible de changer le statut');
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
          toast.showInfo('Déconnecté', 'Vous avez été déconnecté avec succès');
          router.replace('/(auth)/welcome');
        }}
      ]
    );
  };

  // Gérer la navigation vers les partenaires
  const handleNavigateToPartners = () => {
    if (profileData?.enterprise.deliveryPartners?.length) {
      // Si des partenaires existent, naviguer vers la liste
      // router.push('/(app)/(enterprise)/partners');
      setShowAddPartner(true); // Temporairement, juste ouvrir le modal d'ajout
    } else {
      // Sinon, ouvrir directement le modal d'ajout
      setShowAddPartner(true);
    }
  };
  
  // Navigation vers les produits
  const handleNavigateToProducts = () => {
    // Implémentation future: router.push('/(app)/(enterprise)/products');
    toast.showInfo('Fonctionnalité à venir', 'La gestion des produits sera disponible prochainement');
  };

  // Navigation vers les commandes
  const handleNavigateToOrders = () => {
    // Implémentation future: router.push('/(app)/(enterprise)/orders');
    toast.showInfo('Fonctionnalité à venir', 'La gestion des commandes sera disponible prochainement');
  };

  // Navigation vers les statistiques
  const handleNavigateToStats = () => {
    // Implémentation future: router.push('/(app)/(enterprise)/statistics');
    toast.showInfo('Fonctionnalité à venir', 'Les statistiques détaillées seront disponibles prochainement');
  };

  // Navigation vers les paramètres
  const handleNavigateToSettings = () => {
    router.push('/(app)/(enterprise)/profile/settings');
  };

  // Navigation vers l'aide
  const handleNavigateToHelp = () => {
    router.push('/(app)/(enterprise)/profile/help');
  };
  
  // Ouvrir la modal d'édition des informations de l'entreprise
  const handleNavigateToEnterpriseInfo = () => {
    setShowEditEnterprise(true);
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

        {/* Résumé de l'activité */}
        <View className="px-4 py-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4 pl-1">
            Résumé de l&apos;activité
          </Text>
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

        {/* Liste des options de profil */}
        <View className="px-4 py-4">
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            {/* Informations entreprise */}
            <TouchableOpacity 
              onPress={() => setShowEnterpriseDetails(true)}
              className="flex-row items-center justify-between px-4 py-5 border-b border-neutral-100"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary-100 rounded-full justify-center items-center">
                  <Ionicons name="business-outline" size={20} color="#FE8C00" />
                </View>
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Informations entreprise
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            
            {/* Modifier informations entreprise */}
            <TouchableOpacity 
              onPress={handleNavigateToEnterpriseInfo}
              className="flex-row items-center justify-between px-4 py-5 border-b border-neutral-100"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-blue-100 rounded-full justify-center items-center">
                  <Ionicons name="create-outline" size={20} color="#3B82F6" />
                </View>
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Modifier les informations
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Mes produits */}
            <TouchableOpacity 
              onPress={handleNavigateToProducts}
              className="flex-row items-center justify-between px-4 py-5 border-b border-neutral-100"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary-100 rounded-full justify-center items-center">
                  <Ionicons name="storefront-outline" size={20} color="#FE8C00" />
                </View>
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Mes produits
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Commandes */}
            <TouchableOpacity 
              onPress={handleNavigateToOrders}
              className="flex-row items-center justify-between px-4 py-5 border-b border-neutral-100"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-success-100 rounded-full justify-center items-center">
                  <Ionicons name="receipt-outline" size={20} color="#10B981" />
                </View>
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Mes commandes
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Partenaires de livraison */}
            <TouchableOpacity 
              onPress={handleNavigateToPartners}
              className="flex-row items-center justify-between px-4 py-5 border-b border-neutral-100"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-warning-100 rounded-full justify-center items-center">
                  <Ionicons name="people-outline" size={20} color="#F59E0B" />
                </View>
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Partenaires de livraison
                </Text>
                <View className="bg-primary-500 rounded-full px-2 py-1 ml-2">
                  <Text className="text-xs text-white font-quicksand-bold">
                    {profileData.enterprise.deliveryPartners?.length || 0}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Statistiques */}
            <TouchableOpacity 
              onPress={handleNavigateToStats}
              className="flex-row items-center justify-between px-4 py-5 border-b border-neutral-100"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-warning-100 rounded-full justify-center items-center">
                  <Ionicons name="analytics-outline" size={20} color="#F59E0B" />
                </View>
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Statistiques
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Paramètres */}
        <View className="px-4 py-4">
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            {/* Notifications */}
            <View className="flex-row items-center justify-between px-4 py-5 border-b border-neutral-100">
              <View className="flex-row items-center">
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

            {/* Paramètres */}
            <TouchableOpacity 
              onPress={handleNavigateToSettings}
              className="flex-row items-center justify-between px-4 py-5 border-b border-neutral-100"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-secondary-100 rounded-full justify-center items-center">
                  <Ionicons name="settings-outline" size={20} color="#8B5CF6" />
                </View>
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Paramètres
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Aide et support */}
            <TouchableOpacity 
              onPress={handleNavigateToHelp}
              className="flex-row items-center justify-between px-4 py-5"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-neutral-100 rounded-full justify-center items-center">
                  <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
                </View>
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Aide et support
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton de déconnexion */}
        <View className="px-4 py-6">
          <TouchableOpacity
            className="bg-white rounded-2xl py-4 border border-neutral-200"
            onPress={handleLogout}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text className="text-error-500 font-quicksand-semibold ml-2">
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
          <EnterpriseDetailsModal
            visible={showEnterpriseDetails}
            onClose={() => setShowEnterpriseDetails(false)}
            enterprise={profileData.enterprise}
          />
        </>
      )}
    </SafeAreaView>
  );
}

export default EnterpriseProfilePage;
