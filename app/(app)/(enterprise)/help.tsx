import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "../../../components/ui/ToastManager";

interface FAQItem {
  question: string;
  answer: string;
  isExpanded: boolean;
}

export default function EnterpriseHelpScreen() {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [faqs, setFaqs] = useState<FAQItem[]>([
    {
      question: "Comment ajouter un nouveau produit ?",
      answer: "Pour ajouter un nouveau produit, accédez à la section 'Mes produits' depuis votre tableau de bord, puis appuyez sur le bouton '+' en haut à droite. Remplissez le formulaire avec les détails du produit et appuyez sur 'Sauvegarder'.",
      isExpanded: false
    },
    {
      question: "Comment gérer mes commandes ?",
      answer: "Vous pouvez gérer toutes vos commandes dans la section 'Commandes'. Vous pouvez accepter, refuser ou marquer les commandes comme expédiées. Vous recevrez également des notifications push pour chaque nouvelle commande.",
      isExpanded: false
    },
    {
      question: "Comment ajouter un partenaire de livraison ?",
      answer: "Pour ajouter un partenaire de livraison, accédez à la section 'Partenaires de livraison' et appuyez sur le bouton '+'. Entrez l'ID du partenaire que vous souhaitez ajouter et confirmez.",
      isExpanded: false
    },
    {
      question: "Comment modifier les informations de mon entreprise ?",
      answer: "Pour modifier les informations de votre entreprise, accédez à la section 'Informations entreprise' depuis votre profil. Vous pourrez y modifier le nom, la description, le logo et les liens sociaux de votre entreprise.",
      isExpanded: false
    },
    {
      question: "Comment activer ou désactiver mon entreprise ?",
      answer: "Vous pouvez activer ou désactiver votre entreprise depuis votre profil. Lorsqu'elle est désactivée, votre entreprise et vos produits ne seront pas visibles aux clients, mais vous pourrez toujours accéder à votre compte et gérer vos données.",
      isExpanded: false
    },
  ]);

  const toggleFAQ = (index: number) => {
    const updatedFAQs = [...faqs];
    updatedFAQs[index].isExpanded = !updatedFAQs[index].isExpanded;
    setFaqs(updatedFAQs);
  };

  const filteredFAQs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactSupport = () => {
    if (!supportMessage.trim()) {
      toast.showWarning('Message requis', 'Veuillez entrer un message avant de soumettre');
      return;
    }

    setIsSubmitting(true);
    // Simulation d'envoi de message
    setTimeout(() => {
      setSupportMessage('');
      setIsSubmitting(false);
      toast.showSuccess('Message envoyé', 'Nous avons bien reçu votre message et vous répondrons dans les plus brefs délais');
    }, 1500);
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+22969852147');
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@nativecommerce.com');
  };

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <View className="flex-row items-center justify-between px-6 py-4 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-quicksand-bold text-neutral-800">
          Aide et support
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Recherche */}
        <View className="px-4 py-6">
          <View className="flex-row items-center bg-white rounded-xl px-3 border border-neutral-200">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher dans l'aide"
              className="flex-1 px-2 py-3 font-quicksand-regular"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Contact rapide */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
            Contact rapide
          </Text>
          <View className="flex-row justify-between">
            <TouchableOpacity 
              onPress={handleCallSupport}
              className="w-[48%] bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 items-center"
            >
              <View className="w-12 h-12 bg-primary-100 rounded-full justify-center items-center mb-2">
                <Ionicons name="call-outline" size={20} color="#FE8C00" />
              </View>
              <Text className="text-neutral-800 font-quicksand-semibold text-center">
                Appeler le support
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleEmailSupport}
              className="w-[48%] bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 items-center"
            >
              <View className="w-12 h-12 bg-success-100 rounded-full justify-center items-center mb-2">
                <Ionicons name="mail-outline" size={20} color="#10B981" />
              </View>
              <Text className="text-neutral-800 font-quicksand-semibold text-center">
                Email au support
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
            Questions fréquentes
          </Text>
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((faq, index) => (
                <View key={index} className="border-b border-neutral-100 last:border-b-0">
                  <TouchableOpacity 
                    className="flex-row items-center justify-between px-4 py-4"
                    onPress={() => toggleFAQ(faqs.indexOf(faq))}
                  >
                    <Text className="flex-1 text-base font-quicksand-medium text-neutral-800">
                      {faq.question}
                    </Text>
                    <Ionicons 
                      name={faq.isExpanded ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>
                  
                  {faq.isExpanded && (
                    <View className="px-4 pb-4">
                      <Text className="text-neutral-600 font-quicksand-regular">
                        {faq.answer}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View className="px-4 py-6 items-center">
                <Ionicons name="search" size={36} color="#D1D5DB" />
                <Text className="text-neutral-500 font-quicksand-medium mt-2 text-center">
                  Aucun résultat trouvé pour &quot;{searchQuery}&quot;
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Formulaire de contact */}
        <View className="px-4 mb-10">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
            Nous contacter
          </Text>
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4">
            <Text className="text-neutral-700 font-quicksand-medium mb-3">
              Décrivez votre problème ou posez-nous une question :
            </Text>
            <View className="mb-4">
              <TextInput
                value={supportMessage}
                onChangeText={setSupportMessage}
                placeholder="Entrez votre message ici..."
                multiline
                numberOfLines={5}
                className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 min-h-[120px] text-neutral-700 font-quicksand-regular"
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity
              onPress={handleContactSupport}
              disabled={isSubmitting || !supportMessage.trim()}
              className={`rounded-xl py-3 flex-row justify-center items-center ${!supportMessage.trim() ? 'bg-neutral-300' : 'bg-primary-500'}`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-quicksand-semibold">
                  Envoyer le message
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Centre d'aide */}
        <View className="px-4 mb-10">
          <View className="bg-primary-100 rounded-2xl p-4">
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-lg font-quicksand-bold text-primary-700 mb-2">
                  Centre d&apos;aide
                </Text>
                <Text className="text-primary-600 font-quicksand-regular mb-4">
                  Consultez notre documentation complète pour en savoir plus sur l&apos;utilisation de NativeCommerce Business.
                </Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://docs.nativecommerce.com')}
                  className="bg-primary-500 rounded-lg py-2 px-3 self-start"
                >
                  <Text className="text-white font-quicksand-semibold">
                    Consulter la documentation
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="ml-4">
                <Ionicons name="book-outline" size={50} color="#FE8C00" />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
