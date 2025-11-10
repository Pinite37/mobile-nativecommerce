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
import { useToast } from "../../../../../components/ui/ReanimatedToast/context";
import { useSocket } from "../../../../../hooks/useSocket";
import MessagingService, { Conversation } from "../../../../../services/api/MessagingService";

export default function ClientMessagesPage() {
    const router = useRouter();
    const { onNewMessage, onMessagesRead } = useSocket();
    const { showToast } = useToast();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Conversation[]>([]);
    const [searching, setSearching] = useState(false);
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);

    // États pour le menu contextuel
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [contextMenuLoading, setContextMenuLoading] = useState(false);

    // Fonctions helper pour les notifications
    const notifySuccess = React.useCallback((title: string, message?: string) => {
        try { showToast({ title, subtitle: message, autodismiss: true }); } catch {}
    }, [showToast]);

    const notifyError = React.useCallback((title: string, message?: string) => {
        try { showToast({ title, subtitle: message, autodismiss: true }); } catch {}
    }, [showToast]);

    const notifyInfo = React.useCallback((title: string, message?: string) => {
        try { showToast({ title, subtitle: message, autodismiss: true }); } catch {}
    }, [showToast]);

    // Fonction utilitaire pour classifier les erreurs
    const classifyError = (error: any) => {
        // Erreurs réseau
        if (error.message?.includes('Network') || error.message?.includes('fetch') || error.code === 'NETWORK_ERROR') {
            return {
                type: 'network',
                title: 'Problème de connexion',
                message: 'Vérifiez votre connexion internet et réessayez.',
                userMessage: 'Problème de connexion réseau. Vérifiez votre connexion internet.'
            };
        }

        // Erreurs de serveur (5xx)
        if (error.status >= 500 || error.message?.includes('Server') || error.message?.includes('500')) {
            return {
                type: 'server',
                title: 'Erreur serveur',
                message: 'Le serveur rencontre des difficultés. Veuillez réessayer plus tard.',
                userMessage: 'Service temporairement indisponible. Réessayez dans quelques instants.'
            };
        }

        // Erreurs d'authentification (401, 403)
        if (error.status === 401 || error.status === 403 || error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
            return {
                type: 'auth',
                title: 'Authentification requise',
                message: 'Votre session a expiré. Veuillez vous reconnecter.',
                userMessage: 'Session expirée. Veuillez vous reconnecter.'
            };
        }

        // Erreurs de validation (400)
        if (error.status === 400 || error.message?.includes('Validation') || error.message?.includes('Bad Request')) {
            return {
                type: 'validation',
                title: 'Données invalides',
                message: 'Les informations fournies ne sont pas valides.',
                userMessage: 'Informations invalides. Vérifiez vos données.'
            };
        }

        // Erreurs de ressource non trouvée (404)
        if (error.status === 404 || error.message?.includes('Not Found')) {
            return {
                type: 'not_found',
                title: 'Ressource introuvable',
                message: 'L\'élément demandé n\'existe pas ou a été supprimé.',
                userMessage: 'Élément introuvable ou supprimé.'
            };
        }

        // Erreur par défaut
        return {
            type: 'unknown',
            title: 'Erreur',
            message: error.message || 'Une erreur inattendue s\'est produite.',
            userMessage: 'Une erreur inattendue s\'est produite. Veuillez réessayer.'
        };
    };

    const loadConversations = useCallback(async () => {
        try {
            setLoading(true);
            const conversationsData = await MessagingService.getUserConversations();
            console.log('Raw conversationsData:', JSON.stringify(conversationsData, null, 2)); // Debug API response
            setConversations(conversationsData || []);
            console.log("✅ Conversations chargées:", (conversationsData || []).length);
        } catch (error: any) {
            console.error('❌ Erreur chargement conversations:', error);
            setConversations([]);
            
            // Classifier l'erreur et notifier l'utilisateur
            const errorInfo = classifyError(error);
            notifyError(errorInfo.title, errorInfo.message);
            
            // Pour les erreurs d'authentification, rediriger vers la connexion
            if (errorInfo.type === 'auth') {
                setTimeout(() => {
                    router.replace('/(auth)/welcome');
                }, 2000);
            }
        } finally {
            setLoading(false);
        }
    }, [notifyError, router]);

    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);

        if (query.trim().length < 2) {
            setSearchResults([]);
            setSearching(false);
            return;
        }

        try {
            setSearching(true);
            // Rechercher dans les conversations locales (déjà filtrées)
            const lowerQuery = query.trim().toLowerCase();
            const filtered = conversations.filter(conv => {
                // Rechercher dans le nom du participant
                const otherParticipant = conv.otherParticipant || 
                    conv.participants?.find(p => (p as any)?._id !== (conv as any)?.userId);
                const participantName = otherParticipant 
                    ? `${otherParticipant.firstName} ${otherParticipant.lastName}`.toLowerCase()
                    : '';
                
                // Rechercher dans le nom du produit
                const productName = (conv.product?.name || '').toLowerCase();
                
                // Rechercher dans le dernier message
                const lastMessageText = (conv.lastMessage?.text || '').toLowerCase();
                
                return participantName.includes(lowerQuery) || 
                       productName.includes(lowerQuery) || 
                       lastMessageText.includes(lowerQuery);
            });
            setSearchResults(filtered);
        } catch (error) {
            console.error('❌ Erreur recherche conversations:', error);
            setSearchResults([]);
            // Pour les erreurs de recherche, on affiche un message discret
            notifyInfo('Erreur de recherche', 'Impossible de filtrer les conversations pour le moment.');
        } finally {
            setSearching(false);
        }
    }, [conversations, notifyInfo]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadConversations();
        setRefreshing(false);
    };

    // Gestion du menu contextuel
    const handleLongPress = (conversation: Conversation) => {
        console.log('🔵 Long press sur conversation:', conversation._id);
        setSelectedConversation(conversation);
        setContextMenuVisible(true);
    };

    const handleArchiveConversation = () => {
        console.log('📁 Archive conversation (pas encore implémenté):', selectedConversation?._id);
        setContextMenuVisible(false);
        setSelectedConversation(null);
        // TODO: Implémenter l'archivage plus tard
    };

    const handleDeleteConversation = useCallback(async () => {
        if (!selectedConversation) return;

        console.log('🗑️ Suppression conversation:', selectedConversation._id);
        setContextMenuLoading(true);

        try {
            await MessagingService.deleteConversation(selectedConversation._id);

            // Retirer la conversation de la liste localement
            setConversations(prev => prev.filter(conv => conv._id !== selectedConversation._id));
            setSearchResults(prev => prev.filter(conv => conv._id !== selectedConversation._id));

            console.log('✅ Conversation supprimée avec succès');
            notifySuccess('Conversation supprimée', 'La conversation a été supprimée avec succès.');
            setContextMenuVisible(false);
            setSelectedConversation(null);

        } catch (error: any) {
            console.error('❌ Erreur suppression conversation:', error);
            
            // Classifier l'erreur et notifier l'utilisateur
            const errorInfo = classifyError(error);
            notifyError(errorInfo.title, errorInfo.message);
            
            // Pour les erreurs d'authentification, rediriger vers la connexion
            if (errorInfo.type === 'auth') {
                setTimeout(() => {
                    router.replace('/(auth)/welcome');
                }, 2000);
            }
        } finally {
            setContextMenuLoading(false);
        }
    }, [selectedConversation, notifySuccess, notifyError, router]);

    const closeContextMenu = () => {
        setContextMenuVisible(false);
        setSelectedConversation(null);
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
    };

    // Charger les conversations au focus de la page
    useFocusEffect(
        useCallback(() => {
            loadConversations();
        }, [loadConversations])
    );

    // Abonnements Socket.IO pour mise à jour temps réel
    useEffect(() => {
        const cleanupNewMessage = onNewMessage((data: any) => {
            try {
                if (!data?.conversation || !data?.message) {
                    console.warn('⚠️ Socket.IO new_message: données invalides', data);
                    return;
                }
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
                console.error('❌ Erreur critique Socket.IO new_message:', e);
                notifyError('Erreur de synchronisation', 'Impossible de mettre à jour les messages. Rechargez la page.');
            }
        });

        const cleanupMessagesRead = onMessagesRead((data: any) => {
            try {
                if (!data?.conversationId) {
                    console.warn('⚠️ Socket.IO messages_read: conversationId manquant', data);
                    return;
                }
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
                console.error('❌ Erreur critique Socket.IO messages_read:', e);
                notifyError('Erreur de synchronisation', 'Impossible de mettre à jour le statut de lecture.');
            }
        });

        return () => {
            cleanupNewMessage();
            cleanupMessagesRead();
        };
    }, [onNewMessage, onMessagesRead, notifyError]);

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
                className={`rounded-xl mx-4 my-2 p-4 shadow-sm border border-neutral-100 ${isUnread ? 'bg-primary-50' : 'bg-white'}`}
                onPress={() => {
                    console.log('Navigating to conversation:', conversation._id); // Debug navigation
                    router.push(`/(app)/(client)/conversation/${conversation._id}`);
                }}
                onLongPress={() => handleLongPress(conversation)}
                delayLongPress={500}
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
                            <Text className="text-xs text-neutral-400 font-quicksand-medium">
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
                            className={`text-sm ${isUnread ? 'text-neutral-800 font-quicksand-semibold' : 'text-neutral-600 font-quicksand-light'}`}
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
                contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }}
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
                                className="bg-primary-500 rounded-2xl px-8 py-4 shadow-sm"
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
                    paddingBottom: 80,
                }}
            />

            {/* Menu contextuel pour les conversations */}
            {contextMenuVisible && selectedConversation && (
                <View 
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999,
                    }}
                >
                    <TouchableOpacity 
                        activeOpacity={1}
                        onPress={closeContextMenu}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    />

                    <View 
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 16,
                            padding: 8,
                            margin: 20,
                            minWidth: 200,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                            elevation: 5,
                        }}
                    >
                        {/* Titre */}
                        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                            <Text className="text-base font-quicksand-semibold text-neutral-800">
                                Actions
                            </Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: '#E5E7EB' }} />

                        {/* Option Archiver */}
                        <TouchableOpacity
                            onPress={handleArchiveConversation}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                            }}
                            disabled={contextMenuLoading}
                        >
                            <Ionicons name="archive-outline" size={20} color="#6B7280" style={{ marginRight: 12 }} />
                            <Text className="text-base font-quicksand-medium text-neutral-600">
                                Archiver
                            </Text>
                        </TouchableOpacity>

                        <View style={{ height: 1, backgroundColor: '#E5E7EB' }} />

                        {/* Option Supprimer */}
                        <TouchableOpacity
                            onPress={handleDeleteConversation}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                            }}
                            disabled={contextMenuLoading}
                        >
                            {contextMenuLoading ? (
                                <ActivityIndicator size="small" color="#EF4444" style={{ marginRight: 12 }} />
                            ) : (
                                <Ionicons name="trash-outline" size={20} color="#EF4444" style={{ marginRight: 12 }} />
                            )}
                            <Text className={`text-base font-quicksand-medium ${contextMenuLoading ? 'text-neutral-400' : 'text-red-500'}`}>
                                {contextMenuLoading ? 'Suppression...' : 'Supprimer'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}