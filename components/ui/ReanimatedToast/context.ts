import { createContext, useContext, type ReactNode } from 'react';

export type ToastType = {
  id: number;
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  leading?: () => ReactNode;
  /**
   * Nature du message. Reprise de l'ancien système de notifications, qui
   * surgissait du haut avec sa propre icône colorée : sans ce champ, la fusion
   * des deux systèmes ferait perdre la distinction succès / erreur.
   */
  variant?: 'success' | 'error' | 'warning' | 'info';
  key?: string;
  autodismiss?: boolean;
};

export const ToastContext = createContext<{
  showToast: (toast: Omit<ToastType, 'id'>) => void;
}>({
  showToast: () => {},
});

export const useToast = () => {
  return useContext(ToastContext);
};
