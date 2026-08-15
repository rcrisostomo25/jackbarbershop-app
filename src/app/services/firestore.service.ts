import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Query,
  DocumentReference,
  DocumentData
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  constructor(private firestore: Firestore) {}

  // Get a single document
  async getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
    try {
      const docRef = doc(this.firestore, collectionName, docId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as T) : null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  // Get all documents from a collection
  async getCollection<T>(collectionName: string): Promise<T[]> {
    try {
      const colRef = collection(this.firestore, collectionName);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      console.error('Error getting collection:', error);
      throw error;
    }
  }

  // Query documents
  async queryCollection<T>(collectionName: string, constraints: any[]): Promise<T[]> {
    try {
      const colRef = collection(this.firestore, collectionName);
      const q = query(colRef, ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      console.error('Error querying collection:', error);
      throw error;
    }
  }

  // Add or update a document
  async setDocument<T extends Record<string, any>>(collectionName: string, docId: string, data: T): Promise<void> {
    try {
      const docRef = doc(this.firestore, collectionName, docId);
      await setDoc(docRef, data);
    } catch (error) {
      console.error('Error setting document:', error);
      throw error;
    }
  }

  // Update a document
  async updateDocument<T>(collectionName: string, docId: string, data: Partial<T>): Promise<void> {
    try {
      const docRef = doc(this.firestore, collectionName, docId);
      await updateDoc(docRef, data as any);
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  // Delete a document
  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  // Batch operations
  async batchWrite(operations: Array<{ type: 'set' | 'update' | 'delete'; collection: string; docId: string; data?: any }>): Promise<void> {
    try {
      const batch = await import('@angular/fire/firestore').then(m => m.writeBatch(this.firestore));
      
      operations.forEach(op => {
        const docRef = doc(this.firestore, op.collection, op.docId);
        switch (op.type) {
          case 'set':
            batch.set(docRef, op.data);
            break;
          case 'update':
            batch.update(docRef, op.data);
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      });

      await batch.commit();
    } catch (error) {
      console.error('Error in batch write:', error);
      throw error;
    }
  }
}
