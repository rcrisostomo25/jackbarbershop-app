export interface Sale {
  id?: string;
  productId: string; // ID of the product or 'otros' for custom products
  productName: string; // Name of the product
  description?: string; // Optional description
  quantity: number; // Quantity sold
  salePrice: number; // Sale price per unit
  totalPrice: number; // Total price (quantity * salePrice)
  comments?: string; // Optional comments
  saleDate: Date; // Date of the sale (can be today or past date)
  createdAt: Date; // Registration timestamp
  updatedAt: Date; // Last update timestamp
}

export interface SaleFilter {
  startDate?: Date;
  endDate?: Date;
}

export interface SaleResponse {
  success: boolean;
  message: string;
  data?: Sale;
  error?: string;
}
