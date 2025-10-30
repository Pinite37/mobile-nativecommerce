import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { Dimensions, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const onboardingData = [
	{
		title: 'Découvrez d\'innombrables possibilités d\'achat',
		subtitle: 'Explorez une vaste collection de produits des meilleures marques, tout en un seul endroit.',
		image: require('../../assets/images/axiLogoo.png'), // Placeholder - vous pourrez remplacer par vos vraies images
	},
	{
		title: 'Achetez auprès d\'entreprises vérifiées',
		subtitle: 'Connectez-vous avec des entreprises de confiance et découvrez des produits de qualité adaptés à vos besoins.',
		image: require('../../assets/images/axiLogoo.png'),
	},
	{
		title: 'Livraison rapide et fiable',
		subtitle: 'Suivez vos commandes en temps réel et profitez d\'une livraison sécurisée et rapide à votre porte.',
		image: require('../../assets/images/axiLogoo.png'),
	},
];

export default function OnboardingScreen() {
	const [currentIndex, setCurrentIndex] = useState(0);
	const scrollViewRef = useRef<ScrollView>(null);
	const { width: screenWidth } = Dimensions.get('window');

	const handleNext = () => {
		if (currentIndex < onboardingData.length - 1) {
			const nextIndex = currentIndex + 1;
			setCurrentIndex(nextIndex);
			scrollViewRef.current?.scrollTo({ x: nextIndex * screenWidth, animated: true });
		} else {
			// Navigate to auth screens
			router.push('/(auth)/welcome');
		}
	};

	const handlePrevious = () => {
		if (currentIndex > 0) {
			const prevIndex = currentIndex - 1;
			setCurrentIndex(prevIndex);
			scrollViewRef.current?.scrollTo({ x: prevIndex * screenWidth, animated: true });
		}
	};

	const handleSkip = () => {
		router.push('/(auth)/welcome');
	};

	const handleScroll = (event: any) => {
		const scrollPosition = event.nativeEvent.contentOffset.x;
		const newIndex = Math.round(scrollPosition / screenWidth);
		if (newIndex !== currentIndex && newIndex >= 0 && newIndex < onboardingData.length) {
			setCurrentIndex(newIndex);
		}
	};

	return (
		<View className="flex-1 bg-white">
			<StatusBar style="dark" />
			
			{/* Header with Skip Button - Fixed */}
			<View className="flex-row justify-between items-center px-6 pt-16 pb-4">
				<View className="w-12" />
				{currentIndex < onboardingData.length - 1 && (
					<TouchableOpacity
						onPress={handleSkip}
						className="px-4 py-2"
						activeOpacity={1}
					>
						<Text className="text-neutral-500 font-quicksand-medium text-sm">
							Passer
						</Text>
					</TouchableOpacity>
				)}
				{currentIndex === onboardingData.length - 1 && <View className="w-12" />}
			</View>

			{/* Scrollable Content */}
			<ScrollView
				ref={scrollViewRef}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onScroll={handleScroll}
				scrollEventThrottle={16}
				className="flex-1"
			>
				{onboardingData.map((slide, index) => (
					<View key={index} style={{ width: screenWidth }} className="flex-1 justify-center items-center px-6">
						{/* Image */}
						<Image
							source={slide.image}
							className="w-80 h-80 mb-8"
							resizeMode="contain"
						/>

						{/* Title and Subtitle */}
						<View className="items-center mb-8">
							<Text className="text-2xl font-quicksand-bold text-neutral-900 text-center mb-4">
								{slide.title}
							</Text>
							<Text className="text-base font-quicksand text-neutral-600 text-center leading-6">
								{slide.subtitle}
							</Text>
						</View>
					</View>
				))}
			</ScrollView>

			{/* Fixed Bottom Section */}
			<View className="px-6 pb-12">
				{/* Dots Indicator */}
				<View className="flex-row justify-center mb-8">
					{Array.from({ length: onboardingData.length }).map((_, index) => (
						<View
							key={index}
							className={`h-2 rounded-full mx-1 ${
								index === currentIndex
									? 'bg-primary w-8'
									: 'bg-neutral-300 w-2'
							}`}
						/>
					))}
				</View>

				{/* Navigation Buttons */}
				<View className="flex-row justify-center items-center">
					{currentIndex > 0 && (
						<TouchableOpacity
							onPress={handlePrevious}
							className="border border-neutral-300 rounded-full py-4 px-8 mr-4"
							activeOpacity={1}
						>
							<Text className="text-neutral-700 font-quicksand-semibold text-base">
								Précédent
							</Text>
						</TouchableOpacity>
					)}

					<TouchableOpacity
						onPress={handleNext}
						className={`bg-primary rounded-full py-4 px-8 ${currentIndex > 0 ? 'flex-1' : 'min-w-32'}`}
						activeOpacity={1}
					>
						<Text className="text-white font-quicksand-semibold text-base text-center">
							{currentIndex === onboardingData.length - 1 ? 'Commencer' : 'Suivant'}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);
}
