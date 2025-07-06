import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import OnboardingSlide from '../../components/onboarding/OnboardingSlide';

const onboardingData = [
	{
		title: 'Discover Endless Shopping Possibilities',
		subtitle: 'Explore a vast collection of products from top brands, all in one place.',
		image: require('../../assets/images/react-logo.png'), // Placeholder - vous pourrez remplacer par vos vraies images
	},
	{
		title: 'Shop from Verified Businesses',
		subtitle: 'Connect with trusted enterprises and discover quality products tailored to your needs.',
		image: require('../../assets/images/react-logo.png'),
	},
	{
		title: 'Fast & Reliable Delivery',
		subtitle: 'Track your orders in real-time and enjoy secure, fast delivery to your doorstep.',
		image: require('../../assets/images/react-logo.png'),
	},
];

export default function OnboardingScreen() {
	const [currentIndex, setCurrentIndex] = useState(0);

	const handleNext = () => {
		if (currentIndex < onboardingData.length - 1) {
			setCurrentIndex(currentIndex + 1);
		} else {
			// Navigate to auth screens
			router.push('/(auth)/welcome');
		}
	};

	const handlePrevious = () => {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1);
		}
	};

	const handleSkip = () => {
		router.push('/(auth)/welcome');
	};

	return (
		<View className="flex-1">
			<OnboardingSlide
				title={onboardingData[currentIndex].title}
				subtitle={onboardingData[currentIndex].subtitle}
				image={onboardingData[currentIndex].image}
				onNext={handleNext}
				onPrevious={handlePrevious}
				onSkip={handleSkip}
				isLast={currentIndex === onboardingData.length - 1}
				isFirst={currentIndex === 0}
				currentIndex={currentIndex}
				totalSlides={onboardingData.length}
			/>
		</View>
	);
}
