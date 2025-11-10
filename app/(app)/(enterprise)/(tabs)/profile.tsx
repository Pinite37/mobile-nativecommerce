import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
// New Reanimated toast system only
import { useToast as useReanimatedToast } from '../../../../components/ui/ReanimatedToast/context';
import { useAuth } from '../../../../contexts/AuthContext';
import { useSubscription } from '../../../../contexts/SubscriptionContext';
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
  const { showToast: showReToast } = useReanimatedToast();
  const [firstName, setFirstName] = useState(initialData.user.firstName || '');
  const [lastName, setLastName] = useState(initialData.user.lastName || '');
  const [phone, setPhone] = useState(initialData.user.phone || '');
  const [address, setAddress] = useState(initialData.user.address || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      showReToast({ title: 'Permission requise', subtitle: "Vous devez autoriser l'accès à la galerie pour sélectionner une image.", autodismiss: true });
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
          <View className="px-6 pt-14 pb-4 border-b border-neutral-200">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={onClose}>
                <Text className="text-primary-500 font-quicksand-medium">Annuler</Text>
              </TouchableOpacity>
              <Text className="text-lg font-quicksand-bold">Modifier le profil</Text>
              <TouchableOpacity onPress={handleSave} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#10B981" />
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
  const { showToast: showReToast } = useReanimatedToast();
  const [companyName, setCompanyName] = useState(initialData.companyName || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [website, setWebsite] = useState(initialData.contactInfo?.website || '');
  const [phone, setPhone] = useState(initialData.contactInfo?.phone || '');
  const [email, setEmail] = useState(initialData.contactInfo?.email || '');
  const [whatsapp, setWhatsapp] = useState(initialData.contactInfo?.whatsapp || '');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(initialData.socialLinks || []);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const pickLogo = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      showReToast({ title: 'Permission requise', subtitle: "Vous devez autoriser l'accès à la galerie pour sélectionner un logo.", autodismiss: true });
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
      showReToast({ title: 'Champ requis', subtitle: "Le nom de l'entreprise est requis", autodismiss: true });
      return;
    }
    
    const enterpriseData = {
      companyName,
      description,
      contactInfo: {
        email,
        phone,
        whatsapp,
        website
      },
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
          <View className="px-6 pt-14 pb-4 border-b border-neutral-200">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={onClose}>
                <Text className="text-primary-500 font-quicksand-medium">Annuler</Text>
              </TouchableOpacity>
              <Text className="text-lg font-quicksand-bold">Modifier l&apos;entreprise</Text>
              <TouchableOpacity onPress={handleSave} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#10B981" />
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
                    Email professionnel
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="contact@entreprise.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 font-quicksand-regular"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-neutral-700 font-quicksand-semibold mb-2 pl-1">
                    WhatsApp
                  </Text>
                  <TextInput
                    value={whatsapp}
                    onChangeText={setWhatsapp}
                    placeholder="Numéro WhatsApp"
                    keyboardType="phone-pad"
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 font-quicksand-regular"
                  />
                </View>
              </View>

              {/* Liens sociaux */}
              <View className="pt-2">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg font-quicksand-bold text-neutral-800 pl-1">Réseaux sociaux</Text>
                  <TouchableOpacity onPress={addSocialLink} className="flex-row items-center">
                    <Ionicons name="add-circle" size={20} color="#10B981" />
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
        <View className="px-6 pt-14 pb-4 border-b border-neutral-200">
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
              {enterprise.contactInfo?.website && (
                <View className="flex-row items-center">
                  <Ionicons name="globe-outline" size={20} color="#10B981" />
                  <Text className="text-neutral-700 font-quicksand-medium ml-3">
                    {enterprise.contactInfo.website}
                  </Text>
                </View>
              )}
              
              {enterprise.contactInfo?.phone && (
                <View className="flex-row items-center">
                  <Ionicons name="call-outline" size={20} color="#10B981" />
                  <Text className="text-neutral-700 font-quicksand-medium ml-3">
                    {enterprise.contactInfo.phone}
                  </Text>
                </View>
              )}
              
              {!enterprise.contactInfo?.website && !enterprise.contactInfo?.phone && (
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

// Composant pour ajouter un partenaire (DEPRECATED: remplacé par la page /delivery-partners)
const AddPartnerModal: React.FC<AddPartnerModalProps> = ({ visible, onClose, onAdd, loading }) => {
  const { showToast: showReToast } = useReanimatedToast();
  const [partnerId, setPartnerId] = useState('');

  const handleAdd = () => {
    if (partnerId.trim()) {
      onAdd(partnerId.trim());
      setPartnerId('');
    } else {
      showReToast({ title: 'Attention', subtitle: 'Veuillez entrer un ID de partenaire valide', autodismiss: true });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-6 pt-6 pb-4 border-b border-neutral-200">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-primary-500 font-quicksand-medium">Annuler</Text>
            </TouchableOpacity>
            <Text className="text-lg font-quicksand-bold">Ajouter un partenaire</Text>
            <TouchableOpacity onPress={handleAdd} disabled={loading || !partnerId.trim()}>
              {loading ? (
                <ActivityIndicator size="small" color="#10B981" />
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
  const { showToast: showReToast } = useReanimatedToast();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<EnterpriseProfile | null>(null);
  
  // Modals
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditEnterprise, setShowEditEnterprise] = useState(false);
  // const [showAddPartner, setShowAddPartner] = useState(false); // supprimé (ancienne modal d'ajout partenaire)
  const [showEnterpriseDetails, setShowEnterpriseDetails] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    type: 'toggle_status' | 'logout';
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null);

  // Abonnement et restrictions
  const { subscription, canUseFeature } = useSubscription();

  // Responsive dimensions
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isTablet = width >= 768 && width < 1024;
  const isLargeTablet = width >= 1024;

  // Header paddings
  const headerPaddingTop = isLargeTablet ? 80 : isTablet ? 72 : isSmallPhone ? 48 : 64;
  const headerPaddingBottom = isLargeTablet ? 72 : isTablet ? 64 : isSmallPhone ? 48 : 80;

  // Overlay lift
  const overlayLift = isLargeTablet ? -72 : isTablet ? -64 : isSmallPhone ? -40 : -56;

  // Logo size
  const logoSize = isLargeTablet ? 104 : isTablet ? 88 : isSmallPhone ? 72 : 80;

  // Marketing layout (row vs column)
  const stackMarketing = width < 400;

  // Chips overlay wrapping for small widths
  const wrapOverlayChips = width < 420;

  // Dashboard columns and card width
  const dashboardColumns = isLargeTablet ? 4 : isTablet ? 3 : isSmallPhone ? 1 : 2;
  const dashboardCardWidth =
    dashboardColumns === 1 ? '100%' :
    dashboardColumns === 2 ? '48%' :
    dashboardColumns === 3 ? '31.5%' : '23%';

  // Skeleton Loader Component
  const ShimmerBlock = ({ style }: { style?: any }) => {
    const shimmer = React.useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }, [shimmer]);
    const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-150, 150] });
    return (
      <View style={[{ backgroundColor: '#E5E7EB', overflow: 'hidden' }, style]}>
        <Animated.View style={{
          position: 'absolute', top: 0, bottom: 0, width: 120,
          transform: [{ translateX }],
          backgroundColor: 'rgba(255,255,255,0.35)',
          opacity: 0.7,
        }} />
      </View>
    );
  };

  const SkeletonCard = ({ style }: { style?: any }) => (
    <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden" style={style}>
      <ShimmerBlock style={{ height: 120, borderRadius: 16, width: '100%' }} />
    </View>
  );

  const renderSkeletonProfile = () => (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
    >
      {/* Gradient Header Skeleton */}
      <LinearGradient
        colors={['#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="px-6"
        style={{ paddingTop: headerPaddingTop, paddingBottom: headerPaddingBottom }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <ShimmerBlock style={{ height: 28, borderRadius: 14, width: '70%', marginBottom: 12 }} />
            <View className="flex-row items-center mt-3">
              <ShimmerBlock style={{ width: 16, height: 16, borderRadius: 8, marginRight: 8 }} />
              <ShimmerBlock style={{ height: 14, borderRadius: 7, width: '40%' }} />
            </View>
            <View className="flex-row items-center mt-2">
              <ShimmerBlock style={{ width: 12, height: 12, borderRadius: 6, marginRight: 8 }} />
              <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '30%' }} />
            </View>
          </View>
          <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 20 }} />
        </View>
      </LinearGradient>

      {/* Overlay Card Skeleton */}
      <View className="px-4" style={{ marginTop: overlayLift }}>
        <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-5">
          <View className="flex-row items-center">
            <ShimmerBlock style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 2 }} />
            <View className="flex-1 ml-5">
              <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '80%', marginBottom: 8 }} />
              <ShimmerBlock style={{ height: 14, borderRadius: 7, width: '60%', marginBottom: 16 }} />
              <View className="flex-row mt-4 space-x-3">
                <ShimmerBlock style={{ width: 60, height: 28, borderRadius: 14 }} />
                <ShimmerBlock style={{ width: 60, height: 28, borderRadius: 14 }} />
                <ShimmerBlock style={{ width: 60, height: 28, borderRadius: 14 }} />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Marketing Skeleton */}
      <View className="px-4 pt-6">
        <ShimmerBlock style={{ height: 20, borderRadius: 10, width: '50%', marginBottom: 16, marginLeft: 4 }} />
        <View className="flex-row" style={{ flexDirection: stackMarketing ? 'column' : 'row' }}>
          <View className="flex-1 rounded-2xl overflow-hidden" style={{ marginRight: stackMarketing ? 0 : 8, marginBottom: stackMarketing ? 8 : 0 }}>
            <ShimmerBlock style={{ height: 120, borderRadius: 16, width: '100%' }} />
          </View>
          <View className="flex-1 rounded-2xl overflow-hidden" style={{ marginLeft: stackMarketing ? 0 : 8, marginTop: stackMarketing ? 8 : 0 }}>
            <ShimmerBlock style={{ height: 120, borderRadius: 16, width: '100%' }} />
          </View>
        </View>
      </View>

      {/* Contact & Owner Cards Skeleton */}
      <View className="px-4 pt-6 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </View>

      {/* Dashboard Skeleton */}
      <View className="px-4 py-4">
        <ShimmerBlock style={{ height: 20, borderRadius: 10, width: '40%', marginBottom: 16, marginLeft: 4 }} />
        <View className="flex-row flex-wrap justify-between">
          {Array.from({ length: dashboardColumns }).map((_, index) => (
            <View key={index} style={{ width: dashboardCardWidth, marginBottom: 12 }}>
              <SkeletonCard />
            </View>
          ))}
        </View>
      </View>

      {/* Actions rapides Skeleton */}
      <View className="px-4 py-4">
        <ShimmerBlock style={{ height: 20, borderRadius: 10, width: '45%', marginBottom: 16, marginLeft: 4 }} />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>

      {/* Gestion Skeleton */}
      <View className="px-4 py-4">
        <ShimmerBlock style={{ height: 20, borderRadius: 10, width: '50%', marginBottom: 16, marginLeft: 4 }} />
        <SkeletonCard />
        <SkeletonCard />
      </View>

      {/* Paramètres Skeleton */}
      <View className="px-4 py-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>

      {/* Bouton de déconnexion Skeleton */}
      <View className="px-4 py-6">
        <ShimmerBlock style={{ height: 48, borderRadius: 16, width: '100%' }} />
      </View>
    </ScrollView>
  );

  // Unified toast helpers (reanimated only)
  const notifySuccess = React.useCallback((title: string, message?: string) => {
    try { showReToast({ title, subtitle: message, autodismiss: true }); } catch {}
  }, [showReToast]);
  const notifyError = React.useCallback((title: string, message?: string) => {
    try { showReToast({ title, subtitle: message, autodismiss: true }); } catch {}
  }, [showReToast]);
  const notifyInfo = React.useCallback((title: string, message?: string) => {
    try { showReToast({ title, subtitle: message, autodismiss: true }); } catch {}
  }, [showReToast]);

  // Charger les données du profil
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await EnterpriseService.getProfile();
      setProfileData(data);
    } catch (error: any) {
      console.error('❌ Erreur chargement profil:', error);
      notifyError('Erreur', error.message || 'Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // loadProfile retiré des dépendances pour éviter la boucle infinie

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
      notifySuccess('Succès', 'Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour profil:', error);
      notifyError('Erreur', error.message || 'Impossible de mettre à jour le profil');
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
      notifySuccess('Succès', 'Informations entreprise mises à jour avec succès');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour entreprise:', error);
      notifyError('Erreur', error.message || 'Impossible de mettre à jour les informations entreprise');
    } finally {
      setEditLoading(false);
    }
  };

  // Gérer l'ajout d'un partenaire
  // Ancienne fonction d'ajout direct d'un partenaire (remplacée par le flux via la page dédiée)
  const handleAddPartner = async (_partnerId: string) => {
    notifyInfo('Redirection', 'Veuillez utiliser la page Partenaires pour associer un livreur.');
  };

  // NOTE: suppression partenaire gérée future (liste partenaires). Fonction retirée pour éviter code mort.

  // Fonctions de confirmation modal
  const showConfirmation = (type: 'toggle_status' | 'logout', onConfirm: () => void) => {
    let title = '';
    let message = '';
    let confirmText = '';
    let confirmColor = '';

    switch (type) {
      case 'toggle_status':
        const newStatus = profileData?.enterprise.isActive ? 'désactiver' : 'activer';
        title = 'Changer le statut';
        message = `Voulez-vous vraiment ${newStatus} votre entreprise ?`;
        confirmText = 'Confirmer';
        confirmColor = profileData?.enterprise.isActive ? '#F59E0B' : '#10B981';
        break;
      case 'logout':
        title = 'Déconnexion';
        message = 'Êtes-vous sûr de vouloir vous déconnecter ?';
        confirmText = 'Déconnexion';
        confirmColor = '#EF4444';
        break;
    }

    setConfirmationAction({ type, title, message, confirmText, confirmColor, onConfirm });
    setConfirmationVisible(true);
  };

  const closeConfirmation = () => {
    setConfirmationVisible(false);
    setConfirmationAction(null);
  };

  const executeConfirmedAction = () => {
    if (confirmationAction?.onConfirm) {
      confirmationAction.onConfirm();
    }
    closeConfirmation();
  };

  // Gérer la déconnexion
  const handleLogout = () => {
    showConfirmation('logout', () => {
      logout();
      notifyInfo('Déconnecté', 'Vous avez été déconnecté avec succès');
      router.replace('/(auth)/welcome');
    });
  };

  // Gérer la navigation vers les partenaires
  const handleNavigateToPartners = () => {
    // Navigation directe: le dossier (enterprise)/delivery-partners contient index.tsx
    router.push('/(app)/(enterprise)/delivery-partners');
  };

  if (loading && !profileData) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <StatusBar backgroundColor="#10B981" barStyle="light-content" />
        {renderSkeletonProfile()}
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
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={['#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="px-6"
          style={{ paddingTop: headerPaddingTop, paddingBottom: headerPaddingBottom }}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-quicksand-bold text-white" numberOfLines={2}>
                {profileData.enterprise.companyName}
              </Text>
              <View className="flex-row items-center mt-3">
                <Ionicons name="location" size={16} color="rgba(255,255,255,0.85)" />
                <Text className="text-sm font-quicksand-medium text-white/90 ml-1" numberOfLines={1}>
                  {profileData.enterprise.location.district}, {profileData.enterprise.location.city}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowEditEnterprise(true)}
              className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
            >
              <Ionicons name="create" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Overlay Card */}
        <View className="px-4" style={{ marginTop: overlayLift }}>
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-5 flex-row items-center">
            <View className="relative">
              {profileData.enterprise.logo ? (
                <Image
                  source={{ uri: profileData.enterprise.logo }}
                  className="rounded-2xl"
                  resizeMode="cover"
                  style={{ width: logoSize, height: logoSize }}
                />
              ) : (
                <View
                  className="rounded-2xl bg-primary-500 items-center justify-center"
                  style={{ width: logoSize, height: logoSize }}
                >
                  <Text className="text-white font-quicksand-bold text-2xl">
                    {profileData.enterprise.companyName?.[0]?.toUpperCase() || 'E'}
                  </Text>
                </View>
              )}
              {profileData.enterprise.isActive && (
                <View className="absolute -top-1 -right-1 w-6 h-6 bg-success-500 rounded-full justify-center items-center">
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View className="flex-1" style={{ marginLeft: isSmallPhone ? 12 : 20 }}>
              {profileData.enterprise.description ? (
                <Text className="text-neutral-700 font-quicksand-medium text-sm" numberOfLines={3}>
                  {profileData.enterprise.description}
                </Text>
              ) : (
                <Text className="text-neutral-400 font-quicksand-regular text-sm italic">
                  Ajoutez une description pour présenter votre entreprise
                </Text>
              )}
              <View className="flex-row mt-4 space-x-3" style={{ flexWrap: wrapOverlayChips ? 'wrap' : 'nowrap' }}>
                <TouchableOpacity
                  onPress={() => setShowEditProfile(true)}
                  className="px-3 py-2 bg-primary-50 rounded-xl flex-row items-center"
                  style={{ marginBottom: wrapOverlayChips ? 8 : 0, flexShrink: 1 }}
                >
                  <Ionicons name="person" size={14} color="#10B981" />
                  <Text className="text-primary-500 font-quicksand-semibold text-xs ml-1">Profil</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  // Ancien bouton modal d'ajout partenaire retiré : redirection uniquement depuis la section gestion
                  onPress={handleNavigateToPartners}
                  className="px-3 py-2 bg-secondary-50 rounded-xl flex-row items-center"
                  style={{ marginBottom: wrapOverlayChips ? 8 : 0, flexShrink: 1 }}
                >
                  <Ionicons name="people" size={14} color="#8B5CF6" />
                  <Text className="text-purple-600 font-quicksand-semibold text-xs ml-1">Partenaires</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowEnterpriseDetails(true)}
                  className="px-3 py-2 bg-neutral-100 rounded-xl flex-row items-center"
                  style={{ marginBottom: wrapOverlayChips ? 8 : 0, flexShrink: 1 }}
                >
                  <Ionicons name="information-circle" size={14} color="#4B5563" />
                  <Text className="text-neutral-700 font-quicksand-semibold text-xs ml-1">Détails</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Marketing & Abonnements (UI Only) */}
        <View className="px-4 pt-6">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4 pl-1">Marketing & Abonnements</Text>
          <View className="flex-row" style={{ flexDirection: stackMarketing ? 'column' : 'row' }}>
            {/* Card Publicités avec restriction */}
            {canUseFeature('advertisements') ? (
              <TouchableOpacity
                className="flex-1 rounded-2xl overflow-hidden shadow-sm"
                style={{ marginRight: stackMarketing ? 0 : 8, marginBottom: stackMarketing ? 8 : 0 }}
                activeOpacity={0.85}
                onPress={() => router.push('/(app)/(enterprise)/advertisements' as any)}
              >
                <LinearGradient
                  colors={['#10B981', '#34D399']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="mr-3 flex-1">
                      <Text className="text-white font-quicksand-semibold text-base" numberOfLines={1}>Publicités</Text>
                      <Text className="text-white/80 font-quicksand-medium text-[12px] mt-1" numberOfLines={2}>Créer & gérer vos bannières</Text>
                    </View>
                    <View className="w-10 h-10 rounded-xl bg-white/25 items-center justify-center">
                      <Ionicons name="megaphone" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                  <View className="mt-4 flex-row items-center">
                    <Text className="text-white font-quicksand-medium text-xs">Configurer maintenant</Text>
                    <Ionicons name="chevron-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View
                className="flex-1 rounded-2xl overflow-hidden shadow-sm"
                style={{ marginRight: stackMarketing ? 0 : 8, marginBottom: stackMarketing ? 8 : 0 }}
              >
                <View className="p-4 bg-neutral-100 border-2 border-dashed border-neutral-300 rounded-2xl">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="mr-3 flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-neutral-800 font-quicksand-semibold text-base" numberOfLines={1}>Publicités</Text>
                        <View className="ml-2 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Text className="text-amber-700 font-quicksand-bold text-[9px]">PREMIUM</Text>
                        </View>
                      </View>
                      <Text className="text-neutral-500 font-quicksand-medium text-[12px] mt-1" numberOfLines={2}>Fonctionnalité non disponible</Text>
                    </View>
                    <View className="w-10 h-10 rounded-xl bg-neutral-200 items-center justify-center">
                      <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push('/(app)/(enterprise)/subscriptions' as any)}
                    className="bg-white border border-neutral-200 rounded-xl py-2 px-3"
                  >
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="arrow-up-circle" size={14} color="#10B981" />
                      <Text className="text-primary-600 font-quicksand-bold text-xs ml-1.5">Passer à un plan supérieur</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Card Abonnements */}
            <TouchableOpacity
              className="flex-1 bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm"
              style={{ marginLeft: stackMarketing ? 0 : 8, marginTop: stackMarketing ? 8 : 0 }}
              activeOpacity={0.85}
              onPress={() => router.push('/(app)/(enterprise)/subscriptions' as any)}
            >
              <View className="flex-row items-center justify-between">
                <View className="mr-3 flex-1">
                  <Text className="text-neutral-800 font-quicksand-semibold text-base" numberOfLines={1}>Abonnements</Text>
                  <Text className="text-neutral-500 font-quicksand-medium text-[12px] mt-1" numberOfLines={2}>
                    {subscription ? subscription.plan.name : 'Akwaba • Cauris • Lissa'}
                  </Text>
                </View>
                <View className="w-10 h-10 rounded-xl bg-primary-100 items-center justify-center">
                  <Ionicons name="layers" size={20} color="#10B981" />
                </View>
              </View>
              <View className="mt-4 flex-row items-center">
                <Text className="text-primary-600 font-quicksand-semibold text-xs">
                  {subscription ? 'Gérer mon plan' : 'Voir les offres'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#10B981" style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact & Owner Cards */}
        <View className="px-4 pt-6 space-y-4">
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
            <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-4">
              Contact Entreprise
            </Text>
            <View className="space-y-3">
              {profileData.enterprise.contactInfo?.email && (
                <View className="flex-row items-center py-2">
                  <View className="w-9 h-9 rounded-xl bg-primary-100 items-center justify-center">
                    <Ionicons name="mail" size={18} color="#FE8C00" />
                  </View>
                  <Text className="text-sm text-neutral-700 ml-4 font-quicksand-medium flex-1" numberOfLines={1}>
                    {profileData.enterprise.contactInfo.email}
                  </Text>
                </View>
              )}
              {profileData.enterprise.contactInfo?.phone && (
                <View className="flex-row items-center py-2">
                  <View className="w-9 h-9 rounded-xl bg-primary-100 items-center justify-center">
                    <Ionicons name="call" size={18} color="#FE8C00" />
                  </View>
                  <Text className="text-sm text-neutral-700 ml-4 font-quicksand-medium flex-1" numberOfLines={1}>
                    {profileData.enterprise.contactInfo.phone}
                  </Text>
                </View>
              )}
              {profileData.enterprise.contactInfo?.whatsapp && (
                <View className="flex-row items-center py-2">
                  <View className="w-9 h-9 rounded-xl bg-success-100 items-center justify-center">
                    <Ionicons name="logo-whatsapp" size={18} color="#10B981" />
                  </View>
                  <Text className="text-sm text-neutral-700 ml-4 font-quicksand-medium flex-1" numberOfLines={1}>
                    {profileData.enterprise.contactInfo.whatsapp}
                  </Text>
                </View>
              )}
              {profileData.enterprise.contactInfo?.website && (
                <View className="flex-row items-center py-2">
                  <View className="w-9 h-9 rounded-xl bg-blue-100 items-center justify-center">
                    <Ionicons name="globe" size={18} color="#2563EB" />
                  </View>
                  <Text className="text-sm text-neutral-700 ml-4 font-quicksand-medium flex-1" numberOfLines={1}>
                    {profileData.enterprise.contactInfo.website}
                  </Text>
                </View>
              )}
              {!profileData.enterprise.contactInfo?.email && !profileData.enterprise.contactInfo?.phone && !profileData.enterprise.contactInfo?.whatsapp && !profileData.enterprise.contactInfo?.website && (
                <Text className="text-neutral-400 text-sm font-quicksand-regular italic">
                  Aucune information de contact renseignée
                </Text>
              )}
            </View>
          </View>

          <View className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-quicksand-semibold text-neutral-700">
                Propriétaire
              </Text>
              <TouchableOpacity onPress={() => setShowEditProfile(true)} className="flex-row items-center">
                <Ionicons name="create-outline" size={16} color="#6B7280" />
                <Text className="text-neutral-600 text-xs font-quicksand-medium ml-1">Modifier</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center">
              {profileData.user.profileImage ? (
                <Image source={{ uri: profileData.user.profileImage }} className="w-12 h-12 rounded-full" />
              ) : (
                <View className="w-12 h-12 rounded-full bg-neutral-200 items-center justify-center">
                  <Text className="text-neutral-600 font-quicksand-bold text-sm">
                    {`${profileData.user.firstName?.[0] || ''}${profileData.user.lastName?.[0] || ''}`.toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="ml-4 flex-1">
                <Text className="text-base font-quicksand-semibold text-neutral-800" numberOfLines={1}>
                  {profileData.user.firstName} {profileData.user.lastName}
                </Text>
                <Text className="text-sm text-neutral-600 font-quicksand-light" numberOfLines={1}>{profileData.user.email}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu de gestion */}
        <View className="px-4 py-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4 pl-1">
            Gestion & Outils
          </Text>
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            {/* Partenaires de livraison */}
            <TouchableOpacity 
              onPress={handleNavigateToPartners}
              className="flex-row items-center justify-between px-4 py-5 border-b border-neutral-100"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-indigo-100 rounded-full justify-center items-center">
                  <Ionicons name="people-outline" size={20} color="#6366F1" />
                </View>
                <View className="ml-4">
                  <Text className="text-base font-quicksand-medium text-neutral-800">
                    Partenaires de Livraison
                  </Text>
                  {profileData.enterprise.deliveryPartners && profileData.enterprise.deliveryPartners.length > 0 && (
                    <Text className="text-sm text-neutral-600 font-quicksand-light">
                      {profileData.enterprise.deliveryPartners.length} partenaire(s)
                    </Text>
                  )}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Paramètres */}
            <TouchableOpacity 
              onPress={() => router.push('/(app)/(enterprise)/profile/settings' as any)}
              className="flex-row items-center justify-between px-4 py-5"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary-100 rounded-full justify-center items-center">
                  <Ionicons name="settings-outline" size={20} color="#10B981" />
                </View>
                <View className="ml-4">
                  <Text className="text-base font-quicksand-medium text-neutral-800">
                    Paramètres
                  </Text>
                  <Text className="text-sm text-neutral-600 font-quicksand-light">
                    Préférences et configuration
                  </Text>
                </View>
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
            Axi Market v1.0.0
          </Text>
        </View>

        {/* Espace supplémentaire pour la navbar */}
        <View style={{ height: 100 }} />
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
            // Modal AddPartner retirée : ne plus rendre (placeholder pour éviter rupture si import conservé)
            visible={false}
            onClose={() => {}}
            onAdd={handleAddPartner}
            loading={editLoading}
          />

          <EnterpriseDetailsModal
            visible={showEnterpriseDetails}
            onClose={() => setShowEnterpriseDetails(false)}
            enterprise={profileData.enterprise}
          />

          {/* Modal de confirmation */}
          <Modal
            visible={confirmationVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={closeConfirmation}
          >
            <View className="flex-1 justify-center items-center bg-black/50 px-4">
              <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
                <Text className="text-xl font-quicksand-bold text-neutral-800 mb-2">
                  {confirmationAction?.title}
                </Text>
                <Text className="text-base text-neutral-600 font-quicksand-medium mb-6">
                  {confirmationAction?.message}
                </Text>
                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    className="flex-1 bg-neutral-100 rounded-xl py-3"
                    onPress={closeConfirmation}
                  >
                    <Text className="text-neutral-700 font-quicksand-semibold text-center">Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 rounded-xl py-3"
                    style={{ backgroundColor: confirmationAction?.confirmColor }}
                    onPress={executeConfirmedAction}
                  >
                    <Text className="text-white font-quicksand-semibold text-center">
                      {confirmationAction?.confirmText}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}

export default EnterpriseProfilePage;
