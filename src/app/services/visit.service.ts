import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, QueryConstraint, Timestamp, updateDoc, setDoc, limit, startAfter, orderBy, QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';
import { Visit, VisitResponse, ClientVisitStats, FidelizationReport, OfferRedemption, RedemptionResponse, VisitStatus, PaginatedVisitsResponse } from '../models/visit.model';
import { FirestoreService } from './firestore.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class VisitService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private firestoreService = inject(FirestoreService);
  private userService = inject(UserService);
  private visitsCollection = 'visits';
  private usersCollection = 'users';
  
  // Pagination cursors cache - stores the last visible doc for each page
  private paginationCursors: Map<number, QueryDocumentSnapshot<DocumentData>> = new Map();

  /**
   * Register a visit with optional clientcode support
   * - If clientcode provided and exists: Use existing client
   * - If clientcode provided and NEW (isNewClientCode=true): Create new customer with this code
   * - If clientcode provided and exists but phone is different: Update with clientcode
   * - If no clientcode: Use existing logic (find by phone or create)
   */
  async registerVisit(
    visit: Omit<Visit, 'id' | 'status'> & { status?: VisitStatus },
    clientcode?: string,
    isNewClientCode: boolean = false
  ): Promise<VisitResponse> {
    try {
      let clientId: string | undefined = undefined;

      // CRITICAL: Always check if clientcode already exists before attempting creation
      // This prevents race conditions where multiple requests create duplicate codes
      if (clientcode) {
        console.log('🔍 Verificando si clientcode ya existe en BD:', clientcode);
        const existingByCode = await this.userService.getUserByClientCode(clientcode);
        if (existingByCode) {
          console.log('✅ Clientcode encontrado en BD, usando cliente existente:', existingByCode.id);
          clientId = existingByCode.id;
          isNewClientCode = false; // Override flag - it's not new
        }
      }

      // If clientcode not found or no clientcode provided, proceed with other logic
      if (!clientId) {
        if (clientcode && isNewClientCode) {
          // New clientcode that doesn't exist in DB - create a new customer with this code
          console.log('✓ Creando nuevo cliente con clientcode:', clientcode);
          clientId = await this.createClientFromVisit(visit.clientPhone, visit.clientName, clientcode);
        } else {
          // Search for client by phone (existing logic)
          const existingClient = await this.findClientByPhone(visit.clientPhone);

          if (existingClient) {
            // Client exists
            clientId = existingClient.id;
            console.log('✓ Cliente encontrado por teléfono:', clientId);

            // If clientcode provided and client doesn't have it, update the client
            if (clientcode && !existingClient.clientcode && clientId) {
              try {
                const userRef = doc(this.firestore, this.usersCollection, clientId);
                await updateDoc(userRef, {
                  clientcode,
                  updatedAt: Timestamp.now()
                });
                console.log('✓ Clientcode actualizado para cliente:', clientId, clientcode);
              } catch (error) {
                console.error('✗ Error updating clientcode:', error);
                // Continue anyway - client was found and can register visit
              }
            }
          } else {
            // Create new client
            console.log('✓ Creando nuevo cliente (no existe por teléfono ni clientcode)...');
            clientId = await this.createClientFromVisit(visit.clientPhone, visit.clientName, clientcode);
          }
        }
      }

      // 2. Register the visit
      if (!clientId) {
        return {
          success: false,
          message: 'No se pudo identificar o crear al cliente',
          error: 'clientId is undefined'
        };
      }

      const visitsRef = collection(this.firestore, this.visitsCollection);
      const visitData = {
        ...visit,
        clientId,
        status: 'Registrado', // Estado por defecto
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
        data: { ...visit, id: docRef.id, clientId, status: 'Registrado' } as Visit
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
   * Create a new customer from visit data with optional clientcode
   * Generates a temporary unique email only for Firebase Auth, but saves minimal data to Firestore
   */
  private async createClientFromVisit(phone: string, displayName: string, clientcode?: string): Promise<string> {
    try {
      // DOUBLE-CHECK: Verify clientcode doesn't already exist just before creation
      if (clientcode) {
        console.log('🔍 Verificación final: ¿existe clientcode?', clientcode);
        const existing = await this.userService.getUserByClientCode(clientcode);
        if (existing) {
          console.log('✅ RACE CONDITION DETECTED: Clientcode ya fue creado. Retornando usuario existente:', existing.id);
          return existing.id;
        }
      }

      // Generate a UNIQUE temporary email ONLY for Firebase Auth (never saved to Firestore)
      // Use timestamp + random UUID to guarantee uniqueness
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 12) + Math.random().toString(36).substr(2, 12);
      const tempEmail = `temp_${timestamp}_${randomId}@jackbarbershop.local`;

      console.log('📧 Email temporal para Firebase Auth (no se guardará en Firestore):', tempEmail);

      const tempPassword = Math.random().toString(36).substr(2, 8);

      try {
        // Create Firebase Auth user with temporary unique email
        const userCredential = await createUserWithEmailAndPassword(this.auth, tempEmail, tempPassword);
        const firebaseUser = userCredential.user;

        console.log('✅ Firebase Auth usuario creado:', firebaseUser.uid);

        // Update profile with display name
        await updateProfile(firebaseUser, { displayName });

        // Create minimal Firestore document: ONLY clientcode, displayName, phone
        // No email stored - we only store what's necessary
        const now = new Date();
        
        // Validate inputs before saving
        if (!phone || phone.trim() === '') {
          console.error('✗ CRÍTICO: phone está vacío o undefined:', { phone, displayName });
        }
        if (!displayName || displayName.trim() === '') {
          console.error('✗ CRÍTICO: displayName está vacío o undefined:', { phone, displayName });
        }
        
        const userData: any = {
          id: firebaseUser.uid,
          displayName: displayName.trim(),
          phone: phone.trim(), // Asegurar que phone se guarda sin espacios
          role: 'customer',
          createdAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now),
          source: 'visit_registration'
        };

        // Add clientcode ONLY if provided
        if (clientcode) {
          userData.clientcode = clientcode;
        }

        console.log('📝 Guardando usuario en Firestore:', {
          id: userData.id,
          displayName: userData.displayName,
          phone: userData.phone,
          clientcode: userData.clientcode || '(sin código)',
          role: userData.role,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        });

        const userDocRef = doc(this.firestore, this.usersCollection, firebaseUser.uid);
        await setDoc(userDocRef, userData, { merge: false });

        console.log('✓ Nuevo cliente creado exitosamente en Firestore:', firebaseUser.uid);
        console.log('  - Nombre:', displayName);
        console.log('  - Teléfono:', phone);
        if (clientcode) {
          console.log('  - Clientcode:', clientcode);
        }
        console.log('  - Email: (no guardado en Firestore, solo temporal en Firebase Auth)');

        return firebaseUser.uid;

      } catch (authError: any) {
        // Handle auth/email-already-in-use - shouldn't happen with our unique email
        if (authError.code === 'auth/email-already-in-use' && clientcode) {
          console.warn('⚠️ EMAIL CONFLICT INESPERADO (esto no debería suceder)');
          
          // Try to find the existing user by clientcode
          const existingUser = await this.userService.getUserByClientCode(clientcode);
          if (existingUser) {
            console.log('✅ Usuario existente encontrado:', existingUser.id);
            return existingUser.id;
          }

          // If we can't find by clientcode, try by phone
          const existingByPhone = await this.findClientByPhone(phone);
          if (existingByPhone) {
            console.log('✅ Usuario existente encontrado por teléfono:', existingByPhone.id);
            return existingByPhone.id;
          }

          throw authError;
        }

        throw authError;
      }

    } catch (error: any) {
      console.error('✗ Error creating client:', error);
      console.error('  Error message:', error.message);
      console.error('  Error code:', error.code);
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
          service: data.service,
          barberName: data.barberName,
          servicePerformed: data.servicePerformed,
          recommendations: data.recommendations || '',
          visitDate: data.visitDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          status: data.status || 'Registrado', // Estado por defecto si no existe
          approvedBy: data.approvedBy,
          approvedAt: data.approvedAt?.toDate(),
          rejectedBy: data.rejectedBy,
          rejectedAt: data.rejectedAt?.toDate(),
          rejectionReason: data.rejectionReason
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
   * Get total count of all visits
   */
  async getTotalVisitsCount(): Promise<number> {
    try {
      const visitsRef = collection(this.firestore, this.visitsCollection);
      const q = query(visitsRef);
      const querySnapshot = await getDocs(q);
      console.log(`✓ Total visits count: ${querySnapshot.size}`);
      return querySnapshot.size;
    } catch (error: any) {
      console.error('✗ Error counting visits:', error);
      return 0;
    }
  }

  /**
   * Get visits paginated with proper Firestore cursor-based pagination
   * @param pageSize - Number of visits per page
   * @param pageNumber - Current page number (1-indexed)
   */
  async getVisitsPaginated(pageSize: number = 20, pageNumber: number = 1): Promise<PaginatedVisitsResponse> {
    try {
      const visitsRef = collection(this.firestore, this.visitsCollection);
      
      // Get total count (only on first page for efficiency)
      let totalCount = 0;
      if (pageNumber === 1) {
        const countQuery = query(visitsRef);
        const countSnapshot = await getDocs(countQuery);
        totalCount = countSnapshot.size;
      }
      
      // Build query with ordering and limit
      let paginationQuery = query(
        visitsRef,
        orderBy('visitDate', 'desc'),
        limit(pageSize + 1) // Get one extra to know if there's a next page
      );

      // If not first page, use cursor for startAfter
      if (pageNumber > 1) {
        const previousPageCursor = this.paginationCursors.get(pageNumber - 1);
        if (previousPageCursor) {
          paginationQuery = query(
            visitsRef,
            orderBy('visitDate', 'desc'),
            startAfter(previousPageCursor),
            limit(pageSize + 1)
          );
        }
      }

      const querySnapshot = await getDocs(paginationQuery);
      const visits: Visit[] = [];
      let lastVisibleDoc: QueryDocumentSnapshot<DocumentData> | null = null;

      let docIndex = 0;
      querySnapshot.forEach((doc) => {
        // Only include pageSize items (the +1 was just to check if there's a next page)
        if (docIndex < pageSize) {
          const data = doc.data() as any;
          visits.push({
            id: doc.id,
            clientPhone: data.clientPhone,
            clientName: data.clientName,
            clientId: data.clientId,
            service: data.service,
            barberName: data.barberName,
            servicePerformed: data.servicePerformed,
            recommendations: data.recommendations || '',
            visitDate: data.visitDate?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            createdBy: data.createdBy,
            status: data.status || 'Registrado',
            approvedBy: data.approvedBy,
            approvedAt: data.approvedAt?.toDate(),
            rejectedBy: data.rejectedBy,
            rejectedAt: data.rejectedAt?.toDate(),
            rejectionReason: data.rejectionReason
          } as Visit);
          lastVisibleDoc = doc;
        }
        docIndex++;
      });

      // Store the cursor for next/previous navigation
      if (lastVisibleDoc) {
        this.paginationCursors.set(pageNumber, lastVisibleDoc);
      }

      // Check if there's a next page (we fetched pageSize + 1 items)
      const hasNextPage = querySnapshot.docs.length > pageSize;
      const totalPages = Math.ceil(totalCount / pageSize) || 1;
      const hasPreviousPage = pageNumber > 1;

      console.log(`✓ Retrieved page ${pageNumber} with ${visits.length} visits (Total: ${totalCount}, Pages: ${totalPages})`);

      return {
        visits,
        totalCount,
        pageNumber,
        pageSize,
        hasNextPage,
        hasPreviousPage
      };
    } catch (error: any) {
      console.error('✗ Error getting paginated visits:', error);
      return {
        visits: [],
        totalCount: 0,
        pageNumber: 1,
        pageSize,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }
  }

  /**
   * Clear pagination cursors (call when filters change)
   */
  clearPaginationCache() {
    this.paginationCursors.clear();
    console.log('✓ Pagination cache cleared');
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
          
          // Contar por estado
          if (visit.status === 'Aprobado') {
            stats.approvedVisits++;
          } else if (visit.status === 'Rechazado') {
            stats.rejectedVisits++;
          } else {
            stats.pendingVisits++;
          }
          
          stats.lastVisit = new Date(visit.visitDate) > new Date(stats.lastVisit || 0) ? visit.visitDate : stats.lastVisit;
        } else {
          const approvedCount = visit.status === 'Aprobado' ? 1 : 0;
          const rejectedCount = visit.status === 'Rechazado' ? 1 : 0;
          const pendingCount = visit.status === 'Registrado' ? 1 : 0;
          
          clientMap.set(visit.clientPhone, {
            phone: visit.clientPhone,
            name: visit.clientName,
            totalVisits: 1,
            approvedVisits: approvedCount,
            rejectedVisits: rejectedCount,
            pendingVisits: pendingCount,
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
   * NOTE: Only approved visits count towards offers
   */
  async redeemOfferForClient(clientPhone: string, offerType: string): Promise<RedemptionResponse> {
    try {
      // 1. Get client visits to check eligibility
      const clientVisits = await this.getClientVisits(clientPhone);
      
      // Count only APPROVED visits for offer eligibility
      const approvedVisitCount = clientVisits.filter(v => v.status === 'Aprobado').length;

      // 2. Validate offer eligibility
      const eligibleOffers = this.getAvailableOffers(approvedVisitCount);
      const isEligible = eligibleOffers.some(o => o.offerType === offerType);

      if (!isEligible) {
        return {
          success: false,
          message: `El cliente no es elegible para esta oferta. Requiere más visitas aprobadas.`,
          error: 'OFFER_NOT_ELIGIBLE'
        };
      }

      // 3. Create redemption record
      const redemption: OfferRedemption = {
        offerType: offerType as 'promo' | 'discount_5' | 'exclusive_products' | 'free_cut',
        visitCount: approvedVisitCount,
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
          
          // Contar por estado
          if (visit.status === 'Aprobado') {
            stats.approvedVisits++;
          } else if (visit.status === 'Rechazado') {
            stats.rejectedVisits++;
          } else {
            stats.pendingVisits++;
          }
          
          stats.lastVisit = new Date(visit.visitDate) > new Date(stats.lastVisit || 0) 
            ? visit.visitDate 
            : stats.lastVisit;
        } else {
          const approvedCount = visit.status === 'Aprobado' ? 1 : 0;
          const rejectedCount = visit.status === 'Rechazado' ? 1 : 0;
          const pendingCount = visit.status === 'Registrado' ? 1 : 0;
          
          clientMap.set(visit.clientPhone, {
            phone: visit.clientPhone,
            name: visit.clientName,
            totalVisits: 1,
            approvedVisits: approvedCount,
            rejectedVisits: rejectedCount,
            pendingVisits: pendingCount,
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

  /**
   * Approve a visit by ID (Admin only)
   * Changes status from "Registrado" to "Aprobado"
   */
  async approveVisit(visitId: string, adminId: string): Promise<VisitResponse> {
    try {
      const visitDoc = doc(this.firestore, this.visitsCollection, visitId);
      
      await updateDoc(visitDoc, {
        status: 'Aprobado',
        approvedBy: adminId,
        approvedAt: Timestamp.now()
      });

      console.log('✓ Visita aprobada:', visitId);
      return {
        success: true,
        message: 'Visita aprobada exitosamente'
      };
    } catch (error: any) {
      console.error('✗ Error approving visit:', error);
      return {
        success: false,
        message: 'Error al aprobar la visita',
        error: error.message
      };
    }
  }

  /**
   * Reject a visit by ID (Admin only)
   * Changes status from "Registrado" to "Rechazado"
   */
  async rejectVisit(visitId: string, adminId: string, reason?: string): Promise<VisitResponse> {
    try {
      const visitDoc = doc(this.firestore, this.visitsCollection, visitId);
      
      const updateData: any = {
        status: 'Rechazado',
        rejectedBy: adminId,
        rejectedAt: Timestamp.now()
      };

      if (reason) {
        updateData.rejectionReason = reason;
      }

      await updateDoc(visitDoc, updateData);

      console.log('✓ Visita rechazada:', visitId);
      return {
        success: true,
        message: 'Visita rechazada exitosamente'
      };
    } catch (error: any) {
      console.error('✗ Error rejecting visit:', error);
      return {
        success: false,
        message: 'Error al rechazar la visita',
        error: error.message
      };
    }
  }
}
