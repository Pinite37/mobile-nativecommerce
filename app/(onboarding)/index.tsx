import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingService from '../../services/OnboardingService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PRIMARY_COLOR = '#10B981';

interface OnboardingSlide {
	id: string;
	title: string;
	description: string;
	imageUri: string;
}

const slides: OnboardingSlide[] = [
	{
		id: '1',
		title: 'Découvrez des milliers de produits',
		description: 'Explorez une vaste sélection de produits provenant d\'entreprises vérifiées et de confiance.',
		imageUri: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&q=80&fit=crop',
	},
	{
		id: '2',
		title: 'Connectez-vous aux entreprises',
		description: 'Mettez-vous en relation directe avec des entreprises locales et découvrez leurs meilleures offres.',
		imageUri: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&fit=crop',
	},
	{
		id: '3',
		title: 'Commandez en toute sécurité',
		description: 'Profitez d\'une expérience d\'achat sécurisée avec suivi de commande en temps réel.',
		imageUri: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=80&fit=crop',
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
			await OnboardingService.markOnboardingComplete();
			router.replace('/(app)/(client)/(tabs)');
		}
	};

	const handleSkip = async () => {
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
			<StatusBar style="light" />

			{/* Slides plein cadre : photo + voile sombre + texte en bas */}
			<ScrollView
				ref={scrollViewRef}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onScroll={handleScroll}
				scrollEventThrottle={16}
				bounces={false}
			>
				{slides.map((slide) => (
					<View key={slide.id} style={styles.slide}>
						<Image
							source={{ uri: slide.imageUri }}
							style={StyleSheet.absoluteFill}
							resizeMode="cover"
						/>
						<LinearGradient
							colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.92)']}
							locations={[0, 0.28, 0.55, 1]}
							style={StyleSheet.absoluteFill}
						/>

						<View style={[styles.slideContent, { paddingBottom: insets.bottom + 210 }]}>
							<Text style={styles.title}>{slide.title}</Text>
							<Text style={styles.description}>{slide.description}</Text>
						</View>
					</View>
				))}
			</ScrollView>

			{/* Header flottant : logo + Passer */}
			<View style={[styles.header, { paddingTop: insets.top + 12 }]}>
				<View style={styles.logoBadge}>
					<Image
						source={require('../../assets/images/axiLogoo.png')}
						style={styles.logo}
						resizeMode="contain"
					/>
				</View>
				<TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.75}>
					<Text style={styles.skipText}>Passer</Text>
				</TouchableOpacity>
			</View>

			{/* Footer flottant : pagination + bouton */}
			<View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
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

				<TouchableOpacity onPress={handleNext} style={styles.nextButton} activeOpacity={0.85}>
					<Text style={styles.nextButtonText}>
						{currentIndex === slides.length - 1 ? 'Commencer' : 'Suivant'}
					</Text>
					<Ionicons
						name={currentIndex === slides.length - 1 ? 'checkmark' : 'arrow-forward'}
						size={22}
						color="#FFFFFF"
					/>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000000',
	},
	slide: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
	},
	slideContent: {
		flex: 1,
		justifyContent: 'flex-end',
		paddingHorizontal: 28,
	},
	header: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingBottom: 12,
	},
	logoBadge: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 16,
		backgroundColor: 'rgba(255,255,255,0.94)',
	},
	logo: {
		width: 90,
		height: 30,
	},
	skipButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: 'rgba(255,255,255,0.16)',
	},
	skipText: {
		fontSize: 14,
		color: '#FFFFFF',
		fontFamily: 'Poppins-SemiBold',
	},
	title: {
		fontSize: 30,
		fontFamily: 'Poppins-Bold',
		color: '#FFFFFF',
		marginBottom: 12,
	},
	description: {
		fontSize: 15,
		fontFamily: 'Poppins-Regular',
		color: 'rgba(255,255,255,0.85)',
		lineHeight: 23,
	},
	footer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		paddingHorizontal: 28,
	},
	pagination: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
		gap: 6,
	},
	dot: {
		height: 6,
		borderRadius: 3,
	},
	dotActive: {
		backgroundColor: PRIMARY_COLOR,
		width: 28,
	},
	dotInactive: {
		backgroundColor: 'rgba(255,255,255,0.35)',
		width: 6,
	},
	nextButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
		paddingVertical: 17,
		borderRadius: 16,
		backgroundColor: PRIMARY_COLOR,
		shadowColor: PRIMARY_COLOR,
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.4,
		shadowRadius: 12,
		elevation: 8,
	},
	nextButtonText: {
		fontSize: 17,
		fontFamily: 'Poppins-Bold',
		color: '#FFFFFF',
	},
});
