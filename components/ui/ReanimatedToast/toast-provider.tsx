import React, { useCallback, useMemo, useState, type FC, type PropsWithChildren } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastContext, type ToastType } from './context';
import { Toast } from './toast';

export const ToastProvider: FC<PropsWithChildren> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const MAX_TOASTS = 4; // active + 3 stacked

  const showToast = useCallback((toast: Omit<ToastType, 'id'>) => {
    setToasts(prev => {
      // Increment existing positions and drop those that would exceed MAX_TOASTS
      const updatedPrev = prev
        .map(item => ({ ...item, id: item.id + 1 }))
        .filter(item => item.id < MAX_TOASTS);
      const stableKey = toast.key || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newToast: ToastType = { ...toast, key: stableKey, id: 0, autodismiss: toast.autodismiss ?? true } as ToastType;
      return [...updatedPrev, newToast];
    });
  }, []);

  const sortedToasts = useMemo(() => {
    return [...toasts].sort((a, b) => a.id - b.id);
  }, [toasts]);

  const onDismiss = useCallback((toastKey: string) => {
    setToasts(prev => {
      // Find current id of the toast with the given key
      const target = prev.find(t => t.key === toastKey);
      if (!target) return prev;
      const removedId = target.id;
      return prev
        .map(item => {
          if (item.key === toastKey) return null as any;
          if (item.id > removedId) return { ...item, id: item.id - 1 };
          return item;
        })
        .filter(Boolean) as ToastType[];
    });
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
      {sortedToasts.map((toast, index) => (
        <Toast key={toast.key as string} toast={toast} index={index} onDismiss={onDismiss} />
      ))}
    </GestureHandlerRootView>
  );
};

export default ToastProvider;
