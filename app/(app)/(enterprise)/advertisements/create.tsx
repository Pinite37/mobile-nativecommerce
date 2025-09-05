import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateAdvertisement() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;

  const [title, setTitle] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de l\'accès à votre galerie pour sélectionner une image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 1], // Ratio pour bannière
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de l\'accès à votre caméra pour prendre une photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre pour votre publicité.');
      return;
    }

    if (!image) {
      Alert.alert('Erreur', 'Veuillez sélectionner une image pour votre publicité.');
      return;
    }

    setLoading(true);

    try {
      // Simulation de sauvegarde
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        'Succès',
        isEditing ? 'Publicité modifiée avec succès !' : 'Publicité créée avec succès !',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !image) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs avant de publier.');
      return;
    }

    Alert.alert(
      'Publier la publicité',
      'Votre publicité sera soumise à validation avant d\'être publiée.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Publier',
          onPress: async () => {
            setLoading(true);
            try {
              // Simulation de publication
              await new Promise(resolve => setTimeout(resolve, 1500));
              Alert.alert('Succès', 'Publicité publiée avec succès !', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
        <StatusBar backgroundColor="#10B981" barStyle="light-content" />

        {/* Header */}
        <LinearGradient
          colors={['#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-6 pt-14 pb-6"
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-xl font-quicksand-bold text-white">
              {isEditing ? 'Modifier la publicité' : 'Nouvelle publicité'}
            </Text>
            <View className="w-10 h-10" />
          </View>
        </LinearGradient>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            className="flex-1 px-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          >
            {/* Image Section */}
            <View className="mt-6">
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">
                Image de la bannière *
              </Text>

              {image ? (
                <View className="relative">
                  <Image
                    source={{ uri: image }}
                    className="w-full h-32 rounded-2xl"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setImage(null)}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full items-center justify-center"
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Ajouter une image',
                      'Choisissez une option',
                      [
                        { text: 'Annuler', style: 'cancel' },
                        { text: 'Prendre une photo', onPress: takePhoto },
                        { text: 'Choisir depuis la galerie', onPress: pickImage },
                      ]
                    );
                  }}
                  className="w-full h-32 bg-neutral-100 rounded-2xl items-center justify-center border-2 border-dashed border-neutral-300"
                >
                  <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                  <Text className="text-neutral-500 font-quicksand-medium mt-2 text-sm">
                    Appuyez pour ajouter une image
                  </Text>
                  <Text className="text-neutral-400 font-quicksand-medium text-xs mt-1">
                    Ratio recommandé: 3:1
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Title Section */}
            <View className="mt-6">
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">
                Titre de la publicité *
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Promo exceptionnelle -30% sur tous les produits"
                className="bg-white rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border border-neutral-200"
                placeholderTextColor="#9CA3AF"
                maxLength={100}
                multiline
                numberOfLines={2}
              />
              <Text className="text-xs text-neutral-500 font-quicksand-medium mt-2 text-right">
                {title.length}/100 caractères
              </Text>
            </View>

            {/* Preview Section */}
            {(title.trim() || image) && (
              <View className="mt-8">
                <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">
                  Aperçu
                </Text>
                <View className="bg-white rounded-2xl overflow-hidden border border-neutral-100">
                  {image ? (
                    <View className="relative">
                      <Image
                        source={{ uri: image }}
                        className="w-full h-32"
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.4)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        className="absolute inset-0"
                      />
                      <View className="absolute bottom-3 left-3 right-3">
                        <Text className="text-white font-quicksand-bold text-lg" numberOfLines={2}>
                          {title.trim() || 'Titre de votre publicité'}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View className="w-full h-32 bg-neutral-100 items-center justify-center">
                      <Text className="text-neutral-600 font-quicksand-medium">
                        {title.trim() || 'Votre titre apparaîtra ici'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Actions */}
          <View
            className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-4 py-4"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleSave}
                disabled={loading}
                className="flex-1 bg-neutral-100 rounded-2xl py-4 items-center justify-center"
              >
                <Text className="text-neutral-700 font-quicksand-semibold">
                  {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePublish}
                disabled={loading || !title.trim() || !image}
                className={`flex-1 rounded-2xl py-4 items-center justify-center ${
                  title.trim() && image && !loading
                    ? 'bg-primary-500'
                    : 'bg-neutral-300'
                }`}
              >
                <Text className={`font-quicksand-semibold ${
                  title.trim() && image && !loading ? 'text-white' : 'text-neutral-500'
                }`}>
                  {loading ? 'Publication...' : 'Publier'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}
