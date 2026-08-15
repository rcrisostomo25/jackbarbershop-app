export interface OfferRedemption {
  id?: string;
  offerType: 'promo' | 'discount_5' | 'exclusive_products' | 'free_cut';
  redeemedAt: Date;
  visitCount: number; // Número de visitas requeridas
  description: string;
  expiresAt?: Date;
}

export interface Visit {
  id?: string;
  clientPhone: string;
  clientName: string;
  clientId?: string; // Referencia al usuario si existe
  servicePerformed: string;
  recommendations?: string;
  visitDate: Date;
  createdAt: Date;
  createdBy?: string; // ID del admin que registró
  redeemedOffers?: OfferRedemption[]; // Ofertas canjeadas por este cliente
}

export interface VisitFilter {
  searchQuery?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface VisitResponse {
  success: boolean;
  message: string;
  data?: Visit;
  error?: string;
}

export interface ClientVisitStats {
  phone: string;
  name: string;
  totalVisits: number;
  lastVisit?: Date;
  redeemedOffers?: OfferRedemption[];
}

export interface FidelizationReport {
  period: string; // Ej: "Agosto 2026"
  totalClients: number;
  totalVisits: number;
  averageVisitsPerClient: number;
  tierDistribution: {
    new: number; // 1-2 visitas
    regular: number; // 3-4 visitas
    premium: number; // 5-9 visitas
    vip: number; // 10+ visitas
  };
  totalOffersRedeemed: number;
  offerBreakdown: {
    promo: number;
    discount_5: number;
    exclusive_products: number;
    free_cut: number;
  };
  topClients: ClientVisitStats[];
}

export interface RedemptionResponse {
  success: boolean;
  message: string;
  data?: OfferRedemption;
  error?: string;
}
