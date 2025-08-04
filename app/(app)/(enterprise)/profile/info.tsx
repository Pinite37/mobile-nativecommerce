import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "../../../../components/ui/ToastManager";
import { useAuth } from "../../../../contexts/AuthContext";
import EnterpriseService, { Enterprise, SocialLink } from "../../../../services/api/EnterpriseService";

export default function EnterpriseInfoScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  const loadEnterpriseData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const data = await EnterpriseService.getEnterpriseById(user.enterpriseId);
      if (data) {
        setEnterprise(data);
        setName(data.name || "");
        setDescription(data.description || "");
        setWebsite(data.website || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setSocialLinks(data.socialLinks || []);
      }
    } catch (error) {
      toast.showError("Erreur", "Impossible de charger les informations de l'entreprise");
      console.error("Failed to load enterprise data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadEnterpriseData();
  }, [loadEnterpriseData]);

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

  const handleAddSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: "", url: "" }]);
  };

  const handleUpdateSocialLink = (index: number, field: 'platform' | 'url', value: string) => {
    const updatedLinks = [...socialLinks];
    updatedLinks[index][field] = value;
    setSocialLinks(updatedLinks);
  };

  const handleRemoveSocialLink = (index: number) => {
    const updatedLinks = [...socialLinks];
    updatedLinks.splice(index, 1);
    setSocialLinks(updatedLinks);
  };

  const handleSave = async () => {
    if (!enterprise) return;

    if (!name.trim()) {
      toast.showWarning("Champ requis", "Le nom de l'entreprise est requis");
      return;
    }

    try {
      setSaving(true);
      const updatedEnterprise = {
        ...enterprise,
        name,
        description,
        website,
        phone,
        address,
        socialLinks
      };

      await EnterpriseService.updateEnterprise(updatedEnterprise, imageBase64);
      toast.showSuccess("Succès", "Informations de l'entreprise mises à jour avec succès");
      router.back();
    } catch (error) {
      toast.showError("Erreur", "Impossible de mettre à jour les informations de l'entreprise");
      console.error("Failed to update enterprise:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#FE8C00" />
        <Text className="mt-4 text-neutral-600 font-quicksand-medium">
          Chargement des informations...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <View className="flex-row items-center justify-between px-6 py-4 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-quicksand-bold text-neutral-800">
          Informations entreprise
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {/* Logo de l'entreprise */}
          <View className="items-center mb-6">
            <TouchableOpacity 
              onPress={pickImage}
              className="relative mb-2"
            >
              <View className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary-500">
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} className="w-full h-full" />
                ) : enterprise?.logoUrl ? (
                  <Image source={{ uri: enterprise.logoUrl }} className="w-full h-full" />
                ) : (
                  <View className="w-full h-full bg-neutral-200 justify-center items-center">
                    <Ionicons name="business-outline" size={40} color="#9CA3AF" />
                  </View>
                )}
              </View>
              <View className="absolute bottom-0 right-0 bg-primary-500 rounded-full w-8 h-8 justify-center items-center border-2 border-white">
                <Ionicons name="camera-outline" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text className="text-primary-600 font-quicksand-medium">
              Modifier le logo
            </Text>
          </View>

          {/* Nom de l'entreprise */}
          <View className="mb-4">
            <Text className="text-neutral-700 font-quicksand-semibold mb-2 pl-1">
              Nom de l&apos;entreprise*
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nom de votre entreprise"
              className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 font-quicksand-regular"
            />
          </View>

          {/* Description */}
          <View className="mb-4">
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
          <View className="mb-6">
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
            
            <View>
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

          {/* Réseaux sociaux */}
          <View className="mb-6">
            <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
              Réseaux sociaux
            </Text>
            
            {socialLinks.map((link, index) => (
              <View key={index} className="flex-row items-center mb-3">
                <TextInput
                  value={link.platform}
                  onChangeText={(value) => handleUpdateSocialLink(index, 'platform', value)}
                  placeholder="Plateforme (ex: Facebook)"
                  className="flex-1 bg-white border border-neutral-200 rounded-l-xl px-4 py-3 text-neutral-800 font-quicksand-regular"
                />
                <TextInput
                  value={link.url}
                  onChangeText={(value) => handleUpdateSocialLink(index, 'url', value)}
                  placeholder="URL"
                  className="flex-2 bg-white border-t border-r border-b border-neutral-200 rounded-r-xl px-4 py-3 text-neutral-800 font-quicksand-regular"
                  style={{ flex: 2 }}
                />
                <TouchableOpacity 
                  onPress={() => handleRemoveSocialLink(index)}
                  className="ml-2 w-8 h-8 bg-error-100 rounded-full justify-center items-center"
                >
                  <Ionicons name="close" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            
            <TouchableOpacity 
              onPress={handleAddSocialLink}
              className="flex-row items-center mt-2"
            >
              <Ionicons name="add-circle" size={20} color="#FE8C00" />
              <Text className="text-primary-500 font-quicksand-medium ml-1">
                Ajouter un réseau social
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bouton Enregistrer */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-primary-500 rounded-xl py-4 mb-10"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-quicksand-bold text-center">
                Enregistrer les modifications
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
