import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '../../../../contexts/LocaleContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import i18n from '../../../../i18n/i18n';
import CategoryService from '../../../../services/api/CategoryService';

export default function AllCategoriesPage() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { locale } = useLocale();
    const { colors, isDark } = useTheme();
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

    const handleCategoryPress = (categoryId: string) => {
        router.push(`/(app)/(enterprise)/category/${categoryId}`);
    };

    const categoryColors = ["#FF6B35", "#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#6366F1", "#EF4444", "#F59E0B"];
    const icons = ["flame", "car-sport", "home", "phone-portrait", "laptop", "bed", "shirt", "construct"];

    // Détecte tous les types d'emojis
    const isEmoji = (str: string) => {
        const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
        return emojiRegex.test(str);
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.secondary }}>
            <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />

            {/* Header avec gradient */}
            <LinearGradient
                colors={['#047857', '#10B981']}
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
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mr-3"
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-white text-xl font-quicksand-bold">
                            {i18n.t("enterprise.categories.title")}
                        </Text>
                        {!loading && (
                            <Text className="text-white/80 text-xs font-quicksand-medium mt-1">
                                {categories.length} {categories.length > 1 ? i18n.t("enterprise.categories.count.plural") : i18n.t("enterprise.categories.count.singular")} {categories.length > 1 ? i18n.t("enterprise.categories.count.availables") : i18n.t("enterprise.categories.count.available")}
                            </Text>
                        )}
                    </View>
                </View>
            </LinearGradient>

            {/* Contenu */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#10B981" />
                </View>
            ) : categories.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="file-tray-outline" size={64} color={colors.textSecondary} />
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 18, marginTop: 16 }}>
                        {i18n.t("enterprise.categories.empty.title")}
                    </Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 80 }}
                >
                    {categories.map((category: any, index: number) => {
                        const categoryColor = category.color || categoryColors[index % categoryColors.length];
                        const categoryIcon = category.icon || icons[index % icons.length];

                        return (
                            <TouchableOpacity
                                key={category._id}
                                onPress={() => handleCategoryPress(category._id)}
                                style={{
                                    backgroundColor: colors.card,
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    marginBottom: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    padding: 16,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4,
                                    elevation: 3,
                                    borderWidth: 1,
                                    borderColor: colors.border
                                }}
                            >
                                {/* Icône de la catégorie */}
                                <View
                                    className="w-16 h-16 rounded-2xl justify-center items-center mr-4"
                                    style={{
                                        backgroundColor: categoryColor + "15",
                                        borderWidth: 1,
                                        borderColor: categoryColor + "30",
                                    }}
                                >
                                    {isEmoji(categoryIcon) ? (
                                        <Text className="text-3xl">{categoryIcon}</Text>
                                    ) : (
                                        <Ionicons
                                            name={categoryIcon as any}
                                            size={28}
                                            color={categoryColor}
                                        />
                                    )}
                                </View>

                                {/* Informations de la catégorie */}
                                <View className="flex-1">
                                    <Text style={{ color: colors.textPrimary, fontSize: 16, fontFamily: 'Quicksand-Bold', marginBottom: 4 }}>
                                        {category.name}
                                    </Text>
                                    {category.description && (
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Quicksand-Medium' }} numberOfLines={1}>
                                            {category.description}
                                        </Text>
                                    )}
                                    {category.productCount !== undefined && (
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Quicksand-Medium', marginTop: 4 }}>
                                            {category.productCount} {category.productCount > 1 ? i18n.t("enterprise.categories.products.plural") : i18n.t("enterprise.categories.products.singular")}
                                        </Text>
                                    )}
                                </View>

                                {/* Flèche de navigation */}
                                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}
