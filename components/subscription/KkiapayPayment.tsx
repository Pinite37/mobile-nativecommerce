import { KkiapayProvider, useKkiapay } from '@kkiapay-org/react-native-sdk';
import { useEffect } from 'react';
import { View } from 'react-native';

interface KkiapayPaymentProps {
  amount: number;
  email: string;
  phone: string;
  name: string;
  reason: string;
  onSuccess: (data: any) => void;
  onFailed: (data: any) => void;
  apiKey: string;
  sandbox?: boolean;
}

function KkiapayPaymentContent({
  amount,
  email,
  phone,
  name,
  reason,
  onSuccess,
  onFailed,
  apiKey,
  sandbox = true,
}: KkiapayPaymentProps) {
  const { openKkiapayWidget, addSuccessListener, addFailedListener } = useKkiapay();

  useEffect(() => {
    // Configurer les listeners d'abord
    addSuccessListener(onSuccess);
    addFailedListener(onFailed);

    // Puis ouvrir le widget
    openKkiapayWidget({
      amount,
      api_key: apiKey,
      sandbox,
      email,
      phone,
      name,
      reason,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Exécuter une seule fois au montage

  return null; // Le widget est géré par le SDK
}

// Wrapper avec le provider localement
export default function KkiapayPayment(props: KkiapayPaymentProps) {
  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 9999,
    }}>
      <KkiapayProvider>
        <KkiapayPaymentContent {...props} />
      </KkiapayProvider>
    </View>
  );
}
