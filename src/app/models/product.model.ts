export interface Product {
  id?: string;
  name: string;
  quantity: number;
  costPrice: number;
  salePrice: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface ProductFilter {
  searchQuery?: string;
}

export interface ProductResponse {
  success: boolean;
  message: string;
  data?: Product;
  error?: string;
}

export interface SaleResponse {
  success: boolean;
  message: string;
  data?: {
    productId: string;
    quantitySold: number;
    profit: number;
  };
  error?: string;
}
