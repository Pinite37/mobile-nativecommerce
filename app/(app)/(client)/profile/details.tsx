import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ImagePickerModal from "../../../../components/ui/ImagePickerModal";
import { useToast } from "../../../../components/ui/ToastManager";
import { useAuth } from "../../../../contexts/AuthContext";
import CustomerService, { UpdateProfileRequest } from "../../../../services/api/CustomerService";

export default function ProfileDetailsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, refreshUserData } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true); // Commencer avec loading = true
  const [saving, setSaving] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const toast = useToast();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
  
  // État local pour les informations du profil
  const [profile, setProfile] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    profileImage: user?.profileImage || undefined,
  });

  // Charger les informations du profil depuis l'API
  useEffect(() => {
    fetchProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fonction pour charger les données du profil
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const profileData = await CustomerService.getProfile();
      setProfile({
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        profileImage: profileData.profileImage || undefined,
      });
      // Le rafraîchissement du contexte est géré par l'API refreshUserData
      await refreshUserData();
    } catch (error) {
      toast.showError("Erreur", "Impossible de charger les informations du profil");
      console.error("Erreur lors du chargement du profil:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour mettre à jour les champs
  const handleChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  // Fonction pour sauvegarder les modifications
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Préparer les données à mettre à jour
      const updateData: UpdateProfileRequest = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      };
      
      // Appeler l'API pour mettre à jour le profil
      await CustomerService.updateProfile(updateData);
      
      // Rafraîchir les données utilisateur dans le contexte
      await refreshUserData();
      
      // Afficher un toast de succès
      toast.showSuccess("Profil mis à jour", "Vos informations ont été enregistrées avec succès");
      
      // Retourner à la page précédente
      router.back();
    } catch (error) {
      toast.showError("Erreur", "Impossible de mettre à jour votre profil");
      console.error("Erreur lors de la mise à jour du profil:", error);
    } finally {
      setSaving(false);
    }
  };
  
  // Gérer la mise à jour de la photo de profil
  const handleImageUpdated = (imageUrl: string) => {
    setProfile(prev => ({ ...prev, profileImage: imageUrl }));
    // Rafraîchir les données utilisateur dans le contexte
    refreshUserData();
  };

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

  const SkeletonForm = () => (
    <ScrollView className="flex-1 px-4">
      {/* Photo de profil skeleton */}
      <View className="bg-white rounded-2xl mt-6 p-4 items-center">
        <ShimmerBlock style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 16 }} />
        <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '40%' }} />
      </View>

      {/* Informations personnelles skeleton */}
      <View className="bg-white rounded-2xl mt-6 p-4">
        <ShimmerBlock style={{ height: 20, borderRadius: 10, width: '60%', marginBottom: 16 }} />

        {/* Champs skeleton */}
        {[1, 2, 3, 4].map((i) => (
          <View key={i} className="mb-4">
            <ShimmerBlock style={{ height: 14, borderRadius: 7, width: '25%', marginBottom: 8 }} />
            <ShimmerBlock style={{ height: 48, borderRadius: 12, width: '100%' }} />
          </View>
        ))}
      </View>

      {/* Sécurité skeleton */}
      <View className="bg-white rounded-2xl mt-6 p-4">
        <ShimmerBlock style={{ height: 20, borderRadius: 10, width: '30%', marginBottom: 16 }} />

        {[1, 2, 3].map((i) => (
          <View key={i} className="py-3 border-b border-gray-100">
            <View className="flex-row items-center">
              <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 12, marginRight: 12 }} />
              <View className="flex-1">
                <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '70%', marginBottom: 4 }} />
              </View>
              <ShimmerBlock style={{ width: 40, height: 24, borderRadius: 12 }} />
            </View>
          </View>
        ))}
      </View>

      {/* Bouton skeleton */}
      <View className="my-8">
        <ShimmerBlock style={{ height: 48, borderRadius: 16, width: '100%' }} />
      </View>
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-background-secondary">
      <ExpoStatusBar style="light" translucent />
      {/* Header vert */}
      <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="pb-6 rounded-b-3xl shadow-md" style={{ paddingTop: insets.top + 16, paddingBottom: 16 }}>
        <View className="px-6">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-white/20 rounded-full justify-center items-center"
            >
              <Ionicons name="chevron-back" size={20} color="white" />
            </TouchableOpacity>
            <View className="flex-1 mx-4">
              <Text className="text-lg font-quicksand-bold text-white text-center">
                Mes informations
              </Text>
            </View>
            <View className="w-10 h-10">
              {loading && (
                <ActivityIndicator size="small" color="white" />
              )}
            </View>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <SkeletonForm />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {/* Modal de sélection d'image */}
          <ImagePickerModal
            visible={imagePickerVisible}
            onClose={() => setImagePickerVisible(false)}
            onImageUpdated={handleImageUpdated}
          />

          <ScrollView className="flex-1 px-4">
          {/* Photo de profil */}
          <View className="bg-white rounded-2xl mt-6 p-4 items-center">
            <TouchableOpacity 
              onPress={() => setImagePickerVisible(true)}
              className="mb-4"
            >
              {profile.profileImage ? (
                <Image 
                  source={{ uri: profile.profileImage }} 
                  className="w-24 h-24 rounded-full"
                  style={{ borderWidth: 2, borderColor: '#FE8C00' }}
                />
              ) : (
                <View 
                  className="w-24 h-24 rounded-full bg-primary-100 justify-center items-center"
                  style={{ borderWidth: 2, borderColor: '#FE8C00' }}
                >
                  <Ionicons name="person" size={40} color="#FE8C00" />
                </View>
              )}
              
              <View className="absolute bottom-0 right-0 bg-primary rounded-full w-8 h-8 items-center justify-center">
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text className="text-center font-quicksand-semibold text-primary-500">
              Modifier ma photo
            </Text>
          </View>

          {/* Informations personnelles */}
          <View className="bg-white rounded-2xl mt-6 p-4">
            <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4">
              Informations personnelles
            </Text>
            
            {/* Prénom */}
            <View className="mb-4">
              <Text className="text-sm font-quicksand-medium text-neutral-600 mb-2">
                Prénom
              </Text>
              <TextInput
                value={profile.firstName}
                onChangeText={(text) => handleChange("firstName", text)}
                className="border border-gray-200 rounded-xl p-3 font-quicksand"
                placeholder="Votre prénom"
              />
            </View>

            {/* Nom */}
            <View className="mb-4">
              <Text className="text-sm font-quicksand-medium text-neutral-600 mb-2">
                Nom
              </Text>
              <TextInput
                value={profile.lastName}
                onChangeText={(text) => handleChange("lastName", text)}
                className="border border-gray-200 rounded-xl p-3 font-quicksand"
                placeholder="Votre nom"
              />
            </View>

            {/* Email */}
            <View className="mb-4">
              <Text className="text-sm font-quicksand-medium text-neutral-600 mb-2">
                Email
              </Text>
              <TextInput
                value={profile.email}
                onChangeText={(text) => handleChange("email", text)}
                className="border border-gray-200 rounded-xl p-3 font-quicksand"
                placeholder="Votre email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Téléphone */}
            <View className="mb-4">
              <Text className="text-sm font-quicksand-medium text-neutral-600 mb-2">
                Téléphone
              </Text>
              <TextInput
                value={profile.phone}
                onChangeText={(text) => handleChange("phone", text)}
                className="border border-gray-200 rounded-xl p-3 font-quicksand"
                placeholder="Votre numéro de téléphone"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Sécurité */}
          <View className="bg-white rounded-2xl mt-6 p-4">
            <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4">
              Sécurité
            </Text>
            
            <TouchableOpacity
              className="flex-row items-center justify-between py-3 border-b border-gray-100"
            >
              <View className="flex-row items-center">
                <Ionicons name="lock-closed-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Modifier le mot de passe
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between py-3 border-b border-gray-100"
            >
              <View className="flex-row items-center">
                <Ionicons name="finger-print-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Authentification biométrique
                </Text>
              </View>
              <View className="w-12 h-6 bg-primary rounded-full px-1 justify-center">
                <View className="w-4 h-4 bg-white rounded-full ml-auto" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between py-3"
            >
              <View className="flex-row items-center">
                <Ionicons name="notifications-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Notifications de connexion
                </Text>
              </View>
              <View className="w-12 h-6 bg-gray-200 rounded-full px-1 justify-center">
                <View className="w-4 h-4 bg-white rounded-full" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Bouton de sauvegarde */}
          <View className="my-8">
            <TouchableOpacity
              onPress={handleSave}
              className="bg-primary py-4 rounded-xl"
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white text-center font-quicksand-bold text-base">
                  Enregistrer les modifications
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    )}
    </View>
  );
}
