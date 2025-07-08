import { Product } from './product';

// Types pour le panier
export interface CartItem {
  _id: string;
  product: Product;
  quantity: number;
  price: number;
  totalPrice: number;
  addedAt: string;
}

export interface Cart {
  _id: string;
  enterprise: {
    _id: string;
    companyName: string;
    user: string;
  };
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

// Types pour les commandes
export interface OrderItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    images: string[];
    price: number;
    enterprise: {
      _id: string;
      companyName: string;
    };
  };
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  buyer: {
    _id: string;
    companyName: string;
    user: string;
  };
  seller: {
    _id: string;
    companyName: string;
    user: string;
  };
  items: OrderItem[];
  totalAmount: number;
  totalItems: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  items: {
    productId: string;
    quantity: number;
  }[];
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
}

export interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface OrderFilters {
  status?: string;
  paymentStatus?: string;
  sellerId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}
