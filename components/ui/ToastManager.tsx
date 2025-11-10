/**
 * @deprecated This file is a compatibility wrapper. Use ReanimatedToast directly instead.
 * Import from: './ReanimatedToast/context'
 * 
 * This wrapper will be removed in a future version.
 */

import React from 'react';
import { useToast as useReanimatedToast } from './ReanimatedToast/context';

/**
 * @deprecated Use useToast from ReanimatedToast/context instead
 */
export const useToast = () => {
  const { showToast } = useReanimatedToast();

  const showSuccess = (title: string, message?: string) => {
    showToast({ title, subtitle: message, autodismiss: true });
  };

  const showError = (title: string, message?: string) => {
    showToast({ title, subtitle: message, autodismiss: true });
  };

  const showInfo = (title: string, message?: string) => {
    showToast({ title, subtitle: message, autodismiss: true });
  };

  const showWarning = (title: string, message?: string) => {
    showToast({ title, subtitle: message, autodismiss: true });
  };

  return {
    showToast: (config: any) => showToast({ title: config.title, subtitle: config.message, autodismiss: true }),
    showSuccess,
    showError,
    showInfo,
    showWarning,
    hideToast: () => {}, // No-op for compatibility
  };
};

/**
 * @deprecated No longer needed. Toast provider is already in _layout.tsx
 */
export const ToastManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
