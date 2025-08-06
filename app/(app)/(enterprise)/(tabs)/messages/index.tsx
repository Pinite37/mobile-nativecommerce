import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MessagingService, { Conversation } from "../../../../../services/api/MessagingService";

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [searching, setSearching] = useState(false);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const conversationsData = await MessagingService.getUserConversations();
      setConversations(conversationsData || []);
      console.log("✅ Conversations chargées:", (conversationsData || []).length);
    } catch (error) {
      console.error('❌ Erreur chargement conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    
    try {
      setSearching(true);
      const results = await MessagingService.searchConversations(query.trim());
      setSearchResults(results || []);
    } catch (error) {
      console.error('❌ Erreur recherche conversations:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  // Charger les conversations au focus de la page
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  // Composant pour une conversation
  const ConversationCard = ({ conversation }: { conversation: Conversation }) => {
    // L'API retourne déjà otherParticipant, sinon on prend le premier participant différent
    const otherParticipant = conversation.otherParticipant || conversation.participants[0];

    const lastMessageTime = conversation.lastMessage 
      ? MessagingService.formatMessageTime(conversation.lastMessage.sentAt || (conversation.lastMessage as any).createdAt)
      : MessagingService.formatMessageTime(conversation.lastActivity);

    const messagePreview = conversation.lastMessage 
      ? MessagingService.getMessagePreview(conversation.lastMessage)
      : 'Nouvelle conversation';

    return (
      <TouchableOpacity 
        className="bg-white border-b border-neutral-100 px-4 py-4"
        onPress={() => {
          router.push(`/(app)/(enterprise)/conversation/${conversation._id}` as any);
        }}
      >
        <View className="flex-row items-center">
          {/* Photo de profil */}
          <View className="relative">
            {otherParticipant?.profileImage ? (
              <Image
                source={{ uri: otherParticipant.profileImage }}
                className="w-12 h-12 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-12 h-12 bg-primary-100 rounded-full justify-center items-center">
                <Ionicons 
                  name={otherParticipant?.role === 'ENTERPRISE' ? "business" : "person"} 
                  size={20} 
                  color="#FE8C00" 
                />
              </View>
            )}
            
            {/* Badge de messages non lus */}
            {conversation.unreadCount && conversation.unreadCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-primary-500 rounded-full min-w-5 h-5 justify-center items-center px-1">
                <Text className="text-white text-xs font-quicksand-bold">
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </Text>
              </View>
            )}
          </View>

          {/* Informations de la conversation */}
          <View className="ml-3 flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-base font-quicksand-semibold text-neutral-800" numberOfLines={1}>
                {otherParticipant 
                  ? MessagingService.formatParticipantName(otherParticipant)
                  : 'Utilisateur inconnu'}
              </Text>
              <Text className="text-xs text-neutral-500">
                {lastMessageTime}
              </Text>
            </View>
            
            {/* Produit concerné */}
            <View className="flex-row items-center mb-2">
              <Ionicons name="cube-outline" size={12} color="#9CA3AF" />
              <Text className="text-xs text-neutral-600 ml-1" numberOfLines={1}>
                {conversation.product.name} • {formatPrice(conversation.product.price)}
              </Text>
            </View>
            
            {/* Dernier message */}
            <Text 
              className={`text-sm ${
                conversation.unreadCount && conversation.unreadCount > 0
                  ? 'text-neutral-800 font-quicksand-medium' 
                  : 'text-neutral-600 font-quicksand-regular'
              }`}
              numberOfLines={2}
            >
              {messagePreview}
            </Text>
          </View>

          {/* Indicateur */}
          <View className="ml-2">
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const displayedConversations = searchQuery.trim().length >= 2 ? searchResults : conversations;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FE8C00" />
          <Text className="mt-4 text-neutral-600 font-quicksand-medium">
            Chargement des conversations...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 py-4 pt-16 bg-white border-b border-neutral-100">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-quicksand-bold text-neutral-800">
            Messages
          </Text>
          <TouchableOpacity className="w-10 h-10 bg-neutral-100 rounded-full justify-center items-center">
            <Ionicons name="add" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Barre de recherche */}
        <View className="relative">
          <View className="absolute left-3 top-3 z-10">
            <Ionicons name="search" size={20} color="#9CA3AF" />
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Rechercher une conversation..."
            className="bg-neutral-50 rounded-2xl pl-10 pr-4 py-3 text-neutral-800 font-quicksand-medium"
            placeholderTextColor="#9CA3AF"
          />
          {searching && (
            <View className="absolute right-3 top-3">
              <ActivityIndicator size="small" color="#FE8C00" />
            </View>
          )}
        </View>
      </View>

      {/* Liste des conversations */}
      <FlatList
        data={displayedConversations}
        renderItem={({ item }) => <ConversationCard conversation={item} />}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FE8C00']}
            tintColor="#FE8C00"
          />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <View className="bg-neutral-50 rounded-full w-20 h-20 justify-center items-center mb-4">
              <Ionicons name="chatbubbles-outline" size={32} color="#9CA3AF" />
            </View>
            <Text className="text-lg font-quicksand-bold text-neutral-600 mb-2">
              {searchQuery.trim().length >= 2 
                ? 'Aucun résultat trouvé' 
                : 'Aucune conversation'}
            </Text>
            <Text className="text-neutral-500 font-quicksand-medium text-center px-6">
              {searchQuery.trim().length >= 2 
                ? `Aucune conversation trouvée pour "${searchQuery}"`
                : 'Vos conversations avec les vendeurs apparaîtront ici'}
            </Text>
            {searchQuery.trim().length === 0 && (
              <TouchableOpacity 
                className="mt-6 bg-primary-500 rounded-2xl px-6 py-3"
                onPress={() => router.push('/(app)/(enterprise)/(tabs)/' as any)}
              >
                <Text className="text-white font-quicksand-semibold">
                  Explorer les produits
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={{ 
          flexGrow: 1,
          paddingBottom: 20 
        }}
      />
    </SafeAreaView>
  );
}
