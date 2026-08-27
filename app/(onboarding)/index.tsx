import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingService from '../../services/OnboardingService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PRIMARY_COLOR = '#10B981';

interface OnboardingSlide {
	id: string;
	title: string;
	description: string;
	icon: keyof typeof Ionicons.glyphMap;
	imageUri: string;
}

const slides: OnboardingSlide[] = [
	{
		id: '1',
		title: 'Découvrez des milliers de produits',
		description: 'Explorez une vaste sélection de produits provenant d\'entreprises vérifiées et de confiance.',
		icon: 'storefront-outline',
		imageUri: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80&fit=crop',
	},
	{
		id: '2',
		title: 'Connectez-vous aux entreprises',
		description: 'Mettez-vous en relation directe avec des entreprises locales et découvrez leurs meilleures offres.',
		icon: 'business-outline',
		imageUri: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80&fit=crop',
	},
	{
		id: '3',
		title: 'Commandez en toute sécurité',
		description: 'Profitez d\'une expérience d\'achat sécurisée avec suivi de commande en temps réel.',
		icon: 'shield-checkmark-outline',
		imageUri: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80&fit=crop',
	},
];

export default function OnboardingScreen() {
	const [currentIndex, setCurrentIndex] = useState(0);
	const scrollViewRef = useRef<ScrollView>(null);
	const insets = useSafeAreaInsets();

	// Guard: Si l'onboarding est déjà complété, rediriger vers le marketplace public
	useEffect(() => {
		const checkOnboarding = async () => {
			const completed = await OnboardingService.hasCompletedOnboarding();
			if (completed) {
				console.log('🔒 Onboarding déjà complété, redirection vers marketplace public');
				router.replace('/(app)/(client)/(tabs)');
			}
		};
		checkOnboarding();
	}, []);

	const handleNext = async () => {
		if (currentIndex < slides.length - 1) {
			const nextIndex = currentIndex + 1;
			setCurrentIndex(nextIndex);
			scrollViewRef.current?.scrollTo({
				x: nextIndex * SCREEN_WIDTH,
				animated: true,
			});
		} else {
			// Marquer l'onboarding comme complété
			await OnboardingService.markOnboardingComplete();
			// Navigate to marketplace public
			router.replace('/(app)/(client)/(tabs)');
		}
	};

	const handleSkip = async () => {
		// Marquer l'onboarding comme complété même si skip
		await OnboardingService.markOnboardingComplete();
		router.replace('/(app)/(client)/(tabs)');
	};

	const handleScroll = (event: any) => {
		const scrollPosition = event.nativeEvent.contentOffset.x;
		const newIndex = Math.round(scrollPosition / SCREEN_WIDTH);
		if (newIndex !== currentIndex && newIndex >= 0 && newIndex < slides.length) {
			setCurrentIndex(newIndex);
		}
	};

	return (
		<View style={styles.container}>
			<StatusBar style="dark" />

			{/* Header avec logo */}
			<View style={[styles.header, { paddingTop: insets.top + 20 }]}>
				<Image
					source={require('../../assets/images/axiLogoo.png')}
					style={styles.logo}
					resizeMode="contain"
				/>
				<TouchableOpacity onPress={handleSkip} style={[styles.skipButton, { top: insets.top + 20 }]}>
					<Text style={styles.skipText}>Passer</Text>
				</TouchableOpacity>
			</View>

			{/* Slides */}
			<ScrollView
				ref={scrollViewRef}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onScroll={handleScroll}
				scrollEventThrottle={16}
				bounces={false}
			>
				{slides.map((slide, index) => (
					<View key={slide.id} style={styles.slideContainer}>
						<View style={styles.imageContainer}>
							<Image
								source={{ uri: slide.imageUri }}
								style={styles.slideImage}
								resizeMode="cover"
							/>
							<View style={styles.imageOverlay} />
						</View>

						<Text style={styles.title}>{slide.title}</Text>
						<Text style={styles.description}>{slide.description}</Text>
					</View>
				))}
			</ScrollView>

			{/* Footer avec indicateurs et bouton */}
			<View style={styles.footer}>
				{/* Indicateurs de pagination */}
				<View style={styles.pagination}>
					{slides.map((_, index) => (
						<View
							key={index}
							style={[
								styles.dot,
								index === currentIndex ? styles.dotActive : styles.dotInactive,
							]}
						/>
					))}
				</View>

				{/* Bouton Suivant */}
				<TouchableOpacity
					onPress={handleNext}
					style={styles.nextButton}
					activeOpacity={0.8}
				>
					<View style={styles.nextButtonGradient}>
						<Text style={styles.nextButtonText}>
							{currentIndex === slides.length - 1 ? 'Commencer' : 'Suivant'}
						</Text>
						<Ionicons
							name={currentIndex === slides.length - 1 ? 'checkmark' : 'arrow-forward'}
							size={24}
							color="white"
						/>
					</View>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F9FAFB',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingBottom: 20,
	},
	logo: {
		width: 120,
		height: 40,
	},
	skipButton: {
		position: 'absolute',
		right: 20,
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	skipText: {
		fontSize: 16,
		color: '#6B7280',
		fontFamily: 'Poppins-SemiBold',
	},
	slideContainer: {
		width: SCREEN_WIDTH,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 32,
	},
	imageContainer: {
		width: SCREEN_WIDTH * 0.78,
		height: SCREEN_WIDTH * 0.78,
		borderRadius: 32,
		overflow: 'hidden',
		marginBottom: 36,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.18,
		shadowRadius: 20,
		elevation: 12,
	},
	slideImage: {
		width: '100%',
		height: '100%',
	},
	imageOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(6, 95, 70, 0.18)',
	},
	title: {
		fontSize: 26,
		fontFamily: 'Poppins-Bold',
		color: '#111827',
		textAlign: 'center',
		marginBottom: 14,
	},
	description: {
		fontSize: 15,
		fontFamily: 'Poppins-Regular',
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 24,
		paddingHorizontal: 6,
	},
	footer: {
		paddingHorizontal: 20,
		paddingBottom: 40,
	},
	pagination: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 32,
	},
	dot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		marginHorizontal: 6,
	},
	dotActive: {
		backgroundColor: PRIMARY_COLOR,
		width: 32,
	},
	dotInactive: {
		backgroundColor: '#D1D5DB',
	},
	nextButton: {
		borderRadius: 16,
		overflow: 'hidden',
		shadowColor: PRIMARY_COLOR,
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	nextButtonGradient: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 18,
		paddingHorizontal: 32,
		gap: 12,
		backgroundColor: PRIMARY_COLOR,
		borderRadius: 16,
	},
	nextButtonText: {
		fontSize: 18,
		fontFamily: 'Poppins-Bold',
		color: 'white',
	},
});
