import { Redirect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

export default function PublicProductShare() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const { colors } = useTheme();

  if (id && !isLoading) {
    if (isAuthenticated && userRole === "ENTERPRISE") {
      return <Redirect href={`/(app)/(enterprise)/product/${id}` as any} />;
    }

    if (isAuthenticated && userRole === "CLIENT") {
      return <Redirect href={`/(app)/(client)/product/${id}` as any} />;
    }

    if (isAuthenticated) {
      return <Redirect href={"/(auth)/welcome" as any} />;
    }

    return <Redirect href={`/(app)/(client)/product/${id}` as any} />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </View>
  );
}
