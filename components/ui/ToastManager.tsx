import React, { ReactNode, useCallback, useState } from 'react';
import { View } from 'react-native';
import Toast, { ToastConfig } from './Toast';

interface ToastManagerContextType {
  showToast: (config: Omit<ToastConfig, 'id'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  hideToast: (id: string) => void;
}

export const ToastManagerContext = React.createContext<ToastManagerContextType | null>(null);

interface ToastManagerProps {
  children: ReactNode;
}

export const ToastManager: React.FC<ToastManagerProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((config: Omit<ToastConfig, 'id'>) => {
    const id = Date.now().toString();
    const newToast: ToastConfig = {
      ...config,
      id,
      // Use longer duration for error messages
      duration: config.type === 'error' ? 6000 : (config.duration || 4000),
      onDismiss: () => hideToast(id),
    };
    setToasts(prev => [...prev, newToast]);
  }, [hideToast]);

  const showSuccess = useCallback((title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    showToast({ type: 'error', title, message });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    showToast({ type: 'warning', title, message });
  }, [showToast]);

  const contextValue: ToastManagerContextType = {
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    hideToast,
  };

  return (
    <ToastManagerContext.Provider value={contextValue}>
      {children}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999 }}>
        {toasts.map((toast, index) => (
          <View key={toast.id} style={{ marginTop: index * 80 }}>
            <Toast config={toast} />
          </View>
        ))}
      </View>
    </ToastManagerContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastManagerContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastManager');
  }
  return context;
};
