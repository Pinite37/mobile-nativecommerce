import { ImageSourcePropType } from 'react-native';

const ICONS: Record<string, ImageSourcePropType> = {
  accessories: require('../assets/images/icon/accessories.png'),
  'appareils-photo': require('../assets/images/icon/appareils-photo.png'),
  audio: require('../assets/images/icon/audio.png'),
  automobile: require('../assets/images/icon/automobile.png'),
  beaute: require('../assets/images/icon/beaute.png'),
  divers: require('../assets/images/icon/divers.png'),
  ecrans: require('../assets/images/icon/ecrans.png'),
  electromenager: require('../assets/images/icon/electromenager.png'),
  'fournitures-medicales': require('../assets/images/icon/fournitures-medicales.png'),
  gaming: require('../assets/images/icon/gaming.png'),
  'hi-tech': require('../assets/images/icon/hi-tech.png'),
  immobilier: require('../assets/images/icon/immobilier.png'),
  livres: require('../assets/images/icon/livres.png'),
  'maison-connectee': require('../assets/images/icon/maison-connectee.png'),
  meubles: require('../assets/images/icon/meubles.png'),
  mode: require('../assets/images/icon/mode.png'),
  ordinateurs: require('../assets/images/icon/ordinateurs.png'),
  'prestation-services': require('../assets/images/icon/prestation-services.png'),
  'restaurant-alimentation': require('../assets/images/icon/restaurant-alimentation.png'),
  sante: require('../assets/images/icon/sante.png'),
  smartphones: require('../assets/images/icon/smartphones.png'),
  sport: require('../assets/images/icon/sport.png'),
  tablettes: require('../assets/images/icon/tablettes.png'),
};

// Normalise un nom de catégorie en clé ASCII simple
function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // supprime les diacritiques (hex explicite, pas de char Unicode)
    .replace(/[\s_&/\\]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Mots-clés → clé icône (lookup rapide sans ordre de priorité)
const KEYWORDS: Array<[string, string]> = [
  // Smartphones / Téléphones
  ['smartphone', 'smartphones'],
  ['telephone', 'smartphones'],
  ['portable', 'smartphones'],
  ['mobile', 'smartphones'],
  // Ordinateurs
  ['ordinateur', 'ordinateurs'],
  ['informatique', 'ordinateurs'],
  ['laptop', 'ordinateurs'],
  // Tablettes
  ['tablette', 'tablettes'],
  // Écrans
  ['ecran', 'ecrans'],
  ['moniteur', 'ecrans'],
  // Accessoires
  ['accessoire', 'accessories'],
  ['accesoire', 'accessories'],
  // Audio
  ['audio', 'audio'],
  ['casque', 'audio'],
  ['enceinte', 'audio'],
  // Gaming
  ['gaming', 'gaming'],
  ['jeu', 'gaming'],
  ['console', 'gaming'],
  // Hi-Tech
  ['hi-tech', 'hi-tech'],
  ['hitech', 'hi-tech'],
  ['technologie', 'hi-tech'],
  // Electroménager
  ['electromenager', 'electromenager'],
  ['electro', 'electromenager'],
  ['menager', 'electromenager'],
  // Appareils photo
  ['appareil', 'appareils-photo'],
  ['photo', 'appareils-photo'],
  ['camera', 'appareils-photo'],
  // Mode
  ['mode', 'mode'],
  ['vetement', 'mode'],
  ['habillement', 'mode'],
  ['fashion', 'mode'],
  // Beauté
  ['beaute', 'beaute'],
  ['soin', 'beaute'],
  ['cosmetique', 'beaute'],
  ['parfum', 'beaute'],
  // Meubles
  ['meuble', 'meubles'],
  ['mobilier', 'meubles'],
  ['deco', 'meubles'],
  // Maison connectée
  ['maison-connectee', 'maison-connectee'],
  ['domotique', 'maison-connectee'],
  ['maison', 'maison-connectee'],
  // Immobilier
  ['immobilier', 'immobilier'],
  ['foncier', 'immobilier'],
  ['logement', 'immobilier'],
  // Automobile
  ['automobile', 'automobile'],
  ['vehicule', 'automobile'],
  ['voiture', 'automobile'],
  ['moto', 'automobile'],
  ['transport', 'automobile'],
  // Restaurant / Alimentation
  ['restaurant', 'restaurant-alimentation'],
  ['alimentation', 'restaurant-alimentation'],
  ['nourriture', 'restaurant-alimentation'],
  ['food', 'restaurant-alimentation'],
  ['traiteur', 'restaurant-alimentation'],
  // Santé
  ['sante', 'sante'],
  ['pharmacie', 'sante'],
  ['medical', 'sante'],
  // Fournitures médicales
  ['fourniture', 'fournitures-medicales'],
  ['medicale', 'fournitures-medicales'],
  ['medicales', 'fournitures-medicales'],
  // Prestation de services
  ['prestation', 'prestation-services'],
  ['service', 'prestation-services'],
  // Livres
  ['livre', 'livres'],
  ['librairie', 'livres'],
  ['lecture', 'livres'],
  // Sport
  ['sport', 'sport'],
  ['fitness', 'sport'],
  // Divers
  ['divers', 'divers'],
  ['autre', 'divers'],
];

export function getCategoryIcon(categoryName: string): ImageSourcePropType | null {
  const key = normalizeKey(categoryName);

  // 1. Correspondance exacte dans ICONS
  if (ICONS[key]) return ICONS[key];

  // 2. Recherche par mot-clé (premier match gagne)
  for (const [keyword, iconKey] of KEYWORDS) {
    if (key.includes(keyword)) {
      return ICONS[iconKey] ?? null;
    }
  }

  console.warn('[CategoryIcons] Aucune icône pour :', categoryName, '(clé:', key, ')');
  return null;
}
