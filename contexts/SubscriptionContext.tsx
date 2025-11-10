import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import SubscriptionService, { Subscription } from '../services/api/SubscriptionService';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  needsSubscription: boolean; // Nouveau: indique si l'utilisateur doit choisir un abonnement
  loadSubscription: () => Promise<void>;
  activateTrialPlan: () => Promise<void>;
  subscribeToPlan: (planId: string, paymentData?: any) => Promise<void>;
  canUseFeature: (featureName: string) => boolean;
  hasReachedLimit: (limitName: string, currentValue: number) => boolean;
  isTrialExpired: () => boolean;
  daysUntilExpiration: () => number | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const { user } = useAuth();

  // Charger la souscription active
  const loadSubscription = useCallback(async () => {
    if (!user || user.role !== 'ENTERPRISE') {
      setSubscription(null);
      setNeedsSubscription(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 SUBSCRIPTION CONTEXT - Chargement souscription pour:', user._id);
      
      const activeSub = await SubscriptionService.getActiveSubscription();
      setSubscription(activeSub);
      
      // Si aucune souscription active, l'utilisateur doit en choisir une
      if (!activeSub) {
        console.log('⚠️ SUBSCRIPTION CONTEXT - Aucune souscription active, affichage du modal requis');
        setNeedsSubscription(true);
      } else {
        console.log('✅ SUBSCRIPTION CONTEXT - Souscription active trouvée:', activeSub);
        setNeedsSubscription(false);
      }
    } catch (err: any) {
      console.error('❌ SUBSCRIPTION CONTEXT - Erreur chargement souscription:', err);
      
      // Si l'erreur indique qu'il n'y a pas de souscription (404), c'est normal
      if (err.message?.includes('404') || err.message?.includes('No active subscription')) {
        console.log('⚠️ SUBSCRIPTION CONTEXT - Pas de souscription, modal requis');
        setNeedsSubscription(true);
      } else {
        setError(err.message || 'Erreur lors du chargement de la souscription');
      }
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Activer le plan d'essai gratuit
  const activateTrialPlan = useCallback(async () => {
    if (!user || user.role !== 'ENTERPRISE') {
      throw new Error('Vous devez être connecté en tant qu\'entreprise');
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 SUBSCRIPTION CONTEXT - Activation plan TRIAL');
      
      const result = await SubscriptionService.activateTrialPlan();
      setSubscription(result);
      setNeedsSubscription(false); // Plus besoin du modal après activation
      
      console.log('✅ SUBSCRIPTION CONTEXT - Plan TRIAL activé:', result);
    } catch (err: any) {
      console.error('❌ SUBSCRIPTION CONTEXT - Erreur activation TRIAL:', err);
      setError(err.message || 'Erreur lors de l\'activation du plan d\'essai');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // S'abonner à un plan spécifique
  const subscribeToPlan = useCallback(async (planId: string, paymentData?: any) => {
    if (!user || user.role !== 'ENTERPRISE') {
      throw new Error('Vous devez être connecté en tant qu\'entreprise');
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 SUBSCRIPTION CONTEXT - Abonnement au plan:', planId);
      
      const result = await SubscriptionService.subscribeToPlan(planId, paymentData);
      setSubscription(result);
      setNeedsSubscription(false); // Plus besoin du modal après souscription
      
      console.log('✅ SUBSCRIPTION CONTEXT - Abonné au plan:', result);
    } catch (err: any) {
      console.error('❌ SUBSCRIPTION CONTEXT - Erreur abonnement au plan:', err);
      setError(err.message || 'Erreur lors de l\'abonnement au plan');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Vérifier si une feature est disponible
  const canUseFeature = useCallback((featureName: string): boolean => {
    if (!subscription || !subscription.plan) {
      return false;
    }

    const features = subscription.plan.features;
    
    // Vérifier si la feature existe et est activée
    return features[featureName] === true;
  }, [subscription]);

  // Vérifier si une limite est atteinte
  const hasReachedLimit = useCallback((limitName: string, currentValue: number): boolean => {
    if (!subscription || !subscription.plan) {
      return true; // Pas de souscription = limite atteinte
    }

    const features = subscription.plan.features;
    const limit = features[limitName];

    // Si la limite n'existe pas ou est infinie (-1), pas de limite
    if (limit === undefined || limit === -1) {
      return false;
    }

    // Vérifier si la limite est atteinte
    return currentValue >= limit;
  }, [subscription]);

  // Vérifier si le plan d'essai a expiré
  const isTrialExpired = useCallback((): boolean => {
    if (!subscription || subscription.plan?.name !== 'TRIAL') {
      return false;
    }

    const endDate = new Date(subscription.endDate);
    return endDate < new Date();
  }, [subscription]);

  // Calculer les jours restants avant expiration
  const daysUntilExpiration = useCallback((): number | null => {
    if (!subscription) {
      return null;
    }

    const endDate = new Date(subscription.endDate);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }, [subscription]);

  // Charger la souscription à la connexion de l'utilisateur
  useEffect(() => {
    if (user && user.role === 'ENTERPRISE') {
      loadSubscription();
    } else {
      setSubscription(null);
    }
  }, [user, loadSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        error,
        needsSubscription,
        loadSubscription,
        activateTrialPlan,
        subscribeToPlan,
        canUseFeature,
        hasReachedLimit,
        isTrialExpired,
        daysUntilExpiration,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
