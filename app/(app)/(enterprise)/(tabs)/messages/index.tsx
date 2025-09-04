import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMQTT } from "../../../../../hooks/useMQTT";
import MessagingService, { Conversation } from "../../../../../services/api/MessagingService";

export default function MessagesPage() {
  const router = useRouter();
  const { onNewMessage, onMessagesRead, offNewMessage, offMessagesRead } = useMQTT();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [searching, setSearching] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

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

  // === GESTION MQTT ===
  React.useEffect(() => {
    const setupMQTTConnection = async () => {
      try {
        // Le client MQTT est géré par le hook useMQTT dans les composants de conversation
        // Ici on configure juste les listeners pour les notifications de messages

        // Écouter les nouveaux messages (notifications)
        const handleNewMessageNotification = (data: any) => {
          console.log('🔔 Nouvelle notification de message:', data);

          // Mettre à jour le compteur de messages non lus pour la conversation
          setConversations(prev => prev.map(conv => {
            if (conv._id === data.conversation._id) {
              return {
                ...conv,
                unreadCount: (conv.unreadCount || 0) + 1,
                lastMessage: data.message,
                lastActivity: new Date().toISOString()
              };
            }
            return conv;
          }));

          // Mettre à jour aussi les résultats de recherche si applicable
          setSearchResults(prev => prev.map(conv => {
            if (conv._id === data.conversation._id) {
              return {
                ...conv,
                unreadCount: (conv.unreadCount || 0) + 1,
                lastMessage: data.message,
                lastActivity: new Date().toISOString()
              };
            }
            return conv;
          }));
        };

        // Écouter les messages marqués comme lus
        const handleMessagesRead = (data: any) => {
          console.log('👁️ Messages marqués comme lus:', data);

          // Mettre à jour le compteur de messages non lus
          setConversations(prev => prev.map(conv => {
            if (conv._id === data.conversationId) {
              return {
                ...conv,
                unreadCount: Math.max(0, (conv.unreadCount || 0) - data.readCount)
              };
            }
            return conv;
          }));

          setSearchResults(prev => prev.map(conv => {
            if (conv._id === data.conversationId) {
              return {
                ...conv,
                unreadCount: Math.max(0, (conv.unreadCount || 0) - data.readCount)
              };
            }
            return conv;
          }));
        };

        // S'abonner aux événements MQTT via le hook
        onNewMessage(handleNewMessageNotification);
        onMessagesRead(handleMessagesRead);

        // Cleanup function
        return () => {
          offNewMessage(handleNewMessageNotification);
          offMessagesRead(handleMessagesRead);
        };

      } catch (error) {
        console.error('❌ Erreur setup MQTT dans messages:', error);
      }
    };

    const cleanup = setupMQTTConnection();

    // Cleanup lors du démontage du composant
    return () => {
      cleanup.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [onNewMessage, onMessagesRead, offNewMessage, offMessagesRead]);

  // Composant pour une conversation
  const ConversationCard = ({ conversation }: { conversation: Conversation }) => {
    // L'API retourne déjà otherParticipant, sinon on prend le premier participant différent
    const otherParticipant = conversation?.otherParticipant || conversation?.participants?.[0];

    const lastMessageTime = conversation?.lastMessage
      ? MessagingService.formatMessageTime(conversation.lastMessage.sentAt || (conversation.lastMessage as any).createdAt)
      : conversation?.lastActivity ? MessagingService.formatMessageTime(conversation.lastActivity) : '';

    const messagePreview = conversation?.lastMessage
      ? MessagingService.getMessagePreview(conversation.lastMessage) || ''
      : 'Nouvelle conversation';

    const isUnread = Boolean(conversation?.unreadCount && conversation.unreadCount > 0);
    const unreadCount = Number(conversation?.unreadCount) || 0;

    return (
      <TouchableOpacity
        className={`rounded-xl mx-4 my-2 p-4 shadow-sm border border-neutral-100 active:opacity-70 ${isUnread ? 'bg-primary-50' : 'bg-white'}`}
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
                className="w-14 h-14 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-14 h-14 bg-primary-100 rounded-full justify-center items-center">
                <Ionicons
                  name={otherParticipant?.role === 'ENTERPRISE' ? "business" : "person"}
                  size={24}
                  color="#FE8C00"
                />
              </View>
            )}

            {/* Badge de messages non lus */}
            {isUnread && (
              <View className="absolute -top-1 -right-1 bg-primary-500 rounded-full min-w-6 h-6 justify-center items-center px-2">
                <Text className="text-white text-xs font-quicksand-bold">
                  {unreadCount > 99 ? '99+' : unreadCount.toString()}
                </Text>
              </View>
            )}
          </View>

          {/* Informations de la conversation */}
          <View className="ml-4 flex-1">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-quicksand-semibold text-neutral-800" numberOfLines={1}>
                {otherParticipant
                  ? (MessagingService.formatParticipantName(otherParticipant) || 'Utilisateur inconnu')
                  : 'Utilisateur inconnu'}
              </Text>
              <Text className="text-xs text-neutral-500">
                {String(lastMessageTime)}
              </Text>
            </View>

            {/* Produit concerné */}
            <View className="flex-row items-center mb-2">
              {conversation?.product?.images?.[0] ? (
                <Image
                  source={{ uri: conversation.product.images[0] }}
                  className="w-6 h-6 rounded-lg mr-2"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="cube-outline" size={14} color="#9CA3AF" />
              )}
              <Text className="text-sm text-neutral-600 font-quicksand-medium" numberOfLines={1}>
                {conversation?.product?.name && conversation?.product?.price
                  ? `${String(conversation.product.name)} • ${formatPrice(Number(conversation.product.price))}`
                  : 'Produit inconnu'}
              </Text>
            </View>

            {/* Dernier message */}
            <Text
              className={`text-sm ${isUnread ? 'text-neutral-800 font-quicksand-semibold' : 'text-neutral-600 font-quicksand-regular'}`}
              numberOfLines={2}
            >
              {String(messagePreview)}
            </Text>
          </View>

          {/* Indicateur */}
          <View className="ml-2">
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const displayedConversations = searchQuery.trim().length >= 2 
    ? searchResults 
    : showUnreadOnly 
      ? conversations.filter(conv => (conv.unreadCount || 0) > 0)
      : conversations;

  // Skeleton Loader Component
  const ShimmerBlock = ({ style }: { style?: any }) => {
    const shimmer = React.useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }, [shimmer]);
    const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-150, 150] });
    return (
      <View style={[{ backgroundColor: '#E5E7EB', overflow: 'hidden' }, style]}>
        <Animated.View style={{
          position: 'absolute', top: 0, bottom: 0, width: 120,
          transform: [{ translateX }],
          backgroundColor: 'rgba(255,255,255,0.35)',
          opacity: 0.7,
        }} />
      </View>
    );
  };

  const SkeletonCard = () => (
    <View className="rounded-xl mx-4 my-2 p-4 shadow-sm border border-neutral-100 bg-white">
      <View className="flex-row items-center">
        {/* Avatar skeleton */}
        <ShimmerBlock style={{ width: 56, height: 56, borderRadius: 28 }} />

        {/* Content skeleton */}
        <View className="ml-4 flex-1">
          <View className="flex-row items-center justify-between mb-2">
            <ShimmerBlock style={{ height: 18, borderRadius: 8, width: '60%' }} />
            <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '20%' }} />
          </View>

          {/* Product info skeleton */}
          <View className="flex-row items-center mb-2">
            <ShimmerBlock style={{ width: 24, height: 24, borderRadius: 6, marginRight: 8 }} />
            <ShimmerBlock style={{ height: 14, borderRadius: 6, width: '70%' }} />
          </View>

          {/* Message preview skeleton */}
          <ShimmerBlock style={{ height: 14, borderRadius: 6, width: '85%', marginBottom: 4 }} />
          <ShimmerBlock style={{ height: 14, borderRadius: 6, width: '60%' }} />
        </View>

        {/* Chevron skeleton */}
        <View className="ml-2">
          <ShimmerBlock style={{ width: 18, height: 18, borderRadius: 2 }} />
        </View>
      </View>
    </View>
  );

  const renderSkeletons = () => {
    return (
      <FlatList
        data={Array.from({ length: 6 }).map((_, i) => i.toString())}
        renderItem={() => <SkeletonCard />}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar backgroundColor="#10B981" barStyle="light-content" />
        {/* Header avec gradient */}
        <LinearGradient
          colors={['#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="px-6 py-4 pt-16"
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-quicksand-bold text-white">
              Messages
            </Text>
            <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full justify-center items-center">
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Barre de recherche skeleton */}
          <View className="relative mb-4">
            <View className="absolute left-3 top-3 z-10">
              <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" />
            </View>
            <View className="bg-white/20 rounded-2xl pl-10 pr-4 py-3">
              <ShimmerBlock style={{ height: 16, borderRadius: 6, width: '100%' }} />
            </View>
          </View>

          {/* Bouton de filtrage skeleton */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center px-4 py-2 rounded-full bg-white/20">
              <Ionicons
                name="mail-unread"
                size={16}
                color="white"
                style={{ marginRight: 8 }}
              />
              <ShimmerBlock style={{ height: 14, borderRadius: 6, width: 120 }} />
            </View>

            <ShimmerBlock style={{ height: 14, borderRadius: 6, width: 80 }} />
          </View>
        </LinearGradient>

        {/* Conteneur du contenu avec fond blanc */}
        <View className="flex-1 bg-white">
          {renderSkeletons()}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar backgroundColor="#10B981" barStyle="light-content" />
      {/* Header avec gradient */}
      <LinearGradient
        colors={['#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="px-6 py-4 pt-16"
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-quicksand-bold text-white">
            Messages
          </Text>
          <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full justify-center items-center">
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Barre de recherche */}
        <View className="relative mb-4">
          <View className="absolute left-3 top-3 z-10">
            <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" />
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Rechercher une conversation..."
            className="bg-white/20 rounded-2xl pl-10 pr-4 py-3 text-white font-quicksand-medium"
            placeholderTextColor="rgba(255,255,255,0.7)"
          />
          {searching && (
            <View className="absolute right-3 top-3">
              <ActivityIndicator size="small" color="white" />
            </View>
          )}
        </View>

        {/* Bouton de filtrage */}
        <View className="flex-row justify-between items-center">
          <TouchableOpacity
            onPress={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`flex-row items-center px-4 py-2 rounded-full ${
              showUnreadOnly ? 'bg-white/30' : 'bg-white/20'
            }`}
          >
            <Ionicons
              name="mail-unread"
              size={16}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text className="text-white font-quicksand-medium text-sm">
              {showUnreadOnly ? 'Toutes les conversations' : 'Non lus seulement'}
            </Text>
          </TouchableOpacity>

          <Text className="text-white/80 font-quicksand-medium text-sm">
            {displayedConversations.length} conversation{displayedConversations.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </LinearGradient>

      {/* Conteneur du contenu avec fond blanc */}
      <View className="flex-1 bg-white">
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
            paddingBottom: 20 }}
          >
        </FlatList>
      </View>
    </SafeAreaView>
  );
}