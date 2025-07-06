import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export const CustomTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  const focusedOptions = descriptors[state.routes[state.index].key].options;

  if (focusedOptions.tabBarVisible === false) {
    return null;
  }

  return (
    <View className="flex-row bg-white border-t-0 shadow-lg rounded-t-3xl" style={{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 15,
      paddingTop: 15,
      paddingBottom: 25,
      paddingHorizontal: 10,
      height: 90,
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
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            className={`flex-1 items-center justify-center py-2 mx-1 rounded-2xl ${
              isFocused ? 'bg-primary/10' : 'bg-transparent'
            }`}
            style={{
              minHeight: 50,
              transform: [{ scale: isFocused ? 1.05 : 1 }],
            }}
          >
            <View className="items-center justify-center">
              {IconComponent && (
                <IconComponent
                  color={isFocused ? '#FE8C00' : '#6B7280'}
                  size={22}
                  focused={isFocused}
                />
              )}
              <Text
                className={`text-xs mt-1 font-quicksand-semibold ${
                  isFocused ? 'text-primary' : 'text-gray-500'
                }`}
                style={{
                  fontSize: 10,
                  lineHeight: 12,
                  textAlign: 'center',
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
