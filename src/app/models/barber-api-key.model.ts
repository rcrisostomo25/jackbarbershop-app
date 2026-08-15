/**
 * Barber API Key Model
 * Stores the security key for public service registration
 */
export interface BarberApiKey {
  id?: string;
  barberId: string;
  barberName: string;
  apiKey: string; // Security key generated for this barber
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
}
