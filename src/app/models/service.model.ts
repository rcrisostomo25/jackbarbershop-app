/**
 * Service Model
 * Represents a barber service/sale record
 */
export interface Service {
  id?: string;
  serviceName: string;
  barberId: string;
  barberName: string;
  price: number;
  paymentMethod: 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'otro';
  comments?: string;
  apiKey?: string; // Security key for public registration
  isPublicRegistration?: boolean; // Flag to identify public vs authenticated registrations
  serviceDate?: Date; // Date when the service was provided (for admin-registered services from past)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Filter criteria for service listing
 */
export interface ServiceFilter {
  barberId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Service response from API
 */
export interface ServiceResponse {
  success: boolean;
  message: string;
  data?: Service | Service[];
  error?: string;
}
