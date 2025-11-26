import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Modal, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../../../components/ui/ToastManager';
import EnterpriseService, { DeliveryPartnerStatus } from '../../../../services/api/EnterpriseService';

/**
 * Écran de détail d'un partenaire de livraison
 */
export default function DeliveryPartnerDetailScreen() {
	const router = useRouter();
	const toast = useToast();
	const insets = useSafeAreaInsets();
	const { partnerId } = useLocalSearchParams<{ partnerId: string }>();

	const [partner, setPartner] = useState<DeliveryPartnerStatus | null>(null);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [associating, setAssociating] = useState(false);
	const [dissociating, setDissociating] = useState(false);
	const [checkingAssociation, setCheckingAssociation] = useState(false);
	const [isAssociated, setIsAssociated] = useState<boolean | null>(null);
	const [confirmationVisible, setConfirmationVisible] = useState(false);

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

	const checkAssociationStatus = useCallback(async () => {
		if (!partnerId) return;

		try {
			setCheckingAssociation(true);
			const associated = await EnterpriseService.checkDeliveryPartnerAssociation(partnerId);
			setIsAssociated(associated);
		} catch (error: any) {
			console.error('❌ Erreur vérification association:', error);
			// En cas d'erreur, on considère que le partenaire n'est pas associé
			setIsAssociated(false);
		} finally {
			setCheckingAssociation(false);
		}
	}, [partnerId]);

	const loadPartnerDetails = useCallback(async () => {
		if (!partnerId) return;

		try {
			setLoading(true);
			// Utiliser l'endpoint avec statut enrichi si disponible, sinon fallback sur l'endpoint simple
			const partnerData = await EnterpriseService.getDeliveryPartnerWithStatusById(partnerId);
			setPartner(partnerData);

			// Vérifier le statut d'association avec l'API dédiée
			await checkAssociationStatus();
		} catch (error: any) {
			console.error('❌ Erreur chargement détails partenaire:', error);
			toast.showError('Erreur', error.message || 'Impossible de charger les détails du partenaire');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [partnerId, toast, checkAssociationStatus]);

	const loadRef = useRef(loadPartnerDetails);

	// Update ref when loadPartnerDetails changes
	useEffect(() => {
		loadRef.current = loadPartnerDetails;
	}, [loadPartnerDetails]);

	useFocusEffect(useCallback(() => {
		loadRef.current();
	}, []));

	const onRefresh = async () => {
		setRefreshing(true);
		await loadPartnerDetails();
	};

	const handleAssociate = async () => {
		if (!partner) return;

		try {
			setAssociating(true);
			await EnterpriseService.associateDeliveryPartner(partner._id);
			toast.showSuccess('Succès', 'Partenaire associé avec succès');
			setIsAssociated(true); // Mettre à jour l'état local
		} catch (error: any) {
			console.error('❌ Erreur association partenaire:', error);
			toast.showError('Erreur', error.message || 'Échec association partenaire');
		} finally {
			setAssociating(false);
		}
	};

	const showDissociateConfirmation = () => {
		setConfirmationVisible(true);
	};

	const closeDissociateConfirmation = () => {
		setConfirmationVisible(false);
	};

	const handleDissociate = async () => {
		if (!partner) return;

		closeDissociateConfirmation();

		try {
			setDissociating(true);
			await EnterpriseService.dissociateDeliveryPartner(partner._id);
			toast.showSuccess('Succès', 'Partenaire dissocié avec succès');
			setIsAssociated(false); // Mettre à jour l'état local
		} catch (error: any) {
			console.error('❌ Erreur dissociation partenaire:', error);
			toast.showError('Erreur', error.message || 'Échec dissociation partenaire');
		} finally {
			setDissociating(false);
		}
	};

	const renderSkeletonDetail = () => (
		<ScrollView className="flex-1">
			{/* Header avec gradient */}
			<LinearGradient
				colors={['#047857', '#10B981']}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 0 }}
				className="px-6 pt-12 pb-8"
			>
				<View className="flex-row items-center justify-between mb-6">
					<TouchableOpacity className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
						<Ionicons name="arrow-back" size={20} color="#FFFFFF" />
					</TouchableOpacity>
					<ShimmerBlock style={{ height: 20, borderRadius: 10, width: 120 }} />
					<View className="w-10" />
				</View>

				{/* Photo de profil skeleton */}
				<View className="items-center mb-6">
					<ShimmerBlock style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 16 }} />
					<ShimmerBlock style={{ height: 18, borderRadius: 9, width: 140, marginBottom: 8 }} />
					<ShimmerBlock style={{ height: 14, borderRadius: 7, width: 100 }} />
				</View>
			</LinearGradient>

			{/* Contenu skeleton */}
			<View className="px-6 pt-6 -mt-6 rounded-t-[32px] bg-background-secondary">
				{Array.from({ length: 4 }).map((_, index) => (
					<View
						key={index}
						className="bg-white rounded-2xl p-4 mb-4"
						style={{
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 2 },
							shadowOpacity: 0.1,
							shadowRadius: 4,
							elevation: 3,
						}}
					>
						<ShimmerBlock style={{ height: 16, borderRadius: 8, width: '60%', marginBottom: 12 }} />
						<ShimmerBlock style={{ height: 60, borderRadius: 12, width: '100%' }} />
					</View>
				))}
			</View>
		</ScrollView>
	);

	// Avatar avec fallback aux initiales et gestion d'erreur image (dégradé indigo/violet)
	const Avatar = ({
		uri,
		firstName,
		lastName,
		size = 100,
		borderWidth = 4,
	}: {
		uri?: string | null;
		firstName?: string;
		lastName?: string;
		size?: number;
		borderWidth?: number;
	}) => {
		const [error, setError] = React.useState(false);

		const initials = React.useMemo(() => {
			const f = (firstName?.trim()?.[0] || '').toUpperCase();
			const l = (lastName?.trim()?.[0] || '').toUpperCase();
			const init = `${f}${l}`.trim();
			return init || '?';
		}, [firstName, lastName]);

		const circle = {
			width: size,
			height: size,
			borderRadius: size / 2,
			alignItems: 'center' as const,
			justifyContent: 'center' as const,
			borderWidth,
			borderColor: 'rgba(255,255,255,0.2)',
		};

		if (uri && !error) {
			return (
				<Image
					source={{ uri }}
					style={circle}
					onError={() => setError(true)}
				/>
			);
		}

		return (
			<LinearGradient
				colors={['#94A3B8', '#475569']}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={circle}
			>
				<Text className="text-white font-quicksand-bold" style={{ fontSize: size / 2.8 }}>
					{initials}
				</Text>
			</LinearGradient>
		);
	};

	if (loading) {
		return (
			<View className="flex-1 bg-background-secondary">
				<ExpoStatusBar style="light" translucent />
				{renderSkeletonDetail()}
			</View>
		);
	}

	if (!partner) {
		return (
			<View className="flex-1 bg-background-secondary">
				<ExpoStatusBar style="light" translucent />

				{/* Header avec gradient */}
				<LinearGradient
					colors={['#047857', '#10B981']}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
					style={{
						paddingTop: insets.top + 16,
						paddingBottom: 32,
						paddingLeft: insets.left + 24,
						paddingRight: insets.right + 24,
					}}
				>
					<View className="flex-row items-center justify-between mb-6">
						<TouchableOpacity
							onPress={() => router.back()}
							className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
						>
							<Ionicons name="arrow-back" size={20} color="#FFFFFF" />
						</TouchableOpacity>
						<Text className="text-xl font-quicksand-bold text-white flex-1 text-center mr-10">
							Partenaire introuvable
						</Text>
					</View>
				</LinearGradient>

				{/* Message d'erreur */}
				<View className="flex-1 items-center justify-center px-6">
					<View className="w-20 h-20 rounded-full bg-neutral-100 items-center justify-center mb-4">
						<Ionicons name="alert-circle" size={32} color="#EF4444" />
					</View>
					<Text className="text-neutral-700 font-quicksand-semibold text-lg text-center mb-2">
						Partenaire non trouvé
					</Text>
					<Text className="text-neutral-500 font-quicksand-regular text-center mb-6">
						Le partenaire de livraison demandé n&apos;existe pas ou n&apos;est plus disponible.
					</Text>
					<TouchableOpacity
						onPress={() => router.back()}
						className="bg-primary-500 rounded-xl px-6 py-3"
					>
						<Text className="text-white font-quicksand-semibold">Retour</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background-secondary">
			<ExpoStatusBar style="light" translucent />

			{/* Header fixe avec gradient moderne */}
			<LinearGradient
				colors={['#047857', '#10B981']}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 0 }}
				style={{
					paddingTop: insets.top + 16,
					paddingBottom: 16,
					paddingLeft: insets.left + 24,
					paddingRight: insets.right + 24,
					zIndex: 10,
				}}
			>
				<View className="flex-row items-center justify-between">
					<TouchableOpacity
						onPress={() => router.back()}
						className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
					>
						<Ionicons name="arrow-back" size={20} color="#FFFFFF" />
					</TouchableOpacity>
					<Text className="text-xl font-quicksand-bold text-white flex-1 text-center mr-10">
						Détails du partenaire
					</Text>
				</View>
			</LinearGradient>

			<ScrollView
				className="flex-1"
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						colors={['#10B981']}
						tintColor="#10B981"
						progressBackgroundColor="#FFFFFF"
					/>
				}
			>
				{/* Partie supérieure scrollable avec le reste du gradient */}
				<LinearGradient
					colors={['#047857', '#10B981']}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
					style={{
						paddingTop: 8,
						paddingBottom: 32,
						paddingLeft: insets.left + 24,
						paddingRight: insets.right + 24,
					}}
				>
					{/* Profil principal */}
					<View className="items-center">
						{/* Photo de profil */}
						<View className="relative mb-4">
							<Avatar uri={partner.profileImage} firstName={partner.firstName} lastName={partner.lastName} size={100} />
							<View className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-3 border-white ${partner.availability ? 'bg-success-500' : 'bg-neutral-400'}`} />
						</View>

						{/* Nom et statut */}
						<Text className="text-white font-quicksand-bold text-2xl text-center mb-2">
							{partner.firstName} {partner.lastName}
						</Text>

						<View className="flex-row items-center space-x-3">
							<View className={`px-3 py-1 rounded-full ${partner.availability ? 'bg-success-500/20' : 'bg-neutral-500/20'}`}>
								<Text className={`font-quicksand-semibold text-sm ${partner.availability ? 'text-success-100' : 'text-neutral-100'}`}>
									{partner.availability ? 'Disponible' : 'Indisponible'}
								</Text>
							</View>

							{partner.isVerified && (
								<View className="px-3 py-1 rounded-full bg-blue-500/20">
									<Text className="font-quicksand-semibold text-sm text-blue-100">✓ Vérifié</Text>
								</View>
							)}
						</View>
					</View>
				</LinearGradient>

				{/* Contenu principal */}
				<View className="px-6 pt-6 -mt-6 rounded-t-[32px] bg-background-secondary">
					{/* Section informations générales */}
					<View
						className="bg-white rounded-2xl p-4 mb-4"
						style={{
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 2 },
							shadowOpacity: 0.1,
							shadowRadius: 4,
							elevation: 3,
						}}
					>
						<Text className="text-neutral-800 font-quicksand-bold text-lg mb-4">
							Informations générales
						</Text>

						{/* Email */}
						{partner.email && (
							<View className="flex-row items-center mb-3">
								<View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
									<Ionicons name="mail" size={16} color="#10B981" />
								</View>
								<View className="flex-1">
									<Text className="text-neutral-500 font-quicksand-medium text-sm">Email</Text>
									<Text className="text-neutral-800 font-quicksand-semibold">{partner.email}</Text>
								</View>
							</View>
						)}

						{/* Téléphone */}
						{partner.phone && (
							<View className="flex-row items-center mb-3">
								<View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
									<Ionicons name="call" size={16} color="#10B981" />
								</View>
								<View className="flex-1">
									<Text className="text-neutral-500 font-quicksand-medium text-sm">Téléphone</Text>
									<Text className="text-neutral-800 font-quicksand-semibold">{partner.phone}</Text>
								</View>
							</View>
						)}

						{/* Type de véhicule */}
						{partner.vehicleType && (
							<View className="flex-row items-center">
								<View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
									<Ionicons name="bicycle" size={16} color="#10B981" />
								</View>
								<View className="flex-1">
									<Text className="text-neutral-500 font-quicksand-medium text-sm">Véhicule</Text>
									<Text className="text-neutral-800 font-quicksand-semibold">{partner.vehicleType}</Text>
								</View>
							</View>
						)}
					</View>

					{/* Section horaires de travail */}
					{(partner as any).workingHours && (
						<View
							className="bg-white rounded-2xl p-4 mb-4"
							style={{
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 2 },
								shadowOpacity: 0.1,
								shadowRadius: 4,
								elevation: 3,
							}}
						>
							<Text className="text-neutral-800 font-quicksand-bold text-lg mb-4">
								Horaires de travail
							</Text>

							<View className="flex-row items-center">
								<View className="w-10 h-10 rounded-full bg-warning-100 items-center justify-center mr-3">
									<Ionicons name="time" size={16} color="#F59E0B" />
								</View>
								<View className="flex-1">
									<Text className="text-neutral-500 font-quicksand-medium text-sm">Plage horaire</Text>
									<Text className="text-neutral-800 font-quicksand-semibold">
										{(partner as any).workingHours.start} - {(partner as any).workingHours.end}
									</Text>
								</View>
							</View>
						</View>
					)}

					{/* Section rating et statistiques */}
					{(partner.rating !== undefined || (partner as any).stats) && (
						<View
							className="bg-white rounded-2xl p-4 mb-4"
							style={{
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 2 },
								shadowOpacity: 0.1,
								shadowRadius: 4,
								elevation: 3,
							}}
						>
							<Text className="text-neutral-800 font-quicksand-bold text-lg mb-4">
								Performance
							</Text>

							{partner.rating !== undefined && (
								<View className="flex-row items-center mb-3">
									<View className="w-10 h-10 rounded-full bg-warning-100 items-center justify-center mr-3">
										<Ionicons name="star" size={16} color="#F59E0B" />
									</View>
									<View className="flex-1">
										<Text className="text-neutral-500 font-quicksand-medium text-sm">Note moyenne</Text>
										<Text className="text-neutral-800 font-quicksand-semibold">
											{partner.rating.toFixed(1)} / 5
										</Text>
									</View>
								</View>
							)}

							{/* Statistiques supplémentaires si disponibles */}
							{(partner as any).stats && Object.keys((partner as any).stats).length > 0 && (
								<View className="pt-3 border-t border-neutral-100">
									<Text className="text-neutral-600 font-quicksand-medium text-sm mb-2">
										Statistiques détaillées disponibles
									</Text>
								</View>
							)}
						</View>
					)}

					{/* Section statut d'association */}
					<View
						className="bg-white rounded-2xl p-4 mb-6"
						style={{
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 2 },
							shadowOpacity: 0.1,
							shadowRadius: 4,
							elevation: 3,
						}}
					>
						<Text className="text-neutral-800 font-quicksand-bold text-lg mb-4">
							Statut d&apos;association
						</Text>

						{isAssociated === null || checkingAssociation ? (
							// Loading state for association check
							<View className="items-center py-4">
								<ActivityIndicator size="small" color="#10B981" />
								<Text className="text-neutral-500 font-quicksand-medium text-sm mt-2">
									Vérification du statut...
								</Text>
							</View>
						) : isAssociated ? (
							<View className="bg-success-50 rounded-xl p-4 border border-success-200">
								<View className="flex-row items-center justify-center mb-2">
									<Ionicons name="checkmark-circle" size={24} color="#10B981" />
									<Text className="text-success-700 font-quicksand-bold text-lg ml-2">
										Partenaire associé
									</Text>
								</View>
								<Text className="text-success-600 font-quicksand-medium text-center mb-4">
									Ce livreur est déjà associé à votre entreprise
								</Text>

								{/* Bouton de dissociation */}
								<TouchableOpacity
									disabled={dissociating}
									onPress={showDissociateConfirmation}
									className="bg-red-500 rounded-xl py-3 items-center"
									activeOpacity={0.85}
								>
									{dissociating ? (
										<ActivityIndicator size="small" color="#FFFFFF" />
									) : (
										<View className="flex-row items-center">
											<Ionicons name="remove-circle" size={18} color="#FFFFFF" />
											<Text className="font-quicksand-semibold text-white ml-2">
												Dissocier ce partenaire
											</Text>
										</View>
									)}
								</TouchableOpacity>
							</View>
						) : (
							<View>
								<View className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 mb-4">
									<View className="flex-row items-center justify-center mb-2">
										<Ionicons name="information-circle" size={24} color="#6B7280" />
										<Text className="text-neutral-700 font-quicksand-bold text-lg ml-2">
											Non associé
										</Text>
									</View>
									<Text className="text-neutral-600 font-quicksand-medium text-center">
										Ce livreur n&apos;est pas encore associé à votre entreprise
									</Text>
								</View>

								<TouchableOpacity
									disabled={associating}
									onPress={handleAssociate}
									className="rounded-xl py-4 items-center overflow-hidden"
									activeOpacity={0.85}
								>
									<LinearGradient
										colors={['#047857', '#10B981']}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 0 }}
										className="absolute inset-0"
									/>
									{associating ? (
										<ActivityIndicator size="small" color="#FFFFFF" />
									) : (
										<View className="flex-row items-center">
											<Ionicons name="add-circle" size={20} color="#FFFFFF" />
											<Text className="font-quicksand-bold text-white ml-2">
												Associer ce partenaire
											</Text>
										</View>
									)}
								</TouchableOpacity>
							</View>
						)}
					</View>
				</View>
			</ScrollView>

			{/* Modal de confirmation pour la dissociation */}
			<Modal
				visible={confirmationVisible}
				transparent={true}
				animationType="fade"
				onRequestClose={closeDissociateConfirmation}
			>
				<TouchableOpacity
					className="flex-1 bg-black/50"
					activeOpacity={1}
					onPress={closeDissociateConfirmation}
				>
					<View className="flex-1 justify-center items-center px-6">
						<TouchableOpacity
							className="bg-white rounded-3xl w-full max-w-sm"
							activeOpacity={1}
							onPress={() => { }}
						>
							{/* Icon */}
							<View className="items-center pt-8 pb-4">
								<View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center">
									<Ionicons name="remove-circle" size={28} color="#EF4444" />
								</View>
							</View>

							{/* Content */}
							<View className="px-6 pb-6">
								<Text className="text-xl font-quicksand-bold text-neutral-800 text-center mb-2">
									Dissocier le partenaire
								</Text>
								<Text className="text-base text-neutral-600 font-quicksand-medium text-center leading-5">
									Êtes-vous sûr de vouloir dissocier {partner?.firstName} {partner?.lastName} de votre entreprise ? Cette action est réversible.
								</Text>
							</View>

							{/* Actions */}
							<View className="flex-row px-6 pb-6 gap-3">
								<TouchableOpacity
									onPress={closeDissociateConfirmation}
									className="flex-1 bg-neutral-100 py-4 rounded-2xl items-center"
								>
									<Text className="text-base font-quicksand-semibold text-neutral-700">
										Annuler
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={handleDissociate}
									className="flex-1 bg-red-500 py-4 rounded-2xl items-center"
								>
									<Text className="text-base font-quicksand-semibold text-white">
										Dissocier
									</Text>
								</TouchableOpacity>
							</View>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</Modal>
		</View>
	);
}