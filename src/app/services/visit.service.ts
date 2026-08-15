import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, QueryConstraint, Timestamp, updateDoc } from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';
import { Visit, VisitResponse, ClientVisitStats, FidelizationReport, OfferRedemption, RedemptionResponse } from '../models/visit.model';
import { FirestoreService } from './firestore.service';

@Injectable({
  providedIn: 'root'
})
export class VisitService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private firestoreService = inject(FirestoreService);
  private visitsCollection = 'visits';
  private usersCollection = 'users';

  /**
   * Register a visit - automatically creates a client if not found
   */
  async registerVisit(visit: Omit<Visit, 'id'>): Promise<VisitResponse> {
    try {
      // 1. Search for client by phone
      let clientId: string | undefined = undefined;
      const existingClient = await this.findClientByPhone(visit.clientPhone);

      if (existingClient) {
        // Client exists
        clientId = existingClient.id;
        console.log('✓ Cliente encontrado:', clientId);
      } else {
        // Create new client
        console.log('✓ Creando nuevo cliente...');
        const newClientId = await this.createClientFromVisit(visit.clientPhone, visit.clientName);
        clientId = newClientId;
      }

      // 2. Register the visit
      const visitsRef = collection(this.firestore, this.visitsCollection);
      const visitData = {
        ...visit,
        clientId,
        visitDate: Timestamp.fromDate(new Date(visit.visitDate)),
        createdAt: Timestamp.now()
      };

      // Remove undefined fields to prevent Firebase errors
      const cleanVisitData = Object.fromEntries(
        Object.entries(visitData).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(visitsRef, cleanVisitData);
      console.log('✓ Visita registrada:', docRef.id);

      return {
        success: true,
        message: 'Visita registrada exitosamente',
        data: { ...visit, id: docRef.id, clientId } as Visit
      };
    } catch (error: any) {
      console.error('✗ Error registering visit:', error);
      return {
        success: false,
        message: 'Error al registrar la visita',
        error: error.message
      };
    }
  }

  /**
   * Find client by phone number
   */
  private async findClientByPhone(phone: string): Promise<any | null> {
    try {
      const usersRef = collection(this.firestore, this.usersCollection);
      const q = query(usersRef, where('phone', '==', phone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }

      return null;
    } catch (error: any) {
      console.error('✗ Error finding client:', error);
      return null;
    }
  }

  /**
   * Create a new customer from visit data
   */
  private async createClientFromVisit(phone: string, displayName: string): Promise<string> {
    try {
      // Generate a temporary email based on phone
      const tempEmail = `cliente_${phone}@jackbarbershop.local`;
      const tempPassword = Math.random().toString(36).substr(2, 8);

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(this.auth, tempEmail, tempPassword);
      const firebaseUser = userCredential.user;

      // Update profile
      await updateProfile(firebaseUser, { displayName });

      // Create Firestore document
      const userData = {
        id: firebaseUser.uid,
        email: tempEmail,
        displayName,
        phone,
        role: 'customer',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        source: 'visit_registration'
      };

      await this.firestoreService.setDocument(this.usersCollection, firebaseUser.uid, userData);
      console.log('✓ Nuevo cliente creado:', firebaseUser.uid);

      return firebaseUser.uid;
    } catch (error: any) {
      console.error('✗ Error creating client:', error);
      throw error;
    }
  }

  /**
   * Get all visits
   */
  async getVisits(): Promise<Visit[]> {
    try {
      const visitsRef = collection(this.firestore, this.visitsCollection);
      const q = query(visitsRef);
      const querySnapshot = await getDocs(q);
      const visits: Visit[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        visits.push({
          id: doc.id,
          clientPhone: data.clientPhone,
          clientName: data.clientName,
          clientId: data.clientId,
          servicePerformed: data.servicePerformed,
          recommendations: data.recommendations || '',
          visitDate: data.visitDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy
        } as Visit);
      });

      // Sort by date descending
      visits.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());

      console.log(`✓ Retrieved ${visits.length} visits`);
      return visits;
    } catch (error: any) {
      console.error('✗ Error getting visits:', error);
      return [];
    }
  }

  /**
   * Get visits for a specific client by phone
   */
  async getClientVisits(phone: string): Promise<Visit[]> {
    try {
      const visits = await this.getVisits();
      return visits.filter(v => v.clientPhone === phone);
    } catch (error: any) {
      console.error('✗ Error getting client visits:', error);
      return [];
    }
  }

  /**
   * Get total visits count for a client
   */
  async getTotalVisitsByClient(phone: string): Promise<number> {
    try {
      const visits = await this.getClientVisits(phone);
      return visits.length;
    } catch (error: any) {
      console.error('✗ Error calculating total visits:', error);
      return 0;
    }
  }

  /**
   * Get visit statistics for all clients
   */
  async getClientsVisitStats(): Promise<ClientVisitStats[]> {
    try {
      const visits = await this.getVisits();
      const clientMap = new Map<string, ClientVisitStats>();

      visits.forEach(visit => {
        if (clientMap.has(visit.clientPhone)) {
          const stats = clientMap.get(visit.clientPhone)!;
          stats.totalVisits++;
          stats.lastVisit = new Date(visit.visitDate) > new Date(stats.lastVisit || 0) ? visit.visitDate : stats.lastVisit;
        } else {
          clientMap.set(visit.clientPhone, {
            phone: visit.clientPhone,
            name: visit.clientName,
            totalVisits: 1,
            lastVisit: visit.visitDate
          });
        }
      });

      return Array.from(clientMap.values()).sort((a, b) => b.totalVisits - a.totalVisits);
    } catch (error: any) {
      console.error('✗ Error getting client stats:', error);
      return [];
    }
  }

  /**
   * Delete a visit
   */
  async deleteVisit(id: string): Promise<VisitResponse> {
    try {
      const visitDoc = doc(this.firestore, this.visitsCollection, id);
      await deleteDoc(visitDoc);
      console.log('✓ Visit deleted:', id);
      return {
        success: true,
        message: 'Visita eliminada exitosamente'
      };
    } catch (error: any) {
      console.error('✗ Error deleting visit:', error);
      return {
        success: false,
        message: 'Error al eliminar la visita',
        error: error.message
      };
    }
  }

  /**
   * Search visits by phone or name
   */
  async searchVisits(searchQuery: string): Promise<Visit[]> {
    try {
      const visits = await this.getVisits();
      if (!searchQuery.trim()) {
        return visits;
      }
      const query = searchQuery.toLowerCase();
      return visits.filter(v =>
        v.clientPhone.toLowerCase().includes(query) ||
        v.clientName.toLowerCase().includes(query) ||
        v.servicePerformed.toLowerCase().includes(query)
      );
    } catch (error: any) {
      console.error('✗ Error searching visits:', error);
      return [];
    }
  }

  /**
   * Get available offers for a client based on visit count
   */
  getAvailableOffers(visitCount: number): OfferRedemption[] {
    const offers: OfferRedemption[] = [];
    const now = new Date();
    const expiresIn30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (visitCount >= 1) {
      offers.push({
        offerType: 'promo',
        visitCount: 1,
        description: 'Acceso a promociones generales',
        redeemedAt: now,
        expiresAt: expiresIn30Days
      });
    }
    if (visitCount >= 3) {
      offers.push({
        offerType: 'discount_5',
        visitCount: 3,
        description: 'Descuento del 5% en servicios',
        redeemedAt: now,
        expiresAt: expiresIn30Days
      });
    }
    if (visitCount >= 5) {
      offers.push({
        offerType: 'exclusive_products',
        visitCount: 5,
        description: 'Acceso a productos exclusivos',
        redeemedAt: now,
        expiresAt: expiresIn30Days
      });
    }
    if (visitCount >= 10) {
      offers.push({
        offerType: 'free_cut',
        visitCount: 10,
        description: 'Corte gratis cada 10 visitas',
        redeemedAt: now,
        expiresAt: expiresIn30Days
      });
    }

    return offers;
  }

  /**
   * Redeem an offer for a client
   */
  async redeemOfferForClient(clientPhone: string, offerType: string): Promise<RedemptionResponse> {
    try {
      // 1. Get client visits to check eligibility
      const clientVisits = await this.getClientVisits(clientPhone);
      const visitCount = clientVisits.length;

      // 2. Validate offer eligibility
      const eligibleOffers = this.getAvailableOffers(visitCount);
      const isEligible = eligibleOffers.some(o => o.offerType === offerType);

      if (!isEligible) {
        return {
          success: false,
          message: `El cliente no es elegible para esta oferta. Requiere más visitas.`,
          error: 'OFFER_NOT_ELIGIBLE'
        };
      }

      // 3. Create redemption record
      const redemption: OfferRedemption = {
        offerType: offerType as 'promo' | 'discount_5' | 'exclusive_products' | 'free_cut',
        visitCount,
        description: eligibleOffers.find(o => o.offerType === offerType)?.description || '',
        redeemedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      // 4. Add redemption to first visit of client
      if (clientVisits.length > 0) {
        const firstVisit = clientVisits[0];
        if (firstVisit.id) {
          const visitDoc = doc(this.firestore, this.visitsCollection, firstVisit.id);
          const redeemedOffers = firstVisit.redeemedOffers || [];
          
          await updateDoc(visitDoc, {
            redeemedOffers: [...redeemedOffers, redemption]
          });

          console.log('✓ Oferta canjeada:', offerType);
          return {
            success: true,
            message: `Oferta "${redemption.description}" canjeada exitosamente`,
            data: redemption
          };
        }
      }

      return {
        success: false,
        message: 'No se pudo registrar el canje de la oferta',
        error: 'UPDATE_FAILED'
      };
    } catch (error: any) {
      console.error('✗ Error redeeming offer:', error);
      return {
        success: false,
        message: 'Error al canjear la oferta',
        error: error.message
      };
    }
  }

  /**
   * Get redemption history for a client
   */
  async getClientRedemptions(clientPhone: string): Promise<OfferRedemption[]> {
    try {
      const clientVisits = await this.getClientVisits(clientPhone);
      const allRedemptions: OfferRedemption[] = [];

      clientVisits.forEach(visit => {
        if (visit.redeemedOffers) {
          allRedemptions.push(...visit.redeemedOffers);
        }
      });

      // Sort by redeemed date descending
      return allRedemptions.sort((a, b) => 
        new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime()
      );
    } catch (error: any) {
      console.error('✗ Error getting client redemptions:', error);
      return [];
    }
  }

  /**
   * Generate fidelization report
   */
  async generateFidelizationReport(): Promise<FidelizationReport> {
    try {
      const clientStats = await this.getClientsVisitStats();
      const visits = await this.getVisits();

      // Calculate tier distribution
      const tierDistribution = {
        new: 0,
        regular: 0,
        premium: 0,
        vip: 0
      };

      clientStats.forEach(stat => {
        if (stat.totalVisits >= 10) {
          tierDistribution.vip++;
        } else if (stat.totalVisits >= 5) {
          tierDistribution.premium++;
        } else if (stat.totalVisits >= 3) {
          tierDistribution.regular++;
        } else {
          tierDistribution.new++;
        }
      });

      // Count total offers redeemed
      let totalOffersRedeemed = 0;
      const offerBreakdown = {
        promo: 0,
        discount_5: 0,
        exclusive_products: 0,
        free_cut: 0
      };

      clientStats.forEach(stat => {
        if (stat.redeemedOffers) {
          stat.redeemedOffers.forEach(offer => {
            totalOffersRedeemed++;
            offerBreakdown[offer.offerType as keyof typeof offerBreakdown]++;
          });
        }
      });

      // Get today's date for period
      const today = new Date();
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const period = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;

      // Get top 5 clients
      const topClients = clientStats.slice(0, 5);

      return {
        period,
        totalClients: clientStats.length,
        totalVisits: visits.length,
        averageVisitsPerClient: clientStats.length > 0 ? visits.length / clientStats.length : 0,
        tierDistribution,
        totalOffersRedeemed,
        offerBreakdown,
        topClients
      };
    } catch (error: any) {
      console.error('✗ Error generating fidelization report:', error);
      return {
        period: 'N/A',
        totalClients: 0,
        totalVisits: 0,
        averageVisitsPerClient: 0,
        tierDistribution: { new: 0, regular: 0, premium: 0, vip: 0 },
        totalOffersRedeemed: 0,
        offerBreakdown: { promo: 0, discount_5: 0, exclusive_products: 0, free_cut: 0 },
        topClients: []
      };
    }
  }

  /**
   * Get report data for date range
   */
  async getReportByDateRange(startDate: Date, endDate: Date): Promise<FidelizationReport> {
    try {
      const allVisits = await this.getVisits();
      const filteredVisits = allVisits.filter(v => {
        const visitDate = new Date(v.visitDate);
        return visitDate >= startDate && visitDate <= endDate;
      });

      // Get unique clients from filtered visits
      const clientMap = new Map<string, ClientVisitStats>();
      filteredVisits.forEach(visit => {
        if (clientMap.has(visit.clientPhone)) {
          const stats = clientMap.get(visit.clientPhone)!;
          stats.totalVisits++;
          stats.lastVisit = new Date(visit.visitDate) > new Date(stats.lastVisit || 0) 
            ? visit.visitDate 
            : stats.lastVisit;
        } else {
          clientMap.set(visit.clientPhone, {
            phone: visit.clientPhone,
            name: visit.clientName,
            totalVisits: 1,
            lastVisit: visit.visitDate,
            redeemedOffers: visit.redeemedOffers
          });
        }
      });

      const clientStats = Array.from(clientMap.values()).sort((a, b) => b.totalVisits - a.totalVisits);

      // Calculate tier distribution
      const tierDistribution = {
        new: 0,
        regular: 0,
        premium: 0,
        vip: 0
      };

      clientStats.forEach(stat => {
        if (stat.totalVisits >= 10) {
          tierDistribution.vip++;
        } else if (stat.totalVisits >= 5) {
          tierDistribution.premium++;
        } else if (stat.totalVisits >= 3) {
          tierDistribution.regular++;
        } else {
          tierDistribution.new++;
        }
      });

      // Count total offers redeemed
      let totalOffersRedeemed = 0;
      const offerBreakdown = {
        promo: 0,
        discount_5: 0,
        exclusive_products: 0,
        free_cut: 0
      };

      clientStats.forEach(stat => {
        if (stat.redeemedOffers) {
          stat.redeemedOffers.forEach(offer => {
            totalOffersRedeemed++;
            offerBreakdown[offer.offerType as keyof typeof offerBreakdown]++;
          });
        }
      });

      const period = `${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`;

      return {
        period,
        totalClients: clientStats.length,
        totalVisits: filteredVisits.length,
        averageVisitsPerClient: clientStats.length > 0 ? filteredVisits.length / clientStats.length : 0,
        tierDistribution,
        totalOffersRedeemed,
        offerBreakdown,
        topClients: clientStats.slice(0, 5)
      };
    } catch (error: any) {
      console.error('✗ Error getting report by date range:', error);
      return {
        period: 'N/A',
        totalClients: 0,
        totalVisits: 0,
        averageVisitsPerClient: 0,
        tierDistribution: { new: 0, regular: 0, premium: 0, vip: 0 },
        totalOffersRedeemed: 0,
        offerBreakdown: { promo: 0, discount_5: 0, exclusive_products: 0, free_cut: 0 },
        topClients: []
      };
    }
  }

  /**
   * Validate visit key from params collection
   */
  async validateVisitKey(key: string): Promise<boolean> {
    try {
      const paramsRef = collection(this.firestore, 'params');
      const q = query(paramsRef);
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.warn('⚠️ No params document found');
        return false;
      }

      // Get the first document (should be unique 'params' doc)
      const doc = querySnapshot.docs[0];
      const data = doc.data() as any;
      const storedKey = data.visitKey?.toString();

      const isValid = storedKey === key;
      if (isValid) {
        console.log('✓ Visit key validated successfully');
      } else {
        console.warn('❌ Invalid visit key');
      }

      return isValid;
    } catch (error: any) {
      console.error('✗ Error validating visit key:', error);
      return false;
    }
  }
}
