import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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

interface ProductForm {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  images: { base64: string; uri: string }[];
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

type Step = 'basic' | 'details' | 'shipping' | 'advanced' | 'seo';

export default function CreateProduct() {
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [newSpec, setNewSpec] = useState({ key: '', value: '' });
  
  // Fonction temporaire pour éviter l'erreur de navigation context
  const showToast = (message: string) => {
    Alert.alert("Succès", message);
  };

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

  const steps: { id: Step; title: string; icon: string }[] = [
    { id: 'basic', title: 'Informations de base', icon: 'information-circle' },
    { id: 'details', title: 'Détails produit', icon: 'list' },
    { id: 'shipping', title: 'Expédition', icon: 'car' },
    { id: 'advanced', title: 'Options avancées', icon: 'settings' },
    { id: 'seo', title: 'SEO & Marketing', icon: 'trending-up' },
  ];

  useEffect(() => {
    loadCategories();
  }, []);

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
        if (form.images.length === 0) {
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
      case 'shipping':
        if (form.shippingWeight.trim() && (isNaN(Number(form.shippingWeight)) || Number(form.shippingWeight) <= 0)) {
          newErrors.weight = "Le poids d'expédition doit être un nombre positif";
        }
        break;
      case 'advanced':
        if (form.minOrderQuantity.trim() && (isNaN(Number(form.minOrderQuantity)) || Number(form.minOrderQuantity) <= 0)) {
          newErrors.stock = "La quantité minimum doit être un nombre positif";
        }
        if (form.maxOrderQuantity.trim() && (isNaN(Number(form.maxOrderQuantity)) || Number(form.maxOrderQuantity) <= 0)) {
          newErrors.stock = "La quantité maximum doit être un nombre positif";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): boolean => {
    return validateStep('basic') && validateStep('details') && validateStep('shipping') && validateStep('advanced');
  };

  const handleImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setForm(prev => ({
            ...prev,
            images: [...prev.images, { 
              base64: asset.base64!, 
              uri: asset.uri 
            }]
          }));
        }
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert("Erreur", "Impossible de sélectionner l'image");
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
    if (validateStep(currentStep)) {
      const currentIndex = steps.findIndex(s => s.id === currentStep);
      if (currentIndex < steps.length - 1) {
        setCurrentStep(steps[currentIndex + 1].id);
      }
    }
  };

  const prevStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
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

      await ProductService.createProduct(productData);
      
      // Affichage du toast de succès
      showToast("Produit créé avec succès !");
      
      // Retour automatique à la liste des produits avec rafraîchissement
      router.push({
        pathname: '/(app)/(enterprise)/(tabs)/products',
        params: { refresh: 'true' }
      });
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Impossible de créer le produit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="bg-white px-6 py-4 pt-16 shadow-sm">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={20} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-quicksand-bold text-neutral-800">
              Nouveau produit
            </Text>
            <View className="w-10" />
          </View>
        </View>

        {/* Step Indicator */}
        <View className="bg-white px-6 py-4 border-b border-neutral-100">
          <View className="flex-row items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <TouchableOpacity
                  onPress={() => goToStep(step.id)}
                  className="items-center"
                >
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center ${
                      currentStep === step.id
                        ? "bg-primary-500"
                        : steps.findIndex(s => s.id === currentStep) > index
                        ? "bg-success-500"
                        : "bg-neutral-200"
                    }`}
                  >
                    <Ionicons
                      name={step.icon as any}
                      size={16}
                      color={
                        currentStep === step.id || steps.findIndex(s => s.id === currentStep) > index
                          ? "white"
                          : "#9CA3AF"
                      }
                    />
                  </View>
                  <Text
                    className={`text-xs font-quicksand-medium mt-1 text-center ${
                      currentStep === step.id
                        ? "text-primary-500"
                        : steps.findIndex(s => s.id === currentStep) > index
                        ? "text-success-500"
                        : "text-neutral-500"
                    }`}
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
            ))}
          </View>
        </View>

        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {currentStep === 'basic' && (
            <View className="px-6 py-6 space-y-6">
              {/* Images */}
              <View className="bg-white rounded-3xl p-6 shadow-sm">
                <View className="flex-row items-center mb-4">
                  <Ionicons name="camera" size={24} color="#6366F1" />
                  <Text className="text-xl font-quicksand-bold text-neutral-800 ml-3">
                    Photos du produit *
                  </Text>
                </View>
                
                <View className="space-y-4">
                  {form.images.length > 0 && (
                    <View className="flex-row flex-wrap gap-3">
                      {form.images.map((image, index) => (
                        <View key={index} className="relative">
                          <Image
                            source={{ uri: image.uri }}
                            className="w-24 h-24 rounded-2xl"
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            onPress={() => removeImage(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
                          >
                            <Ionicons name="close" size={14} color="white" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  <TouchableOpacity
                    onPress={handleImagePicker}
                    className="border-2 border-dashed border-primary-300 rounded-2xl p-8 items-center justify-center bg-primary-50"
                  >
                    <Ionicons name="camera" size={40} color="#6366F1" />
                    <Text className="text-primary-600 font-quicksand-semibold mt-2">
                      Ajouter une photo
                    </Text>
                    <Text className="text-primary-400 font-quicksand text-sm mt-1">
                      PNG, JPG jusqu&apos;à 10MB
                    </Text>
                  </TouchableOpacity>
                  
                  {errors.images && (
                    <Text className="text-red-500 text-sm font-quicksand">{errors.images}</Text>
                  )}
                </View>
              </View>

              {/* Basic Information */}
              <View className="bg-white rounded-3xl p-6 shadow-sm">
                <View className="flex-row items-center mb-4">
                  <Ionicons name="information-circle" size={24} color="#6366F1" />
                  <Text className="text-xl font-quicksand-bold text-neutral-800 ml-3">
                    Informations de base *
                  </Text>
                </View>
                
                <View className="space-y-5">
                  <View>
                    <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-3">
                      Nom du produit *
                    </Text>
                    <TextInput
                      className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200 focus:border-primary-500"
                      placeholder="Ex: iPhone 15 Pro Max 256GB"
                      placeholderTextColor="#9CA3AF"
                      value={form.name}
                      onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
                    />
                    {errors.name && (
                      <Text className="text-red-500 text-sm mt-2 font-quicksand">{errors.name}</Text>
                    )}
                  </View>

                  <View>
                    <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-3">
                      Description *
                    </Text>
                    <TextInput
                      className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200 focus:border-primary-500"
                      placeholder="Décrivez votre produit en détail : caractéristiques, état, avantages..."
                      placeholderTextColor="#9CA3AF"
                      value={form.description}
                      onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                    {errors.description && (
                      <Text className="text-red-500 text-sm mt-2 font-quicksand">{errors.description}</Text>
                    )}
                  </View>

                  <View className="flex-row space-x-4">
                    <View className="flex-1">
                      <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-3">
                        Prix (FCFA) *
                      </Text>
                      <TextInput
                        className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200 focus:border-primary-500"
                        placeholder="50000"
                        placeholderTextColor="#9CA3AF"
                        value={form.price}
                        onChangeText={(text) => setForm(prev => ({ ...prev, price: text }))}
                        keyboardType="numeric"
                      />
                      {errors.price && (
                        <Text className="text-red-500 text-sm mt-2 font-quicksand">{errors.price}</Text>
                      )}
                    </View>

                    <View className="flex-1">
                      <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-3">
                        Stock *
                      </Text>
                      <TextInput
                        className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200 focus:border-primary-500"
                        placeholder="100"
                        placeholderTextColor="#9CA3AF"
                        value={form.stock}
                        onChangeText={(text) => setForm(prev => ({ ...prev, stock: text }))}
                        keyboardType="numeric"
                      />
                      {errors.stock && (
                        <Text className="text-red-500 text-sm mt-2 font-quicksand">{errors.stock}</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Category Selection */}
              <View className="bg-white rounded-3xl p-6 shadow-sm">
                <View className="flex-row items-center mb-4">
                  <Ionicons name="grid" size={24} color="#6366F1" />
                  <Text className="text-xl font-quicksand-bold text-neutral-800 ml-3">
                    Catégorie *
                  </Text>
                </View>
                
                {loadingCategories ? (
                  <View className="py-8 items-center">
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text className="text-neutral-500 font-quicksand mt-2">
                      Chargement des catégories...
                    </Text>
                  </View>
                ) : (
                  <View>
                    <View className="flex-row flex-wrap gap-3">
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category._id}
                          className={`px-6 py-4 rounded-2xl border-2 ${
                            form.category === category._id
                              ? "bg-primary-500 border-primary-500"
                              : "bg-neutral-50 border-neutral-200"
                          }`}
                          onPress={() => setForm(prev => ({ ...prev, category: category._id }))}
                        >
                          <Text
                            className={`font-quicksand-semibold ${
                              form.category === category._id ? "text-white" : "text-neutral-700"
                            }`}
                          >
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {errors.category && (
                      <Text className="text-red-500 text-sm mt-3 font-quicksand">{errors.category}</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {currentStep === 'details' && (
            <View className="px-6 py-6 space-y-6">
              {/* Product Details */}
              <View className="bg-white rounded-3xl p-6 shadow-sm">
                <View className="flex-row items-center mb-4">
                  <Ionicons name="document-text" size={24} color="#6366F1" />
                  <Text className="text-xl font-quicksand-bold text-neutral-800 ml-3">
                    Détails du produit
                  </Text>
                </View>
                
                <View className="space-y-5">
                  <View className="flex-row space-x-4">
                    <View className="flex-1">
                      <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-3">
                        Marque
                      </Text>
                      <TextInput
                        className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200"
                        placeholder="Apple, Samsung..."
                        placeholderTextColor="#9CA3AF"
                        value={form.brand}
                        onChangeText={(text) => setForm(prev => ({ ...prev, brand: text }))}
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-3">
                        Modèle
                      </Text>
                      <TextInput
                        className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200"
                        placeholder="iPhone 15 Pro"
                        placeholderTextColor="#9CA3AF"
                        value={form.model}
                        onChangeText={(text) => setForm(prev => ({ ...prev, model: text }))}
                      />
                    </View>
                  </View>

                  <View className="flex-row space-x-4">
                    <View className="flex-1">
                      <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-3">
                        SKU (Référence)
                      </Text>
                      <TextInput
                        className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200"
                        placeholder="IPH15P-256-BLK"
                        placeholderTextColor="#9CA3AF"
                        value={form.sku}
                        onChangeText={(text) => setForm(prev => ({ ...prev, sku: text }))}
                      />
                      {errors.sku && (
                        <Text className="text-red-500 text-sm mt-2 font-quicksand">{errors.sku}</Text>
                      )}
                    </View>

                    <View className="flex-1">
                      <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-3">
                        Code-barres
                      </Text>
                      <TextInput
                        className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200"
                        placeholder="123456789012"
                        placeholderTextColor="#9CA3AF"
                        value={form.barcode}
                        onChangeText={(text) => setForm(prev => ({ ...prev, barcode: text }))}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View>
                    <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-3">
                      Poids (kg)
                    </Text>
                    <TextInput
                      className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200"
                      placeholder="0.5"
                      placeholderTextColor="#9CA3AF"
                      value={form.weight}
                      onChangeText={(text) => setForm(prev => ({ ...prev, weight: text }))}
                      keyboardType="decimal-pad"
                    />
                    {errors.weight && (
                      <Text className="text-red-500 text-sm mt-2 font-quicksand">{errors.weight}</Text>
                    )}
                  </View>

                  <View>
                    <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-3">
                      Dimensions (cm)
                    </Text>
                    <View className="flex-row space-x-3">
                      <View className="flex-1">
                        <TextInput
                          className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200"
                          placeholder="Longueur"
                          placeholderTextColor="#9CA3AF"
                          value={form.dimensions.length}
                          onChangeText={(text) => setForm(prev => ({ 
                            ...prev, 
                            dimensions: { ...prev.dimensions, length: text }
                          }))}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View className="flex-1">
                        <TextInput
                          className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200"
                          placeholder="Largeur"
                          placeholderTextColor="#9CA3AF"
                          value={form.dimensions.width}
                          onChangeText={(text) => setForm(prev => ({ 
                            ...prev, 
                            dimensions: { ...prev.dimensions, width: text }
                          }))}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View className="flex-1">
                        <TextInput
                          className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200"
                          placeholder="Hauteur"
                          placeholderTextColor="#9CA3AF"
                          value={form.dimensions.height}
                          onChangeText={(text) => setForm(prev => ({ 
                            ...prev, 
                            dimensions: { ...prev.dimensions, height: text }
                          }))}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Specifications */}
              <View className="bg-white rounded-3xl p-6 shadow-sm">
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
              <View className="bg-white rounded-3xl p-6 shadow-sm">
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
                ) : (
                  <Text className="text-neutral-500 font-quicksand text-center py-8">
                    Aucun tag ajouté
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Autres étapes simplifiées pour maintenir la lisibilité */}
          {(currentStep === 'shipping' || currentStep === 'advanced' || currentStep === 'seo') && (
            <View className="px-6 py-6">
              <View className="bg-white rounded-3xl p-6 shadow-sm items-center">
                <Ionicons name="construct" size={60} color="#9CA3AF" />
                <Text className="text-lg font-quicksand-bold text-neutral-800 mt-4 mb-2">
                  Section en développement
                </Text>
                <Text className="text-neutral-600 font-quicksand text-center">
                  Cette section sera disponible dans une prochaine mise à jour
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Navigation Buttons */}
        <View className="px-6 py-4 bg-white border-t border-neutral-200">
          <View className="flex-row space-x-3">
            {currentStep !== 'basic' && (
              <TouchableOpacity
                className="flex-1 bg-neutral-100 rounded-2xl py-4"
                onPress={prevStep}
              >
                <Text className="text-neutral-700 text-center font-quicksand-semibold">
                  Précédent
                </Text>
              </TouchableOpacity>
            )}
            
            {currentStep === 'details' ? (
              <TouchableOpacity
                className={`flex-1 py-4 rounded-2xl ${
                  loading ? 'bg-primary-300' : 'bg-primary-500'
                }`}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-quicksand-semibold ml-2">
                      Création...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white text-center font-quicksand-semibold">
                    Créer le produit
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="flex-1 bg-primary-500 rounded-2xl py-4"
                onPress={nextStep}
              >
                <Text className="text-white text-center font-quicksand-semibold">
                  Suivant
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
                className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200 mb-4"
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
                  className="flex-1 bg-primary-500 rounded-2xl py-3"
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
                className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200 mb-3"
                placeholder="Nom (ex: Couleur, Taille...)"
                placeholderTextColor="#9CA3AF"
                value={newSpec.key}
                onChangeText={(text) => setNewSpec(prev => ({ ...prev, key: text }))}
              />
              <TextInput
                className="bg-neutral-50 rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border-2 border-neutral-200 mb-4"
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
                  className="flex-1 bg-primary-500 rounded-2xl py-3"
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
    </SafeAreaView>
  );
}
