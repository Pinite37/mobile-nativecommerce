import { AppHeader } from '@/components/ui/AppHeader';
import { Ionicons } from '@expo/vector-icons';
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

    return (
        <View style={{ flex: 1, backgroundColor: colors.secondary }}>
            <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />

            <AppHeader
                title={i18n.t("enterprise.categories.title")}
                subtitle={!loading ? `${categories.length} ${categories.length > 1 ? i18n.t("enterprise.categories.count.plural") : i18n.t("enterprise.categories.count.singular")} ${categories.length > 1 ? i18n.t("enterprise.categories.count.availables") : i18n.t("enterprise.categories.count.available")}` : undefined}
            />

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#10B981" />
                </View>
            ) : categories.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="file-tray-outline" size={64} color={colors.textSecondary} />
                    <Text style={{ color: colors.textPrimary, fontFamily: 'PlusJakartaSans-Bold', fontSize: 18, marginTop: 16 }}>
                        {i18n.t("enterprise.categories.empty.title")}
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
                                onPress={() => router.push(`/(app)/(enterprise)/category/${category._id}`)}
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
                                <View style={{ width: 56, height: 56, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
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

                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.textPrimary, fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', marginBottom: 4 }}>
                                        {category.name}
                                    </Text>
                                    {category.description && (
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'PlusJakartaSans-Medium' }} numberOfLines={1}>
                                            {category.description}
                                        </Text>
                                    )}
                                    {category.productCount !== undefined && (
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', marginTop: 4 }}>
                                            {category.productCount} {category.productCount > 1 ? i18n.t("enterprise.categories.products.plural") : i18n.t("enterprise.categories.products.singular")}
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
