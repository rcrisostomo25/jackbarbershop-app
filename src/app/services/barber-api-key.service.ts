import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where, getDocs, doc, getDoc } from '@angular/fire/firestore';
import { BarberApiKey } from '../models/barber-api-key.model';

@Injectable({
  providedIn: 'root'
})
export class BarberApiKeyService {
  private firestore = inject(Firestore);

  /**
   * Validate barber API key against user document
   */
  async validateApiKey(barberId: string, apiKey: string): Promise<boolean> {
    try {
      const userDoc = doc(this.firestore, 'users', barberId);
      const snapshot = await getDoc(userDoc);

      if (!snapshot.exists()) {
        console.error('User not found:', barberId);
        return false;
      }

      const data = snapshot.data() as any;
      const storedApiKey = data?.apiKey;

      if (!storedApiKey) {
        console.error('API key not found for user:', barberId);
        return false;
      }

      return storedApiKey === apiKey;
    } catch (error: any) {
      console.error('Error validating API key:', error);
      return false;
    }
  }

  /**
   * Get barber info including API key from users collection
   */
  async getBarberApiKey(barberId: string): Promise<BarberApiKey | null> {
    try {
      const userDoc = doc(this.firestore, 'users', barberId);
      const snapshot = await getDoc(userDoc);

      if (!snapshot.exists()) {
        console.error('User not found:', barberId);
        return null;
      }

      const data = snapshot.data() as any;
      return {
        id: barberId,
        barberId: barberId,
        barberName: data.name || data.displayName || '',
        apiKey: data.apiKey || '',
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastUsed: data.lastUsed?.toDate()
      } as BarberApiKey;
    } catch (error: any) {
      console.error('Error getting barber API key:', error);
      return null;
    }
  }
}
