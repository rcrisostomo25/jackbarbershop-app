import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, QueryConstraint, Timestamp } from '@angular/fire/firestore';
import { Sale, SaleFilter, SaleResponse } from '../models/sale.model';

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private firestore = inject(Firestore);
  private collectionName = 'sales';

  /**
   * Add a new sale
   */
  async addSale(sale: Omit<Sale, 'id'>): Promise<SaleResponse> {
    try {
      const salesCollection = collection(this.firestore, this.collectionName);
      const newSale = {
        ...sale,
        saleDate: Timestamp.fromDate(sale.saleDate),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      const docRef = await addDoc(salesCollection, newSale);
      console.log('✓ Sale created:', docRef.id);
      return {
        success: true,
        message: 'Venta registrada exitosamente',
        data: { ...sale, id: docRef.id } as Sale
      };
    } catch (error: any) {
      console.error('✗ Error adding sale:', error);
      return {
        success: false,
        message: 'Error al registrar la venta',
        error: error.message
      };
    }
  }

  /**
   * Get all sales with optional filters
   */
  async getSales(filters?: SaleFilter): Promise<Sale[]> {
    try {
      const salesCollection = collection(this.firestore, this.collectionName);
      const constraints: QueryConstraint[] = [];

      // Filter by date range (using saleDate)
      if (filters?.startDate) {
        constraints.push(where('saleDate', '>=', Timestamp.fromDate(filters.startDate)));
      }
      if (filters?.endDate) {
        // End of day
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('saleDate', '<=', Timestamp.fromDate(endOfDay)));
      }

      const q = query(salesCollection, ...constraints);
      const querySnapshot = await getDocs(q);
      const sales: Sale[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        sales.push({
          id: doc.id,
          productId: data.productId,
          productName: data.productName,
          description: data.description || '',
          quantity: data.quantity,
          salePrice: data.salePrice,
          totalPrice: data.totalPrice,
          comments: data.comments || '',
          saleDate: data.saleDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Sale);
      });

      console.log(`✓ Retrieved ${sales.length} sales`);
      return sales;
    } catch (error: any) {
      console.error('✗ Error getting sales:', error);
      return [];
    }
  }

  /**
   * Get sales for a specific date
   */
  async getSalesByDate(date: Date): Promise<Sale[]> {
    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      return this.getSales({
        startDate: startOfDay,
        endDate: endOfDay
      });
    } catch (error: any) {
      console.error('✗ Error getting sales by date:', error);
      return [];
    }
  }

  /**
   * Update a sale
   */
  async updateSale(id: string, sale: any): Promise<SaleResponse> {
    try {
      const saleDocRef = doc(this.firestore, this.collectionName, id);
      const updateData: any = {
        ...sale,
        updatedAt: Timestamp.now()
      };

      // Convert saleDate if it exists
      if (sale.saleDate) {
        updateData.saleDate = Timestamp.fromDate(sale.saleDate);
      }

      await updateDoc(saleDocRef, updateData);
      console.log('✓ Sale updated:', id);
      return {
        success: true,
        message: 'Venta actualizada exitosamente',
        data: { ...sale } as Sale
      };
    } catch (error: any) {
      console.error('✗ Error updating sale:', error);
      return {
        success: false,
        message: 'Error al actualizar la venta',
        error: error.message
      };
    }
  }

  /**
   * Delete a sale
   */
  async deleteSale(id: string): Promise<SaleResponse> {
    try {
      const saleDocRef = doc(this.firestore, this.collectionName, id);
      await deleteDoc(saleDocRef);
      console.log('✓ Sale deleted:', id);
      return {
        success: true,
        message: 'Venta eliminada exitosamente'
      };
    } catch (error: any) {
      console.error('✗ Error deleting sale:', error);
      return {
        success: false,
        message: 'Error al eliminar la venta',
        error: error.message
      };
    }
  }
}
