import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { User } from '../models/user.model';
import { where } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private firestoreService: FirestoreService) {}

  // Get user by ID
  async getUserById(userId: string): Promise<User | null> {
    return this.firestoreService.getDocument<User>('users', userId);
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<User | null> {
    const users = await this.firestoreService.queryCollection<User>('users', [where('email', '==', email)]);
    return users.length > 0 ? users[0] : null;
  }

  // Get all users
  async getAllUsers(): Promise<User[]> {
    return this.firestoreService.getCollection<User>('users');
  }

  // Get users by role
  async getUsersByRole(role: 'customer' | 'barber' | 'admin'): Promise<User[]> {
    return this.firestoreService.queryCollection<User>('users', [where('role', '==', role)]);
  }

  // Update user profile
  async updateUserProfile(userId: string, userData: Partial<User>): Promise<void> {
    const updatedData = {
      ...userData,
      updatedAt: new Date()
    };
    return this.firestoreService.updateDocument<User>('users', userId, updatedData);
  }

  // Delete user
  async deleteUser(userId: string): Promise<void> {
    return this.firestoreService.deleteDocument('users', userId);
  }

  // Get barbers (for scheduling)
  async getAvailableBarbers(): Promise<User[]> {
    return this.getUsersByRole('barber');
  }
}
