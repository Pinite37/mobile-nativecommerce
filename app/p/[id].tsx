import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import i18n from "../../i18n/i18n";
import ProductService from "../../services/api/ProductService";
import { Product } from "../../types/product";

export default function PublicProductShare() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const { colors } = useTheme();

  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);

  // If authenticated, jump to the role's product screen.
  useEffect(() => {
    if (!id) return;
    if (isLoading) return;

    if (isAuthenticated && userRole) {
      if (userRole === "ENTERPRISE") {
        router.replace(`/(app)/(enterprise)/product/${id}` as any);
      } else if (userRole === "CLIENT") {
        router.replace(`/(app)/(client)/product/${id}` as any);
      } else {
        router.replace("/(auth)/welcome" as any);
      }
    }
  }, [id, isAuthenticated, userRole, isLoading, router]);

  // If not authenticated, show a lightweight public preview.
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      if (isLoading) return;
      if (isAuthenticated) return;

      try {
        setLoadingProduct(true);
        const productData = await ProductService.getPublicProductById(id);
        setProduct(productData);
      } catch {
        setProduct(null);
      } finally {
        setLoadingProduct(false);
      }
    };

    load();
  }, [id, isAuthenticated, isLoading]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  if (!id) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top,
        }}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
            {i18n.t("messages.error")}
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading || (isAuthenticated && userRole)) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top,
        }}
      >
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      <View
        style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 18,
            fontFamily: "Quicksand-Bold",
          }}
        >
          {i18n.t("client.product.details.title") ?? "Produit"}
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {loadingProduct ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !product ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 16,
                textAlign: "center",
              }}
            >
              {i18n.t("client.product.details.notFound") ??
                "Produit introuvable"}
            </Text>
            <TouchableOpacity
              style={{
                marginTop: 16,
                backgroundColor: colors.primary,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
              }}
              onPress={() => router.replace("/(auth)/welcome" as any)}
            >
              <Text style={{ color: "#fff", fontFamily: "Quicksand-Bold" }}>
                {i18n.t("auth.welcome.title") ?? "Aller à l'accueil"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View
              style={{
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
              }}
            >
              {product.images?.[0] ? (
                <Image
                  source={{ uri: product.images[0] }}
                  style={{ width: "100%", height: 220 }}
                  resizeMode="cover"
                />
              ) : null}

              <View style={{ padding: 16 }}>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: 18,
                    fontFamily: "Quicksand-Bold",
                  }}
                >
                  {product.name}
                </Text>
                <Text
                  style={{
                    marginTop: 6,
                    color: colors.primary,
                    fontSize: 18,
                    fontFamily: "Quicksand-Bold",
                  }}
                >
                  {formatPrice(product.price)}
                </Text>
                {product.description ? (
                  <Text
                    style={{
                      marginTop: 10,
                      color: colors.textSecondary,
                      fontFamily: "Quicksand-Medium",
                    }}
                  >
                    {product.description}
                  </Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              style={{
                marginTop: 16,
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
              }}
              onPress={() => router.replace("/(auth)/welcome" as any)}
            >
              <Text
                style={{
                  color: "#fff",
                  fontFamily: "Quicksand-Bold",
                  fontSize: 16,
                }}
              >
                {i18n.t("auth.welcome.title") ?? "Ouvrir l'application"}
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                marginTop: 10,
                color: colors.textTertiary,
                fontSize: 12,
                textAlign: "center",
              }}
            >
              {i18n.t("client.product.share.openInAppHint") ??
                "Connectez-vous pour accéder à toutes les fonctionnalités."}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
