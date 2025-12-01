import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
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
import { useTheme } from "../../../../contexts/ThemeContext";
import { useSubscription } from "../../../../contexts/SubscriptionContext";
import i18n from "../../../../i18n/i18n";
import PaymentService from "../../../../services/api/PaymentService";
import SubscriptionService, {
  Plan,
} from "../../../../services/api/SubscriptionService";

// Skeleton Loader Component
const ShimmerBlock = ({ style, colors }: { style?: any; colors: any }) => {
  const shimmer = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150],
  });
  return (
    <View style={[{ backgroundColor: colors.border, overflow: "hidden" }, style]}>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 120,
          transform: [{ translateX }],
          backgroundColor: "rgba(255,255,255,0.35)",
          opacity: 0.7,
        }}
      />
    </View>
  );
};

const SkeletonCard = ({ colors }: { colors: any }) => (
  <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
    <View className="flex-row items-start justify-between mb-3">
      <View className="flex-1 mr-3">
        <ShimmerBlock
          colors={colors}
          style={{ height: 20, borderRadius: 8, width: "40%", marginBottom: 8 }}
        />
        <ShimmerBlock colors={colors} style={{ height: 24, borderRadius: 8, width: "60%" }} />
      </View>
      <ShimmerBlock colors={colors} style={{ height: 24, borderRadius: 12, width: 80 }} />
    </View>
    <View className="mb-4">
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="flex-row items-start mb-2">
          <ShimmerBlock
            colors={colors}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              marginRight: 8,
              marginTop: 1,
            }}
          />
          <ShimmerBlock colors={colors} style={{ height: 14, borderRadius: 6, width: "80%" }} />
        </View>
      ))}
    </View>
    <ShimmerBlock colors={colors} style={{ height: 44, borderRadius: 22, width: "100%" }} />
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

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔄 Chargement des plans et souscription...");

      // Charger les plans disponibles et la souscription active en parallèle
      await Promise.all([loadPlans(), loadSubscription()]);

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
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  // Handle upgrade confirmation
  const handleConfirmUpgrade = async () => {
    if (!selectedPlan || !user) return;

    try {
      setUpgradeLoading(true);
      console.log("🔄 Upgrade vers le plan:", selectedPlan.name);

      const isFree = selectedPlan.price === "Gratuit";

      if (isFree) {
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
          phone: user.phone || "",
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
        style={{ backgroundColor: colors.card, borderRadius: 24, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}
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
                  <Text style={{ fontSize: 20, fontFamily: 'Quicksand-Bold', color: colors.textPrimary }}>
                    {plan.name}
                  </Text>
                  {isCurrentPlan && (
                    <View className="bg-green-100 px-2.5 py-1 rounded-full ml-3">
                      <Text className="text-[10px] font-quicksand-bold text-green-700 tracking-wide">
                        ACTIF
                      </Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-baseline">
                  <Text
                    className="text-2xl font-quicksand-bold"
                    style={{ color: plan.color }}
                  >
                    {plan.price}
                  </Text>
                  {plan.period && (
                    <Text style={{ fontSize: 14, fontFamily: 'Quicksand-SemiBold', marginLeft: 6, color: colors.textSecondary }}>
                      {plan.period}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            {plan.popular && !isCurrentPlan && (
              <View className="absolute -top-2 -right-2">
                <View className="bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 rounded-bl-2xl">
                  <Text className="text-[10px] font-quicksand-bold text-white tracking-wider">
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
              <Text style={{ flex: 1, fontSize: 14, fontFamily: 'Quicksand-Medium', color: colors.textSecondary, lineHeight: 20 }}>
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
              <Text style={{ color: '#047857', fontFamily: 'Quicksand-Bold', fontSize: 14, marginLeft: 10 }}>
                {i18n.t("enterprise.subscriptions.plans.current")}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', backgroundColor: plan.color, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 }}
              onPress={() => handleSelectPlan(plan)}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: 'Quicksand-Bold', fontSize: 16 }}>
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

        {/* Dynamic Header */}
        <LinearGradient
          colors={["#047857", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: 24,
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
          }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-xl font-quicksand-bold text-white">
              {i18n.t("enterprise.subscriptions.title")}
            </Text>
            <TouchableOpacity className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
              <Ionicons name="help-circle-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

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
                <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
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
                      <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                        {isExpired()
                          ? i18n.t("enterprise.subscriptions.plans.expired")
                          : isExpiringSoon()
                          ? i18n.t("enterprise.subscriptions.plans.expiringSoon")
                          : i18n.t("enterprise.subscriptions.plans.active")}
                      </Text>
                    </View>
                    {isExpiringSoon() && (
                      <View className="bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                        <Text className="text-amber-700 font-quicksand-bold text-[10px]">
                          {getDaysRemaining()} {i18n.t("enterprise.subscriptions.plans.daysRemaining")}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Plan Name */}
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 24, marginBottom: 8 }}>
                    {subscription.plan.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 14, marginBottom: 16, lineHeight: 20 }}>
                    {subscription.plan.description}
                  </Text>

                  {/* Stats Grid */}
                  <View className="flex-row mb-4">
                    <View style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 12, padding: 12, marginRight: 8, borderWidth: 1, borderColor: colors.border }}>
                      <View className="flex-row items-center justify-between mb-1">
                        <Text style={{ color: '#10B981', fontFamily: 'Quicksand-Medium', fontSize: 11 }}>
                          {i18n.t("enterprise.subscriptions.plans.products")}
                        </Text>
                        <Ionicons
                          name="cube-outline"
                          size={14}
                          color="#10B981"
                        />
                      </View>
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 18 }}>
                        {subscription.usage.currentProducts}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 10 }}>
                        {i18n.t("enterprise.subscriptions.plans.on")} {subscription.plan.features.maxProducts}
                      </Text>
                    </View>

                    <View style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 12, padding: 12, marginLeft: 8, borderWidth: 1, borderColor: colors.border }}>
                      <View className="flex-row items-center justify-between mb-1">
                        <Text style={{ color: '#3B82F6', fontFamily: 'Quicksand-Medium', fontSize: 11 }}>
                          {i18n.t("enterprise.subscriptions.plans.expiration")}
                        </Text>
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color="#3B82F6"
                        />
                      </View>
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 14 }}>
                        {formatDate(subscription.endDate)
                          .split(" ")
                          .slice(0, 2)
                          .join(" ")}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 10 }}>
                        {getDaysRemaining()! > 0
                          ? `${getDaysRemaining()} ${i18n.t("enterprise.subscriptions.plans.days")}`
                          : i18n.t("enterprise.subscriptions.plans.expired")}
                      </Text>
                    </View>
                  </View>

                  {/* Quick Actions */}
                  {isExpired() && (
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
                      <Text className="text-white font-quicksand-bold text-sm">
                        {i18n.t("enterprise.subscriptions.plans.renew")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Section Title */}
            <View className="mb-5">
              <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                {subscription ? i18n.t("enterprise.subscriptions.sections.otherPlans") : i18n.t("enterprise.subscriptions.sections.ourPlans")}
              </Text>
              <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 24 }}>
                {subscription && isExpired()
                  ? i18n.t("enterprise.subscriptions.sections.renewSubscription")
                  : i18n.t("enterprise.subscriptions.sections.choosePlan")}
              </Text>
            </View>

            {/* Plans List */}
            {loading ? (
              // Afficher les skeletons pendant le chargement
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
                <Text style={{ color: '#DC2626', fontFamily: 'Quicksand-Bold', fontSize: 16, marginBottom: 8 }}>
                  {i18n.t("enterprise.subscriptions.sections.loadingError")}
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 14, textAlign: 'center', paddingHorizontal: 32, marginBottom: 24 }}>
                  {error}
                </Text>
                <TouchableOpacity
                  onPress={loadData}
                  className="bg-primary-500 px-8 py-3 rounded-xl shadow-sm"
                >
                  <Text style={{ color: '#FFFFFF', fontFamily: 'Quicksand-Bold', fontSize: 14 }}>
                    {i18n.t("enterprise.subscriptions.sections.retry")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              plans.map(renderPlan)
            )}

            {/* Subscription Details Section */}
            {subscription && (
              <View className="mt-2 mb-4">
                <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
                  <View className="flex-row items-center mb-4">
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Ionicons
                        name="information-circle"
                        size={24}
                        color="#10B981"
                      />
                    </View>
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 18 }}>
                      {i18n.t("enterprise.subscriptions.details.title")}
                    </Text>
                  </View>

                  {/* Payment Info */}
                  <View style={{ backgroundColor: colors.secondary, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 14, marginBottom: 12 }}>
                      {i18n.t("enterprise.subscriptions.details.paymentInfo")}
                    </Text>
                    <View className="flex-row items-center justify-between mb-2.5">
                      <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 12 }}>
                        {i18n.t("enterprise.subscriptions.details.amount")}
                      </Text>
                      <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 16 }}>
                        {subscription.payment.amount
                          ? `${subscription.payment.amount.toLocaleString()} ${
                              subscription.plan.price.currency
                            }`
                          : "N/A"}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between mb-2.5">
                      <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 12 }}>
                        {i18n.t("enterprise.subscriptions.details.method")}
                      </Text>
                      <View style={{ backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 12 }}>
                          {subscription.payment.method === "TRIAL"
                            ? i18n.t("enterprise.subscriptions.details.trial")
                            : subscription.payment.method}
                        </Text>
                      </View>
                    </View>
                    {subscription.payment.reference && (
                      <View className="flex-row items-center justify-between">
                        <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 12 }}>
                          {i18n.t("enterprise.subscriptions.details.reference")}
                        </Text>
                        <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Medium', fontSize: 12 }}>
                          {subscription.payment.reference}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Features Grid */}
                  <View style={{ backgroundColor: colors.secondary, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 14, marginBottom: 12 }}>
                      {i18n.t("enterprise.subscriptions.details.features")}
                    </Text>
                    <View className="flex-row flex-wrap">
                      {[
                        { key: "phone", label: i18n.t("enterprise.subscriptions.details.featuresList.phone"), icon: "call" },
                        { key: "sms", label: i18n.t("enterprise.subscriptions.details.featuresList.sms"), icon: "chatbox" },
                        {
                          key: "whatsapp",
                          label: i18n.t("enterprise.subscriptions.details.featuresList.whatsapp"),
                          icon: "logo-whatsapp",
                        },
                        { key: "messaging", label: i18n.t("enterprise.subscriptions.details.featuresList.messaging"), icon: "mail" },
                        {
                          key: "advertisements",
                          label: i18n.t("enterprise.subscriptions.details.featuresList.advertisements"),
                          icon: "megaphone",
                        },
                      ].map(({ key, label, icon }) => {
                        const isEnabled = subscription.plan.features[key];
                        return (
                          <View
                            key={key}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 8,
                              marginRight: 8,
                              marginBottom: 8,
                              backgroundColor: isEnabled ? '#ECFDF5' : colors.card,
                              borderWidth: 1,
                              borderColor: isEnabled ? '#D1FAE5' : colors.border,
                            }}
                          >
                            <Ionicons
                              name={isEnabled ? "checkmark-circle" : "close-circle"}
                              size={14}
                              color={isEnabled ? "#10B981" : colors.textSecondary}
                            />
                            <Text
                              style={{
                                marginLeft: 6,
                                fontFamily: 'Quicksand-SemiBold',
                                fontSize: 12,
                                color: isEnabled ? '#059669' : colors.textSecondary,
                              }}
                            >
                              {label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Help Section */}
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
              <View className="flex-row items-start">
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="help-circle" size={24} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 16, marginBottom: 4 }}>
                    {i18n.t("enterprise.subscriptions.help.title")}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
                    {i18n.t("enterprise.subscriptions.help.message")}
                  </Text>
                  <TouchableOpacity style={{ backgroundColor: '#3B82F6', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}>
                    <Text style={{ color: '#FFFFFF', fontFamily: 'Quicksand-SemiBold', fontSize: 12 }}>
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
        visible={showUpgradeModal}
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
      {processingPayment && (
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
            <Text className="text-neutral-800 font-quicksand-bold text-lg mb-2 text-center">
              {i18n.t("enterprise.subscriptions.processing.title")}
            </Text>
            <Text className="text-neutral-600 font-quicksand-medium text-sm text-center mb-4">
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
      {showKkiapayWidget && paymentConfig && (
        <KkiapayPayment
          amount={paymentConfig.amount}
          email={paymentConfig.email}
          phone={paymentConfig.phone}
          name={paymentConfig.name}
          reason={paymentConfig.reason}
          apiKey={process.env.EXPO_PUBLIC_KKIAPAY_PUBLIC_API_KEY || ""}
          sandbox={true}
          onSuccess={handlePaymentSuccess}
          onFailed={handlePaymentFailed}
        />
      )}
    </>
  );
}

export default EnterpriseSubscriptionsContent;
