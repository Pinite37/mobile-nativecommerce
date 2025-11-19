import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { Link, router, useFocusEffect } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import NotificationModal, { useNotification } from "../../../../../components/ui/NotificationModal";
import { useToast } from "../../../../../components/ui/ToastManager";

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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
  const [maxReachedStep, setMaxReachedStep] = useState<number>(0); // index of farthest unlocked step
  const [showErrorSummary, setShowErrorSummary] = useState(false);

  const steps: { id: Step; title: string; icon: string }[] = [
    { id: 'basic', title: 'Informations de base', icon: 'information-circle' },
    { id: 'details', title: 'Détails produit', icon: 'list' },
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
          newErrors.name = "Le nom du produit est requis";
        }
        if (!form.description.trim()) {
          newErrors.description = "La description est requise";
        }
        if (!form.price.trim()) {
          newErrors.price = "Le prix est requis";
        } else if (isNaN(Number(form.price)) || Number(form.price) <= 0) {
          newErrors.price = "Le prix doit être un nombre positif";
        }
        if (!form.stock.trim()) {
          newErrors.stock = "Le stock est requis";
        } else if (isNaN(Number(form.stock)) || Number(form.stock) < 0) {
          newErrors.stock = "Le stock doit être un nombre positif ou nul";
        }
        if (!form.category) {
          newErrors.category = "La catégorie est requise";
        }
        if (form.images.filter(img => !img.loading).length === 0) {
          newErrors.images = "Au moins une image est requise";
        }
        break;
      case 'details':
        if (form.sku.trim() && !/^[A-Za-z0-9-_]+$/.test(form.sku.trim())) {
          newErrors.sku = "Le SKU ne peut contenir que des lettres, chiffres, tirets et underscores";
        }
        if (form.weight.trim() && (isNaN(Number(form.weight)) || Number(form.weight) <= 0)) {
          newErrors.weight = "Le poids doit être un nombre positif";
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
        showNotification(
          'warning', 
          'Limite atteinte', 
          `Votre plan "${subscription?.plan?.name}" autorise maximum ${maxImagesPerProduct} image${maxImagesPerProduct > 1 ? 's' : ''} par produit. Passez à un plan supérieur pour ajouter plus d'images.`
        );
        return;
      }
      
      // Vérifier les permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showNotification('error', 'Permission refusée', 'Nous avons besoin de votre permission pour accéder à la galerie');
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
          showNotification('error', 'Image trop grande', 'Veuillez choisir une image de moins de 5MB');
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
      showNotification('error', 'Erreur', "Impossible de sélectionner l'image");
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
      setForm(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
      setShowTagModal(false);
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
      setShowSpecModal(false);
    }
  };

  const removeSpecification = (index: number) => {
    setForm(prev => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index)
    }));
  };

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
      showNotification(
        'error', 
        'Limite de produits atteinte', 
        `Vous avez atteint la limite de ${maxProducts} produit${maxProducts > 1 ? 's' : ''} de votre plan "${subscription?.plan?.name}". Passez à un plan supérieur pour ajouter plus de produits.`
      );
      return;
    }
    
    const ok = validateForm();
    setShowErrorSummary(!ok);
    if (!ok) {
      showNotification('error', 'Erreur', 'Veuillez corriger les erreurs avant de continuer');
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
      showSuccess("Produit créé avec succès !", `${createdProduct.name} a été ajouté à votre catalogue`);
      
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
      showError("Erreur", error.message || "Impossible de créer le produit");
      console.error('Erreur création produit:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background-secondary">
      <ExpoStatusBar style="light" translucent />
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <LinearGradient
          colors={['#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: 32,
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View className="px-6">
            <View className="flex-row items-center justify-between">
              <Link 
                href="/(app)/(enterprise)/(tabs)/products"
                asChild
              >
                <TouchableOpacity
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm items-center justify-center border border-white/30"
                >
                  <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </Link>
              <View className="flex-1 items-center px-2">
                <Text className="text-2xl font-quicksand-bold text-white text-center">
                  Nouveau produit
                </Text>
                <Text className="text-white/90 font-quicksand-medium text-sm text-center mt-1">
                  Ajoutez un nouveau produit à votre catalogue
                </Text>
              </View>
              <View className="w-12" />
            </View>
          </View>
        </LinearGradient>

        {/* Step Indicator + Progress */}
        <View className="bg-white px-6 pt-5 pb-6 border-b border-neutral-100">
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
            <Text className="text-sm text-neutral-600 font-quicksand-medium">
              Étape {currentStepIndex + 1} sur {steps.length} • {Math.round(progress * 100)}% terminé
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            {steps.map((step, index) => {
              const stepErrors: Record<string,string> = {};
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
                    className={`w-10 h-10 rounded-full items-center justify-center ${
                      currentStep === step.id
                        ? "bg-primary-500"
                        : steps.findIndex(s => s.id === currentStep) > index
                        ? "bg-success-500"
                        : hasErr ? 'bg-red-200' : "bg-neutral-200"
                    }`}
                  >
                    <Ionicons
                      name={step.icon as any}
                      size={16}
                      color={
                        currentStep === step.id || steps.findIndex(s => s.id === currentStep) > index
                          ? "white"
                          : hasErr ? '#B91C1C' : "#9CA3AF"
                      }
                    />
                    {hasErr && (
                      <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 items-center justify-center">
                        <Text className="text-[9px] text-white font-quicksand-bold">!</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    className={`text-xs font-quicksand-medium mt-1 text-center ${
                      currentStep === step.id
                        ? "text-primary-500"
                        : steps.findIndex(s => s.id === currentStep) > index
                        ? "text-success-500"
                        : hasErr ? 'text-red-500' : "text-neutral-500"
                    }`}
                    numberOfLines={1}
                  >
                    {step.title}
                  </Text>
                </TouchableOpacity>
                {index < steps.length - 1 && (
                  <View
                    className={`flex-1 h-0.5 mx-2 ${
                      steps.findIndex(s => s.id === currentStep) > index
                        ? "bg-success-500"
                        : "bg-neutral-200"
                    }`}
                  />
                )}
              </React.Fragment>
            );})}
          </View>
        </View>

  <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140, paddingTop: 8 }}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 'basic' && (
            <View className="px-5 py-6 space-y-6">
              {/* Subscription Limits Info */}
              {subscription && (
                <View className="bg-gradient-to-r from-primary-50 to-emerald-50 rounded-2xl p-4 border border-primary-100">
                  <View className="flex-row items-center mb-3">
                    <View className="w-8 h-8 rounded-full bg-primary-500 items-center justify-center mr-3">
                      <Ionicons name="information" size={16} color="#FFFFFF" />
                    </View>
                    <Text className="text-primary-700 font-quicksand-bold text-sm">
                      Limites de votre plan {subscription.plan.name}
                    </Text>
                  </View>
                  <View className="space-y-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-neutral-600 font-quicksand-medium text-xs">
                        Produits
                      </Text>
                      <Text className="text-neutral-800 font-quicksand-bold text-sm">
                        {totalProducts} / {subscription.plan.features.maxProducts}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-neutral-600 font-quicksand-medium text-xs">
                        Images par produit
                      </Text>
                      <Text className="text-neutral-800 font-quicksand-bold text-sm">
                        {subscription.plan.features.maxImagesPerProduct}
                      </Text>
                    </View>
                  </View>
                  {hasReachedLimit('maxProducts', totalProducts) && (
                    <View className="mt-3 pt-3 border-t border-primary-200">
                      <Text className="text-amber-700 font-quicksand-semibold text-xs">
                        ⚠️ Vous avez atteint la limite de produits. Passez à un plan supérieur pour continuer.
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* Images */}
              <View className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100">
                <View className="flex-row items-center mb-5">
                  <View className="w-12 h-12 rounded-2xl bg-primary-100 items-center justify-center">
                    <Ionicons name="camera" size={24} color="#6366F1" />
                  </View>
                  <View className="flex-1 ml-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-lg font-quicksand-bold text-neutral-800">
                        Photos du produit *
                      </Text>
                      {subscription && (
                        <Text className="text-xs font-quicksand-semibold text-primary-600">
                          {form.images.filter(img => !img.loading).length}/{subscription.plan.features.maxImagesPerProduct}
                        </Text>
                      )}
                    </View>
                    <Text className="text-xs text-neutral-500 font-quicksand-medium mt-0.5">
                      {subscription 
                        ? `Maximum ${subscription.plan.features.maxImagesPerProduct} image${subscription.plan.features.maxImagesPerProduct > 1 ? 's' : ''} selon votre plan`
                        : 'Ajoutez des images de votre produit'
                      }
                    </Text>
                  </View>
                </View>
                
                <View className="space-y-4">
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
                        Limite atteinte
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
                        Ajouter une photo
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
              <View className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100">
                <View className="flex-row items-center mb-5">
                  <View className="w-12 h-12 rounded-2xl bg-primary-100 items-center justify-center">
                    <Ionicons name="information-circle" size={24} color="#6366F1" />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text className="text-lg font-quicksand-bold text-neutral-800">
                      Informations de base *
                    </Text>
                    <Text className="text-xs text-neutral-500 font-quicksand-medium mt-0.5">
                      Détails essentiels du produit
                    </Text>
                  </View>
                </View>
                
                <View className="space-y-5">
                  <View>
                    <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-2">
                      Nom du produit *
                    </Text>
                    <TextInput
                      className="bg-neutral-50 rounded-xl px-4 py-3.5 text-neutral-800 font-quicksand-medium border border-neutral-200"
                      placeholder="Ex: iPhone 15 Pro Max 256GB"
                      placeholderTextColor="#9CA3AF"
                      value={form.name}
                      onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
                    />
                    {errors.name && (
                      <View className="flex-row items-center bg-red-50 rounded-lg p-2 mt-2">
                        <Ionicons name="alert-circle" size={14} color="#EF4444" />
                        <Text className="text-red-600 text-xs ml-2 font-quicksand-medium flex-1">{errors.name}</Text>
                      </View>
                    )}
                  </View>

                  <View>
                    <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-2">
                      Description *
                    </Text>
                    <TextInput
                      className="bg-neutral-50 rounded-xl px-4 py-3.5 text-neutral-800 font-quicksand-medium border border-neutral-200"
                      placeholder="Décrivez votre produit en détail..."
                      placeholderTextColor="#9CA3AF"
                      value={form.description}
                      onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      style={{ minHeight: 100 }}
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
                      <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-2">
                        Prix (FCFA) *
                      </Text>
                      <View className="flex-row items-center bg-neutral-50 rounded-xl border border-neutral-200">
                        <View className="pl-4 pr-2">
                          <Ionicons name="cash-outline" size={20} color="#6B7280" />
                        </View>
                        <TextInput
                          className="flex-1 py-3.5 pr-4 text-neutral-800 font-quicksand-medium"
                          placeholder="50000"
                          placeholderTextColor="#9CA3AF"
                          value={form.price}
                          onChangeText={(text) => setForm(prev => ({ ...prev, price: text }))}
                          keyboardType="numeric"
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
                      <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-2">
                        Stock *
                      </Text>
                      <View className="flex-row items-center bg-neutral-50 rounded-xl border border-neutral-200">
                        <View className="pl-4 pr-2">
                          <Ionicons name="cube-outline" size={20} color="#6B7280" />
                        </View>
                        <TextInput
                          className="flex-1 py-3.5 pr-4 text-neutral-800 font-quicksand-medium"
                          placeholder="100"
                          placeholderTextColor="#9CA3AF"
                          value={form.stock}
                          onChangeText={(text) => setForm(prev => ({ ...prev, stock: text }))}
                          keyboardType="numeric"
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
              <View className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100">
                <View className="flex-row items-center mb-5">
                  <View className="w-12 h-12 rounded-2xl bg-primary-100 items-center justify-center">
                    <Ionicons name="grid" size={24} color="#6366F1" />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text className="text-lg font-quicksand-bold text-neutral-800">
                      Catégorie *
                    </Text>
                    <Text className="text-xs text-neutral-500 font-quicksand-medium mt-0.5">
                      Sélectionnez une catégorie
                    </Text>
                  </View>
                </View>
                
                {loadingCategories ? (
                  <View className="py-12 items-center">
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text className="text-neutral-500 font-quicksand-medium mt-3">
                      Chargement des catégories...
                    </Text>
                  </View>
                ) : (
                  <View>
                    <View className="flex-row flex-wrap gap-2.5">
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category._id}
                          className={`px-5 py-3 rounded-xl border ${
                            form.category === category._id
                              ? "bg-primary-500 border-primary-500"
                              : "bg-neutral-50 border-neutral-200"
                          }`}
                          onPress={() => {
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
                              className={`font-quicksand-semibold text-sm ${
                                form.category === category._id ? "text-white" : "text-neutral-700"
                              }`}
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
            <View className="px-5 py-6 space-y-6">
              {/* Product Details */}
              <View className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100">
                <View className="flex-row items-center mb-5">
                  <View className="w-12 h-12 rounded-2xl bg-primary-100 items-center justify-center">
                    <Ionicons name="document-text" size={24} color="#6366F1" />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text className="text-lg font-quicksand-bold text-neutral-800">
                      Détails du produit
                    </Text>
                    <Text className="text-xs text-neutral-500 font-quicksand-medium mt-0.5">
                      Informations complémentaires
                    </Text>
                  </View>
                </View>
                
                <View className="space-y-5">
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-2">
                        Marque
                      </Text>
                      <TextInput
                        className="bg-neutral-50 rounded-xl px-4 py-3.5 text-neutral-800 font-quicksand-medium border border-neutral-200"
                        placeholder="Apple, Samsung..."
                        placeholderTextColor="#9CA3AF"
                        value={form.brand}
                        onChangeText={(text) => setForm(prev => ({ ...prev, brand: text }))}
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-2">
                        Modèle
                      </Text>
                      <TextInput
                        className="bg-neutral-50 rounded-xl px-4 py-3.5 text-neutral-800 font-quicksand-medium border border-neutral-200"
                        placeholder="iPhone 15 Pro"
                        placeholderTextColor="#9CA3AF"
                        value={form.model}
                        onChangeText={(text) => setForm(prev => ({ ...prev, model: text }))}
                      />
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-2">
                        SKU (Référence)
                      </Text>
                      <TextInput
                        className="bg-neutral-50 rounded-xl px-4 py-3.5 text-neutral-800 font-quicksand-medium border border-neutral-200"
                        placeholder="IPH15P-256-BLK"
                        placeholderTextColor="#9CA3AF"
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
                      <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-2">
                        Code-barres
                      </Text>
                      <TextInput
                        className="bg-neutral-50 rounded-xl px-4 py-3.5 text-neutral-800 font-quicksand-medium border border-neutral-200"
                        placeholder="123456789012"
                        placeholderTextColor="#9CA3AF"
                        value={form.barcode}
                        onChangeText={(text) => setForm(prev => ({ ...prev, barcode: text }))}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View>
                    <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-2">
                      Poids (kg)
                    </Text>
                    <View className="flex-row items-center bg-neutral-50 rounded-xl border border-neutral-200">
                      <View className="pl-4 pr-2">
                        <Ionicons name="barbell-outline" size={20} color="#6B7280" />
                      </View>
                      <TextInput
                        className="flex-1 py-3.5 pr-4 text-neutral-800 font-quicksand-medium"
                        placeholder="0.5"
                        placeholderTextColor="#9CA3AF"
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
                    <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-2">
                      Dimensions (cm)
                    </Text>
                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <TextInput
                          className="bg-neutral-50 rounded-xl px-3 py-3.5 text-neutral-800 font-quicksand-medium border border-neutral-200 text-center"
                          placeholder="L"
                          placeholderTextColor="#9CA3AF"
                          value={form.dimensions.length}
                          onChangeText={(text) => setForm(prev => ({ 
                            ...prev, 
                            dimensions: { ...prev.dimensions, length: text }
                          }))}
                          keyboardType="decimal-pad"
                        />
                        <Text className="text-xs text-neutral-500 font-quicksand text-center mt-1">
                          Longueur
                        </Text>
                      </View>
                      <View className="flex-1">
                        <TextInput
                          className="bg-neutral-50 rounded-xl px-3 py-3.5 text-neutral-800 font-quicksand-medium border border-neutral-200 text-center"
                          placeholder="l"
                          placeholderTextColor="#9CA3AF"
                          value={form.dimensions.width}
                          onChangeText={(text) => setForm(prev => ({ 
                            ...prev, 
                            dimensions: { ...prev.dimensions, width: text }
                          }))}
                          keyboardType="decimal-pad"
                        />
                        <Text className="text-xs text-neutral-500 font-quicksand text-center mt-1">
                          Largeur
                        </Text>
                      </View>
                      <View className="flex-1">
                        <TextInput
                          className="bg-neutral-50 rounded-xl px-3 py-3.5 text-neutral-800 font-quicksand-medium border border-neutral-200 text-center"
                          placeholder="H"
                          placeholderTextColor="#9CA3AF"
                          value={form.dimensions.height}
                          onChangeText={(text) => setForm(prev => ({ 
                            ...prev, 
                            dimensions: { ...prev.dimensions, height: text }
                          }))}
                          keyboardType="decimal-pad"
                        />
                        <Text className="text-xs text-neutral-500 font-quicksand text-center mt-1">
                          Hauteur
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Specifications */}
              <View className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <Ionicons name="list" size={24} color="#6366F1" />
                    <Text className="text-xl font-quicksand-bold text-neutral-800 ml-3">
                      Spécifications
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowSpecModal(true)}
                    className="bg-primary-100 rounded-full p-2"
                  >
                    <Ionicons name="add" size={20} color="#6366F1" />
                  </TouchableOpacity>
                </View>

                {form.specifications.length > 0 ? (
                  <View className="space-y-3">
                    {form.specifications.map((spec, index) => (
                      <View key={index} className="flex-row items-center justify-between bg-neutral-50 rounded-2xl p-4">
                        <View className="flex-1">
                          <Text className="font-quicksand-semibold text-neutral-800">{spec.key}</Text>
                          <Text className="font-quicksand text-neutral-600">{spec.value}</Text>
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
                  <Text className="text-neutral-500 font-quicksand text-center py-8">
                    Aucune spécification ajoutée
                  </Text>
                )}
              </View>

              {/* Tags */}
              <View className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <Ionicons name="pricetag" size={24} color="#6366F1" />
                    <Text className="text-xl font-quicksand-bold text-neutral-800 ml-3">
                      Tags
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowTagModal(true)}
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
                  <Text className="text-neutral-500 font-quicksand text-center py-8">
                    Aucun tag ajouté
                  </Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Fixed Bottom Buttons */}
        <View className="bg-white border-t border-neutral-100 px-4 py-4" style={{ paddingBottom: Platform.OS === 'ios' ? 34 : 16 }}>
          {/* Error Summary */}
          {showErrorSummary && (
            <View className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text className="text-red-600 font-quicksand-semibold ml-2 text-sm">Veuillez corriger les erreurs :</Text>
              </View>
              <View className="space-y-1">
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
                  Suivant : Détails du produit
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
                  <Text className="text-neutral-700 text-center font-quicksand-semibold ml-2">Précédent</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-4 rounded-2xl ${
                  loading 
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
                    <Text className="text-white font-quicksand-semibold ml-2">Création...</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text className="text-white text-center font-quicksand-semibold ml-2">Créer le produit</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tag Modal */}
        <Modal
          visible={showTagModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTagModal(false)}
        >
          <TouchableOpacity
            className="flex-1 bg-black/50 justify-center items-center"
            activeOpacity={1}
            onPress={() => setShowTagModal(false)}
          >
            <View className="bg-white rounded-2xl p-6 mx-6 w-full max-w-sm">
              <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4">
                Ajouter un tag
              </Text>
              <TextInput
                className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200 mb-4 focus:border-primary-500"
                placeholder="Ex: Nouveau, Populaire, Promo..."
                placeholderTextColor="#9CA3AF"
                value={newTag}
                onChangeText={setNewTag}
                autoFocus
              />
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  className="flex-1 bg-neutral-100 rounded-2xl py-3"
                  onPress={() => setShowTagModal(false)}
                >
                  <Text className="text-neutral-700 text-center font-quicksand-semibold">
                    Annuler
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-primary-500 rounded-2xl py-3 shadow-sm"
                  onPress={addTag}
                >
                  <Text className="text-white text-center font-quicksand-semibold">
                    Ajouter
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Specification Modal */}
        <Modal
          visible={showSpecModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSpecModal(false)}
        >
          <TouchableOpacity
            className="flex-1 bg-black/50 justify-center items-center"
            activeOpacity={1}
            onPress={() => setShowSpecModal(false)}
          >
            <View className="bg-white rounded-2xl p-6 mx-6 w-full max-w-sm">
              <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4">
                Ajouter une spécification
              </Text>
              <TextInput
                className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200 mb-3 focus:border-primary-500"
                placeholder="Nom (ex: Couleur, Taille...)"
                placeholderTextColor="#9CA3AF"
                value={newSpec.key}
                onChangeText={(text) => setNewSpec(prev => ({ ...prev, key: text }))}
              />
              <TextInput
                className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200 mb-4 focus:border-primary-500"
                placeholder="Valeur (ex: Noir, XL...)"
                placeholderTextColor="#9CA3AF"
                value={newSpec.value}
                onChangeText={(text) => setNewSpec(prev => ({ ...prev, value: text }))}
              />
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  className="flex-1 bg-neutral-100 rounded-2xl py-3"
                  onPress={() => setShowSpecModal(false)}
                >
                  <Text className="text-neutral-700 text-center font-quicksand-semibold">
                    Annuler
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-primary-500 rounded-2xl py-3 shadow-sm"
                  onPress={addSpecification}
                >
                  <Text className="text-white text-center font-quicksand-semibold">
                    Ajouter
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
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