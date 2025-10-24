import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

interface OnboardingSlideProps {
  title: string;
  subtitle: string;
  image: any;
  onNext: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  isLast?: boolean;
  isFirst?: boolean;
  currentIndex: number;
  totalSlides: number;
}

export default function OnboardingSlide({
  title,
  subtitle,
  image,
  onNext,
  onPrevious,
  onSkip,
  isLast = false,
  isFirst = false,
  currentIndex,
  totalSlides
}: OnboardingSlideProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Header with Skip Button */}
      <View className="flex-row justify-between items-center px-6 pt-16 pb-4">
        <View className="w-12" />
        {!isLast && (
          <TouchableOpacity
            onPress={onSkip}
            className="px-4 py-2"
            activeOpacity={1}
          >
            <Text className="text-neutral-500 font-quicksand-medium text-sm">
              Passer
            </Text>
          </TouchableOpacity>
        )}
        {isLast && <View className="w-12" />}
      </View>

      <Animated.View style={[animatedStyle]} className="flex-1">
        {/* Image Section */}
        <View className="flex-1 justify-center items-center px-6">
          <Image
            source={image}
            className="w-80 h-80 mb-8"
            resizeMode="contain"
          />

          {/* Title and Subtitle */}
          <View className="items-center mb-8">
            <Text className="text-2xl font-quicksand-bold text-neutral-900 text-center mb-4">
              {title}
            </Text>
            <Text className="text-base font-quicksand text-neutral-600 text-center leading-6">
              {subtitle}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom Section */}
      <View className="px-6 pb-12">
        {/* Dots Indicator */}
        <View className="flex-row justify-center mb-8">
          {Array.from({ length: totalSlides }).map((_, index) => (
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
          {!isFirst && (
            <TouchableOpacity
              onPress={onPrevious}
              className="border border-neutral-300 rounded-full py-4 px-8 mr-4"
              activeOpacity={1}
            >
              <Text className="text-neutral-700 font-quicksand-semibold text-base">
                Précédent
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onNext}
            className={`bg-primary rounded-full py-4 px-8 ${!isFirst ? 'flex-1' : 'min-w-32'}`}
            activeOpacity={1}
          >
            <Text className="text-white font-quicksand-semibold text-base text-center">
              {isLast ? 'Commencer' : 'Suivant'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
