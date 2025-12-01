import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import i18n from '../../i18n/i18n';

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
  const { colors } = useTheme();
  const isUpgrade = currentPlanName && currentPlanName !== plan?.name;
  const isFree = plan?.price === 'Gratuit';

  if (!plan) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <BlurView intensity={20} className="absolute inset-0" />
        
        <View style={{ backgroundColor: colors.card, borderRadius: 24, width: '100%', maxWidth: 400, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 }}>
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
            
            <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 24, marginBottom: 4 }}>
              {isUpgrade ? `${i18n.t('enterprise.subscription.upgrade.switchTo')} ` : `${i18n.t('enterprise.subscription.upgrade.activate')} `}{plan.name}
            </Text>
            <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 14, lineHeight: 20 }}>
              {isUpgrade 
                ? i18n.t('enterprise.subscription.upgrade.switchingFromTo', { from: currentPlanName, to: plan.name })
                : i18n.t('enterprise.subscription.upgrade.activatingPlan', { plan: plan.name })
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
              <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                  {i18n.t('enterprise.subscription.upgrade.price')}
                </Text>
                <View className="flex-row items-baseline">
                  <Text 
                    style={{ fontSize: 30, fontFamily: 'Quicksand-Bold', color: plan.color }}
                  >
                    {plan.price}
                  </Text>
                  {plan.period && (
                    <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 14, marginLeft: 8 }}>
                      {plan.period}
                    </Text>
                  )}
                </View>
              </View>

              {/* Features List */}
              <View className="mb-5">
                <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 14, marginBottom: 12 }}>
                  {i18n.t('enterprise.subscription.upgrade.whatsIncluded')}
                </Text>
                {plan.features.map((feature, idx) => (
                  <View key={idx} className="flex-row items-start mb-2.5">
                    <View 
                      className="w-5 h-5 rounded-full items-center justify-center mt-0.5 mr-3"
                      style={{ backgroundColor: `${plan.color}20` }}
                    >
                      <Ionicons name="checkmark" size={14} color={plan.color} />
                    </View>
                    <Text style={{ flex: 1, color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 14, lineHeight: 20 }}>
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
                      <Text style={{ color: '#1E3A8A', fontFamily: 'Quicksand-Bold', fontSize: 14, marginBottom: 4 }}>
                        {i18n.t('enterprise.subscription.upgrade.securePayment')}
                      </Text>
                      <Text style={{ color: '#1D4ED8', fontFamily: 'Quicksand-Medium', fontSize: 12, lineHeight: 18 }}>
                        {i18n.t('enterprise.subscription.upgrade.paymentProcessedVia')}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Important Notice */}
              <View className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <View className="flex-row items-start">
                  <Ionicons name="information-circle" size={20} color="#F59E0B" style={{ marginTop: 1, marginRight: 8 }} />
                  <Text style={{ flex: 1, color: '#92400E', fontFamily: 'Quicksand-Medium', fontSize: 12, lineHeight: 18 }}>
                    {isUpgrade 
                      ? i18n.t('enterprise.subscription.upgrade.upgradeNotice')
                      : isFree
                        ? i18n.t('enterprise.subscription.upgrade.freeTrialNotice')
                        : i18n.t('enterprise.subscription.upgrade.activationNotice')
                    }
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ padding: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.secondary }}>
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
                  <Text style={{ color: '#FFFFFF', fontFamily: 'Quicksand-Bold', fontSize: 16 }}>
                    {isFree ? i18n.t('enterprise.subscription.upgrade.activateFree') : i18n.t('enterprise.subscription.upgrade.confirmAndPay')}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onCancel}
              disabled={loading}
              style={{ borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
            >
              <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 16 }}>
                {i18n.t('common.actions.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
