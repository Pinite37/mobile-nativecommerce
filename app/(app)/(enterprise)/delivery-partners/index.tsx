import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, FlatList, Image, RefreshControl, SafeAreaView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../../../components/ui/ToastManager';
import EnterpriseService, { DeliveryPartnerStatus, DeliveryPartnersWithStatusResponse, Enterprise } from '../../../../services/api/EnterpriseService';

/**
 * Écran de gestion des partenaires de livraison (design moderne et cohérent)
 */
export default function DeliveryPartnersScreen() {
	const router = useRouter();
	const toast = useToast();
	const insets = useSafeAreaInsets();
	const [partners, setPartners] = useState<DeliveryPartnerStatus[]>([]);
	const [filtered, setFiltered] = useState<DeliveryPartnerStatus[]>([]);
	const [search, setSearch] = useState('');
	const [loading, setLoading] = useState(false);
	const [associating, setAssociating] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
	const [totals, setTotals] = useState<{ total: number; associatedCount: number }>({ total: 0, associatedCount: 0 });

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

	const SkeletonPartnerCard = () => (
		<View className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4 mb-4">
			<View className="flex-row items-center">
				<ShimmerBlock style={{ width: 60, height: 60, borderRadius: 30 }} />
				<View className="flex-1 ml-4">
					<ShimmerBlock style={{ height: 18, borderRadius: 9, width: '70%', marginBottom: 8 }} />
					<ShimmerBlock style={{ height: 14, borderRadius: 7, width: '50%', marginBottom: 12 }} />
					<View className="flex-row space-x-2">
						<ShimmerBlock style={{ width: 60, height: 24, borderRadius: 12 }} />
						<ShimmerBlock style={{ width: 60, height: 24, borderRadius: 12 }} />
					</View>
				</View>
			</View>
		</View>
	);

	const renderSkeletonPartners = () => (
		<View className="flex-1">
			{/* Header avec gradient */}
			<LinearGradient
				colors={['#10B981', '#34D399']}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 0 }}
				className="px-6 pt-12 pb-6"
			>
				<View className="flex-row items-center justify-between mb-6">
					<TouchableOpacity
						className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
					>
						<Ionicons name="arrow-back" size={20} color="#FFFFFF" />
					</TouchableOpacity>
					<Text className="text-xl font-quicksand-bold text-white flex-1 text-center mr-10">
						Partenaires livraison
					</Text>
				</View>

				{/* Barre de recherche skeleton */}
				<View className="bg-white/20 rounded-2xl px-4 py-3 mb-4">
					<ShimmerBlock style={{ height: 16, borderRadius: 8, width: '60%' }} />
				</View>

				{/* Statistiques skeleton */}
				<View className="flex-row justify-between">
					<View className="items-center">
						<ShimmerBlock style={{ height: 20, borderRadius: 10, width: 40, marginBottom: 4 }} />
						<ShimmerBlock style={{ height: 14, borderRadius: 7, width: 60 }} />
					</View>
					<View className="items-center">
						<ShimmerBlock style={{ height: 20, borderRadius: 10, width: 40, marginBottom: 4 }} />
						<ShimmerBlock style={{ height: 14, borderRadius: 7, width: 60 }} />
					</View>
				</View>
			</LinearGradient>

			{/* Liste skeleton */}
			<View className="px-4 pt-6">
				{Array.from({ length: 5 }).map((_, index) => (
					<SkeletonPartnerCard key={index} />
				))}
			</View>
		</View>
	);

	// Avatar avec fallback aux initiales si l'image est absente ou invalide
	const Avatar = ({ uri, firstName, lastName }: { uri?: string | null; firstName?: string; lastName?: string }) => {
		const [error, setError] = React.useState(false);

		const initials = React.useMemo(() => {
			const f = (firstName?.trim()?.[0] || '').toUpperCase();
			const l = (lastName?.trim()?.[0] || '').toUpperCase();
			const init = `${f}${l}`.trim();
			return init || '?';
		}, [firstName, lastName]);

		if (uri && !error) {
			return (
				<Image
					source={{ uri }}
					style={{ width: 50, height: 50, borderRadius: 25 }}
					onError={() => setError(true)}
				/>
			);
		}

		return (
			<LinearGradient
				colors={['#34D399', '#10B981']}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }}
			>
				<Text className="text-white font-quicksand-bold text-base">
					{initials}
				</Text>
			</LinearGradient>
		);
	};

	const loadPartners = useCallback(async () => {
		try {
			setLoading(true);
			const data: DeliveryPartnersWithStatusResponse = await EnterpriseService.getDeliveryPartnersWithStatus();
			setTotals({ total: data.total, associatedCount: data.associatedCount });
			setPartners(data.deliverers);
			setFiltered(data.deliverers);
		} catch (error: any) {
			console.error('❌ Erreur chargement partenaires:', error);
			toast.showError('Erreur', error.message || 'Impossible de charger les partenaires');
		} finally {
			setLoading(false);
		}
	}, [toast]);

	const onRefresh = async () => {
		try {
			setRefreshing(true);
			await loadPartners();
		} finally {
			setRefreshing(false);
		}
	};

	useEffect(() => { loadPartners(); }, [loadPartners]);

	useEffect(() => {
		if (!search.trim()) {
			setFiltered(partners);
		} else {
			const s = search.toLowerCase();
			setFiltered(partners.filter(p => (
				`${p.firstName} ${p.lastName}`.toLowerCase().includes(s) ||
				p.email?.toLowerCase().includes(s) ||
				p.phone?.toLowerCase().includes(s)
			)));
		}
	}, [search, partners]);

	const handleAssociate = async (partnerId: string) => {
		try {
			setAssociating(partnerId);
			const updatedEnterprise = await EnterpriseService.associateDeliveryPartner(partnerId);
			setEnterprise(updatedEnterprise);
			toast.showSuccess('Succès', 'Partenaire associé avec succès');
			setPartners(prev => prev.map(p => p._id === partnerId ? { ...p, isAssociated: true } : p));
			setFiltered(prev => prev.map(p => p._id === partnerId ? { ...p, isAssociated: true } : p));
			setTotals(prev => ({ ...prev, associatedCount: prev.associatedCount + 1 }));
		} catch (error: any) {
			console.error('❌ Erreur association partenaire:', error);
			toast.showError('Erreur', error.message || 'Échec association partenaire');
		} finally {
			setAssociating(null);
		}
	};

	const renderItem = ({ item }: { item: DeliveryPartnerStatus }) => {
		const alreadyAssociated = item.isAssociated || enterprise?.deliveryPartners?.some(p => p._id === item._id);
		const openDetail = () => router.push(`/delivery-partners/${item._id}` as any);

		return (
			<TouchableOpacity
				onPress={openDetail}
				activeOpacity={0.9}
				className="bg-white mx-4 mb-4 rounded-2xl shadow-sm border border-neutral-100 overflow-hidden"
			>
				<View className="p-4">
					{/* Header avec photo et nom */}
					<View className="flex-row items-center mb-3">
						<View className="relative mr-3">
							<Avatar uri={item.profileImage} firstName={item.firstName} lastName={item.lastName} />
							<View className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${item.availability ? 'bg-success-500' : 'bg-neutral-400'}`} />
						</View>

						<View className="flex-1">
							<Text className="text-neutral-800 font-quicksand-semibold text-base" numberOfLines={1}>
								{item.firstName} {item.lastName}
							</Text>
							<View className="flex-row items-center mt-1">
								<Text className="text-sm font-quicksand-medium text-neutral-600">
									{item.availability ? 'Disponible' : 'Indisponible'}
								</Text>
								{item.vehicleType && (
									<Text className="text-sm font-quicksand-medium text-neutral-500 ml-2">
										• {item.vehicleType}
									</Text>
								)}
							</View>
						</View>
					</View>

					{/* Badges et rating */}
					<View className="flex-row items-center justify-between mb-3">
						<View className="flex-row items-center flex-wrap">
							{item.isVerified && (
								<View className="mr-2 px-2 py-1 bg-success-100 rounded-full">
									<Text className="text-xs font-quicksand-semibold text-success-700">✓ Vérifié</Text>
								</View>
							)}
							{item.isAssociated && (
								<View className="px-2 py-1 bg-primary-100 rounded-full">
									<Text className="text-xs font-quicksand-semibold text-primary-700">Associé</Text>
								</View>
							)}
						</View>

						{item.rating !== undefined && (
							<View className="flex-row items-center">
								<Ionicons name="star" size={14} color="#F59E0B" />
								<Text className="text-sm font-quicksand-semibold text-warning-600 ml-1">
									{item.rating.toFixed(1)}
								</Text>
							</View>
						)}
					</View>

					{/* Informations de contact - responsive */}
					{(item.phone || item.email) && (
						<View className="mb-3 pt-3 border-t border-neutral-100">
							{item.phone && (
								<View className="flex-row items-center mb-2">
									<Ionicons name="call" size={14} color="#6B7280" />
									<Text className="text-sm font-quicksand-medium text-neutral-600 ml-2 flex-1" numberOfLines={1}>
										{item.phone}
									</Text>
								</View>
							)}
							{item.email && (
								<View className="flex-row items-center">
									<Ionicons name="mail" size={14} color="#6B7280" />
									<Text className="text-sm font-quicksand-medium text-neutral-600 ml-2 flex-1" numberOfLines={1}>
										{item.email}
									</Text>
								</View>
							)}
						</View>
					)}

					{/* Bouton d'action */}
					<View className="pt-3 border-t border-neutral-100">
						{alreadyAssociated ? (
							<View className="bg-neutral-100 rounded-xl px-4 py-3 items-center">
								<View className="flex-row items-center">
									<Ionicons name="checkmark-circle" size={16} color="#6B7280" />
									<Text className="font-quicksand-semibold text-sm text-neutral-600 ml-2">
										Déjà associé
									</Text>
								</View>
							</View>
						) : (
							<TouchableOpacity
								disabled={associating === item._id}
								onPress={() => handleAssociate(item._id)}
								className="rounded-xl px-4 py-3 items-center overflow-hidden"
								activeOpacity={0.85}
							>
								<LinearGradient
									colors={['#10B981', '#34D399']}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
									className="absolute inset-0"
								/>
								{associating === item._id ? (
									<ActivityIndicator size="small" color="#FFFFFF" />
								) : (
									<View className="flex-row items-center">
										<Ionicons name="add-circle" size={16} color="#FFFFFF" />
										<Text className="font-quicksand-semibold text-sm text-white ml-2">
											Associer
										</Text>
									</View>
								)}
							</TouchableOpacity>
						)}
					</View>
				</View>
			</TouchableOpacity>
		);
	};

	return (
		<SafeAreaView className="flex-1 bg-background-secondary">
			<StatusBar backgroundColor="#10B981" barStyle="light-content" />

			{loading ? (
				renderSkeletonPartners()
			) : (
				<>
					{/* Header avec gradient moderne */}
					<LinearGradient
						colors={['#10B981', '#34D399']}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
						className="px-6 pt-12 pb-8"
					>
						<View className="flex-row items-center justify-between mb-6">
							<TouchableOpacity
								onPress={() => router.back()}
								className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
							>
								<Ionicons name="arrow-back" size={20} color="#FFFFFF" />
							</TouchableOpacity>
							<Text className="text-xl font-quicksand-bold text-white flex-1 text-center mr-10">
								Partenaires de livraison
							</Text>
						</View>

						{/* Statistiques dans le header */}
						<View className="bg-white/10 rounded-2xl p-4 mb-6">
							<View className="flex-row justify-between">
								<View className="items-center flex-1">
									<Text className="text-white/80 font-quicksand-medium text-sm">Total</Text>
									<Text className="text-white font-quicksand-bold text-2xl">{totals.total}</Text>
								</View>
								<View className="items-center flex-1">
									<Text className="text-white/80 font-quicksand-medium text-sm">Associés</Text>
									<Text className="text-white font-quicksand-bold text-2xl">{totals.associatedCount}</Text>
								</View>
								<View className="items-center flex-1">
									<Text className="text-white/80 font-quicksand-medium text-sm">Disponibles</Text>
									<Text className="text-white font-quicksand-bold text-2xl">
										{partners.filter(p => p.availability).length}
									</Text>
								</View>
							</View>
						</View>

						{/* Barre de recherche dans le header */}
						<View className="relative">
							<View className="bg-white/20 rounded-2xl pl-12 pr-12 py-3">
								<TextInput
									value={search}
									onChangeText={setSearch}
									placeholder="Rechercher un livreur..."
									placeholderTextColor="#FFFFFF80"
									className="text-white font-quicksand-medium"
									autoCapitalize="none"
								/>
							</View>
							<Ionicons name="search" size={20} color="#FFFFFF" style={{ position: 'absolute', left: 16, top: 12 }} />
							{search.length > 0 && (
								<TouchableOpacity
									onPress={() => setSearch('')}
									style={{ position: 'absolute', right: 16, top: 12 }}
								>
									<Ionicons name="close-circle" size={20} color="#FFFFFF" />
								</TouchableOpacity>
							)}
						</View>
					</LinearGradient>

					{/* Contenu principal */}
					<View className="flex-1 -mt-6 rounded-t-[32px] bg-background-secondary">
						<FlatList
							data={filtered}
							keyExtractor={(item) => item._id}
							contentContainerStyle={{ paddingTop: 20, paddingBottom: Math.max(insets.bottom, 20) + 60 }}
							renderItem={renderItem}
							ListEmptyComponent={
								<View className="items-center pt-20 px-6">
									<View className="w-20 h-20 rounded-full bg-neutral-100 items-center justify-center mb-4">
										<Ionicons name="people" size={32} color="#9CA3AF" />
									</View>
									<Text className="text-neutral-700 font-quicksand-semibold text-lg text-center mb-2">
										Aucun partenaire trouvé
									</Text>
									<Text className="text-neutral-500 font-quicksand-regular text-center">
										Aucun livreur disponible ne correspond à votre recherche.
									</Text>
								</View>
							}
							refreshControl={
								<RefreshControl
									refreshing={refreshing}
									onRefresh={onRefresh}
									colors={['#10B981']}
									tintColor="#10B981"
									progressBackgroundColor="#FFFFFF"
								/>
							}
							showsVerticalScrollIndicator={false}
						/>
					</View>
				</>
			)}
		</SafeAreaView>
	);
}
