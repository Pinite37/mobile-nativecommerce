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
import type { Advertisement } from "../../services/api/AdvertisementService";
import AdvertisementService from "../../services/api/AdvertisementService";

export default function PublicAdvertisementShare() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const { colors } = useTheme();

  const [advertisement, setAdvertisement] = useState<Advertisement | null>(
    null,
  );
  const [loadingAd, setLoadingAd] = useState(true);

  // If authenticated, jump to the role's advertisement screen.
  useEffect(() => {
    if (!id) return;
    if (isLoading) return;

    if (isAuthenticated && userRole) {
      if (userRole === "ENTERPRISE") {
        router.replace(`/(app)/(enterprise)/advertisement/${id}` as any);
      } else if (userRole === "CLIENT") {
        router.replace(`/(app)/(client)/advertisement/${id}` as any);
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
        setLoadingAd(true);
        const adData =
          await AdvertisementService.getActiveAdvertisementById(id);
        setAdvertisement(adData);
      } catch {
        setAdvertisement(null);
      } finally {
        setLoadingAd(false);
      }
    };

    load();
  }, [id, isAuthenticated, isLoading]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
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
          {i18n.t("client.advertisement.header.title") ?? "Publicité"}
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {loadingAd ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !advertisement ? (
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
              {i18n.t("client.advertisement.error.notFound") ??
                "Publicité introuvable"}
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
              {advertisement.images?.[0] ? (
                <Image
                  source={{ uri: advertisement.images[0] }}
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
                  {advertisement.title}
                </Text>

                <Text
                  style={{
                    marginTop: 6,
                    color: colors.textTertiary,
                    fontSize: 12,
                    fontFamily: "Quicksand-Medium",
                  }}
                >
                  {i18n.t("enterprise.advertisementDetails.info.validUntil", {
                    date: formatDate(advertisement.endDate),
                  }) ?? `Valable jusqu'au ${formatDate(advertisement.endDate)}`}
                </Text>

                {advertisement.description ? (
                  <Text
                    style={{
                      marginTop: 10,
                      color: colors.textSecondary,
                      fontFamily: "Quicksand-Medium",
                    }}
                  >
                    {advertisement.description}
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
