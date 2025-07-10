import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export const CustomTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  // Force apply default family for the entire tab bar if needed
  React.useEffect(() => {
    // This is just a side effect to ensure fonts are applied
    console.log('TabBar mounted with Quicksand font family');
  }, []);
  const focusedOptions = descriptors[state.routes[state.index].key].options;

  // Modern Expo Router uses tabBarStyle: { display: 'none' } instead of tabBarVisible
  if (focusedOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View className="flex-row bg-white border-t-0 shadow-lg rounded-t-3xl" style={{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 15,
      paddingTop: 12,
      paddingBottom: 28, // Plus de padding en bas pour les téléphones avec barre home
      paddingHorizontal: 12,
      height: 85,
    }}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined 
          ? options.tabBarLabel 
          : options.title !== undefined 
          ? options.title 
          : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Get the icon component
        const IconComponent = options.tabBarIcon;
        
        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel || `Onglet ${label}`}
            testID={options.tabBarTestID || `tab-${label}`}
            onPress={onPress}
            onLongPress={onLongPress}
            className={`flex-1 items-center justify-center py-2 mx-1 rounded-2xl ${
              isFocused ? 'bg-primary/10' : 'bg-transparent'
            }`}
            style={{
              minHeight: 50,
              transform: [{ scale: isFocused ? 1.05 : 1 }],
              // Add a slight animation for better UX
              transitionDuration: '150ms',
            }}
          >
            <View className="items-center justify-center">
              {IconComponent && (
                <IconComponent
                  color={isFocused ? '#FE8C00' : '#6B7280'}
                  size={isFocused ? 24 : 22}
                  focused={isFocused}
                  style={{
                    marginBottom: 3, // Add some spacing between icon and text
                  }}
                />
              )}
              <Text
                className={`mt-1 ${
                  isFocused ? 'text-primary' : 'text-gray-500'
                }`}
                style={{
                  fontSize: 12,
                  lineHeight: 14,
                  textAlign: 'center',
                  fontFamily: 'Quicksand-SemiBold', // Utilisation explicite de la police via style
                }}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
              >
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
