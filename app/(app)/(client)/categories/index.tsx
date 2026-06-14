import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCategoryIcon } from '../../../../constants/CategoryIcons';
import { useTheme } from '../../../../contexts/ThemeContext';
import i18n from '../../../../i18n/i18n';
import CategoryService from '../../../../services/api/CategoryService';

export default function AllCategoriesPage() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { colors } = useTheme();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const response = await CategoryService.getAllCategories();
            setCategories(response);
        } catch (error) {
            console.error('❌ Erreur chargement catégories:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
            <ExpoStatusBar style="light" translucent />

            <LinearGradient
                colors={['#059669', '#10B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-b-3xl shadow-md"
                style={{
                    paddingTop: insets.top + 16,
                    paddingLeft: insets.left + 24,
                    paddingRight: insets.right + 24,
                    paddingBottom: 20
                }}
            >
                <View className="flex-row items-center mb-3">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-white text-xl font-quicksand-bold">
                            {i18n.t("client.categories.title")}
                        </Text>
                        {!loading && (
                            <Text className="text-white/80 text-xs font-quicksand-medium mt-1">
                                {i18n.t(categories.length === 1 ? "client.categories.subtitle.singular" : "client.categories.subtitle.plural", { count: categories.length })}
                            </Text>
                        )}
                    </View>
                </View>
            </LinearGradient>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={colors.brandPrimary} />
                </View>
            ) : categories.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="file-tray-outline" size={64} color={colors.textSecondary} />
                    <Text className="text-lg font-quicksand-bold mt-4" style={{ color: colors.textPrimary }}>
                        {i18n.t("client.categories.empty")}
                    </Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 80 }}
                >
                    {categories.map((category: any) => {
                        const localIcon = getCategoryIcon(category.name);

                        return (
                            <TouchableOpacity
                                key={category._id}
                                onPress={() => router.push(`/(app)/(client)/category/${category._id}`)}
                                className="rounded-2xl overflow-hidden mb-4 flex-row items-center p-4"
                                style={{
                                    backgroundColor: colors.card,
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4,
                                    elevation: 3,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                }}
                            >
                                <View className="w-14 h-14 justify-center items-center mr-4">
                                    {localIcon ? (
                                        <Image
                                            source={localIcon}
                                            style={{ width: 48, height: 48 }}
                                            resizeMode="contain"
                                        />
                                    ) : (
                                        <Ionicons name="grid-outline" size={28} color={colors.textSecondary} />
                                    )}
                                </View>

                                <View className="flex-1">
                                    <Text className="text-base font-quicksand-bold mb-1" style={{ color: colors.textPrimary }}>
                                        {category.name}
                                    </Text>
                                    {category.description && (
                                        <Text className="text-xs font-quicksand-medium" numberOfLines={1} style={{ color: colors.textSecondary }}>
                                            {category.description}
                                        </Text>
                                    )}
                                    {category.productCount !== undefined && (
                                        <Text className="text-xs font-quicksand-medium mt-1" style={{ color: colors.textSecondary }}>
                                            {i18n.t(category.productCount === 1 ? "client.categories.productCount.singular" : "client.categories.productCount.plural", { count: category.productCount })}
                                        </Text>
                                    )}
                                </View>

                                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}
