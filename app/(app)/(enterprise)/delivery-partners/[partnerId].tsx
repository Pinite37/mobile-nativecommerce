import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../../../components/ui/ToastManager';
import { Shimmer } from '../../../../components/ui/Shimmer';
import { useLocale } from '../../../../contexts/LocaleContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import i18n from '../../../../i18n/i18n';
import EnterpriseService, { DeliveryPartnerStatus } from '../../../../services/api/EnterpriseService';

/**
 * Écran de détail d'un partenaire de livraison
 */
export default function DeliveryPartnerDetailScreen() {
	const router = useRouter();
	const toast = useToast();
	const insets = useSafeAreaInsets();
	const { locale } = useLocale();
	const { colors, isDark } = useTheme();
	const { partnerId } = useLocalSearchParams<{ partnerId: string }>();

	const [partner, setPartner] = useState<DeliveryPartnerStatus | null>(null);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [associating, setAssociating] = useState(false);
	const [dissociating, setDissociating] = useState(false);
	const [checkingAssociation, setCheckingAssociation] = useState(false);
	const [isAssociated, setIsAssociated] = useState<boolean | null>(null);
	const [confirmationVisible, setConfirmationVisible] = useState(false);

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
			{/* Header skeleton */}
			<View style={{ backgroundColor: colors.surface, paddingTop: insets.top + 8, paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
				<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
					<Shimmer style={{ width: 38, height: 38, borderRadius: 12, marginRight: 10 }} />
					<Shimmer style={{ height: 20, borderRadius: 10, width: 120 }} />
				</View>

				{/* Photo de profil skeleton */}
				<View style={{ alignItems: 'center' }}>
					<Shimmer style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 16 }} />
					<Shimmer style={{ height: 18, borderRadius: 9, width: 140, marginBottom: 8 }} />
					<Shimmer style={{ height: 14, borderRadius: 7, width: 100 }} />
				</View>
			</View>

			{/* Contenu skeleton */}
			<View className="px-6 pt-6" style={{ backgroundColor: colors.secondary }}>
				{Array.from({ length: 4 }).map((_, index) => (
					<View
						key={index}
						className="rounded-2xl p-4 mb-4"
						style={{
							backgroundColor: colors.card,
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 2 },
							shadowOpacity: 0.1,
							shadowRadius: 4,
							elevation: 3,
						}}
					>
						<Shimmer style={{ height: 16, borderRadius: 8, width: '60%', marginBottom: 12 }} />
						<Shimmer style={{ height: 60, borderRadius: 12, width: '100%' }} />
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
			<View style={[circle, { backgroundColor: colors.tertiary }]}>
				<Text style={{ fontSize: size / 2.8, fontFamily: 'Poppins-Bold', color: colors.textSecondary }}>
					{initials}
				</Text>
			</View>
		);
	};

	if (loading) {
		return (
			<View className="flex-1" style={{ backgroundColor: colors.secondary }}>
				<ExpoStatusBar style={isDark ? "light" : "dark"} translucent />
				{renderSkeletonDetail()}
			</View>
		);
	}

	if (!partner) {
		return (
			<View className="flex-1" style={{ backgroundColor: colors.secondary }}>
				<ExpoStatusBar style={isDark ? "light" : "dark"} translucent />

				{/* Header */}
				<View style={{ backgroundColor: colors.surface, paddingTop: insets.top + 8, paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
					<View style={{ flexDirection: 'row', alignItems: 'center' }}>
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tertiary, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}
						>
							<Ionicons name="arrow-back" size={20} color={colors.text} />
						</TouchableOpacity>
						<Text style={{ fontSize: 18, fontFamily: 'Poppins-Bold', color: colors.text }}>
							{i18n.t("enterprise.deliveryPartners.detail.notFound.title")}
						</Text>
					</View>
				</View>

				{/* Message d'erreur */}
				<View className="flex-1 items-center justify-center px-6">
					<View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: colors.tertiary }}>
						<Ionicons name="alert-circle" size={32} color={colors.error} />
					</View>
					<Text className="font-poppins-semibold text-lg text-center mb-2" style={{ color: colors.textPrimary }}>
						{i18n.t("enterprise.deliveryPartners.detail.notFound.message")}
					</Text>
					<Text className="font-quicksand-regular text-center mb-6" style={{ color: colors.textSecondary }}>
						{i18n.t("enterprise.deliveryPartners.detail.notFound.description")}
					</Text>
					<TouchableOpacity
						onPress={() => router.back()}
						className="rounded-xl px-6 py-3"
						style={{ backgroundColor: colors.brandPrimary }}
					>
						<Text className="font-poppins-semibold text-white">{i18n.t("enterprise.deliveryPartners.detail.notFound.backButton")}</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	return (
		<View className="flex-1" style={{ backgroundColor: colors.secondary }}>
			<ExpoStatusBar style={isDark ? "light" : "dark"} translucent />

			{/* Header */}
			<View style={{ backgroundColor: colors.surface, paddingTop: insets.top + 8, paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight, zIndex: 10 }}>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<TouchableOpacity
						onPress={() => router.back()}
						style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tertiary, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}
					>
						<Ionicons name="arrow-back" size={20} color={colors.text} />
					</TouchableOpacity>
					<Text style={{ fontSize: 18, fontFamily: 'Poppins-Bold', color: colors.text }}>
						{i18n.t("enterprise.deliveryPartners.detail.title")}
					</Text>
				</View>
			</View>

			<ScrollView
				className="flex-1"
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
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
				{/* Profil principal */}
				<View style={{ backgroundColor: colors.surface, paddingTop: 20, paddingBottom: 24, paddingLeft: insets.left + 24, paddingRight: insets.right + 24, alignItems: 'center' }}>
					{/* Photo de profil */}
					<View style={{ position: 'relative', marginBottom: 16 }}>
						<Avatar uri={partner.profileImage} firstName={partner.firstName} lastName={partner.lastName} size={100} />
						<View style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: partner.availability ? colors.success : colors.textSecondary, borderWidth: 3, borderColor: colors.surface }} />
					</View>

					{/* Nom et statut */}
					<Text style={{ fontSize: 22, fontFamily: 'Poppins-Bold', color: colors.text, textAlign: 'center', marginBottom: 8 }}>
						{partner.firstName} {partner.lastName}
					</Text>

					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
						<View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: partner.availability ? colors.success + '20' : colors.textSecondary + '20' }}>
							<Text style={{ fontSize: 13, fontFamily: 'Poppins-SemiBold', color: partner.availability ? colors.success : colors.textSecondary }}>
								{partner.availability ? i18n.t("enterprise.deliveryPartners.status.available") : i18n.t("enterprise.deliveryPartners.status.unavailable")}
							</Text>
						</View>

						{partner.isVerified && (
							<View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: colors.info + '20' }}>
								<Text style={{ fontSize: 13, fontFamily: 'Poppins-SemiBold', color: colors.info }}>✓ {i18n.t("enterprise.deliveryPartners.badges.verified")}</Text>
							</View>
						)}
					</View>
				</View>

				{/* Contenu principal */}
				<View className="px-6 pt-6" style={{ backgroundColor: colors.secondary }}>
					{/* Section informations générales */}
					<View
						className="rounded-2xl p-4 mb-4"
						style={{
							backgroundColor: colors.card,
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 2 },
							shadowOpacity: 0.1,
							shadowRadius: 4,
							elevation: 3,
						}}
					>
						<Text className="font-poppins-bold text-lg mb-4" style={{ color: colors.textPrimary }}>
							{i18n.t("enterprise.deliveryPartners.detail.sections.generalInfo")}
						</Text>

						{/* Email */}
						{partner.email && (
							<View className="flex-row items-center mb-3">
								<View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.brandPrimary + '20' }}>
									<Ionicons name="mail" size={16} color={colors.brandPrimary} />
								</View>
								<View className="flex-1">
									<Text className="font-poppins-medium text-sm" style={{ color: colors.textTertiary }}>{i18n.t("enterprise.deliveryPartners.detail.labels.email")}</Text>
									<Text className="font-poppins-semibold" style={{ color: colors.textPrimary }}>{partner.email}</Text>
								</View>
							</View>
						)}

						{/* Téléphone */}
						{partner.phone && (
							<View className="flex-row items-center mb-3">
								<View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.brandPrimary + '20' }}>
									<Ionicons name="call" size={16} color={colors.brandPrimary} />
								</View>
								<View className="flex-1">
									<Text className="font-poppins-medium text-sm" style={{ color: colors.textTertiary }}>{i18n.t("enterprise.deliveryPartners.detail.labels.phone")}</Text>
									<Text className="font-poppins-semibold" style={{ color: colors.textPrimary }}>{partner.phone}</Text>
								</View>
							</View>
						)}

						{/* Type de véhicule */}
						{partner.vehicleType && (
							<View className="flex-row items-center">
								<View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.brandPrimary + '20' }}>
									<Ionicons name="bicycle" size={16} color={colors.brandPrimary} />
								</View>
								<View className="flex-1">
									<Text className="font-poppins-medium text-sm" style={{ color: colors.textTertiary }}>{i18n.t("enterprise.deliveryPartners.detail.labels.vehicle")}</Text>
									<Text className="font-poppins-semibold" style={{ color: colors.textPrimary }}>{partner.vehicleType}</Text>
								</View>
							</View>
						)}
					</View>

					{/* Section horaires de travail */}
					{(partner as any).workingHours && (
						<View
							className="rounded-2xl p-4 mb-4"
							style={{
								backgroundColor: colors.card,
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 2 },
								shadowOpacity: 0.1,
								shadowRadius: 4,
								elevation: 3,
							}}
						>
							<Text className="font-poppins-bold text-lg mb-4" style={{ color: colors.textPrimary }}>
								{i18n.t("enterprise.deliveryPartners.detail.sections.workingHours")}
							</Text>

							<View className="flex-row items-center">
								<View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.warning + '20' }}>
									<Ionicons name="time" size={16} color={colors.warning} />
								</View>
								<View className="flex-1">
									<Text className="font-poppins-medium text-sm" style={{ color: colors.textTertiary }}>{i18n.t("enterprise.deliveryPartners.detail.labels.timeRange")}</Text>
									<Text className="font-poppins-semibold" style={{ color: colors.textPrimary }}>
										{(partner as any).workingHours.start} - {(partner as any).workingHours.end}
									</Text>
								</View>
							</View>
						</View>
					)}

					{/* Section rating et statistiques */}
					{(partner.rating !== undefined || (partner as any).stats) && (
						<View
							className="rounded-2xl p-4 mb-4"
							style={{
								backgroundColor: colors.card,
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 2 },
								shadowOpacity: 0.1,
								shadowRadius: 4,
								elevation: 3,
							}}
						>
							<Text className="font-poppins-bold text-lg mb-4" style={{ color: colors.textPrimary }}>
								{i18n.t("enterprise.deliveryPartners.detail.sections.performance")}
							</Text>

							{partner.rating !== undefined && (
								<View className="flex-row items-center mb-3">
									<View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.warning + '20' }}>
										<Ionicons name="star" size={16} color={colors.warning} />
									</View>
									<View className="flex-1">
										<Text className="font-poppins-medium text-sm" style={{ color: colors.textTertiary }}>{i18n.t("enterprise.deliveryPartners.detail.labels.averageRating")}</Text>
										<Text className="font-poppins-semibold" style={{ color: colors.textPrimary }}>
											{partner.rating.toFixed(1)} / 5
										</Text>
									</View>
								</View>
							)}

							{/* Statistiques supplémentaires si disponibles */}
							{(partner as any).stats && Object.keys((partner as any).stats).length > 0 && (
								<View className="pt-3" style={{ borderTopColor: colors.borderLight }}>
									<Text className="font-poppins-medium text-sm mb-2" style={{ color: colors.textSecondary }}>
										{i18n.t("enterprise.deliveryPartners.detail.labels.detailedStats")}
									</Text>
								</View>
							)}
						</View>
					)}

					{/* Section statut d'association */}
					<View
						className="rounded-2xl p-4 mb-6"
						style={{
							backgroundColor: colors.card,
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 2 },
							shadowOpacity: 0.1,
							shadowRadius: 4,
							elevation: 3,
						}}
					>
						<Text className="font-poppins-bold text-lg mb-4" style={{ color: colors.textPrimary }}>
							{i18n.t("enterprise.deliveryPartners.detail.sections.associationStatus")}
						</Text>

						{isAssociated === null || checkingAssociation ? (
							// Loading state for association check
							<View className="items-center py-4">
								<ActivityIndicator size="small" color={colors.brandPrimary} />
								<Text className="font-poppins-medium text-sm mt-2" style={{ color: colors.textSecondary }}>
									{i18n.t("enterprise.deliveryPartners.detail.status.checking")}
								</Text>
							</View>
						) : isAssociated ? (
							<View className="rounded-xl p-4 mb-4" style={{ backgroundColor: colors.success + '20', borderColor: colors.success + '40', borderWidth: 1 }}>
								<View className="flex-row items-center justify-center mb-2">
									<Ionicons name="checkmark-circle" size={24} color={colors.success} />
									<Text className="font-poppins-bold text-lg ml-2" style={{ color: colors.success }}>
										{i18n.t("enterprise.deliveryPartners.detail.status.associated.title")}
									</Text>
								</View>
								<Text className="font-poppins-medium text-center mb-4" style={{ color: colors.success }}>
									{i18n.t("enterprise.deliveryPartners.detail.status.associated.description")}
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
											<Text className="font-poppins-semibold text-white ml-2">
												{i18n.t("enterprise.deliveryPartners.detail.actions.dissociate")}
											</Text>
										</View>
									)}
								</TouchableOpacity>
							</View>
						) : (
							<View>
								<View className="rounded-xl p-4 mb-4" style={{ backgroundColor: colors.tertiary, borderColor: colors.border, borderWidth: 1 }}>
									<View className="flex-row items-center justify-center mb-2">
										<Ionicons name="information-circle" size={24} color={colors.textSecondary} />
										<Text className="font-poppins-bold text-lg ml-2" style={{ color: colors.textPrimary }}>
											{i18n.t("enterprise.deliveryPartners.detail.status.notAssociated.title")}
										</Text>
									</View>
									<Text className="font-poppins-medium text-center" style={{ color: colors.textSecondary }}>
										{i18n.t("enterprise.deliveryPartners.detail.status.notAssociated.description")}
									</Text>
								</View>

								<TouchableOpacity
									disabled={associating}
									onPress={handleAssociate}
									style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.brandPrimary }}
									activeOpacity={0.85}
								>
									{associating ? (
										<ActivityIndicator size="small" color="#FFFFFF" />
									) : (
										<View style={{ flexDirection: 'row', alignItems: 'center' }}>
											<Ionicons name="add-circle" size={20} color="#FFFFFF" />
											<Text style={{ fontFamily: 'Poppins-Bold', color: '#FFFFFF', marginLeft: 8 }}>
												{i18n.t("enterprise.deliveryPartners.detail.actions.associate")}
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
							className="rounded-3xl w-full max-w-sm"
							style={{ backgroundColor: colors.card }}
							activeOpacity={1}
							onPress={() => { }}
						>
							{/* Icon */}
							<View className="items-center pt-8 pb-4">
								<View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: colors.error + '20' }}>
									<Ionicons name="remove-circle" size={28} color={colors.error} />
								</View>
							</View>

							{/* Content */}
							<View className="px-6 pb-6">
								<Text className="text-xl font-poppins-bold text-center mb-2" style={{ color: colors.textPrimary }}>
									{i18n.t("enterprise.deliveryPartners.detail.modal.dissociate.title")}
								</Text>
								<Text className="text-base font-poppins-medium text-center leading-5" style={{ color: colors.textSecondary }}>
									{i18n.t("enterprise.deliveryPartners.detail.modal.dissociate.message", { name: `${partner?.firstName} ${partner?.lastName}` })}
								</Text>
							</View>

							{/* Actions */}
							<View className="flex-row px-6 pb-6 gap-3">
								<TouchableOpacity
									onPress={closeDissociateConfirmation}
									className="flex-1 py-4 rounded-2xl items-center"
									style={{ backgroundColor: colors.tertiary }}
								>
									<Text className="text-base font-poppins-semibold" style={{ color: colors.textPrimary }}>
										{i18n.t("enterprise.deliveryPartners.detail.modal.dissociate.cancel")}
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={handleDissociate}
									className="flex-1 py-4 rounded-2xl items-center"
									style={{ backgroundColor: colors.error }}
								>
									<Text className="text-base font-poppins-semibold text-white">
										{i18n.t("enterprise.deliveryPartners.detail.modal.dissociate.confirm")}
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