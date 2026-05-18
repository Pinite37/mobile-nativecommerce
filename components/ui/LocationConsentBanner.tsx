import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { LocationStatus } from "../../hooks/useLocationForRegistration";

interface Props {
  status: LocationStatus;
  detectedCity: string | null;
  onRequest: () => void;
  onSkip: () => void;
  onReset: () => void;
}

export function LocationConsentBanner({
  status,
  detectedCity,
  onRequest,
  onSkip,
  onReset,
}: Props) {
  if (status === "skipped") {
    return (
      <TouchableOpacity onPress={onReset} activeOpacity={0.7} className="mb-4">
        <View className="flex-row items-center">
          <Ionicons name="location-outline" size={13} color="#9CA3AF" />
          <Text className="text-xs font-quicksand text-neutral-400 ml-1">
            Localisation ignorée —{" "}
            <Text className="text-primary font-quicksand-medium">
              Utiliser ma position
            </Text>
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (status === "requesting") {
    return (
      <View className="bg-white border border-neutral-200/60 rounded-2xl px-4 py-3 mb-4 shadow-sm flex-row items-center">
        <ActivityIndicator size="small" color="#10B981" />
        <Text className="font-quicksand text-neutral-500 ml-3 text-sm">
          Détection de votre position...
        </Text>
      </View>
    );
  }

  if (status === "granted") {
    return (
      <View className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mr-3">
              <Ionicons name="location" size={16} color="#10B981" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-quicksand text-emerald-600 mb-0.5">
                Position détectée
              </Text>
              {detectedCity ? (
                <Text className="font-quicksand-semibold text-emerald-900 text-sm">
                  {detectedCity}
                </Text>
              ) : (
                <Text className="font-quicksand text-emerald-700 text-xs">
                  Coordonnées enregistrées
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={onSkip} activeOpacity={0.7} className="ml-3">
            <Text className="text-xs font-quicksand text-neutral-400 underline">
              Ignorer
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (status === "denied") {
    return (
      <View className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center mr-3">
            <Ionicons name="location-outline" size={16} color="#F59E0B" />
          </View>
          <View className="flex-1">
            <Text className="font-quicksand-medium text-amber-800 text-sm mb-0.5">
              Localisation désactivée
            </Text>
            <Text className="font-quicksand text-amber-700 text-xs leading-4">
              Activez la localisation dans les réglages ou renseignez votre ville manuellement.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 mb-4">
        <View className="flex-row items-center mb-3">
          <View className="w-8 h-8 rounded-full bg-neutral-100 items-center justify-center mr-3">
            <Ionicons name="warning-outline" size={16} color="#9CA3AF" />
          </View>
          <View className="flex-1">
            <Text className="font-quicksand-medium text-neutral-700 text-sm mb-0.5">
              Position indisponible
            </Text>
            <Text className="font-quicksand text-neutral-500 text-xs">
              GPS désactivé ou signal faible.
            </Text>
          </View>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            onPress={onRequest}
            activeOpacity={0.8}
            className="flex-1 bg-neutral-200 rounded-xl py-2 items-center mr-2"
          >
            <Text className="font-quicksand-medium text-neutral-700 text-sm">
              Réessayer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onSkip}
            activeOpacity={0.8}
            className="flex-1 border border-neutral-200 rounded-xl py-2 items-center"
          >
            <Text className="font-quicksand text-neutral-500 text-sm">
              Passer
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // idle — default state
  return (
    <View className="bg-white border border-neutral-200/60 rounded-2xl px-4 py-3 mb-4 shadow-sm">
      <View className="flex-row items-center mb-3">
        <View className="w-9 h-9 rounded-full bg-emerald-50 items-center justify-center mr-3">
          <Ionicons name="locate-outline" size={18} color="#10B981" />
        </View>
        <View className="flex-1">
          <Text className="font-quicksand-medium text-neutral-800 text-sm">
            Détecter ma ville automatiquement
          </Text>
          <Text className="font-quicksand text-neutral-400 text-xs">
            Utilise le GPS de votre téléphone
          </Text>
        </View>
      </View>
      <View className="flex-row">
        <TouchableOpacity
          onPress={onRequest}
          activeOpacity={0.8}
          className="flex-1 bg-emerald-500 rounded-xl py-2.5 items-center mr-2"
        >
          <Text className="font-quicksand-semibold text-white text-sm">
            Détecter ma position
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSkip}
          activeOpacity={0.8}
          className="border border-neutral-200 rounded-xl py-2.5 px-4 items-center"
        >
          <Text className="font-quicksand text-neutral-500 text-sm">
            Passer
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
