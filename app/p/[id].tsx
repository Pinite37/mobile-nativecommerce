import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

export default function PublicProductShare() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const { colors } = useTheme();

  // Route all users to the same rich client product detail screen.
  // Authenticated enterprise users keep their dedicated enterprise view.
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
      return;
    }

    router.replace(`/(app)/(client)/product/${id}` as any);
  }, [id, isAuthenticated, userRole, isLoading, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
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
