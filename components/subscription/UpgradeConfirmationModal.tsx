import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  color: string;
  features: string[];
}

interface UpgradeConfirmationModalProps {
  visible: boolean;
  plan: Plan | null;
  currentPlanName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function UpgradeConfirmationModal({
  visible,
  plan,
  currentPlanName,
  onConfirm,
  onCancel,
  loading = false,
}: UpgradeConfirmationModalProps) {
  if (!plan) return null;

  const isUpgrade = currentPlanName && currentPlanName !== plan.name;
  const isFree = plan.price === 'Gratuit';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <BlurView intensity={20} className="absolute inset-0" />
        
        <View className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
          {/* Header */}
          <View 
            className="p-6 pb-5"
            style={{ backgroundColor: `${plan.color}10` }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View 
                className="w-14 h-14 rounded-2xl items-center justify-center shadow-sm"
                style={{ backgroundColor: plan.color }}
              >
                <Ionicons name="arrow-up-circle" size={28} color="#FFFFFF" />
              </View>
              <TouchableOpacity
                onPress={onCancel}
                disabled={loading}
                className="w-9 h-9 rounded-full bg-white items-center justify-center shadow-sm"
              >
                <Ionicons name="close" size={20} color="#737373" />
              </TouchableOpacity>
            </View>
            
            <Text className="text-neutral-800 font-quicksand-bold text-2xl mb-1">
              {isUpgrade ? 'Passer à ' : 'Activer '}{plan.name}
            </Text>
            <Text className="text-neutral-600 font-quicksand-medium text-sm leading-5">
              {isUpgrade 
                ? `Vous allez passer de ${currentPlanName} à ${plan.name}`
                : `Vous allez activer le plan ${plan.name}`
              }
            </Text>
          </View>

          <ScrollView 
            className="max-h-96"
            showsVerticalScrollIndicator={false}
          >
            {/* Plan Details */}
            <View className="p-6 pt-5">
              {/* Price Section */}
              <View className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl p-4 mb-5 border border-neutral-200">
                <Text className="text-neutral-500 font-quicksand-semibold text-xs uppercase tracking-wide mb-2">
                  Tarif
                </Text>
                <View className="flex-row items-baseline">
                  <Text 
                    className="text-3xl font-quicksand-bold"
                    style={{ color: plan.color }}
                  >
                    {plan.price}
                  </Text>
                  {plan.period && (
                    <Text className="text-neutral-600 font-quicksand-semibold text-sm ml-2">
                      {plan.period}
                    </Text>
                  )}
                </View>
              </View>

              {/* Features List */}
              <View className="mb-5">
                <Text className="text-neutral-700 font-quicksand-bold text-sm mb-3">
                  Ce qui est inclus :
                </Text>
                {plan.features.map((feature, idx) => (
                  <View key={idx} className="flex-row items-start mb-2.5">
                    <View 
                      className="w-5 h-5 rounded-full items-center justify-center mt-0.5 mr-3"
                      style={{ backgroundColor: `${plan.color}20` }}
                    >
                      <Ionicons name="checkmark" size={14} color={plan.color} />
                    </View>
                    <Text className="flex-1 text-neutral-700 font-quicksand-medium text-sm leading-5">
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Payment Method Info */}
              {!isFree && (
                <View className="bg-blue-50 rounded-xl p-4 mb-5 border border-blue-100">
                  <View className="flex-row items-start">
                    <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                      <Ionicons name="card" size={16} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-blue-900 font-quicksand-bold text-sm mb-1">
                        Paiement sécurisé
                      </Text>
                      <Text className="text-blue-700 font-quicksand-medium text-xs leading-5">
                        Le paiement sera traité via KKiaPay, une solution de paiement sécurisée
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Important Notice */}
              <View className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <View className="flex-row items-start">
                  <Ionicons name="information-circle" size={20} color="#F59E0B" style={{ marginTop: 1, marginRight: 8 }} />
                  <Text className="flex-1 text-amber-800 font-quicksand-medium text-xs leading-5">
                    {isUpgrade 
                      ? 'Votre abonnement actuel sera remplacé immédiatement après confirmation du paiement.'
                      : isFree
                        ? 'Vous bénéficierez d\'un essai gratuit de 1 mois.'
                        : 'Votre abonnement sera activé immédiatement après confirmation du paiement.'
                    }
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="p-6 pt-3 border-t border-neutral-100 bg-neutral-50">
            <TouchableOpacity
              onPress={onConfirm}
              disabled={loading}
              className="rounded-xl py-4 items-center justify-center shadow-sm mb-3"
              style={{ backgroundColor: plan.color }}
              activeOpacity={1}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-white font-quicksand-bold text-base">
                    {isFree ? 'Activer gratuitement' : 'Confirmer et payer'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onCancel}
              disabled={loading}
              className="rounded-xl py-4 items-center justify-center bg-white border border-neutral-200"
            >
              <Text className="text-neutral-700 font-quicksand-semibold text-base">
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
