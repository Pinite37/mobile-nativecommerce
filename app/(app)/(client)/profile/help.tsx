import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Linking,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function HelpScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Données fictives pour les FAQ
  const faqItems = [
    {
      id: 1,
      question: "Comment suivre ma commande ?",
      answer:
        "Vous pouvez suivre votre commande en vous rendant dans la section 'Mes commandes' de votre profil. Cliquez sur la commande que vous souhaitez suivre pour voir son statut en temps réel.",
    },
    {
      id: 2,
      question: "Comment retourner un article ?",
      answer:
        "Pour retourner un article, rendez-vous dans 'Mes commandes', sélectionnez la commande concernée, puis cliquez sur 'Demander un retour'. Remplissez le formulaire et suivez les instructions pour préparer votre colis.",
    },
    {
      id: 3,
      question: "Quels sont les délais de livraison ?",
      answer:
        "Les délais de livraison varient selon votre localisation et le vendeur. En général, comptez 2 à 5 jours ouvrables pour une livraison standard dans les grandes villes, et 5 à 10 jours pour les zones rurales.",
    },
    {
      id: 4,
      question: "Comment contacter un vendeur ?",
      answer:
        "Vous pouvez contacter un vendeur directement depuis la page du produit ou la page de sa boutique en cliquant sur 'Contacter le vendeur'. Un formulaire vous permettra d'envoyer votre message.",
    },
    {
      id: 5,
      question: "Comment modifier mes informations de paiement ?",
      answer:
        "Pour modifier vos informations de paiement, accédez à la section 'Moyens de paiement' de votre profil. Vous pourrez y ajouter, modifier ou supprimer vos méthodes de paiement.",
    },
  ];

  // État pour les FAQ ouvertes
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Toggle FAQ
  const toggleFaq = (id: number) => {
    if (openFaq === id) {
      setOpenFaq(null);
    } else {
      setOpenFaq(id);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      {/* Header avec bouton retour */}
      <View className="bg-white px-4 pt-16 pb-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 justify-center items-center mr-4"
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-quicksand-bold text-neutral-800">
          Aide et support
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* Barre de recherche */}
        <View className="p-4">
          <View className="flex-row items-center bg-white rounded-xl px-4 py-3">
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              className="flex-1 ml-2 font-quicksand"
              placeholder="Rechercher une question"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* FAQ */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4">
            Questions fréquentes
          </Text>
          <View className="bg-white rounded-2xl overflow-hidden">
            {faqItems.map((item) => (
              <View
                key={item.id}
                className={`border-b border-gray-100 ${
                  item.id === faqItems.length ? "border-b-0" : ""
                }`}
              >
                <TouchableOpacity
                  className="flex-row justify-between items-center p-4"
                  onPress={() => toggleFaq(item.id)}
                >
                  <Text className="text-base font-quicksand-medium text-neutral-800 flex-1 pr-4">
                    {item.question}
                  </Text>
                  <Ionicons
                    name={openFaq === item.id ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
                {openFaq === item.id && (
                  <View className="px-4 pb-4">
                    <Text className="text-neutral-600 font-quicksand">
                      {item.answer}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Options de contact */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4">
            Contactez-nous
          </Text>
          <View className="bg-white rounded-2xl overflow-hidden">
            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-gray-100"
              onPress={() => Linking.openURL("mailto:support@marketplace.com")}
            >
              <View
                className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3"
              >
                <Ionicons name="mail-outline" size={20} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-quicksand-medium text-neutral-800">
                  Email
                </Text>
                <Text className="text-sm font-quicksand text-neutral-500">
                  support@marketplace.com
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-gray-100"
              onPress={() => Linking.openURL("tel:+22997123456")}
            >
              <View
                className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3"
              >
                <Ionicons name="call-outline" size={20} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-quicksand-medium text-neutral-800">
                  Téléphone
                </Text>
                <Text className="text-sm font-quicksand text-neutral-500">
                  +229 97 12 34 56
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              className="flex-row items-center p-4"
              onPress={() => {/* Ouvrir le chat */}}
            >
              <View
                className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-3"
              >
                <Ionicons name="chatbubble-outline" size={20} color="#8B5CF6" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-quicksand-medium text-neutral-800">
                  Chat en direct
                </Text>
                <Text className="text-sm font-quicksand text-neutral-500">
                  Disponible de 8h à 20h
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Formulaire de contact */}
        <View className="px-4 mb-8">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4">
            Envoyez-nous un message
          </Text>
          <View className="bg-white rounded-2xl p-4">
            <View className="mb-4">
              <Text className="text-sm font-quicksand-medium text-neutral-600 mb-2">
                Sujet
              </Text>
              <TextInput
                className="border border-gray-200 rounded-xl p-3 font-quicksand"
                placeholder="Sujet de votre message"
              />
            </View>
            <View className="mb-4">
              <Text className="text-sm font-quicksand-medium text-neutral-600 mb-2">
                Message
              </Text>
              <TextInput
                className="border border-gray-200 rounded-xl p-3 font-quicksand h-32"
                placeholder="Décrivez votre problème en détail"
                multiline={true}
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity className="bg-primary py-3 rounded-xl">
              <Text className="text-white text-center font-quicksand-bold">
                Envoyer
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Guides */}
        <View className="px-4 mb-8">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4">
            Guides et tutoriels
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="pb-4"
          >
            <TouchableOpacity className="bg-white rounded-xl mr-3 overflow-hidden w-56">
              <View className="bg-blue-50 h-24 justify-center items-center">
                <Ionicons name="book-outline" size={32} color="#3B82F6" />
              </View>
              <View className="p-3">
                <Text className="text-base font-quicksand-semibold text-neutral-800">
                  Guide d&apos;achat
                </Text>
                <Text className="text-xs font-quicksand text-neutral-500 mt-1">
                  Apprenez à faire vos achats en toute sécurité
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity className="bg-white rounded-xl mr-3 overflow-hidden w-56">
              <View className="bg-amber-50 h-24 justify-center items-center">
                <Ionicons name="shield-checkmark-outline" size={32} color="#F59E0B" />
              </View>
              <View className="p-3">
                <Text className="text-base font-quicksand-semibold text-neutral-800">
                  Sécurité des paiements
                </Text>
                <Text className="text-xs font-quicksand text-neutral-500 mt-1">
                  Tout savoir sur la protection de vos transactions
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity className="bg-white rounded-xl overflow-hidden w-56">
              <View className="bg-green-50 h-24 justify-center items-center">
                <Ionicons name="swap-horizontal-outline" size={32} color="#10B981" />
              </View>
              <View className="p-3">
                <Text className="text-base font-quicksand-semibold text-neutral-800">
                  Retours et remboursements
                </Text>
                <Text className="text-xs font-quicksand text-neutral-500 mt-1">
                  Procédure pour retourner un article
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
