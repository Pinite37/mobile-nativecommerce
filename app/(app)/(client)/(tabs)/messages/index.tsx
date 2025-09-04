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

export default function ClientMessagesPage() {
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

    // Abonnements MQTT pour mise à jour temps réel (aligné sur enterprise)
    useEffect(() => {
        const handleNewMessageNotification = (data: any) => {
            try {
                if (!data?.conversation || !data?.message) return;
                setConversations(prev => prev.map(conv => {
                    if (conv._id === data.conversation._id) {
                        return {
                            ...conv,
                            unreadCount: (conv.unreadCount || 0) + 1,
                            lastMessage: data.message,
                            lastActivity: new Date().toISOString()
                        } as any;
                    }
                    return conv;
                }));
                setSearchResults(prev => prev.map(conv => {
                    if (conv._id === data.conversation._id) {
                        return {
                            ...conv,
                            unreadCount: (conv.unreadCount || 0) + 1,
                            lastMessage: data.message,
                            lastActivity: new Date().toISOString()
                        } as any;
                    }
                    return conv;
                }));
            } catch (e) {
                console.warn('⚠️ MQTT client messages new_message handler error:', e);
            }
        };

        const handleMessagesRead = (data: any) => {
            try {
                if (!data?.conversationId) return;
                setConversations(prev => prev.map(conv => {
                    if (conv._id === data.conversationId) {
                        return {
                            ...conv,
                            unreadCount: Math.max(0, (conv.unreadCount || 0) - (data.readCount || 0))
                        } as any;
                    }
                    return conv;
                }));
                setSearchResults(prev => prev.map(conv => {
                    if (conv._id === data.conversationId) {
                        return {
                            ...conv,
                            unreadCount: Math.max(0, (conv.unreadCount || 0) - (data.readCount || 0))
                        } as any;
                    }
                    return conv;
                }));
            } catch (e) {
                console.warn('⚠️ MQTT client messages messages_read handler error:', e);
            }
        };

        onNewMessage(handleNewMessageNotification);
        onMessagesRead(handleMessagesRead);
        return () => {
            offNewMessage(handleNewMessageNotification);
            offMessagesRead(handleMessagesRead);
        };
    }, [onNewMessage, onMessagesRead, offNewMessage, offMessagesRead]);

    // Composant pour une conversation
    function ConversationCard({ conversation }: { conversation: Conversation }) {
        // Déterminer le participant non-utilisateur avec vérification
        const otherParticipant = conversation.otherParticipant ||
            (conversation.participants?.find(p => (p as any)?._id !== (conversation as any)?.userId) || null);

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
                                    {(conversation.unreadCount || 0) > 99 ? '99+' : String(conversation.unreadCount || 0)}
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
                {/* Header */}
                <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="px-6 py-6 pt-20 rounded-b-3xl">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-3xl font-quicksand-bold text-white">
                            Messages
                        </Text>
                        <TouchableOpacity
                            className="w-12 h-12 bg-white/90 rounded-full justify-center items-center shadow-sm"
                            onPress={() => router.push('/')}
                        >
                            <Ionicons name="add" size={20} color="#10B981" />
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
            {/* Header */}
            <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="px-6 py-6 pt-20 rounded-b-3xl">
                <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-3xl font-quicksand-bold text-white">
                        Messages
                    </Text>
                    <TouchableOpacity
                        className="w-12 h-12 bg-white/90 rounded-full justify-center items-center shadow-sm"
                        onPress={() => router.push('/')}
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
                            <ActivityIndicator size="small" color="#10B981" />
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
                        colors={['#10B981']}
                        tintColor="#10B981"
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
            {searchQuery.trim().length === 0 ? (
                            <TouchableOpacity
                                className="bg-primary-500 rounded-2xl px-8 py-4 shadow-sm active:opacity-70"
                onPress={() => router.push('/')}
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