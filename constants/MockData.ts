// Mock data for the application

export const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "iPhone 14 Pro",
    price: 759000,
    originalPrice: 899000,
    image: "https://via.placeholder.com/150x150/3B82F6/FFFFFF?text=iPhone",
    rating: 4.8,
    reviews: 245,
    store: "TechStore Cotonou",
    category: "Téléphones",
    inStock: true,
    discount: 15,
    description: "Le dernier iPhone avec des performances exceptionnelles et un design premium.",
  },
  {
    id: 2,
    name: "Samsung Galaxy S23",
    price: 559000,
    originalPrice: 629000,
    image: "https://via.placeholder.com/150x150/EF4444/FFFFFF?text=Samsung",
    rating: 4.6,
    reviews: 189,
    store: "Mobile World",
    category: "Téléphones",
    inStock: true,
    discount: 11,
    description: "Smartphone Android haut de gamme avec un excellent appareil photo.",
  },
  {
    id: 3,
    name: "MacBook Air M2",
    price: 1250000,
    originalPrice: 1350000,
    image: "https://via.placeholder.com/150x150/10B981/FFFFFF?text=MacBook",
    rating: 4.9,
    reviews: 78,
    store: "Apple Store Cotonou",
    category: "Ordinateurs",
    inStock: true,
    discount: 7,
    description: "Ordinateur portable ultra-fin avec la puce M2 d'Apple.",
  },
  {
    id: 4,
    name: "AirPods Pro 2",
    price: 189000,
    originalPrice: 219000,
    image: "https://via.placeholder.com/150x150/F59E0B/FFFFFF?text=AirPods",
    rating: 4.7,
    reviews: 312,
    store: "Audio Plus",
    category: "Accessoires",
    inStock: true,
    discount: 14,
    description: "Écouteurs sans fil avec réduction de bruit active.",
  },
  {
    id: 5,
    name: "iPad Air 5",
    price: 429000,
    originalPrice: 499000,
    image: "https://via.placeholder.com/150x150/8B5CF6/FFFFFF?text=iPad",
    rating: 4.8,
    reviews: 156,
    store: "Digital Store",
    category: "Tablettes",
    inStock: true,
    discount: 14,
    description: "Tablette puissante pour le travail et les loisirs.",
  },
];

export const MOCK_CATEGORIES = [
  { id: 1, name: "Électronique", icon: "phone-portrait", color: "#3B82F6" },
  { id: 2, name: "Mode", icon: "shirt", color: "#EF4444" },
  { id: 3, name: "Maison", icon: "home", color: "#10B981" },
  { id: 4, name: "Sports", icon: "football", color: "#F59E0B" },
  { id: 5, name: "Beauté", icon: "brush", color: "#8B5CF6" },
  { id: 6, name: "Livres", icon: "book", color: "#059669" },
];

export const MOCK_STORES = [
  {
    id: 1,
    name: "TechStore Cotonou",
    category: "Électronique",
    rating: 4.7,
    image: "https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=TS",
    verified: true,
    address: "Cotonou, Akpakpa",
    phone: "+229 21 30 40 50",
  },
  {
    id: 2,
    name: "Fashion Plus",
    category: "Mode",
    rating: 4.5,
    image: "https://via.placeholder.com/80x80/EF4444/FFFFFF?text=FP",
    verified: true,
    address: "Cotonou, Fidjrossè",
    phone: "+229 21 35 45 55",
  },
  {
    id: 3,
    name: "Home Decor",
    category: "Maison",
    rating: 4.8,
    image: "https://via.placeholder.com/80x80/10B981/FFFFFF?text=HD",
    verified: false,
    address: "Cotonou, Dantokpa",
    phone: "+229 21 40 50 60",
  },
];

export const MOCK_USER_PROFILE = {
  client: {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+229 12 34 56 78",
    avatar: "https://via.placeholder.com/120x120/3B82F6/FFFFFF?text=JD",
    memberSince: "2023-06-15",
    totalOrders: 12,
    totalSpent: 2450000,
    loyaltyPoints: 1240,
    addresses: [
      {
        id: 1,
        type: "home",
        address: "Cotonou, Fidjrossè - Rue de la Paix, Maison Bleue",
        isDefault: true,
      },
      {
        id: 2,
        type: "work",
        address: "Cotonou, Akpakpa - Immeuble Central, Bureau 201",
        isDefault: false,
      },
    ],
  },
  enterprise: {
    name: "TechStore Cotonou",
    email: "contact@techstore-cotonou.com",
    phone: "+229 21 30 40 50",
    address: "Cotonou, Akpakpa - Carrefour Gbégamey",
    logo: "https://via.placeholder.com/120x120/3B82F6/FFFFFF?text=TC",
    registrationNumber: "RC-2023-B-12345",
    taxNumber: "IFU-987654321",
    category: "Électronique",
    memberSince: "2023-06-15",
    verified: true,
    subscription: {
      plan: "Premium",
      status: "active",
      nextBilling: "2024-02-15",
      price: 25000,
    },
    stats: {
      totalProducts: 45,
      totalOrders: 156,
      totalRevenue: 2450000,
      rating: 4.7,
      reviews: 89,
    },
  },
};

export const ORDER_STATUS_CONFIG = {
  pending: { color: "#F59E0B", bg: "#FEF3C7", text: "En attente" },
  confirmed: { color: "#3B82F6", bg: "#DBEAFE", text: "Confirmée" },
  preparing: { color: "#8B5CF6", bg: "#EDE9FE", text: "Préparation" },
  ready: { color: "#10B981", bg: "#D1FAE5", text: "Prête" },
  shipping: { color: "#F59E0B", bg: "#FEF3C7", text: "En livraison" },
  delivered: { color: "#10B981", bg: "#D1FAE5", text: "Livrée" },
  cancelled: { color: "#EF4444", bg: "#FEE2E2", text: "Annulée" },
};

export const DELIVERY_STATUS_CONFIG = {
  assigned: { color: "#F59E0B", bg: "#FEF3C7", text: "Assignée", icon: "person" },
  picked_up: { color: "#3B82F6", bg: "#DBEAFE", text: "Récupérée", icon: "bag" },
  in_transit: { color: "#8B5CF6", bg: "#EDE9FE", text: "En transit", icon: "car" },
  delivered: { color: "#10B981", bg: "#D1FAE5", text: "Livrée", icon: "checkmark-circle" },
  failed: { color: "#EF4444", bg: "#FEE2E2", text: "Échec", icon: "close-circle" },
};

export const MOCK_DRIVERS = [
  {
    id: 1,
    name: "Koffi Mensah",
    phone: "+229 90 12 34 56",
    vehicle: "Moto - AB 123 CD",
    photo: "https://via.placeholder.com/40x40/3B82F6/FFFFFF?text=KM",
    rating: 4.8,
    deliveries: 145,
  },
  {
    id: 2,
    name: "Ibrahim Sow",
    phone: "+229 91 23 45 67",
    vehicle: "Vélo - BC 456 EF",
    photo: "https://via.placeholder.com/40x40/10B981/FFFFFF?text=IS",
    rating: 4.6,
    deliveries: 98,
  },
  {
    id: 3,
    name: "Fatou Diallo",
    phone: "+229 92 34 56 78",
    vehicle: "Voiture - CD 789 GH",
    photo: "https://via.placeholder.com/40x40/EF4444/FFFFFF?text=FD",
    rating: 4.9,
    deliveries: 203,
  },
];

// Utility functions
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};
