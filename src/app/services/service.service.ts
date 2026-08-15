import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc, QueryConstraint, Timestamp } from '@angular/fire/firestore';
import { Service, ServiceFilter, ServiceResponse } from '../models/service.model';

@Injectable({
  providedIn: 'root'
})
export class ServiceService {
  private firestore = inject(Firestore);
  private collectionName = 'services';

  /**
   * Add a new service
   */
  async addService(service: Omit<Service, 'id'>): Promise<ServiceResponse> {
    try {
      const servicesCollection = collection(this.firestore, this.collectionName);
      const newService = {
        ...service,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      const docRef = await addDoc(servicesCollection, newService);
      console.log('✓ Service created:', docRef.id);
      return {
        success: true,
        message: 'Servicio registrado exitosamente',
        data: { ...service, id: docRef.id } as Service
      };
    } catch (error: any) {
      console.error('✗ Error adding service:', error);
      return {
        success: false,
        message: 'Error al registrar el servicio',
        error: error.message
      };
    }
  }

  /**
   * Get all services with optional filters
   */
  async getServices(filters?: ServiceFilter): Promise<Service[]> {
    try {
      const servicesCollection = collection(this.firestore, this.collectionName);
      const constraints: QueryConstraint[] = [];

      // Filter by barberId
      if (filters?.barberId) {
        constraints.push(where('barberId', '==', filters.barberId));
      }

      // Filter by date range
      if (filters?.startDate) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.startDate)));
      }
      if (filters?.endDate) {
        // End of day
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
      }

      const q = query(servicesCollection, ...constraints);
      const querySnapshot = await getDocs(q);
      const services: Service[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        services.push({
          id: doc.id,
          serviceName: data.serviceName,
          barberId: data.barberId,
          barberName: data.barberName,
          price: data.price,
          paymentMethod: data.paymentMethod,
          comments: data.comments || '',
          serviceDate: data.serviceDate?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Service);
      });

      console.log(`✓ Retrieved ${services.length} services`);
      return services;
    } catch (error: any) {
      console.error('✗ Error getting services:', error);
      return [];
    }
  }

  /**
   * Get services for a specific date
   */
  async getServicesByDate(date: Date): Promise<Service[]> {
    try {
      // Create date boundaries in local timezone to avoid UTC conversion issues
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      return this.getServices({
        startDate: startOfDay,
        endDate: endOfDay
      });
    } catch (error: any) {
      console.error('✗ Error getting services by date:', error);
      return [];
    }
  }

  /**
   * Get services for a specific barber on a specific date
   */
  async getBarberServicesByDate(barberId: string, date: Date): Promise<Service[]> {
    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      return this.getServices({
        barberId,
        startDate: startOfDay,
        endDate: endOfDay
      });
    } catch (error: any) {
      console.error('✗ Error getting barber services by date:', error);
      return [];
    }
  }

  /**
   * Get total revenue by date
   */
  async getTotalRevenueByDate(date: Date): Promise<number> {
    try {
      const services = await this.getServicesByDate(date);
      return services.reduce((total, service) => total + service.price, 0);
    } catch (error: any) {
      console.error('✗ Error calculating revenue:', error);
      return 0;
    }
  }

  /**
   * Get total revenue by barber and date
   */
  async getBarberRevenueByDate(barberId: string, date: Date): Promise<number> {
    try {
      const services = await this.getBarberServicesByDate(barberId, date);
      return services.reduce((total, service) => total + service.price, 0);
    } catch (error: any) {
      console.error('✗ Error calculating barber revenue:', error);
      return 0;
    }
  }

  /**
   * Update a service
   */
  async updateService(id: string, updates: Partial<Service>): Promise<ServiceResponse> {
    try {
      const serviceDoc = doc(this.firestore, this.collectionName, id);
      const updatedData = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      await updateDoc(serviceDoc, updatedData);
      console.log('✓ Service updated:', id);
      return {
        success: true,
        message: 'Servicio actualizado exitosamente'
      };
    } catch (error: any) {
      console.error('✗ Error updating service:', error);
      return {
        success: false,
        message: 'Error al actualizar el servicio',
        error: error.message
      };
    }
  }

  /**
   * Delete a service
   */
  async deleteService(id: string): Promise<ServiceResponse> {
    try {
      const serviceDoc = doc(this.firestore, this.collectionName, id);
      await deleteDoc(serviceDoc);
      console.log('✓ Service deleted:', id);
      return {
        success: true,
        message: 'Servicio eliminado exitosamente'
      };
    } catch (error: any) {
      console.error('✗ Error deleting service:', error);
      return {
        success: false,
        message: 'Error al eliminar el servicio',
        error: error.message
      };
    }
  }
}
