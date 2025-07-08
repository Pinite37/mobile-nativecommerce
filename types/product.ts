// Types pour les produits
export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  enterprise: string | {
    _id: string;
    companyName: string;
    logo?: string;
    user?: string;
  };
  category: string | {
    _id: string;
    name: string;
    description: string;
  };
  isActive: boolean;
  stats: {
    totalSales: number;
    views: number;
    averageRating: number;
    totalReviews: number;
  };
  specifications: {
    key: string;
    value: string;
  }[];
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  tags?: string[];
  brand?: string;
  model?: string;
  sku?: string;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  description: string;
  icon?: string;
  image?: string;
  parentCategory?: string;
  isActive: boolean;
  sortOrder: number;
  featured: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[]; // Les images sont des chaînes base64 directes
  
  // Champs optionnels du modèle backend uniquement
  specifications?: {
    key: string;
    value: string;
  }[];
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  tags?: string[];
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  category?: string;
  images?: {
    base64: string;
  }[];
  specifications?: {
    key: string;
    value: string;
  }[];
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  tags?: string[];
  isActive?: boolean;
}

export interface ProductFilters {
  category?: string;
  isActive?: boolean;
  name?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'rating' | 'popular' | 'newest';
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface RemoveImageRequest {
  imageUrl: string;
}
