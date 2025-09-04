// Assure les polyfills nécessaires pour utiliser mqtt.js dans React Native / Expo
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Buffer pour mqtt.js (payloads, encodage, etc.)
if (typeof (global as any).Buffer === 'undefined') {
  (global as any).Buffer = Buffer;
}

// Optionnel: d'autres polyfills peuvent être ajoutés ici si nécessaire à l'avenir.
// Par exemple, si vous avez des besoins spécifiques (TextEncoder/TextDecoder),
// vous pourriez ajouter des polyfills correspondants.

// Fonction no-op pour expliciter l'intention lors de l'import
export function ensureMQTTPolyfills(): void {
  // Les polyfills sont appliqués par effet de bord lors de l'import du module
}
