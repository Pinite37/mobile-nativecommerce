import { createContext, useContext, type ReactNode } from 'react';

export type ToastType = {
  id: number;
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  leading?: () => ReactNode;
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

export * from './context';
