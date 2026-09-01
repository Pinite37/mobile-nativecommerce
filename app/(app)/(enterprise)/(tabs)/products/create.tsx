import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from 'expo-image-picker';
import { Link, router, useFocusEffect } from "expo-router";
import { useNavigation } from 'expo-router';
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToast } from "../../../../../components/ui/ToastManager";
import { useLocale } from "../../../../../contexts/LocaleContext";
import { useSubscription } from "../../../../../contexts/SubscriptionContext";
import { useTheme } from "../../../../../contexts/ThemeContext";
import i18n from "../../../../../i18n/i18n";
import CategoryService from "../../../../../services/api/CategoryService";
import ProductService from "../../../../../services/api/ProductService";
import { Category, CreateProductRequest } from "../../../../../types/product";

interface ProductFormImage {
  base64: string;
  uri: string;
  loading?: boolean;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  category: string;
  images: ProductFormImage[];
}

interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
  category?: string;
  images?: string;
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ borderRadius: 20, overflow: 'hidden' }, style]}>
      {children}
    </View>
  );
}

export default function CreateProduct() {
  const { locale } = useLocale();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showSuccess, showError } = useToast();
  const { subscription, hasReachedLimit } = useSubscription();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    price: '',
    category: '',
    images: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const nameRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);

  const maxImages = subscription?.plan?.features?.maxImagesPerProduct ?? 1;
  const maxProducts = subscription?.plan?.features?.maxProducts ?? 0;
  const readyImages = form.images.filter(i => !i.loading);

  useFocusEffect(
    useCallback(() => {
      const parent = (navigation as any)?.getParent?.();
      parent?.setOptions?.({ tabBarStyle: { display: 'none' } });
      return () => parent?.setOptions?.({ tabBarStyle: undefined });
    }, [navigation])
  );

  useEffect(() => {
    loadCategories();
    loadProductsCount();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      setCategories(await CategoryService.getActiveCategories());
    } catch { }
    finally { setLoadingCategories(false); }
  };

  const loadProductsCount = async () => {
    try {
      const res = await ProductService.getEnterpriseProducts();
      setTotalProducts(res.products.length);
    } catch { }
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = 'Le nom est requis';
    if (!form.description.trim()) e.description = 'La description est requise';
    if (!form.price.trim() || isNaN(Number(form.price)) || Number(form.price) <= 0)
      e.price = 'Prix invalide';
    if (!form.category) e.category = 'Choisissez une catégorie';
    if (readyImages.length === 0) e.images = 'Ajoutez au moins une photo';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleImagePicker = async () => {
    if (readyImages.length >= maxImages) {
      showError('Limite atteinte', `Votre plan autorise ${maxImages} image${maxImages > 1 ? 's' : ''} par produit`);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) {
        showError('Image trop lourde', 'Maximum 5 Mo par image');
        return;
      }
      setForm(prev => ({ ...prev, images: [...prev.images, { base64: asset.base64 ?? '', uri: asset.uri, loading: true }] }));
      setTimeout(() => {
        setForm(prev => ({ ...prev, images: prev.images.map(img => img.uri === asset.uri ? { ...img, loading: false } : img) }));
      }, 600);
      if (errors.images) setErrors(prev => ({ ...prev, images: undefined }));
    }
  };

  const removeImage = (index: number) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async () => {
    if (hasReachedLimit('maxProducts', totalProducts)) {
      showError('Limite atteinte', `Vous avez atteint la limite de ${maxProducts} produit${maxProducts > 1 ? 's' : ''} de votre plan`);
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      const productData: CreateProductRequest = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category: form.category,
        images: form.images.map(img => `data:image/jpeg;base64,${img.base64}`),
      };
      const created = await ProductService.createProduct(productData);

      // Invalider tous les caches qui affichent la liste de produits de
      // l'entreprise — sans ça, l'accueil (clé ['products', 'enterprise',
      // 'featured']) et la liste de gestion (clé ['enterprise', 'products'])
      // continuent d'afficher leurs données périmées jusqu'à un refresh manuel.
      queryClient.invalidateQueries({ queryKey: ['products', 'enterprise', 'featured'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'popular'] });
      queryClient.invalidateQueries({ queryKey: ['enterprise', 'products'] });

      showSuccess('Produit créé !', created.name);
      setTimeout(() => router.replace('/(app)/(enterprise)/(tabs)/products'), 1200);
    } catch (err: any) {
      showError('Erreur', err.message ?? 'Impossible de créer le produit');
    } finally {
      setLoading(false);
    }
  };

  const inputBorderColor = (field: string) => focusedField === field ? '#10B981' : colors.border;

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View style={{
        backgroundColor: colors.surface,
        paddingTop: insets.top + 8,
        paddingBottom: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}>
        <Link href="/(app)/(enterprise)/(tabs)/products" asChild>
          <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tertiary, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </Link>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-SemiBold', fontSize: 18 }}>Nouveau produit</Text>
          <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-Regular', fontSize: 12, marginTop: 1 }}>Remplissez les informations ci-dessous</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={100}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32, gap: 14 }}
      >

        {/* ── Photos ── */}
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: errors.images ? '#FCA5A5' : colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Ionicons name="images-outline" size={16} color="#6366F1" />
            </View>
            <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 15, flex: 1 }}>
              Photos du produit
            </Text>
            <View style={{ backgroundColor: readyImages.length > 0 ? 'rgba(16,185,129,0.12)' : colors.secondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: readyImages.length > 0 ? '#10B981' : colors.textSecondary, fontFamily: 'Poppins-Bold', fontSize: 12 }}>
                {readyImages.length}/{maxImages}
              </Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {form.images.map((img, idx) => (
              <View key={idx} style={{ position: 'relative' }}>
                <Image source={{ uri: img.uri }} style={{ width: 80, height: 80, borderRadius: 14 }} resizeMode="cover" />
                {img.loading && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => removeImage(idx)}
                  style={{ position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
                {idx === 0 && (
                  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 4 }}>
                    <Text style={{ color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 8 }}>PRINCIPALE</Text>
                  </View>
                )}
              </View>
            ))}

            {readyImages.length < maxImages && (
              <TouchableOpacity
                onPress={handleImagePicker}
                activeOpacity={0.7}
                style={{ width: 80, height: 80, borderRadius: 14, borderWidth: 1.5, borderColor: '#10B981', borderStyle: 'dashed', backgroundColor: isDark ? 'rgba(16,185,129,0.07)' : '#F0FDF4', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                <Ionicons name="add" size={26} color="#10B981" />
                <Text style={{ color: '#10B981', fontFamily: 'Poppins-SemiBold', fontSize: 10 }}>Ajouter</Text>
              </TouchableOpacity>
            )}

            {/* Placeholder vide si aucune image */}
            {form.images.length === 0 && (
              <TouchableOpacity
                onPress={handleImagePicker}
                activeOpacity={0.7}
                style={{ width: 200, height: 80, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}
              >
                <Ionicons name="camera-outline" size={22} color={colors.textSecondary} />
                <View>
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-SemiBold', fontSize: 13 }}>Choisir une photo</Text>
                  <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-Medium', fontSize: 11 }}>JPG, PNG · max 5 Mo</Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>

          {errors.images && (
            <Text style={{ color: '#EF4444', fontFamily: 'Poppins-Medium', fontSize: 12, marginTop: 10 }}>⚠ {errors.images}</Text>
          )}
        </View>

        {/* ── Nom + Description ── */}
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Ionicons name="create-outline" size={16} color="#10B981" />
            </View>
            <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 15 }}>Informations</Text>
          </View>

          {/* Nom */}
          <View>
            <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 7 }}>
              Nom du produit *
            </Text>
            <TextInput
              ref={nameRef}
              style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, fontFamily: 'Poppins-Medium', fontSize: 15, borderWidth: 1.5, borderColor: inputBorderColor('name') }}
              placeholder="Ex : Robe en wax taille M, Samsung Galaxy A55..."
              placeholderTextColor={colors.textSecondary}
              value={form.name}
              onChangeText={t => { setForm(p => ({ ...p, name: t })); if (errors.name) setErrors(p => ({ ...p, name: undefined })); }}
              returnKeyType="next"
              onSubmitEditing={() => descriptionRef.current?.focus()}
              blurOnSubmit={false}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
            />
            {errors.name && <Text style={{ color: '#EF4444', fontFamily: 'Poppins-Medium', fontSize: 12, marginTop: 5 }}>⚠ {errors.name}</Text>}
          </View>

          {/* Description */}
          <View>
            <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 7 }}>
              Description *
            </Text>
            <TextInput
              ref={descriptionRef}
              style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, fontFamily: 'Poppins-Medium', fontSize: 15, borderWidth: 1.5, borderColor: inputBorderColor('description'), minHeight: 95, textAlignVertical: 'top' }}
              placeholder="Matière, taille disponible, état, utilisation..."
              placeholderTextColor={colors.textSecondary}
              value={form.description}
              onChangeText={t => { setForm(p => ({ ...p, description: t })); if (errors.description) setErrors(p => ({ ...p, description: undefined })); }}
              multiline
              blurOnSubmit={false}
              onFocus={() => setFocusedField('description')}
              onBlur={() => setFocusedField(null)}
            />
            {errors.description && <Text style={{ color: '#EF4444', fontFamily: 'Poppins-Medium', fontSize: 12, marginTop: 5 }}>⚠ {errors.description}</Text>}
          </View>
        </View>

        {/* ── Prix + Stock ── */}
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(245,158,11,0.2)' : '#FFFBEB', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Ionicons name="cash-outline" size={16} color="#F59E0B" />
            </View>
            <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 15 }}>Prix</Text>
          </View>

          <View>
            {/* Prix */}
            <View>
              <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 7 }}>Prix *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary, borderRadius: 12, borderWidth: 1.5, borderColor: inputBorderColor('price') }}>
                <TextInput
                  ref={priceRef}
                  style={{ flex: 1, paddingLeft: 14, paddingVertical: 12, color: colors.textPrimary, fontFamily: 'Poppins-SemiBold', fontSize: 16 }}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={form.price}
                  onChangeText={t => { setForm(p => ({ ...p, price: t })); if (errors.price) setErrors(p => ({ ...p, price: undefined })); }}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  onFocus={() => setFocusedField('price')}
                  onBlur={() => setFocusedField(null)}
                />
                <View style={{ backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 }}>
                  <Text style={{ color: '#F59E0B', fontFamily: 'Poppins-Bold', fontSize: 11 }}>FCFA</Text>
                </View>
              </View>
              {errors.price && <Text style={{ color: '#EF4444', fontFamily: 'Poppins-Medium', fontSize: 12, marginTop: 5 }}>⚠ {errors.price}</Text>}
            </View>

          </View>
        </View>

        {/* ── Catégorie ── */}
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: errors.category ? '#FCA5A5' : colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(139,92,246,0.2)' : '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Ionicons name="grid-outline" size={16} color="#8B5CF6" />
            </View>
            <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 15, flex: 1 }}>Catégorie *</Text>
            {form.category && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
          </View>

          {loadingCategories ? (
            <ActivityIndicator size="small" color="#10B981" style={{ alignSelf: 'flex-start', marginVertical: 8 }} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {categories.map(cat => {
                const selected = form.category === cat._id;
                return (
                  <TouchableOpacity
                    key={cat._id}
                    onPress={() => { Keyboard.dismiss(); setForm(p => ({ ...p, category: cat._id })); if (errors.category) setErrors(p => ({ ...p, category: undefined })); }}
                    activeOpacity={0.75}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: selected ? '#8B5CF6' : colors.border,
                      backgroundColor: selected ? (isDark ? 'rgba(139,92,246,0.15)' : '#F5F3FF') : colors.secondary,
                    }}
                  >
                    <Text style={{ fontFamily: selected ? 'Poppins-Bold' : 'Poppins-Medium', fontSize: 13, color: selected ? '#8B5CF6' : colors.textPrimary }}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {errors.category && <Text style={{ color: '#EF4444', fontFamily: 'Poppins-Medium', fontSize: 12, marginTop: 10 }}>⚠ {errors.category}</Text>}
        </View>

      </KeyboardAwareScrollView>

      {/* Footer */}
      <View style={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom + 4, 20),
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.card,
      }}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
          style={{ borderRadius: 16, backgroundColor: colors.brandPrimary, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: loading ? 0.7 : 1 }}
        >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 16 }}>
                  Publier le produit
                </Text>
              </>
            )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
