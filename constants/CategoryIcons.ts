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

// Normalise un nom de catégorie → clé de lookup
function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // supprime les diacritiques
    .replace(/[\s&]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Table d'alias pour couvrir les variantes de noms API
const ALIASES: Record<string, string> = {
  // Accesoires / Accessoires
  accesoires: 'accessories',
  accessoires: 'accessories',
  // Appareils photo
  'appareils-photo': 'appareils-photo',
  'appareil-photo': 'appareils-photo',
  // Automobile / Véhicules
  automobile: 'automobile',
  vehicules: 'automobile',
  vehicule: 'automobile',
  voitures: 'automobile',
  // Beauté
  beaute: 'beaute',
  soin: 'beaute',
  cosmetique: 'beaute',
  cosmetiques: 'beaute',
  // Écrans / Moniteurs
  ecrans: 'ecrans',
  ecran: 'ecrans',
  moniteurs: 'ecrans',
  // Électroménager
  electromenager: 'electromenager',
  'electro-menager': 'electromenager',
  // Fournitures médicales
  'fournitures-medicales': 'fournitures-medicales',
  'fournitures-medical': 'fournitures-medicales',
  medical: 'fournitures-medicales',
  sante: 'sante',
  pharmacie: 'sante',
  // Hi-Tech / Tech
  'hi-tech': 'hi-tech',
  tech: 'hi-tech',
  technologie: 'hi-tech',
  // Immobilier
  immobilier: 'immobilier',
  'biens-immobiliers': 'immobilier',
  // Maison connectée
  'maison-connectee': 'maison-connectee',
  domotique: 'maison-connectee',
  // Meubles / Mobilier
  meubles: 'meubles',
  mobilier: 'meubles',
  meuble: 'meubles',
  // Mode / Vêtements
  mode: 'mode',
  vetements: 'mode',
  vetement: 'mode',
  habillement: 'mode',
  // Ordinateurs
  ordinateurs: 'ordinateurs',
  ordinateur: 'ordinateurs',
  informatique: 'ordinateurs',
  // Prestation de services
  'prestation-services': 'prestation-services',
  'prestation-de-services': 'prestation-services',
  services: 'prestation-services',
  service: 'prestation-services',
  // Restaurant et alimentation
  'restaurant-alimentation': 'restaurant-alimentation',
  'restaurant-et-alimentation': 'restaurant-alimentation',
  alimentation: 'restaurant-alimentation',
  restaurant: 'restaurant-alimentation',
  nourriture: 'restaurant-alimentation',
  alimentaire: 'restaurant-alimentation',
  // Smartphones
  smartphones: 'smartphones',
  smartphone: 'smartphones',
  telephones: 'smartphones',
  telephone: 'smartphones',
  portable: 'smartphones',
  portables: 'smartphones',
};

export function getCategoryIcon(categoryName: string): ImageSourcePropType | null {
  const key = normalizeKey(categoryName);
  const resolved = ALIASES[key] ?? key;
  return ICONS[resolved] ?? null;
}
