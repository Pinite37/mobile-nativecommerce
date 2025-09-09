import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdvertisementService, { CreateAdvertisementPayload } from '../../../../services/api/AdvertisementService';

export default function CreateAdvertisement() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'PROMOTION' | 'EVENT' | 'ANNOUNCEMENT' | 'BANNER'>('PROMOTION');
  const [audience, setAudience] = useState<'ALL' | 'CLIENTS' | 'ENTERPRISES' | 'DELIVERS'>('ALL');
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() + 60*60*1000)); // +1h
  const [endDate, setEndDate] = useState<Date>(new Date(Date.now() + 24*60*60*1000)); // +1 day
  // iOS combined pickers
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  // Android two-phase (date -> time)
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      const uri = result.assets[0].uri;
      setImage(uri);
      try {
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const ext = uri.split('.').pop()?.toLowerCase();
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        setImageBase64(`data:${mime};base64,${b64}`);
      } catch (e: any) {
        Alert.alert('Erreur', e?.message || 'Impossible de lire l\'image.');
      }
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
      const uri = result.assets[0].uri;
      setImage(uri);
      try {
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        setImageBase64(`data:image/jpeg;base64,${b64}`);
      } catch (e: any) {
        Alert.alert('Erreur', e?.message || 'Impossible de lire la photo.');
      }
    }
  };

  const validate = () => {
    if (!title.trim()) return 'Titre requis';
    if (!description.trim()) return 'Description requise';
    if (!imageBase64) return 'Image requise';
    if (endDate <= startDate) return 'La date de fin doit être après la date de début';
    if (startDate.getTime() < Date.now()) return 'La date de début doit être dans le futur';
    return null;
  };

  const submit = async () => {
    const error = validate();
    if (error) { Alert.alert('Erreur', error); return; }
    setSubmitting(true);
    try {
      const payload: CreateAdvertisementPayload = {
        title: title.trim(),
        description: description.trim(),
        imageBase64: imageBase64!,
        type,
        targetAudience: audience,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      await AdvertisementService.create(payload);
      Alert.alert('Succès', 'Publicité créée avec succès', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Échec de la création');
    } finally {
      setSubmitting(false);
    }
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

            {/* Description */}
            <View className="mt-6">
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">Description *</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Décrivez votre publicité, les détails de l'offre, etc."
                className="bg-white rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border border-neutral-200"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text className="text-xs text-neutral-500 font-quicksand-medium mt-2 text-right">{description.length}/500</Text>
            </View>

            {/* Type & Audience */}
            <View className="mt-6 flex-row gap-3">
              <View className="flex-1">
                <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">Type *</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['PROMOTION','EVENT','ANNOUNCEMENT','BANNER'].map(t => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setType(t as any)}
                      className={`px-3 py-2 rounded-xl border ${type===t? 'bg-primary-500 border-primary-500':'bg-white border-neutral-200'}`}
                    >
                      <Text className={`text-xs font-quicksand-semibold ${type===t?'text-white':'text-neutral-700'}`}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">Audience</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['ALL','CLIENTS','ENTERPRISES','DELIVERS'].map(a => (
                    <TouchableOpacity
                      key={a}
                      onPress={() => setAudience(a as any)}
                      className={`px-3 py-2 rounded-xl border ${audience===a? 'bg-primary-500 border-primary-500':'bg-white border-neutral-200'}`}
                    >
                      <Text className={`text-xs font-quicksand-semibold ${audience===a?'text-white':'text-neutral-700'}`}>{a}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Dates */}
            <View className="mt-6">
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">Période *</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => { if (Platform.OS === 'android') { setShowStartDatePicker(true); } else { setShowStartPicker(true); } }} className="flex-1 bg-white rounded-2xl px-4 py-4 border border-neutral-200">
                  <Text className="text-xs text-neutral-500 font-quicksand-medium mb-1">Début</Text>
                  <Text className="text-neutral-800 font-quicksand-semibold text-sm">{startDate.toLocaleString('fr-FR')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { if (Platform.OS === 'android') { setShowEndDatePicker(true); } else { setShowEndPicker(true); } }} className="flex-1 bg-white rounded-2xl px-4 py-4 border border-neutral-200">
                  <Text className="text-xs text-neutral-500 font-quicksand-medium mb-1">Fin</Text>
                  <Text className="text-neutral-800 font-quicksand-semibold text-sm">{endDate.toLocaleString('fr-FR')}</Text>
                </TouchableOpacity>
              </View>
              {/* iOS combined pickers */}
              {Platform.OS === 'ios' && showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  minimumDate={new Date(Date.now() + 30 * 60 * 1000)}
                  mode="datetime"
                  onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                    setShowStartPicker(false);
                    if (event.type === 'dismissed') return;
                    if (selectedDate) {
                      setStartDate(selectedDate);
                      if (selectedDate >= endDate) {
                        setEndDate(new Date(selectedDate.getTime() + 60 * 60 * 1000));
                      }
                    }
                  }}
                />
              )}
              {Platform.OS === 'ios' && showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  minimumDate={new Date(startDate.getTime() + 30 * 60 * 1000)}
                  mode="datetime"
                  onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                    setShowEndPicker(false);
                    if (event.type === 'dismissed') return;
                    if (selectedDate) setEndDate(selectedDate);
                  }}
                />
              )}

              {/* Android: date -> time sequence for start */}
              {Platform.OS === 'android' && showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  minimumDate={new Date(Date.now() + 30 * 60 * 1000)}
                  mode="date"
                  onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                    if (event.type === 'dismissed') { setShowStartDatePicker(false); return; }
                    if (selectedDate) {
                      const updated = new Date(selectedDate);
                      updated.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
                      setStartDate(updated);
                      setShowStartDatePicker(false);
                      setShowStartTimePicker(true);
                    }
                  }}
                />
              )}
              {Platform.OS === 'android' && showStartTimePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="time"
                  onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                    setShowStartTimePicker(false);
                    if (event.type === 'dismissed') return;
                    if (selectedDate) {
                      const updated = new Date(startDate);
                      updated.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
                      setStartDate(updated);
                      if (updated >= endDate) {
                        setEndDate(new Date(updated.getTime() + 60 * 60 * 1000));
                      }
                    }
                  }}
                />
              )}

              {/* Android: date -> time sequence for end */}
              {Platform.OS === 'android' && showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  minimumDate={new Date(startDate.getTime() + 30 * 60 * 1000)}
                  mode="date"
                  onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                    if (event.type === 'dismissed') { setShowEndDatePicker(false); return; }
                    if (selectedDate) {
                      const updated = new Date(selectedDate);
                      updated.setHours(endDate.getHours(), endDate.getMinutes(), 0, 0);
                      setEndDate(updated);
                      setShowEndDatePicker(false);
                      setShowEndTimePicker(true);
                    }
                  }}
                />
              )}
              {Platform.OS === 'android' && showEndTimePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="time"
                  onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                    setShowEndTimePicker(false);
                    if (event.type === 'dismissed') return;
                    if (selectedDate) {
                      const updated = new Date(endDate);
                      updated.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
                      if (updated <= startDate) {
                        Alert.alert('Attention', 'La fin doit être après le début.');
                        return;
                      }
                      setEndDate(updated);
                    }
                  }}
                />
              )}
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
                onPress={submit}
                disabled={submitting}
                className={`flex-1 rounded-2xl py-4 items-center justify-center ${
                  validate() ? 'bg-neutral-300' : 'bg-primary-500'
                }`}
              >
                <Text className={`font-quicksand-semibold ${!validate() ? 'text-white' : 'text-neutral-500'}`}>
                  {submitting ? 'Envoi...' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}
