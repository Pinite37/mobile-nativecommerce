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
  // Plus de distinction « prête / en cours » : rien n'est envoyé avant la
  // publication, toutes les images choisies sont immédiatement utilisables.
  const readyImages = form.images;

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

    const restantes = maxImages - form.images.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      // Sélection multiple : le plan autorise jusqu'à dix images, et les
      // ajouter une par une imposait dix allers-retours dans la galerie.
      // Le recadrage est incompatible avec la sélection multiple, d'où
      // `allowsEditing` seulement quand on n'en prend qu'une.
      allowsMultipleSelection: restantes > 1,
      selectionLimit: restantes,
      allowsEditing: restantes === 1,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const tropLourdes = result.assets.filter(a => (a.fileSize ?? 0) > 5 * 1024 * 1024);
    const retenues = result.assets.filter(a => (a.fileSize ?? 0) <= 5 * 1024 * 1024);

    if (retenues.length) {
      // Aucun état de chargement : rien n'est envoyé ici. L'image est déjà
      // en mémoire, le picker a fourni son base64. L'ancien code affichait
      // un compteur pendant 600 ms via setTimeout — un délai inventé, qui
      // bloquait en plus la validation du formulaire le temps qu'il passe.
      setForm(prev => ({
        ...prev,
        images: [
          ...prev.images,
          ...retenues.map(a => ({ base64: a.base64 ?? '', uri: a.uri })),
        ],
      }));
      if (errors.images) setErrors(prev => ({ ...prev, images: undefined }));
    }

    if (tropLourdes.length) {
      showError(
        tropLourdes.length > 1 ? 'Images trop lourdes' : 'Image trop lourde',
        `${tropLourdes.length} image${tropLourdes.length > 1 ? 's ont' : ' a'} été ignorée${tropLourdes.length > 1 ? 's' : ''} : maximum 5 Mo par image`
      );
    }
  };

  /**
   * La première image est la principale — c'est celle qui représente le
   * produit partout ailleurs. Il fallait auparavant supprimer et réimporter
   * dans le bon ordre pour la changer.
   */
  const setImagePrincipale = (index: number) => {
    if (index === 0) return;
    setForm(prev => {
      const suivantes = [...prev.images];
      const [choisie] = suivantes.splice(index, 1);
      return { ...prev, images: [choisie, ...suivantes] };
    });
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
          <Text style={{ color: colors.textPrimary, fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 18 }}>Nouveau produit</Text>
          <Text style={{ color: colors.textSecondary, fontFamily: 'PlusJakartaSans-Regular', fontSize: 12, marginTop: 1 }}>Remplissez les informations ci-dessous</Text>
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
            <Text style={{ color: colors.textPrimary, fontFamily: 'PlusJakartaSans-Bold', fontSize: 15, flex: 1 }}>
              Photos du produit
            </Text>
            <View style={{ backgroundColor: readyImages.length > 0 ? 'rgba(16,185,129,0.12)' : colors.secondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: readyImages.length > 0 ? '#10B981' : colors.textSecondary, fontFamily: 'PlusJakartaSans-Bold', fontSize: 12 }}>
                {readyImages.length}/{maxImages}
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            // `flexGrow` pour que l'encart vide (flex: 1) prenne toute la
            // largeur disponible au lieu de se réduire à son contenu.
            contentContainerStyle={{ gap: 10, flexGrow: 1 }}
          >
            {form.images.map((img, idx) => {
              const principale = idx === 0;
              return (
                <TouchableOpacity
                  key={img.uri}
                  onPress={() => setImagePrincipale(idx)}
                  activeOpacity={principale ? 1 : 0.8}
                  disabled={principale}
                  style={{ width: 96, height: 96 }}
                >
                  <Image
                    source={{ uri: img.uri }}
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 16,
                      borderWidth: principale ? 2 : 1,
                      borderColor: principale ? '#10B981' : colors.border,
                    }}
                    resizeMode="cover"
                  />

                  {/* Bandeau discret plutôt qu'un voile noir sur le tiers bas
                      de la vignette, qui masquait le produit lui-même. */}
                  {principale ? (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        backgroundColor: '#10B981',
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans-Bold', fontSize: 9 }}>
                        PRINCIPALE
                      </Text>
                    </View>
                  ) : (
                    // Sans cette indication, rien ne laissait deviner qu'on
                    // peut changer la photo principale.
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        right: 6,
                        backgroundColor: 'rgba(0,0,0,0.55)',
                        borderRadius: 6,
                        paddingVertical: 3,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 9 }}>
                        Définir principale
                      </Text>
                    </View>
                  )}

                  {/* Cible portée à 28 px et ramenée dans la vignette : à
                      20 px en débord négatif, elle était sous le seuil
                      tactile utilisable et pouvait être rognée par le
                      défilement horizontal. */}
                  <TouchableOpacity
                    onPress={() => removeImage(idx)}
                    hitSlop={8}
                    style={{
                      position: 'absolute',
                      top: 5,
                      right: 5,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: 'rgba(0,0,0,0.55)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}

            {form.images.length > 0 && readyImages.length < maxImages && (
              <TouchableOpacity
                onPress={handleImagePicker}
                activeOpacity={0.7}
                style={{ width: 96, height: 96, borderRadius: 16, borderWidth: 1.5, borderColor: '#10B981', borderStyle: 'dashed', backgroundColor: isDark ? 'rgba(16,185,129,0.07)' : '#F0FDF4', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                <Ionicons name="add" size={26} color="#10B981" />
                <Text style={{ color: '#10B981', fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 10 }}>Ajouter</Text>
              </TouchableOpacity>
            )}

            {/* État vide. La tuile compacte « + Ajouter » ci-dessus est
                masquée dans ce cas : les deux s'affichaient ensemble, soit
                deux boutons d'ajout côte à côte pour la même action. */}
            {form.images.length === 0 && (
              <TouchableOpacity
                onPress={handleImagePicker}
                activeOpacity={0.7}
                style={{ flex: 1, minHeight: 96, borderRadius: 16, borderWidth: 1.5, borderColor: '#10B981', borderStyle: 'dashed', backgroundColor: isDark ? 'rgba(16,185,129,0.07)' : '#F0FDF4', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}
              >
                <Ionicons name="camera-outline" size={26} color="#10B981" />
                <View>
                  <Text style={{ color: colors.textPrimary, fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14 }}>
                    {maxImages > 1 ? 'Ajouter des photos' : 'Ajouter une photo'}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontFamily: 'PlusJakartaSans-Medium', fontSize: 11, marginTop: 1 }}>
                    {maxImages > 1 ? `Jusqu'à ${maxImages} · max 5 Mo chacune` : 'JPG ou PNG · max 5 Mo'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>

          {errors.images && (
            <Text style={{ color: '#EF4444', fontFamily: 'PlusJakartaSans-Medium', fontSize: 12, marginTop: 10 }}>⚠ {errors.images}</Text>
          )}
        </View>

        {/* ── Nom + Description ── */}
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Ionicons name="create-outline" size={16} color="#10B981" />
            </View>
            <Text style={{ color: colors.textPrimary, fontFamily: 'PlusJakartaSans-Bold', fontSize: 15 }}>Informations</Text>
          </View>

          {/* Nom */}
          <View>
            <Text style={{ color: colors.textSecondary, fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 7 }}>
              Nom du produit *
            </Text>
            <TextInput
              ref={nameRef}
              style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, fontFamily: 'PlusJakartaSans-Medium', fontSize: 15, borderWidth: 1.5, borderColor: inputBorderColor('name') }}
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
            {errors.name && <Text style={{ color: '#EF4444', fontFamily: 'PlusJakartaSans-Medium', fontSize: 12, marginTop: 5 }}>⚠ {errors.name}</Text>}
          </View>

          {/* Description */}
          <View>
            <Text style={{ color: colors.textSecondary, fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 7 }}>
              Description *
            </Text>
            <TextInput
              ref={descriptionRef}
              style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, fontFamily: 'PlusJakartaSans-Medium', fontSize: 15, borderWidth: 1.5, borderColor: inputBorderColor('description'), minHeight: 95, textAlignVertical: 'top' }}
              placeholder="Matière, taille disponible, état, utilisation..."
              placeholderTextColor={colors.textSecondary}
              value={form.description}
              onChangeText={t => { setForm(p => ({ ...p, description: t })); if (errors.description) setErrors(p => ({ ...p, description: undefined })); }}
              multiline
              blurOnSubmit={false}
              onFocus={() => setFocusedField('description')}
              onBlur={() => setFocusedField(null)}
            />
            {errors.description && <Text style={{ color: '#EF4444', fontFamily: 'PlusJakartaSans-Medium', fontSize: 12, marginTop: 5 }}>⚠ {errors.description}</Text>}
          </View>
        </View>

        {/* ── Prix + Stock ── */}
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(245,158,11,0.2)' : '#FFFBEB', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Ionicons name="cash-outline" size={16} color="#F59E0B" />
            </View>
            <Text style={{ color: colors.textPrimary, fontFamily: 'PlusJakartaSans-Bold', fontSize: 15 }}>Prix</Text>
          </View>

          <View>
            {/* Prix */}
            <View>
              <Text style={{ color: colors.textSecondary, fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 7 }}>Prix *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary, borderRadius: 12, borderWidth: 1.5, borderColor: inputBorderColor('price') }}>
                <TextInput
                  ref={priceRef}
                  style={{ flex: 1, paddingLeft: 14, paddingVertical: 12, color: colors.textPrimary, fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 16 }}
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
                  <Text style={{ color: '#F59E0B', fontFamily: 'PlusJakartaSans-Bold', fontSize: 11 }}>FCFA</Text>
                </View>
              </View>
              {errors.price && <Text style={{ color: '#EF4444', fontFamily: 'PlusJakartaSans-Medium', fontSize: 12, marginTop: 5 }}>⚠ {errors.price}</Text>}
            </View>

          </View>
        </View>

        {/* ── Catégorie ── */}
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: errors.category ? '#FCA5A5' : colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(139,92,246,0.2)' : '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Ionicons name="grid-outline" size={16} color="#8B5CF6" />
            </View>
            <Text style={{ color: colors.textPrimary, fontFamily: 'PlusJakartaSans-Bold', fontSize: 15, flex: 1 }}>Catégorie *</Text>
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
                    <Text style={{ fontFamily: selected ? 'PlusJakartaSans-Bold' : 'PlusJakartaSans-Medium', fontSize: 13, color: selected ? '#8B5CF6' : colors.textPrimary }}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {errors.category && <Text style={{ color: '#EF4444', fontFamily: 'PlusJakartaSans-Medium', fontSize: 12, marginTop: 10 }}>⚠ {errors.category}</Text>}
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
                <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans-Bold', fontSize: 16 }}>
                  Publier le produit
                </Text>
              </>
            )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
