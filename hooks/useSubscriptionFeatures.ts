import { useSubscription } from '../contexts/SubscriptionContext';

/**
 * Hook pour vérifier si une feature est disponible dans le plan actuel
 * @param featureName - Nom de la feature à vérifier (ex: 'advertisements', 'whatsapp')
 * @returns boolean - true si la feature est disponible
 * 
 * @example
 * const canAdvertise = useFeature('advertisements');
 * if (canAdvertise) {
 *   // Afficher le bouton de pub
 * }
 */
export const useFeature = (featureName: string): boolean => {
  const { canUseFeature } = useSubscription();
  return canUseFeature(featureName);
};

/**
 * Hook pour vérifier si une limite numérique est atteinte
 * @param limitName - Nom de la limite (ex: 'maxProducts', 'maxImagesPerProduct')
 * @param currentValue - Valeur actuelle
 * @returns boolean - true si la limite est atteinte
 * 
 * @example
 * const hasReachedProductLimit = useLimit('maxProducts', currentProductCount);
 * if (hasReachedProductLimit) {
 *   // Afficher un message d'upgrade
 * }
 */
export const useLimit = (limitName: string, currentValue: number): boolean => {
  const { hasReachedLimit } = useSubscription();
  return hasReachedLimit(limitName, currentValue);
};

/**
 * Hook pour obtenir la valeur maximale d'une limite
 * @param limitName - Nom de la limite
 * @returns number | undefined - Valeur maximale ou undefined si pas de limite
 * 
 * @example
 * const maxProducts = useMaxLimit('maxProducts'); // 20
 */
export const useMaxLimit = (limitName: string): number | undefined => {
  const { subscription } = useSubscription();
  
  if (!subscription || !subscription.plan) {
    return undefined;
  }
  
  return subscription.plan.features[limitName];
};

/**
 * Hook pour obtenir les informations de progression vers une limite
 * @param limitName - Nom de la limite
 * @param currentValue - Valeur actuelle
 * @returns object - { current, max, percentage, isAtLimit }
 * 
 * @example
 * const productProgress = useProgress('maxProducts', currentProductCount);
 * // { current: 15, max: 20, percentage: 75, isAtLimit: false }
 */
export const useProgress = (
  limitName: string,
  currentValue: number
): {
  current: number;
  max: number | undefined;
  percentage: number;
  isAtLimit: boolean;
} => {
  const { subscription, hasReachedLimit } = useSubscription();
  
  const max = subscription?.plan?.features[limitName];
  const percentage = max && max > 0 ? (currentValue / max) * 100 : 0;
  const isAtLimit = hasReachedLimit(limitName, currentValue);
  
  return {
    current: currentValue,
    max,
    percentage: Math.min(percentage, 100),
    isAtLimit,
  };
};

/**
 * Hook pour vérifier si le plan d'essai est proche de l'expiration
 * @param daysThreshold - Nombre de jours avant expiration pour alerter (défaut: 7)
 * @returns object - { isExpiringSoon, daysLeft, isExpired }
 * 
 * @example
 * const { isExpiringSoon, daysLeft } = useTrialExpiration();
 * if (isExpiringSoon) {
 *   // Afficher un message d'alerte
 * }
 */
export const useTrialExpiration = (
  daysThreshold: number = 7
): {
  isExpiringSoon: boolean;
  daysLeft: number | null;
  isExpired: boolean;
} => {
  const { subscription, daysUntilExpiration, isTrialExpired } = useSubscription();
  
  const daysLeft = daysUntilExpiration();
  const isExpired = isTrialExpired();
  const isExpiringSoon = 
    subscription?.plan?.name === 'TRIAL' && 
    daysLeft !== null && 
    daysLeft <= daysThreshold && 
    !isExpired;
  
  return {
    isExpiringSoon,
    daysLeft,
    isExpired,
  };
};
