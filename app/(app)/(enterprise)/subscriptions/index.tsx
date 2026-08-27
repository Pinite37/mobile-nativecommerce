import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KkiapayPayment from "../../../../components/subscription/KkiapayPayment";
import StatusModal from "../../../../components/subscription/StatusModal";
import UpgradeConfirmationModal from "../../../../components/subscription/UpgradeConfirmationModal";
import { useAuth } from "../../../../contexts/AuthContext";
import { useSubscription } from "../../../../contexts/SubscriptionContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import { Shimmer } from "../../../../components/ui/Shimmer";
import i18n from "../../../../i18n/i18n";
import PaymentService from "../../../../services/api/PaymentService";
import SubscriptionService, {
  Plan,
} from "../../../../services/api/SubscriptionService";

const SkeletonCard = ({ colors }: { colors: any }) => (
  <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 20, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 }}>
    <View className="flex-row items-start justify-between mb-3">
      <View className="flex-1 mr-3">
        <Shimmer
          style={{ height: 20, borderRadius: 8, width: "40%", marginBottom: 8 }}
        />
        <Shimmer style={{ height: 24, borderRadius: 8, width: "60%" }} />
      </View>
      <Shimmer style={{ height: 24, borderRadius: 12, width: 80 }} />
    </View>
    <View className="mb-4">
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="flex-row items-start mb-2">
          <Shimmer
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              marginRight: 8,
              marginTop: 1,
            }}
          />
          <Shimmer style={{ height: 14, borderRadius: 6, width: "80%" }} />
        </View>
      ))}
    </View>
    <Shimmer style={{ height: 44, borderRadius: 22, width: "100%" }} />
  </View>
);

function EnterpriseSubscriptionsContent() {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscription, loadSubscription } = useSubscription();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [canGoBack, setCanGoBack] = useState(true);
  const isIosBillingRestricted = Platform.OS === "ios";

  // Modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // Status modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [statusTitle, setStatusTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Payment state
  const [currentIntentId, setCurrentIntentId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showKkiapayWidget, setShowKkiapayWidget] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{
    amount: number;
    email: string;
    phone: string;
    name: string;
    reason: string;
  } | null>(null);

  // Animation pour les points de chargement
  const pulseAnim = useState(new Animated.Value(0))[0];

  // Démarrer l'animation quand le modal de traitement est affiché
  useEffect(() => {
    if (processingPayment) {
      const startPulseAnimation = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 0,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      startPulseAnimation();
    } else {
      pulseAnim.setValue(0);
    }
  }, [processingPayment, pulseAnim]);

  // Callback KKiaPay success
  const handlePaymentSuccess = async (data: any) => {
    console.log("✅ KKiaPay SUCCESS:", data);
    setShowKkiapayWidget(false);
    setProcessingPayment(true);

    try {
      // Confirmer le paiement avec le backend
      if (currentIntentId && data.transactionId) {
        const confirmResult = await PaymentService.confirmPayment({
          intentId: currentIntentId,
          transactionId: data.transactionId,
        });

        console.log("✅ Paiement confirmé par le backend:", confirmResult);

        // Recharger la souscription
        await loadSubscription();
        await loadData();

        // Réinitialiser les états
        setCurrentIntentId(null);
        setShowUpgradeModal(false);
        setSelectedPlan(null);
        setPaymentConfig(null);

        // Afficher le succès
        setStatusType("success");
        setStatusTitle(i18n.t("enterprise.subscriptions.payment.success"));
        setStatusMessage(
          `${i18n.t("enterprise.subscriptions.payment.activated")} ${
            confirmResult.data.subscription
              ? ""
              : i18n.t("enterprise.subscriptions.payment.active")
          }. ${i18n.t("enterprise.subscriptions.payment.thanks")}`
        );
        setShowStatusModal(true);
        setCanGoBack(true); // Autoriser le retour après paiement réussi
      } else {
        throw new Error("Intention de paiement ou transaction ID manquant");
      }
    } catch (error: any) {
      console.error("❌ Erreur confirmation paiement:", error);
      setStatusType("error");
      setStatusTitle("Erreur");
      setStatusMessage(
        error.response?.data?.message ||
          i18n.t("enterprise.subscriptions.payment.confirmError")
      );
      setShowStatusModal(true);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Callback KKiaPay failed
  const handlePaymentFailed = (data: any) => {
    console.log("❌ KKiaPay FAILED:", data);
    setShowKkiapayWidget(false);
    setProcessingPayment(false);
    setCurrentIntentId(null);
    setPaymentConfig(null);

    setStatusType("error");
    setStatusTitle(i18n.t("enterprise.subscriptions.payment.failed"));
    setStatusMessage(i18n.t("enterprise.subscriptions.payment.failedMessage"));
    setShowStatusModal(true);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vérifier si l'utilisateur peut revenir en arrière
  useEffect(() => {
    if (isIosBillingRestricted) {
      setCanGoBack(true);
      return;
    }

    // Bloquer le retour si aucun abonnement actif
    if (subscription) {
      const hasActivePlan = Boolean(
        subscription.isActive && 
        subscription.endDate && 
        new Date(subscription.endDate) > new Date()
      );
      setCanGoBack(hasActivePlan);
      console.log('🔒 Retour autorisé:', hasActivePlan);
    } else {
      setCanGoBack(false);
      console.log('🔒 Retour bloqué: pas d\'abonnement');
    }
  }, [subscription, isIosBillingRestricted]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔄 Chargement des plans et souscription...");

      // Charger les plans disponibles et la souscription active en parallèle
      if (isIosBillingRestricted) {
        await loadSubscription();
      } else {
        await Promise.all([loadPlans(), loadSubscription()]);
      }

      console.log("✅ Données chargées");
    } catch (err: any) {
      console.error("❌ Erreur chargement:", err);
      setError(i18n.t("enterprise.subscriptions.payment.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const enterprisePlans = await SubscriptionService.getEnterprisePlans();
      setPlans(enterprisePlans);
    } catch (err: any) {
      console.error("❌ Erreur chargement plans:", err);
      throw err;
    }
  };

  // Handle plan selection
  const handleSelectPlan = (plan: Plan) => {
    if (isIosBillingRestricted) {
      return;
    }

    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  // Handle upgrade confirmation
  const handleConfirmUpgrade = async () => {
    if (!selectedPlan || !user) return;
    if (isIosBillingRestricted) return;

    try {
      setUpgradeLoading(true);
      console.log("🔄 Upgrade vers le plan:", selectedPlan.name);

      const isFree = selectedPlan.price === "Gratuit";

      if (isFree) {
        // Plan gratuit: activation directe
        // Plan gratuit - Activer le trial directement
        await SubscriptionService.activateTrialPlan();
        console.log("✅ Plan d'essai activé");

        // Recharger les données
        await loadSubscription();
        await loadData();

        // Fermer le modal et afficher le succès
        setShowUpgradeModal(false);
        setSelectedPlan(null);

        setStatusType("success");
        setStatusTitle("🎉 Succès !");
        setStatusMessage(`Votre période d'essai a été activée avec succès.`);
        setShowStatusModal(true);
        setCanGoBack(true); // Autoriser le retour après activation
      } else {
        // Plan payant - Créer une intention de paiement
        const amount = parseFloat(selectedPlan.price.replace(/[^0-9]/g, ""));

        console.log("🔄 Création intention de paiement pour:", amount, "FCFA");

        const intentResponse = await PaymentService.createPaymentIntent({
          subscriptionType: "ENTERPRISE",
          planId: selectedPlan.id,
          metadata: {
            source: "mobile",
            planName: selectedPlan.name,
          },
        });

        console.log("✅ Intention créée:", intentResponse.data.intentId);

        // Stocker l'intentId pour le callback KKiaPay
        setCurrentIntentId(intentResponse.data.intentId);

        // Fermer le modal de confirmation
        setShowUpgradeModal(false);

        // Préparer la configuration du paiement
        console.log("🔄 Préparation widget KKiaPay...");
        setPaymentConfig({
          amount: amount,
          email: user.email || "client@example.com",
          phone: (user.phone || "").replace(/^\+229\s*/, "").replace(/\s+/g, ""),
          name: `${user.firstName} ${user.lastName}`,
          reason: `Abonnement ${selectedPlan.name}`,
        });

        // Afficher le widget KKiaPay
        setShowKkiapayWidget(true);
        console.log("✅ Widget KKiaPay prêt");
      }
    } catch (err: any) {
      console.error("❌ Erreur upgrade:", err);

      setStatusType("error");
      setStatusTitle("❌ Erreur");
      setStatusMessage(
        err.response?.data?.message ||
          "Impossible de lancer le paiement. Veuillez réessayer."
      );
      setShowStatusModal(true);

      // Réinitialiser l'intent en cas d'erreur
      setCurrentIntentId(null);
    } finally {
      setUpgradeLoading(false);
    }
  };

  // Handle modal cancel
  const handleCancelUpgrade = () => {
    if (!upgradeLoading) {
      setShowUpgradeModal(false);
      setSelectedPlan(null);
    }
  };

  const renderPlan = (plan: Plan) => {
    const isCurrentPlan =
      subscription?.plan?._id === plan.id ||
      subscription?.plan?.name === plan.name;
    const isTrialExpired =
      subscription &&
      subscription.endDate &&
      new Date(subscription.endDate) < new Date();

    return (
      <View
        key={plan.id}
        style={{ backgroundColor: colors.card, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: colors.border, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 }}
      >
        {/* Plan Header */}
        <View style={{ padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
              <View
                className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
                style={{ backgroundColor: `${plan.color}10` }}
              >
                <Ionicons
                  name={isCurrentPlan ? "checkmark-circle" : "diamond"}
                  size={28}
                  color={plan.color}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold', color: colors.textPrimary }}>
                    {plan.name}
                  </Text>
                  {isCurrentPlan && (
                    <View className="bg-green-100 px-2.5 py-1 rounded-full ml-3">
                      <Text className="text-[10px] font-poppins-bold text-green-700 tracking-wide">
                        ACTIF
                      </Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-baseline">
                  <Text
                    className="text-2xl font-poppins-bold"
                    style={{ color: plan.color }}
                  >
                    {plan.price}
                  </Text>
                  {plan.period && (
                    <Text style={{ fontSize: 14, fontFamily: 'Poppins-SemiBold', marginLeft: 6, color: colors.textSecondary }}>
                      {plan.period}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            {plan.popular && !isCurrentPlan && (
              <View className="absolute -top-2 -right-2">
                <View className="bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 rounded-bl-2xl">
                  <Text className="text-[10px] font-poppins-bold text-white tracking-wider">
                    {i18n.t("enterprise.subscriptions.plans.popular")}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Features List */}
        <View className="p-6 pt-5 pb-5">
          {plan.features.map((f, idx) => (
            <View key={idx} className="flex-row items-start mb-3.5 last:mb-0">
              <View
                className="w-6 h-6 rounded-full items-center justify-center mt-0.5 mr-3.5"
                style={{ backgroundColor: `${plan.color}15` }}
              >
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={plan.color}
                  style={{ fontWeight: "bold" }}
                />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontFamily: 'Poppins-Medium', color: colors.textSecondary, lineHeight: 20 }}>
                {f}
              </Text>
            </View>
          ))}
        </View>

        {/* Action Button */}
        <View className="px-6 pb-6">
          {isCurrentPlan && !isTrialExpired ? (
            <View style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#D1FAE5' }}>
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
              <Text style={{ color: '#047857', fontFamily: 'Poppins-Bold', fontSize: 14, marginLeft: 10 }}>
                {i18n.t("enterprise.subscriptions.plans.current")}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', backgroundColor: plan.color, elevation: 4, shadowColor: plan.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 }}
              onPress={() => handleSelectPlan(plan)}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins-Bold', fontSize: 16 }}>
                {isTrialExpired
                  ? i18n.t("enterprise.subscriptions.plans.renew")
                  : `${i18n.t("enterprise.subscriptions.plans.choose")} ${plan.name}`}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color="#FFFFFF"
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric",
    };
    return date.toLocaleDateString("fr-FR", options);
  };

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!subscription?.endDate) return null;
    const endDate = new Date(subscription.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Check if trial is expiring soon (less than 7 days)
  const isExpiringSoon = () => {
    const daysRemaining = getDaysRemaining();
    return daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7;
  };

  // Check if subscription is expired
  const isExpired = () => {
    const daysRemaining = getDaysRemaining();
    return daysRemaining !== null && daysRemaining < 0;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />

        {/* Header */}
        <View style={{
          backgroundColor: colors.surface,
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 14,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        }}>
          <TouchableOpacity
            onPress={() => { if (canGoBack) router.back(); }}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tertiary, alignItems: 'center', justifyContent: 'center', opacity: canGoBack ? 1 : 0.4 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontFamily: 'Poppins-Bold', fontSize: 18, color: colors.textPrimary, textAlign: 'center' }}>
            {i18n.t("enterprise.subscriptions.title")}
          </Text>
          <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tertiary, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="help-circle-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Content Section */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ backgroundColor: colors.secondary, paddingTop: 24, paddingHorizontal: 20 }}>
            {/* Active Subscription Card - Moved to content */}
            {subscription && subscription.isActive && (
              <View className="mb-6">
                <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 }}>
                  {/* Status Badge */}
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <View
                        className={`w-2 h-2 rounded-full mr-2 ${
                          isExpired()
                            ? "bg-red-400"
                            : isExpiringSoon()
                            ? "bg-amber-400"
                            : "bg-green-400"
                        }`}
                      />
                      <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                        {isExpired()
                          ? i18n.t("enterprise.subscriptions.plans.expired")
                          : isExpiringSoon()
                          ? i18n.t("enterprise.subscriptions.plans.expiringSoon")
                          : i18n.t("enterprise.subscriptions.plans.active")}
                      </Text>
                    </View>
                    {isExpiringSoon() && (
                      <View className="bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                        <Text className="text-amber-700 font-poppins-bold text-[10px]">
                          {getDaysRemaining()} {i18n.t("enterprise.subscriptions.plans.daysRemaining")}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Plan Name */}
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 24, marginBottom: 8 }}>
                    {subscription.plan.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-Medium', fontSize: 14, marginBottom: 16, lineHeight: 20 }}>
                    {subscription.plan.description}
                  </Text>

                  {/* Stats Grid */}
                  <View className="flex-row mb-4">
                    <View style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 12, padding: 12, marginRight: 8, borderWidth: 1, borderColor: colors.border }}>
                      <View className="flex-row items-center justify-between mb-1">
                        <Text style={{ color: '#10B981', fontFamily: 'Poppins-Medium', fontSize: 11 }}>
                          {i18n.t("enterprise.subscriptions.plans.products")}
                        </Text>
                        <Ionicons
                          name="cube-outline"
                          size={14}
                          color="#10B981"
                        />
                      </View>
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 18 }}>
                        {subscription.usage.currentProducts}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-Medium', fontSize: 10 }}>
                        {i18n.t("enterprise.subscriptions.plans.on")} {subscription.plan.features.maxProducts}
                      </Text>
                    </View>

                    <View style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 12, padding: 12, marginLeft: 8, borderWidth: 1, borderColor: colors.border }}>
                      <View className="flex-row items-center justify-between mb-1">
                        <Text style={{ color: '#3B82F6', fontFamily: 'Poppins-Medium', fontSize: 11 }}>
                          {i18n.t("enterprise.subscriptions.plans.expiration")}
                        </Text>
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color="#3B82F6"
                        />
                      </View>
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 14 }}>
                        {formatDate(subscription.endDate)
                          .split(" ")
                          .slice(0, 2)
                          .join(" ")}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-Medium', fontSize: 10 }}>
                        {getDaysRemaining()! > 0
                          ? `${getDaysRemaining()} ${i18n.t("enterprise.subscriptions.plans.days")}`
                          : i18n.t("enterprise.subscriptions.plans.expired")}
                      </Text>
                    </View>
                  </View>

                  {/* Quick Actions */}
                  {isExpired() && !isIosBillingRestricted && (
                    <TouchableOpacity
                      className="bg-red-500 rounded-xl py-3.5 items-center shadow-sm"
                      onPress={() => {
                        // Scroll to plans section
                        const premiumPlan = plans.find((p) =>
                          p.name.toLowerCase().includes("premium")
                        );
                        if (premiumPlan) {
                          handleSelectPlan(premiumPlan);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-white font-poppins-bold text-sm">
                        {i18n.t("enterprise.subscriptions.plans.renew")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {isIosBillingRestricted && !subscription?.isActive && (
              <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.border }}>
                <View className="flex-row items-start">
                  <Ionicons name="lock-closed" size={22} color="#F59E0B" style={{ marginRight: 10, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 15, marginBottom: 4 }}>
                      Accès entreprise limité
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-Medium', fontSize: 13, lineHeight: 20 }}>
                      Fonctionnalité réservée aux comptes entreprise actifs.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Avertissement si pas de plan actif */}
            {!canGoBack && (
              <View style={{ backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FDE68A' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="flash" size={16} color="#D97706" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#92400E', fontFamily: 'Poppins-Bold', fontSize: 14 }}>
                    {isIosBillingRestricted ? "Accès restreint" : "Activation requise"}
                  </Text>
                </View>
                <Text style={{ color: '#78350F', fontFamily: 'Poppins-Medium', fontSize: 13, lineHeight: 20 }}>
                  {isIosBillingRestricted
                    ? "Fonctionnalité réservée aux comptes entreprise actifs."
                    : "Activez un plan d'abonnement pour accéder à toutes les fonctionnalités."}
                </Text>
              </View>
            )}

            {/* Section Title */}
            {!isIosBillingRestricted && (
              <>
                <View className="mb-5">
                  <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                    {subscription ? i18n.t("enterprise.subscriptions.sections.otherPlans") : i18n.t("enterprise.subscriptions.sections.ourPlans")}
                  </Text>
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 24 }}>
                    {subscription && isExpired()
                      ? i18n.t("enterprise.subscriptions.sections.renewSubscription")
                      : i18n.t("enterprise.subscriptions.sections.choosePlan")}
                  </Text>
                </View>

                {loading ? (
                  <>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <SkeletonCard key={i} colors={colors} />
                    ))}
                  </>
                ) : error ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64, backgroundColor: colors.card, borderRadius: 16 }}>
                    <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-4">
                      <Ionicons name="alert-circle" size={40} color="#EF4444" />
                    </View>
                    <Text style={{ color: '#DC2626', fontFamily: 'Poppins-Bold', fontSize: 16, marginBottom: 8 }}>
                      {i18n.t("enterprise.subscriptions.sections.loadingError")}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-Medium', fontSize: 14, textAlign: 'center', paddingHorizontal: 32, marginBottom: 24 }}>
                      {error}
                    </Text>
                    <TouchableOpacity
                      onPress={loadData}
                      className="bg-primary-500 px-8 py-3 rounded-xl shadow-sm"
                    >
                      <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins-Bold', fontSize: 14 }}>
                        {i18n.t("enterprise.subscriptions.sections.retry")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  plans.map(renderPlan)
                )}
              </>
            )}

            {/* Subscription Details Section */}
            {subscription && (
              <View style={{ marginTop: 8, marginBottom: 16 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Ionicons name="information-circle" size={20} color="#10B981" />
                  </View>
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 17 }}>
                    {i18n.t("enterprise.subscriptions.details.title")}
                  </Text>
                </View>

                {/* Payment Info Card */}
                <View style={{ borderRadius: 14, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 }}>
                <View style={{ backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
                    <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                      {i18n.t("enterprise.subscriptions.details.paymentInfo")}
                    </Text>
                  </View>

                  {/* Montant */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-Medium', fontSize: 13 }}>
                      {i18n.t("enterprise.subscriptions.details.amount")}
                    </Text>
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 15 }}>
                      {subscription.payment.amount
                        ? `${subscription.payment.amount.toLocaleString()} FCFA`
                        : "N/A"}
                    </Text>
                  </View>

                  {/* Méthode */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-Medium', fontSize: 13 }}>
                      {i18n.t("enterprise.subscriptions.details.method")}
                    </Text>
                    <View style={{ backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: '#059669', fontFamily: 'Poppins-Bold', fontSize: 12 }}>
                        {subscription.payment.method === "TRIAL"
                          ? i18n.t("enterprise.subscriptions.details.trial")
                          : subscription.payment.method || "—"}
                      </Text>
                    </View>
                  </View>

                  {/* Référence */}
                  {subscription.payment.reference && (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-Medium', fontSize: 13, marginBottom: 4 }}>
                        {i18n.t("enterprise.subscriptions.details.reference")}
                      </Text>
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-Medium', fontSize: 11, lineHeight: 16 }} numberOfLines={2} ellipsizeMode="middle">
                        {subscription.payment.reference}
                      </Text>
                    </View>
                  )}
                </View>
                </View>

                {/* Features Card */}
                <View style={{ borderRadius: 14, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 }}>
                <View style={{ backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
                    <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                      {i18n.t("enterprise.subscriptions.details.features")}
                    </Text>
                  </View>

                  {[
                    { key: "phone", label: i18n.t("enterprise.subscriptions.details.featuresList.phone"), icon: "call-outline" },
                    { key: "sms", label: i18n.t("enterprise.subscriptions.details.featuresList.sms"), icon: "chatbox-outline" },
                    { key: "whatsapp", label: i18n.t("enterprise.subscriptions.details.featuresList.whatsapp"), icon: "logo-whatsapp" },
                    { key: "messaging", label: i18n.t("enterprise.subscriptions.details.featuresList.messaging"), icon: "mail-outline" },
                    { key: "advertisements", label: i18n.t("enterprise.subscriptions.details.featuresList.advertisements"), icon: "megaphone-outline" },
                  ].map(({ key, label, icon }, idx, arr) => {
                    const isEnabled = subscription.plan.features[key];
                    const isLast = idx === arr.length - 1;
                    return (
                      <View
                        key={key}
                        style={{
                          flexDirection: 'row', alignItems: 'center',
                          paddingHorizontal: 16, paddingVertical: 13,
                          borderTopWidth: 1, borderTopColor: colors.border,
                          ...(isLast ? { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 } : {}),
                        }}
                      >
                        <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: isEnabled ? (isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5') : (isDark ? colors.secondary : '#F9FAFB') }}>
                          <Ionicons name={icon as any} size={16} color={isEnabled ? '#10B981' : colors.textSecondary} />
                        </View>
                        <Text style={{ flex: 1, fontFamily: 'Poppins-SemiBold', fontSize: 14, color: isEnabled ? colors.textPrimary : colors.textSecondary }}>
                          {label}
                        </Text>
                        <Ionicons
                          name={isEnabled ? "checkmark-circle" : "close-circle-outline"}
                          size={20}
                          color={isEnabled ? "#10B981" : colors.textSecondary}
                        />
                      </View>
                    );
                  })}
                </View>
                </View>
              </View>
            )}

            {/* Help Section */}
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 }}>
              <View className="flex-row items-start">
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="help-circle" size={24} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 16, marginBottom: 4 }}>
                    {i18n.t("enterprise.subscriptions.help.title")}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-Medium', fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
                    {i18n.t("enterprise.subscriptions.help.message")}
                  </Text>
                  <TouchableOpacity style={{ backgroundColor: '#3B82F6', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, elevation: 3, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 }}>
                    <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 12 }}>
                      {i18n.t("enterprise.subscriptions.help.contact")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Upgrade Confirmation Modal */}
      <UpgradeConfirmationModal
        visible={!isIosBillingRestricted && showUpgradeModal}
        plan={selectedPlan}
        currentPlanName={subscription?.plan?.name}
        onConfirm={handleConfirmUpgrade}
        onCancel={handleCancelUpgrade}
        loading={upgradeLoading}
      />

      {/* Status Modal */}
      <StatusModal
        visible={showStatusModal}
        type={statusType}
        title={statusTitle}
        message={statusMessage}
        onClose={() => setShowStatusModal(false)}
      />

      {/* Processing Payment Modal */}
      {!isIosBillingRestricted && processingPayment && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <View
            className="bg-white rounded-3xl p-8 items-center"
            style={{ maxWidth: 300 }}
          >
            <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="card" size={32} color="#10B981" />
            </View>
            <Text className="text-neutral-800 font-poppins-bold text-lg mb-2 text-center">
              {i18n.t("enterprise.subscriptions.processing.title")}
            </Text>
            <Text className="text-neutral-600 font-poppins-medium text-sm text-center mb-4">
              {i18n.t("enterprise.subscriptions.processing.message")}
            </Text>
            <View className="flex-row items-center">
              <Animated.View
                className="w-2 h-2 bg-primary-500 rounded-full mr-2"
                style={{
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                  }),
                }}
              />
              <Animated.View
                className="w-2 h-2 bg-primary-400 rounded-full mr-2"
                style={{
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                  }),
                }}
              />
              <Animated.View
                className="w-2 h-2 bg-primary-300 rounded-full"
                style={{
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                  }),
                }}
              />
            </View>
          </View>
        </View>
      )}

      {/* KKiaPay Widget */}
      {!isIosBillingRestricted && showKkiapayWidget && paymentConfig && (
        <KkiapayPayment
          amount={paymentConfig.amount}
          email={paymentConfig.email}
          phone={paymentConfig.phone}
          name={paymentConfig.name}
          reason={paymentConfig.reason}
          apiKey={process.env.EXPO_PUBLIC_KKIAPAY_PUBLIC_API_KEY || ""}
          sandbox={false}
          onSuccess={handlePaymentSuccess}
          onFailed={handlePaymentFailed}
        />
      )}
    </>
  );
}

export default EnterpriseSubscriptionsContent;
