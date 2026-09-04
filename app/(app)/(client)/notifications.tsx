import NotificationsScreen from "@/components/notifications/NotificationsScreen";
import i18n from "@/i18n/i18n";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";

export default function ClientNotificationsScreen() {
  const navigation = useNavigation();
  // D'où l'utilisateur est arrivé : la cloche de l'accueil et la ligne du
  // profil mènent toutes deux ici, et « retour » doit renvoyer à celle des
  // deux qui a réellement servi de point de départ.
  const { from } = useLocalSearchParams<{ from?: string }>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  return (
    <NotificationsScreen
      title={i18n.t("client.notifications.title")}
      emptyMessage={i18n.t("client.notifications.empty")}
      onBack={() =>
        router.replace(from === "profile" ? "/(app)/(client)/(tabs)/profile" : "/(app)/(client)/(tabs)")
      }
    />
  );
}
