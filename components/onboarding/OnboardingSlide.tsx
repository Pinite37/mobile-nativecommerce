import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = translateX.value;
    },
    onActive: (event, context: any) => {
      translateX.value = context.startX + event.translationX;
      opacity.value = Math.max(0.3, 1 - Math.abs(event.translationX) / 300);
    },
    onEnd: (event) => {
      const threshold = 100;
      
      if (event.translationX > threshold && !isFirst) {
        // Swipe right - go to previous
        runOnJS(onPrevious || (() => {}))();
      } else if (event.translationX < -threshold && !isLast) {
        // Swipe left - go to next
        runOnJS(onNext)();
      }
      
      // Reset position
      translateX.value = withSpring(0);
      opacity.value = withSpring(1);
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  return (
    <GestureHandlerRootView className="flex-1">
      <View className="flex-1 bg-white">
        <StatusBar style="dark" />
        
        {/* Header with Skip Button */}
        <View className="flex-row justify-between items-center px-6 pt-16 pb-4">
          <View className="w-12" />
          {!isLast && (
            <TouchableOpacity
              onPress={onSkip}
              className="px-4 py-2"
            >
              <Text className="text-neutral-500 font-quicksand-medium text-sm">
                Skip
              </Text>
            </TouchableOpacity>
          )}
          {isLast && <View className="w-12" />}
        </View>

        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View style={[animatedStyle]} className="flex-1">
            {/* Image Section */}
            <View className="flex-1 justify-center items-center px-6">
              <Image
                source={image}
                className="w-80 h-80 mb-8"
                resizeMode="contain"
              />
              
              {/* Title */}
              <Text className="text-2xl font-quicksand-bold text-center text-neutral-900 mb-4 px-4">
                {title}
              </Text>
              
              {/* Subtitle */}
              <Text className="text-base font-quicksand text-center text-neutral-600 leading-6 px-8">
                {subtitle}
              </Text>
            </View>
          </Animated.View>
        </PanGestureHandler>

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
          <View className="flex-row justify-between items-center">
            {/* Previous Button */}
            {/* {!isFirst ? (
              <TouchableOpacity
                onPress={onPrevious}
                className="w-12 h-12 rounded-full bg-neutral-100 items-center justify-center"
              >
                <View className="w-2 h-2 rounded-full bg-neutral-600" />
              </TouchableOpacity>
            ) : (
              <View className="w-12" />
            )} */}
            
            {/* Next Button */}
            <TouchableOpacity
              onPress={onNext}
              className="bg-primary rounded-full py-4 px-8 flex-1 ml-4"
            >
              <Text className="text-white font-quicksand-semibold text-base text-center">
                {isLast ? 'Get Started' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Swipe Hint
          <Text className="text-center text-neutral-400 font-quicksand text-xs mt-4">
            Swipe left or right to navigate
          </Text> */}
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
