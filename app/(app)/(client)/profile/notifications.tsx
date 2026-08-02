import NotificationsScreen from "@/components/notifications/NotificationsScreen";
import i18n from "@/i18n/i18n";
import { useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";

export default function ClientNotificationsScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  return (
    <NotificationsScreen
      title={i18n.t("client.notifications.title")}
      emptyMessage={i18n.t("client.notifications.empty")}
    />
  );
}
