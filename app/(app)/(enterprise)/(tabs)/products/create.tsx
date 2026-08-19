import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { Link, router, useFocusEffect } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import NotificationModal, { useNotification } from "../../../../../components/ui/NotificationModal";
import { useToast } from "../../../../../components/ui/ToastManager";
import { useLocale } from "../../../../../contexts/LocaleContext";
import { useTheme } from "../../../../../contexts/ThemeContext";
import i18n from "../../../../../i18n/i18n";

import { useSubscription } from "../../../../../contexts/SubscriptionContext";
import CategoryService from "../../../../../services/api/CategoryService";
import ProductService from "../../../../../services/api/ProductService";
import { Category, CreateProductRequest } from "../../../../../types/product";

interface ProductFormErrors {
  name?: string;
  description?: string;
  price?: string;
  stock?: string;
  category?: string;
  images?: string;
  brand?: string;
  model?: string;
  sku?: string;
  barcode?: string;
  weight?: string;
  dimensions?: string;
  specifications?: string;
  tags?: string;
}

interface ProductFormImage {
  base64: string;
  uri: string;
  loading?: boolean;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  images: ProductFormImage[];
  brand: string;
  model: string;
  sku: string;
  barcode: string;
  specifications: { key: string; value: string }[];
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  tags: string[];
  minOrderQuantity: string;
  maxOrderQuantity: string;
  bulkPricing: { minQuantity: string; price: string }[];
  shippingWeight: string;
  shippingDimensions: {
    length: string;
    width: string;
    height: string;
  };
  origin: string;
  warranty: string;
  returnPolicy: string;
  isActive: boolean;
  isFeatured: boolean;
  isDigital: boolean;
  hasVariants: boolean;
  variants: {
    name: string;
    options: string[];
  }[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
}

type Step = 'basic' | 'details';

export default function CreateProduct() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { locale } = useLocale(); // Écoute les changements de langue pour re-render automatiquement
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [newSpec, setNewSpec] = useState({ key: '', value: '' });
  const [totalProducts, setTotalProducts] = useState(0);

  // Hook pour afficher des notifications toast
  const { showSuccess, showError } = useToast();
  const { notification, showNotification, hideNotification } = useNotification();

  // Hook pour gérer les restrictions d'abonnement
  const { subscription, hasReachedLimit } = useSubscription();

  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "",
    images: [],
    brand: "",
    model: "",
    sku: "",
    barcode: "",
    specifications: [],
    weight: "",
    dimensions: {
      length: "",
      width: "",
      height: "",
    },
    tags: [],
    minOrderQuantity: "",
    maxOrderQuantity: "",
    bulkPricing: [],
    shippingWeight: "",
    shippingDimensions: {
      length: "",
      width: "",
      height: "",
    },
    origin: "",
    warranty: "",
    returnPolicy: "",
    isActive: true,
    isFeatured: false,
    isDigital: false,
    hasVariants: false,
    variants: [],
    seo: {
      metaTitle: "",
      metaDescription: "",
      keywords: [],
    },
  });

  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [maxReachedStep, setMaxReachedStep] = useState<number>(0);
  const [showErrorSummary, setShowErrorSummary] = useState(false);

  // Navigation clavier entre champs
  const nameRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const stockRef = useRef<TextInput>(null);

  // Retour visuel focus
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Animations modals slide-up
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [specModalVisible, setSpecModalVisible] = useState(false);
  const slideTagAnim = useRef(new Animated.Value(500)).current;
  const backdropTagAnim = useRef(new Animated.Value(0)).current;
  const slideSpecAnim = useRef(new Animated.Value(500)).current;
  const backdropSpecAnim = useRef(new Animated.Value(0)).current;

  const steps: { id: Step; title: string; icon: string }[] = [
    { id: 'basic', title: i18n.t('enterprise.products.create.steps.basic'), icon: 'information-circle' },
    { id: 'details', title: i18n.t('enterprise.products.create.steps.details'), icon: 'list' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = (currentStepIndex + 1) / steps.length;

  useEffect(() => {
    loadCategories();
    loadProductsCount();
  }, []);

  // Hide the TabBar on this screen to ensure bottom action buttons are always visible
  useFocusEffect(
    React.useCallback(() => {
      const parent = (navigation as any)?.getParent?.();
      parent?.setOptions?.({ tabBarStyle: { display: 'none' } });
      return () => {
        parent?.setOptions?.({ tabBarStyle: undefined });
      };
    }, [navigation])
  );

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const categoriesData = await CategoryService.getActiveCategories();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadProductsCount = async () => {
    try {
      const response = await ProductService.getEnterpriseProducts();
      setTotalProducts(response.products.length);
    } catch (err) {
      console.error('Error loading products count:', err);
    }
  };

  const validateStep = (step: Step): boolean => {
    const newErrors: ProductFormErrors = {};

    switch (step) {
      case 'basic':
        if (!form.name.trim()) {
          newErrors.name = i18n.t("enterprise.products.create.errors.nameRequired");
        }
        if (!form.description.trim()) {
          newErrors.description = i18n.t("enterprise.products.create.errors.descriptionRequired");
        }
        if (!form.price.trim()) {
          newErrors.price = i18n.t("enterprise.products.create.errors.priceRequired");
        } else if (isNaN(Number(form.price)) || Number(form.price) <= 0) {
          newErrors.price = i18n.t("enterprise.products.create.errors.priceInvalid");
        }
        if (!form.stock.trim()) {
          newErrors.stock = i18n.t("enterprise.products.create.errors.stockRequired");
        } else if (isNaN(Number(form.stock)) || Number(form.stock) < 0) {
          newErrors.stock = i18n.t("enterprise.products.create.errors.stockInvalid");
        }
        if (!form.category) {
          newErrors.category = i18n.t("enterprise.products.create.errors.categoryRequired");
        }
        if (form.images.filter(img => !img.loading).length === 0) {
          newErrors.images = i18n.t("enterprise.products.create.errors.imagesRequired");
        }
        break;
      case 'details':
        if (form.sku.trim() && !/^[A-Za-z0-9-_]+$/.test(form.sku.trim())) {
          newErrors.sku = i18n.t("enterprise.products.create.errors.skuInvalid");
        }
        if (form.weight.trim() && (isNaN(Number(form.weight)) || Number(form.weight) <= 0)) {
          newErrors.weight = i18n.t("enterprise.products.create.errors.weightInvalid");
        }
        break;
    }

    // Merge with existing so we don't clear other step errors prematurely
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): boolean => {
    return validateStep('basic') && validateStep('details');
  };

  const handleImagePicker = async () => {
    try {
      // Vérifier la limite d'images par produit selon le plan
      const maxImagesPerProduct = subscription?.plan?.features?.maxImagesPerProduct || 1;

      if (form.images.filter(img => !img.loading).length >= maxImagesPerProduct) {
        const message = maxImagesPerProduct > 1
          ? `Votre plan "${subscription?.plan?.name}" autorise maximum ${maxImagesPerProduct} images par produit. Passez à un plan supérieur pour ajouter plus d'images.`
          : `Votre plan "${subscription?.plan?.name}" autorise maximum ${maxImagesPerProduct} image par produit. Passez à un plan supérieur pour ajouter plus d'images.`;
        showNotification(
          'warning',
          i18n.t('enterprise.products.create.notifications.limitReachedTitle'),
          message
        );
        return;
      }

      // Vérifier les permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showNotification('error', i18n.t('enterprise.products.create.errors.permissionDenied'), i18n.t('enterprise.products.create.errors.permissionDeniedMessage'));
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
        const asset = result.assets[0];

        // Vérifier la taille du fichier (max 5MB)
        const fileSizeInMB = (asset.fileSize || 0) / (1024 * 1024);
        if (fileSizeInMB > 5) {
          showNotification('error', i18n.t('enterprise.products.create.errors.imageTooLarge'), i18n.t('enterprise.products.create.errors.imageTooLargeMessage'));
          return;
        }

        // Ajouter l'image avec état de chargement
        setForm(prev => ({
          ...prev,
          images: [...prev.images, { base64: asset.base64 || '', uri: asset.uri, loading: true }]
        }));

        // Simuler le traitement de l'image
        setTimeout(() => {
          setForm(prev => ({
            ...prev,
            images: prev.images.map(img => img.uri === asset.uri ? { ...img, loading: false } : img)
          }));
        }, 700);

        // Effacer l'erreur d'images s'il y en avait une
        if (errors.images) {
          setErrors(prev => ({ ...prev, images: undefined }));
        }
      }
    } catch (err) {
      console.error('Error picking image:', err);
      showNotification('error', i18n.t('enterprise.products.create.errors.imageError'), i18n.t('enterprise.products.create.errors.imageErrorMessage'));
    }
  };

  const removeImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
      closeTagModal();
    }
  };

  const removeTag = (index: number) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const addSpecification = () => {
    if (newSpec.key.trim() && newSpec.value.trim()) {
      setForm(prev => ({
        ...prev,
        specifications: [...prev.specifications, { key: newSpec.key.trim(), value: newSpec.value.trim() }]
      }));
      setNewSpec({ key: '', value: '' });
      closeSpecModal();
    }
  };

  const removeSpecification = (index: number) => {
    setForm(prev => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index)
    }));
  };

  // Style TextInput avec highlight focus
  const getInputStyle = (field: string): any => ({
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontFamily: 'Quicksand-Medium',
    borderWidth: focusedField === field ? 1.5 : 1,
    borderColor: focusedField === field ? '#10B981' : colors.border,
  });

  const openTagModal = useCallback(() => {
    setTagModalVisible(true);
    setShowTagModal(true);
    Animated.parallel([
      Animated.spring(slideTagAnim, { toValue: 0, damping: 22, stiffness: 200, useNativeDriver: true }),
      Animated.timing(backdropTagAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [slideTagAnim, backdropTagAnim]);

  const closeTagModal = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideTagAnim, { toValue: 500, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropTagAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => { setTagModalVisible(false); setShowTagModal(false); });
  }, [slideTagAnim, backdropTagAnim]);

  const openSpecModal = useCallback(() => {
    setSpecModalVisible(true);
    setShowSpecModal(true);
    Animated.parallel([
      Animated.spring(slideSpecAnim, { toValue: 0, damping: 22, stiffness: 200, useNativeDriver: true }),
      Animated.timing(backdropSpecAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [slideSpecAnim, backdropSpecAnim]);

  const closeSpecModal = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideSpecAnim, { toValue: 500, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropSpecAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => { setSpecModalVisible(false); setShowSpecModal(false); });
  }, [slideSpecAnim, backdropSpecAnim]);

  const nextStep = () => {
    const ok = validateStep(currentStep);
    setShowErrorSummary(!ok);
    if (!ok) {
      // Scroll to top pour voir les erreurs
      return;
    }

    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentStep(steps[nextIndex].id);
      if (nextIndex > maxReachedStep) setMaxReachedStep(nextIndex);
      setShowErrorSummary(false);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const goToStep = (step: Step) => {
    const targetIndex = steps.findIndex(s => s.id === step);
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    // allow going back freely
    if (targetIndex <= currentIndex) {
      setCurrentStep(step);
      setShowErrorSummary(false);
      return;
    }
    // only allow forward if already unlocked
    if (targetIndex <= maxReachedStep) {
      setCurrentStep(step);
      setShowErrorSummary(false);
      return;
    }
    // need to validate current step first, and only allow the immediate next step
    const ok = validateStep(currentStep);
    setShowErrorSummary(!ok);
    if (!ok) return;
    if (targetIndex === currentIndex + 1) {
      setCurrentStep(step);
      if (targetIndex > maxReachedStep) setMaxReachedStep(targetIndex);
      setShowErrorSummary(false);
    }
  };

  const handleSubmit = async () => {
    // Vérifier la limite de produits selon le plan
    const maxProducts = subscription?.plan?.features?.maxProducts || 0;
    const productLimitReached = hasReachedLimit('maxProducts', totalProducts);

    if (productLimitReached) {
      const message = maxProducts > 1
        ? `Vous avez atteint la limite de ${maxProducts} produits de votre plan "${subscription?.plan?.name}". Passez à un plan supérieur pour ajouter plus de produits.`
        : `Vous avez atteint la limite de ${maxProducts} produit de votre plan "${subscription?.plan?.name}". Passez à un plan supérieur pour ajouter plus de produits.`;
      showNotification(
        'error',
        i18n.t('enterprise.products.create.notifications.productLimitTitle'),
        message
      );
      return;
    }

    const ok = validateForm();
    setShowErrorSummary(!ok);
    if (!ok) {
      showNotification('error', i18n.t('enterprise.products.create.notifications.errorTitle'), i18n.t('enterprise.products.create.errors.correctErrors'));
      return;
    }

    setLoading(true);

    try {
      // Créer seulement les données conformes au schéma backend
      const productData: CreateProductRequest = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
        category: form.category,
        images: form.images.map(img => `data:image/jpeg;base64,${img.base64}`),
      };

      // Ajouter les champs optionnels seulement s'ils sont remplis et supportés par le backend
      if (form.specifications.length > 0) {
        const validSpecs = form.specifications.filter(spec => spec.key.trim() && spec.value.trim());
        if (validSpecs.length > 0) {
          productData.specifications = validSpecs;
        }
      }

      if (form.weight.trim() && !isNaN(Number(form.weight))) {
        productData.weight = Number(form.weight);
      }

      if (form.dimensions.length || form.dimensions.width || form.dimensions.height) {
        const dimensions: any = {};
        if (form.dimensions.length && !isNaN(Number(form.dimensions.length))) {
          dimensions.length = Number(form.dimensions.length);
        }
        if (form.dimensions.width && !isNaN(Number(form.dimensions.width))) {
          dimensions.width = Number(form.dimensions.width);
        }
        if (form.dimensions.height && !isNaN(Number(form.dimensions.height))) {
          dimensions.height = Number(form.dimensions.height);
        }
        if (Object.keys(dimensions).length > 0) {
          productData.dimensions = dimensions;
        }
      }

      if (form.tags.length > 0) {
        const validTags = form.tags.filter(tag => tag.trim());
        if (validTags.length > 0) {
          productData.tags = validTags;
        }
      }

      console.log('Creating product with data:', JSON.stringify(productData, null, 2));

      // Création du produit
      const createdProduct = await ProductService.createProduct(productData);

      // Affichage du toast de succès
      showSuccess(i18n.t("enterprise.products.create.notifications.successTitle"), `${createdProduct.name} ${i18n.t("enterprise.products.create.notifications.successMessage").replace('{{name}}', '')}`.replace('  ', ' ').trim());

      // Réinitialiser le formulaire
      setForm({
        name: "",
        description: "",
        price: "",
        stock: "",
        category: "",
        images: [],
        brand: "",
        model: "",
        sku: "",
        barcode: "",
        specifications: [],
        weight: "",
        dimensions: { length: "", width: "", height: "" },
        tags: [],
        minOrderQuantity: "",
        maxOrderQuantity: "",
        bulkPricing: [],
        shippingWeight: "",
        shippingDimensions: { length: "", width: "", height: "" },
        origin: "",
        warranty: "",
        returnPolicy: "",
        isActive: true,
        isFeatured: false,
        isDigital: false,
        hasVariants: false,
        variants: [],
        seo: { metaTitle: "", metaDescription: "", keywords: [] },
      });

      setCurrentStep('basic');
      setMaxReachedStep(0);
      setErrors({});
      setShowErrorSummary(false);

      // Redirection vers la liste des produits après un court délai
      setTimeout(() => {
        router.replace("/(app)/(enterprise)/(tabs)/products");
      }, 1500);
    } catch (error: any) {
      showError(i18n.t("enterprise.products.create.notifications.errorTitle"), error.message || i18n.t("enterprise.products.create.errors.createError"));
      console.error('Erreur création produit:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />

      {/* Header compact — hors zone clavier */}
      <LinearGradient
        colors={['#047857', '#10B981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Link href="/(app)/(enterprise)/(tabs)/products" asChild>
            <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Link>
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 12 }}>
            <Text className="text-lg font-quicksand-bold text-white text-center">
              {i18n.t("enterprise.products.create.title")}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Step Indicator + Progress */}
      <View style={{ backgroundColor: colors.card, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View className="h-2.5 w-full rounded-full bg-neutral-200 overflow-hidden mb-5">
            <View
              style={{
                width: `${progress * 100}%`,
                backgroundColor: '#10B981',
                borderRadius: 4
              }}
              className="h-full"
            />
          </View>
          <View className="flex-row items-center justify-center mb-4">
            <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 14 }}>
              {i18n.t("enterprise.products.create.progress.step")} {currentStepIndex + 1} {i18n.t("enterprise.products.create.progress.of")} {steps.length} • {Math.round(progress * 100)}% {i18n.t("enterprise.products.create.progress.completed")}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            {steps.map((step, index) => {
              const stepErrors: Record<string, string> = {};
              if (step.id === 'basic') {
                if (errors.name || errors.description || errors.price || errors.stock || errors.category || errors.images) stepErrors.basic = '1';
              }
              if (step.id === 'details') {
                if (errors.sku || errors.weight) stepErrors.details = '1';
              }
              const hasErr = Object.keys(stepErrors).length > 0;
              return (
                <React.Fragment key={step.id}>
                  <TouchableOpacity
                    onPress={() => goToStep(step.id)}
                    className="items-center flex-1"
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: currentStep === step.id
                          ? '#10B981'
                          : steps.findIndex(s => s.id === currentStep) > index
                            ? '#10B981'
                            : hasErr ? '#EF4444' : colors.border
                      }}
                    >
                      <Ionicons
                        name={step.icon as any}
                        size={16}
                        color={
                          currentStep === step.id || steps.findIndex(s => s.id === currentStep) > index
                            ? "#FFFFFF"
                            : hasErr ? '#FFFFFF' : colors.textSecondary
                        }
                      />
                      {hasErr && (
                        <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 items-center justify-center">
                          <Text className="text-[9px] text-white font-quicksand-bold">!</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: 'Quicksand-Medium',
                        marginTop: 4,
                        textAlign: 'center',
                        color: currentStep === step.id
                          ? '#10B981'
                          : steps.findIndex(s => s.id === currentStep) > index
                            ? '#10B981'
                            : hasErr ? '#EF4444' : colors.textSecondary
                      }}
                      numberOfLines={1}
                    >
                      {step.title}
                    </Text>
                  </TouchableOpacity>
                  {index < steps.length - 1 && (
                    <View
                      style={{
                        flex: 1,
                        height: 1,
                        marginHorizontal: 8,
                        backgroundColor: steps.findIndex(s => s.id === currentStep) > index
                          ? '#10B981'
                          : colors.border
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
          keyboardShouldPersistTaps="handled"
          bottomOffset={90}
        >
          {currentStep === 'basic' && (
            <View style={{ paddingHorizontal: 20, paddingVertical: 24, gap: 24 }}>
              {/* Subscription Limits Info */}
              {subscription && (
                <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                  <View className="flex-row items-center mb-3">
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Ionicons name="information" size={16} color="#FFFFFF" />
                    </View>
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 14 }}>
                      {i18n.t("enterprise.products.create.limits.planTitle")} {subscription.plan.name}
                    </Text>
                  </View>
                  <View style={{ gap: 8 }}>
                    <View className="flex-row items-center justify-between">
                      <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 12 }}>
                        {i18n.t("enterprise.products.create.limits.products")}
                      </Text>
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 14 }}>
                        {totalProducts} / {subscription.plan.features.maxProducts}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 12 }}>
                        {i18n.t("enterprise.products.create.limits.imagesPerProduct")}
                      </Text>
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 14 }}>
                        {subscription.plan.features.maxImagesPerProduct}
                      </Text>
                    </View>
                  </View>
                  {hasReachedLimit('maxProducts', totalProducts) && (
                    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <Text style={{ color: '#F59E0B', fontFamily: 'Quicksand-SemiBold', fontSize: 12 }}>
                        {i18n.t("enterprise.products.create.limits.limitReached")}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Images */}
              <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: colors.border }}>
                <View className="flex-row items-center mb-5">
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="camera" size={24} color="#6366F1" />
                  </View>
                  <View className="flex-1 ml-4">
                    <View className="flex-row items-center justify-between">
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 18 }}>
                        {i18n.t("enterprise.products.create.fields.photosTitle")}
                      </Text>
                      {subscription && (
                        <Text style={{ color: '#10B981', fontFamily: 'Quicksand-SemiBold', fontSize: 12 }}>
                          {form.images.filter(img => !img.loading).length}/{subscription.plan.features.maxImagesPerProduct}
                        </Text>
                      )}
                    </View>
                    <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 12, marginTop: 2 }}>
                      {subscription
                        ? (subscription.plan.features.maxImagesPerProduct > 1
                          ? `Maximum ${subscription.plan.features.maxImagesPerProduct} images selon votre plan`
                          : `Maximum ${subscription.plan.features.maxImagesPerProduct} image selon votre plan`)
                        : i18n.t("enterprise.products.create.fields.photosHelp")
                      }
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 16 }}>
                  {form.images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 -mx-2">
                      <View className="flex-row gap-3 px-2">
                        {form.images.map((image, index) => (
                          <View key={index} className="relative">
                            <Image
                              source={{ uri: image.uri }}
                              className="w-28 h-28 rounded-2xl"
                              resizeMode="cover"
                            />
                            {image.loading && (
                              <View className="absolute inset-0 bg-black/30 rounded-2xl items-center justify-center">
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              </View>
                            )}
                            <TouchableOpacity
                              onPress={() => removeImage(index)}
                              className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full items-center justify-center shadow-md"
                              style={{ elevation: 3 }}
                            >
                              <Ionicons name="close" size={16} color="white" />
                            </TouchableOpacity>
                            <View className="absolute bottom-2 left-2 bg-black/60 rounded-full px-2 py-1">
                              <Text className="text-white text-xs font-quicksand-semibold">
                                {index + 1}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  )}

                  {/* Add Image Button */}
                  {subscription && form.images.filter(img => !img.loading).length >= subscription.plan.features.maxImagesPerProduct ? (
                    <View className="border-2 border-dashed border-neutral-300 rounded-2xl py-10 items-center justify-center bg-neutral-50">
                      <View className="w-16 h-16 rounded-full bg-neutral-200 items-center justify-center mb-3">
                        <Ionicons name="lock-closed" size={32} color="#9CA3AF" />
                      </View>
                      <Text className="text-neutral-500 font-quicksand-bold text-base mb-1">
                        {i18n.t("enterprise.products.create.limits.imageLimitTitle")}
                      </Text>
                      <Text className="text-neutral-400 font-quicksand-medium text-xs text-center px-8">
                        Maximum {subscription.plan.features.maxImagesPerProduct} image{subscription.plan.features.maxImagesPerProduct > 1 ? 's' : ''} pour votre plan
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleImagePicker}
                      className="border-2 border-dashed border-primary-300 rounded-2xl py-10 items-center justify-center bg-primary-50/50"
                      activeOpacity={0.7}
                    >
                      <View className="w-16 h-16 rounded-full bg-primary-100 items-center justify-center mb-3">
                        <Ionicons name="add" size={32} color="#6366F1" />
                      </View>
                      <Text className="text-primary-600 font-quicksand-bold text-base">
                        {i18n.t("enterprise.products.create.fields.addPhoto")}
                      </Text>
                      <Text className="text-primary-400 font-quicksand-medium text-sm mt-1">
                        PNG, JPG jusqu&apos;à 5MB
                      </Text>
                    </TouchableOpacity>
                  )}

                  {errors.images && (
                    <View className="flex-row items-center bg-red-50 rounded-xl p-3 mt-2">
                      <Ionicons name="alert-circle" size={16} color="#EF4444" />
                      <Text className="text-red-600 text-sm ml-2 font-quicksand-medium flex-1">{errors.images}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Basic Information */}
              <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: colors.border }}>
                <View className="flex-row items-center mb-5">
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="information-circle" size={24} color="#6366F1" />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 18 }}>
                      Informations de base *
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 12, marginTop: 2 }}>
                      Détails essentiels du produit
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 20 }}>
                  <View>
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 14, marginBottom: 8 }}>
                      {i18n.t("enterprise.products.create.fields.nameTitle")}
                    </Text>
                    <TextInput
                      ref={nameRef}
                      style={getInputStyle('name')}
                      placeholder={i18n.t("enterprise.products.create.fields.namePlaceholder")}
                      placeholderTextColor={colors.textSecondary}
                      value={form.name}
                      onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
                      returnKeyType="next"
                      onSubmitEditing={() => descriptionRef.current?.focus()}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                    />
                    {errors.name && (
                      <View className="flex-row items-center bg-red-50 rounded-lg p-2 mt-2">
                        <Ionicons name="alert-circle" size={14} color="#EF4444" />
                        <Text className="text-red-600 text-xs ml-2 font-quicksand-medium flex-1">{errors.name}</Text>
                      </View>
                    )}
                  </View>

                  <View>
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 14, marginBottom: 8 }}>
                      {i18n.t("enterprise.products.create.fields.descriptionTitle")}
                    </Text>
                    <TextInput
                      ref={descriptionRef}
                      style={[getInputStyle('description'), { minHeight: 100 }]}
                      placeholder={i18n.t("enterprise.products.create.fields.descriptionPlaceholder")}
                      placeholderTextColor={colors.textSecondary}
                      value={form.description}
                      onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      blurOnSubmit={false}
                      returnKeyType="next"
                      onSubmitEditing={() => priceRef.current?.focus()}
                      onFocus={() => setFocusedField('description')}
                      onBlur={() => setFocusedField(null)}
                    />
                    {errors.description && (
                      <View className="flex-row items-center bg-red-50 rounded-lg p-2 mt-2">
                        <Ionicons name="alert-circle" size={14} color="#EF4444" />
                        <Text className="text-red-600 text-xs ml-2 font-quicksand-medium flex-1">{errors.description}</Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 14, marginBottom: 8 }}>
                        {i18n.t("enterprise.products.create.fields.priceTitle")}
                      </Text>
                      <View className="flex-row items-center" style={{ backgroundColor: colors.secondary, borderRadius: 12, borderWidth: focusedField === 'price' ? 1.5 : 1, borderColor: focusedField === 'price' ? '#10B981' : colors.border }}>
                        <View className="pl-4 pr-2">
                          <Ionicons name="cash-outline" size={20} color={colors.textSecondary} />
                        </View>
                        <TextInput
                          ref={priceRef}
                          style={{ flex: 1, paddingVertical: 14, paddingRight: 16, color: colors.textPrimary, fontFamily: 'Quicksand-Medium' }}
                          placeholder={i18n.t("enterprise.products.create.fields.pricePlaceholder")}
                          placeholderTextColor={colors.textSecondary}
                          value={form.price}
                          onChangeText={(text) => setForm(prev => ({ ...prev, price: text }))}
                          keyboardType="numeric"
                          returnKeyType="next"
                          onSubmitEditing={() => stockRef.current?.focus()}
                          onFocus={() => setFocusedField('price')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>
                      {errors.price && (
                        <View className="flex-row items-center bg-red-50 rounded-lg p-2 mt-2">
                          <Ionicons name="alert-circle" size={14} color="#EF4444" />
                          <Text className="text-red-600 text-xs ml-2 font-quicksand-medium flex-1">{errors.price}</Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-1">
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 14, marginBottom: 8 }}>
                        {i18n.t("enterprise.products.create.fields.stockTitle")}
                      </Text>
                      <View className="flex-row items-center" style={{ backgroundColor: colors.secondary, borderRadius: 12, borderWidth: focusedField === 'stock' ? 1.5 : 1, borderColor: focusedField === 'stock' ? '#10B981' : colors.border }}>
                        <View className="pl-4 pr-2">
                          <Ionicons name="cube-outline" size={20} color={colors.textSecondary} />
                        </View>
                        <TextInput
                          ref={stockRef}
                          style={{ flex: 1, paddingVertical: 14, paddingRight: 16, color: colors.textPrimary, fontFamily: 'Quicksand-Medium' }}
                          placeholder={i18n.t("enterprise.products.create.fields.stockPlaceholder")}
                          placeholderTextColor={colors.textSecondary}
                          value={form.stock}
                          onChangeText={(text) => setForm(prev => ({ ...prev, stock: text }))}
                          keyboardType="numeric"
                          returnKeyType="done"
                          onSubmitEditing={() => Keyboard.dismiss()}
                          onFocus={() => setFocusedField('stock')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>
                      {errors.stock && (
                        <View className="flex-row items-center bg-red-50 rounded-lg p-2 mt-2">
                          <Ionicons name="alert-circle" size={14} color="#EF4444" />
                          <Text className="text-red-600 text-xs ml-2 font-quicksand-medium flex-1">{errors.stock}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Category Selection */}
              <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: colors.border }}>
                <View className="flex-row items-center mb-5">
                  <View className="w-12 h-12 rounded-2xl bg-primary-100 items-center justify-center">
                    <Ionicons name="grid" size={24} color="#6366F1" />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 18 }}>
                      Catégorie *
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 12, marginTop: 2 }}>
                      Sélectionnez une catégorie
                    </Text>
                  </View>
                </View>

                {loadingCategories ? (
                  <View className="py-12 items-center">
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', marginTop: 12 }}>
                      Chargement des catégories...
                    </Text>
                  </View>
                ) : (
                  <View>
                    <View className="flex-row flex-wrap gap-2.5">
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category._id}
                          style={{
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            backgroundColor: form.category === category._id ? '#6366F1' : colors.secondary,
                            borderColor: form.category === category._id ? '#6366F1' : colors.border
                          }}
                          onPress={() => {
                            Keyboard.dismiss();
                            setForm(prev => ({ ...prev, category: category._id }));
                            if (errors.category) {
                              setErrors(prev => ({ ...prev, category: undefined }));
                            }
                          }}
                          activeOpacity={1}
                        >
                          <View className="flex-row items-center">
                            {form.category === category._id && (
                              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                            )}
                            <Text
                              style={{
                                fontFamily: 'Quicksand-SemiBold',
                                fontSize: 14,
                                color: form.category === category._id ? '#FFFFFF' : colors.textPrimary
                              }}
                            >
                              {category.name}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {errors.category && (
                      <View className="flex-row items-center bg-red-50 rounded-xl p-3 mt-3">
                        <Ionicons name="alert-circle" size={16} color="#EF4444" />
                        <Text className="text-red-600 text-sm ml-2 font-quicksand-medium flex-1">{errors.category}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {currentStep === 'details' && (
            <View style={{ paddingHorizontal: 20, paddingVertical: 24, gap: 24 }}>
              {/* Product Details */}
              <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: colors.border }}>
                <View className="flex-row items-center mb-5">
                  <View className="w-12 h-12 rounded-2xl bg-primary-100 items-center justify-center">
                    <Ionicons name="document-text" size={24} color="#6366F1" />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 18 }}>
                      Détails du produit
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 12, marginTop: 2 }}>
                      Informations complémentaires
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 20 }}>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 14, marginBottom: 8 }}>
                        Marque
                      </Text>
                      <TextInput
                        style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', borderWidth: 1, borderColor: colors.border }}
                        placeholder="Apple, Samsung..."
                        placeholderTextColor={colors.textSecondary}
                        value={form.brand}
                        onChangeText={(text) => setForm(prev => ({ ...prev, brand: text }))}
                      />
                    </View>

                    <View className="flex-1">
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 14, marginBottom: 8 }}>
                        Modèle
                      </Text>
                      <TextInput
                        style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', borderWidth: 1, borderColor: colors.border }}
                        placeholder="iPhone 15 Pro"
                        placeholderTextColor={colors.textSecondary}
                        value={form.model}
                        onChangeText={(text) => setForm(prev => ({ ...prev, model: text }))}
                      />
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 14, marginBottom: 8 }}>
                        SKU (Référence)
                      </Text>
                      <TextInput
                        style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', borderWidth: 1, borderColor: colors.border }}
                        placeholder="IPH15P-256-BLK"
                        placeholderTextColor={colors.textSecondary}
                        value={form.sku}
                        onChangeText={(text) => setForm(prev => ({ ...prev, sku: text }))}
                      />
                      {errors.sku && (
                        <View className="flex-row items-center bg-red-50 rounded-lg p-2 mt-2">
                          <Ionicons name="alert-circle" size={14} color="#EF4444" />
                          <Text className="text-red-600 text-xs ml-2 font-quicksand-medium flex-1">{errors.sku}</Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-1">
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 14, marginBottom: 8 }}>
                        Code-barres
                      </Text>
                      <TextInput
                        style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', borderWidth: 1, borderColor: colors.border }}
                        placeholder="123456789012"
                        placeholderTextColor={colors.textSecondary}
                        value={form.barcode}
                        onChangeText={(text) => setForm(prev => ({ ...prev, barcode: text }))}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View>
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 14, marginBottom: 8 }}>
                      Poids (kg)
                    </Text>
                    <View className="flex-row items-center" style={{ backgroundColor: colors.secondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                      <View className="pl-4 pr-2">
                        <Ionicons name="barbell-outline" size={20} color={colors.textSecondary} />
                      </View>
                      <TextInput
                        style={{ flex: 1, paddingVertical: 14, paddingRight: 16, color: colors.textPrimary, fontFamily: 'Quicksand-Medium' }}
                        placeholder="0.5"
                        placeholderTextColor={colors.textSecondary}
                        value={form.weight}
                        onChangeText={(text) => setForm(prev => ({ ...prev, weight: text }))}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    {errors.weight && (
                      <View className="flex-row items-center bg-red-50 rounded-lg p-2 mt-2">
                        <Ionicons name="alert-circle" size={14} color="#EF4444" />
                        <Text className="text-red-600 text-xs ml-2 font-quicksand-medium flex-1">{errors.weight}</Text>
                      </View>
                    )}
                  </View>

                  <View>
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 14, marginBottom: 8 }}>
                      Dimensions (cm)
                    </Text>
                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <TextInput
                          style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 14, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', borderWidth: 1, borderColor: colors.border, textAlign: 'center' }}
                          placeholder="L"
                          placeholderTextColor={colors.textSecondary}
                          value={form.dimensions.length}
                          onChangeText={(text) => setForm(prev => ({
                            ...prev,
                            dimensions: { ...prev.dimensions, length: text }
                          }))}
                          keyboardType="decimal-pad"
                        />
                        <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                          Longueur
                        </Text>
                      </View>
                      <View className="flex-1">
                        <TextInput
                          style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 14, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', borderWidth: 1, borderColor: colors.border, textAlign: 'center' }}
                          placeholder="l"
                          placeholderTextColor={colors.textSecondary}
                          value={form.dimensions.width}
                          onChangeText={(text) => setForm(prev => ({
                            ...prev,
                            dimensions: { ...prev.dimensions, width: text }
                          }))}
                          keyboardType="decimal-pad"
                        />
                        <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                          Largeur
                        </Text>
                      </View>
                      <View className="flex-1">
                        <TextInput
                          style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 14, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', borderWidth: 1, borderColor: colors.border, textAlign: 'center' }}
                          placeholder="H"
                          placeholderTextColor={colors.textSecondary}
                          value={form.dimensions.height}
                          onChangeText={(text) => setForm(prev => ({
                            ...prev,
                            dimensions: { ...prev.dimensions, height: text }
                          }))}
                          keyboardType="decimal-pad"
                        />
                        <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                          Hauteur
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Specifications */}
              <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: colors.border }}>
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <Ionicons name="list" size={24} color="#6366F1" />
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 20, marginLeft: 12 }}>
                      Spécifications
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={openSpecModal}
                    className="bg-primary-100 rounded-full p-2"
                  >
                    <Ionicons name="add" size={20} color="#6366F1" />
                  </TouchableOpacity>
                </View>

                {form.specifications.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {form.specifications.map((spec, index) => (
                      <View key={index} className="flex-row items-center justify-between" style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16 }}>
                        <View className="flex-1">
                          <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold' }}>{spec.key}</Text>
                          <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand' }}>{spec.value}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => removeSpecification(index)}
                          className="bg-red-100 rounded-full p-2"
                        >
                          <Ionicons name="trash" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand', textAlign: 'center', paddingVertical: 32 }}>
                    Aucune spécification ajoutée
                  </Text>
                )}
              </View>

              {/* Tags */}
              <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: colors.border }}>
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <Ionicons name="pricetag" size={24} color="#6366F1" />
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 20, marginLeft: 12 }}>
                      Tags
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={openTagModal}
                    className="bg-primary-100 rounded-full p-2"
                  >
                    <Ionicons name="add" size={20} color="#6366F1" />
                  </TouchableOpacity>
                </View>

                {form.tags.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-2">
                    <View className="flex-row flex-wrap gap-2">
                      {form.tags.map((tag, index) => (
                        <View key={index} className="flex-row items-center bg-primary-100 rounded-full px-3 py-2">
                          <Text className="font-quicksand-medium text-primary-700">{tag}</Text>
                          <TouchableOpacity
                            onPress={() => removeTag(index)}
                            className="ml-2"
                          >
                            <Ionicons name="close" size={16} color="#6366F1" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                ) : (
                  <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand', textAlign: 'center', paddingVertical: 32 }}>
                    Aucun tag ajouté
                  </Text>
                )}
              </View>
            </View>
          )}
        </KeyboardAwareScrollView>

        {/* Fixed Bottom Buttons */}
        <View style={{ backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
          {/* Error Summary */}
          {showErrorSummary && (
            <View className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text className="text-red-600 font-quicksand-semibold ml-2 text-sm">Veuillez corriger les erreurs :</Text>
              </View>
              <View style={{ gap: 4 }}>
                {currentStep === 'basic' && (
                  <>
                    {errors.name && <Text className="text-red-500 text-xs">• {errors.name}</Text>}
                    {errors.description && <Text className="text-red-500 text-xs">• {errors.description}</Text>}
                    {errors.price && <Text className="text-red-500 text-xs">• {errors.price}</Text>}
                    {errors.stock && <Text className="text-red-500 text-xs">• {errors.stock}</Text>}
                    {errors.category && <Text className="text-red-500 text-xs">• {errors.category}</Text>}
                    {errors.images && <Text className="text-red-500 text-xs">• {errors.images}</Text>}
                  </>
                )}
                {currentStep === 'details' && (
                  <>
                    {errors.sku && <Text className="text-red-500 text-xs">• {errors.sku}</Text>}
                    {errors.weight && <Text className="text-red-500 text-xs">• {errors.weight}</Text>}
                  </>
                )}
              </View>
            </View>
          )}

          {/* Buttons for Basic Step */}
          {currentStep === 'basic' && (
            <TouchableOpacity
              className="bg-primary-500 rounded-2xl py-4 shadow-sm active:bg-primary-600"
              onPress={nextStep}
              activeOpacity={0.8}
            >
              <View className="flex-row items-center justify-center">
                <Text className="text-white text-center font-quicksand-semibold mr-2">
                  {i18n.t("enterprise.products.create.actions.next")} : {i18n.t("enterprise.products.create.steps.details")}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}

          {/* Buttons for Details Step */}
          {currentStep === 'details' && (
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-neutral-100 rounded-2xl py-4 active:bg-neutral-200"
                onPress={prevStep}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="chevron-back" size={18} color="#374151" />
                  <Text className="text-neutral-700 text-center font-quicksand-semibold ml-2">{i18n.t("enterprise.products.create.actions.previous")}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-4 rounded-2xl ${loading
                  ? 'bg-primary-300'
                  : 'bg-primary-500 shadow-sm active:bg-primary-600'
                  }`}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={loading ? 1 : 0.8}
              >
                {loading ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-quicksand-semibold ml-2">{i18n.t("enterprise.products.create.actions.creating")}</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text className="text-white text-center font-quicksand-semibold ml-2">{i18n.t("enterprise.products.create.actions.createProduct")}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

      </KeyboardAvoidingView>

      {/* Tag slide-up modal */}
      {tagModalVisible && (
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Animated.View
            pointerEvents="auto"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdropTagAnim }}
          >
            <Pressable style={{ flex: 1 }} onPress={closeTagModal} />
          </Animated.View>
          <Animated.View
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              transform: [{ translateY: slideTagAnim }],
            }}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 20 }} />
            <View style={{ paddingHorizontal: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 18 }}>
                  {i18n.t("enterprise.products.create.modals.addTag")}
                </Text>
                <TouchableOpacity
                  onPress={closeTagModal}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
                placeholder={i18n.t("enterprise.products.create.modals.tagPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                value={newTag}
                onChangeText={setNewTag}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={addTag}
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
                  onPress={closeTagModal}
                >
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold' }}>
                    {i18n.t("enterprise.products.create.modals.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
                  onPress={addTag}
                >
                  <Text style={{ color: '#FFFFFF', fontFamily: 'Quicksand-SemiBold' }}>
                    {i18n.t("enterprise.products.create.modals.tagAction")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Spec slide-up modal */}
      {specModalVisible && (
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Animated.View
            pointerEvents="auto"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdropSpecAnim }}
          >
            <Pressable style={{ flex: 1 }} onPress={closeSpecModal} />
          </Animated.View>
          <Animated.View
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              transform: [{ translateY: slideSpecAnim }],
            }}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 20 }} />
            <View style={{ paddingHorizontal: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 18 }}>
                  {i18n.t("enterprise.products.create.modals.addSpecification")}
                </Text>
                <TouchableOpacity
                  onPress={closeSpecModal}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}
                placeholder={i18n.t("enterprise.products.create.modals.specKeyPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                value={newSpec.key}
                onChangeText={(text) => setNewSpec(prev => ({ ...prev, key: text }))}
                autoFocus
                returnKeyType="next"
              />
              <TextInput
                style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
                placeholder={i18n.t("enterprise.products.create.modals.specValuePlaceholder")}
                placeholderTextColor={colors.textSecondary}
                value={newSpec.value}
                onChangeText={(text) => setNewSpec(prev => ({ ...prev, value: text }))}
                returnKeyType="done"
                onSubmitEditing={addSpecification}
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
                  onPress={closeSpecModal}
                >
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold' }}>
                    {i18n.t("enterprise.products.create.modals.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
                  onPress={addSpecification}
                >
                  <Text style={{ color: '#FFFFFF', fontFamily: 'Quicksand-SemiBold' }}>
                    {i18n.t("enterprise.products.create.modals.tagAction")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      )}

      <NotificationModal
        visible={notification?.visible || false}
        type={notification?.type || 'info'}
        title={notification?.title || ''}
        message={notification?.message || ''}
        onClose={hideNotification}
      />
    </View>
  );
}