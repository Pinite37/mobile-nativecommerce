import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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

export default function ClientMessagesPage() {
    const router = useRouter();
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
            console.log('Raw conversationsData:', JSON.stringify(conversationsData, null, 2)); // Debug API response
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
    function ConversationCard({ conversation }: { conversation: Conversation }) {
        // Déterminer le participant non-utilisateur avec vérification
        const otherParticipant = conversation.otherParticipant ||
            (conversation.participants?.find(p => p._id !== conversation.userId) || null);

        // Formater l'heure du dernier message avec fallback
        let lastMessageTime: string = 'N/A';
        try {
            lastMessageTime = conversation.lastMessage
                ? MessagingService.formatMessageTime(
                    conversation.lastMessage.sentAt ||
                    (conversation.lastMessage as any).createdAt ||
                    conversation.lastActivity ||
                    new Date().toISOString()
                )
                : MessagingService.formatMessageTime(
                    conversation.lastActivity || new Date().toISOString()
                );
            if (typeof lastMessageTime !== 'string') {
                console.warn('lastMessageTime n\'est pas une string:', lastMessageTime);
                lastMessageTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            }
        } catch (error) {
            console.error('Erreur formatMessageTime:', error);
            lastMessageTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        }

        // Obtenir un aperçu du dernier message avec fallback
        let messagePreview: string = 'Nouvelle conversation';
        try {
            messagePreview = conversation.lastMessage
                ? (MessagingService.getMessagePreview(conversation.lastMessage) || 'Aucun message')
                : 'Nouvelle conversation';
            if (typeof messagePreview !== 'string') {
                console.warn('messagePreview n\'est pas une string:', messagePreview);
                messagePreview = 'Aucun message';
            }
        } catch (error) {
            console.error('Erreur getMessagePreview:', error);
            messagePreview = 'Aucun message';
        }

        // Vérifier que otherParticipant existe avant d'appeler formatParticipantName
        let participantName: string = 'Utilisateur inconnu';
        try {
            participantName = otherParticipant
                ? (MessagingService.formatParticipantName(otherParticipant) || 'Utilisateur inconnu')
                : 'Utilisateur inconnu';
            if (typeof participantName !== 'string') {
                console.warn('participantName n\'est pas une string:', participantName);
                participantName = 'Utilisateur inconnu';
            }
        } catch (error) {
            console.error('Erreur formatParticipantName:', error);
            participantName = 'Utilisateur inconnu';
        }

        // Debug logs pour inspecter les valeurs
        console.log('ConversationCard Debug:', {
            conversationId: conversation._id,
            otherParticipant,
            participantName,
            participantNameType: typeof participantName,
            lastMessageTime,
            lastMessageTimeType: typeof lastMessageTime,
            messagePreview,
            messagePreviewType: typeof messagePreview,
            product: conversation.product,
            productName: conversation.product?.name,
            productNameType: conversation.product?.name ? typeof conversation.product.name : 'undefined',
        });

        // Vérifier que le rendu JSX est valide
        console.log('ConversationCard Rendering:', {
            participantName,
            lastMessageTime,
            messagePreview,
            productName: conversation.product?.name,
            unreadCount: conversation.unreadCount,
            unreadCountType: typeof conversation.unreadCount,
        });

        const isUnread = (conversation.unreadCount && conversation.unreadCount > 0);

        return (
            <TouchableOpacity
                className={`rounded-xl mx-4 my-2 p-4 shadow-sm border border-neutral-100 active:opacity-70 ${isUnread ? 'bg-primary-50' : 'bg-white'}`}
                onPress={() => {
                    console.log('Navigating to conversation:', conversation._id); // Debug navigation
                    router.push(`/(app)/(client)/conversation/${conversation._id}`);
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
                        {isUnread ? (
                            <View className="absolute -top-1 -right-1 bg-primary-500 rounded-full min-w-6 h-6 justify-center items-center px-2">
                                <Text className="text-white text-xs font-quicksand-bold">
                                    {conversation.unreadCount > 99 ? '99+' : String(conversation.unreadCount)}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Informations de la conversation */}
                    <View className="ml-4 flex-1">
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-lg font-quicksand-semibold text-neutral-800" numberOfLines={1}>
                                {participantName}
                            </Text>
                            <Text className="text-xs text-neutral-200 font-quicksand-medium">
                                {lastMessageTime}
                            </Text>
                        </View>

                        {/* Produit concerné */}
                        <View className="flex-row items-center mb-2">
                            {conversation.product?.images?.[0] ? (
                                <Image
                                    source={{ uri: conversation.product.images[0] }}
                                    className="w-6 h-6 rounded-lg mr-2"
                                    resizeMode="cover"
                                />
                            ) : (
                                <Ionicons name="cube-outline" size={14} color="#9CA3AF" />
                            )}
                            <Text className="text-sm text-neutral-600 font-quicksand-medium" numberOfLines={1}>
                                {(conversation.product?.name && conversation.product?.price)
                                    ? `${String(conversation.product.name)} • ${formatPrice(conversation.product.price)}`
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
    }

    const baseConversations = searchQuery.trim().length >= 2 ? searchResults : conversations;
    const displayedConversations = showUnreadOnly
        ? baseConversations.filter(c => (c.unreadCount ?? 0) > 0)
        : baseConversations;

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
            <LinearGradient colors={['#FE8C00', '#FFAB38']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="px-6 py-6 pt-20 rounded-b-3xl">
                <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-3xl font-quicksand-bold text-white">
                        Messages
                    </Text>
                    <TouchableOpacity
                        className="w-12 h-12 bg-white/90 rounded-full justify-center items-center shadow-sm"
                        onPress={() => router.push('/(app)/(client)/(tabs)/')}
                    >
                        <Ionicons name="add" size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                {/* Barre de recherche */}
                <View className="relative bg-white rounded-2xl shadow-lg">
                    <View className="absolute left-4 top-3 z-10">
                        <Ionicons name="search" size={22} color="#9CA3AF" />
                    </View>
                    <TextInput
                        value={searchQuery}
                        onChangeText={handleSearch}
                        placeholder="Rechercher une conversation..."
                        className="bg-white rounded-2xl pl-12 pr-12 py-3 text-neutral-800 font-quicksand-medium text-base"
                        placeholderTextColor="#9CA3AF"
                    />
                    <View className="absolute right-3 top-3 flex-row items-center">
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => {
                                    setSearchQuery('');
                                    setSearchResults([]);
                                }}
                                className="mr-2"
                            >
                                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                        {searching && (
                            <ActivityIndicator size="small" color="#FE8C00" />
                        )}
                    </View>
                </View>

                {/* Filtres rapides */}
                <View className="flex-row mt-3">
                    <TouchableOpacity
                        onPress={() => setShowUnreadOnly(false)}
                        className={`px-3 py-1.5 rounded-full mr-2 ${!showUnreadOnly ? 'bg-white' : 'bg-white/30'}`}
                    >
                        <Text className={`text-xs font-quicksand-semibold ${!showUnreadOnly ? 'text-primary-600' : 'text-white'}`}>
                            Tous ({conversations.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setShowUnreadOnly(true)}
                        className={`px-3 py-1.5 rounded-full ${showUnreadOnly ? 'bg-white' : 'bg-white/30'}`}
                    >
                        <Text className={`text-xs font-quicksand-semibold ${showUnreadOnly ? 'text-primary-600' : 'text-white'}`}>
                            Non lus ({conversations.filter(c => (c.unreadCount ?? 0) > 0).length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Liste des conversations */}
            <FlatList
                data={displayedConversations}
                renderItem={({ item }) => {
                    console.log('FlatList renderItem:', item._id); // Debug FlatList rendering
                    return <ConversationCard conversation={item} />;
                }}
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
                    <View className="flex-1 justify-center items-center py-20 px-6">
                        <View className="bg-neutral-50 rounded-full w-24 h-24 justify-center items-center mb-6 shadow-sm">
                            <Ionicons name="chatbubbles-outline" size={40} color="#9CA3AF" />
                        </View>
                        <Text className="text-xl font-quicksand-bold text-neutral-600 mb-3">
                            {searchQuery.trim().length >= 2
                                ? 'Aucun résultat trouvé'
                                : 'Aucune conversation'}
                        </Text>
                        <Text className="text-neutral-500 font-quicksand-medium text-center mb-6">
                            {searchQuery.trim().length >= 2
                                ? `Aucune conversation trouvée pour "${searchQuery}"`
                                : 'Vos conversations avec les vendeurs apparaîtront ici'}
                        </Text>
                        {(searchQuery.trim().length === 0) ? (
                            <TouchableOpacity
                                className="bg-primary-500 rounded-2xl px-8 py-4 shadow-sm active:opacity-70"
                                onPress={() => router.push('/(app)/(client)/(tabs)/')}
                            >
                                <Text className="text-white font-quicksand-semibold text-base">
                                    Explorer les produits
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                }
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingTop: 16,
                    paddingBottom: 32,
                }}
            />
        </SafeAreaView>
    );
}