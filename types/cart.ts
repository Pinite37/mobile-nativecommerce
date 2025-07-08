// Types pour le panier et commandes B2B
export interface CartItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    price: number;
    images: string[];
    enterprise: {
      _id: string;
      companyName: string;
      logo?: string;
    };
    category: {
      _id: string;
      name: string;
    };
    stock: number;
  };
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  addedAt: string;
}

export interface Cart {
  _id: string;
  enterprise: string;
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  items: {
    product: string;
    quantity: number;
    unitPrice: number;
  }[];
  deliveryAddress: {
    street: string;
    city: string;
    region: string;
    country: string;
    postalCode?: string;
  };
  notes?: string;
  paymentMethod: 'cash' | 'transfer' | 'check' | 'mobile_money';
}

export interface Order {
  _id: string;
  orderNumber: string;
  buyer: {
    _id: string;
    companyName: string;
    logo?: string;
  };
  seller: {
    _id: string;
    companyName: string;
    logo?: string;
  };
  items: {
    product: {
      _id: string;
      name: string;
      images: string[];
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  deliveryAddress: {
    street: string;
    city: string;
    region: string;
    country: string;
    postalCode?: string;
  };
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
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

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}
