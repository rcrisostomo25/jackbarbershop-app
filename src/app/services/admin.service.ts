import { Injectable } from '@angular/core';
import { where } from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import { User } from '../models/user.model';

export interface AdminResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface UserStats {
  totalUsers: number;
  customers: number;
  barbers: number;
  admins: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private auth: Auth
  ) {}

  // ===== USER MANAGEMENT =====

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    try {
      return await this.firestoreService.getCollection<User>('users');
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  /**
   * Create new user (admin only)
   */
  async createUser(
    email: string,
    password: string,
    displayName: string,
    phone: string,
    role: 'customer' | 'barber' | 'admin' = 'customer',
    apiKey?: string
  ): Promise<AdminResponse> {
    try {
      // Verify admin permission
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        return {
          success: false,
          message: 'Solo administradores pueden crear usuarios'
        };
      }

      // Create user in Firebase Auth
      const credentialResponse = await createUserWithEmailAndPassword(this.auth, email, password);
      const firebaseUser = credentialResponse.user;

      // Update profile
      await updateProfile(firebaseUser, { displayName });

      // Create user document in Firestore
      const userData: User = {
        id: firebaseUser.uid,
        email,
        displayName,
        phone,
        role,
        ...(apiKey && { apiKey }),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.firestoreService.setDocument('users', firebaseUser.uid, userData);

      return {
        success: true,
        message: `${role === 'barber' ? 'Barbero' : 'Cliente'} creado exitosamente`,
        data: { userId: firebaseUser.uid, user: userData }
      };
    } catch (error: any) {
      let errorMessage = 'Error al crear usuario';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo electrónico ya está registrado';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El correo electrónico no es válido';
      }

      return {
        success: false,
        message: errorMessage,
        error: error.message
      };
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: 'customer' | 'barber' | 'admin'): Promise<User[]> {
    try {
      const users = await this.firestoreService.queryCollection<User>('users', [
        this.getWhereConstraint('role', '==', role)
      ]);
      return users;
    } catch (error) {
      console.error(`Error getting ${role} users:`, error);
      return [];
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    try {
      return await this.firestoreService.getDocument<User>('users', userId);
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Update user (admin only)
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<AdminResponse> {
    try {
      // Verify admin permission
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        return {
          success: false,
          message: 'Solo administradores pueden actualizar usuarios'
        };
      }

      await this.firestoreService.updateDocument('users', userId, {
        ...updates,
        updatedAt: new Date()
      });

      return {
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: { userId, updates }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al actualizar usuario',
        error: error.message
      };
    }
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId: string): Promise<AdminResponse> {
    try {
      // Verify admin permission
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        return {
          success: false,
          message: 'Solo administradores pueden eliminar usuarios'
        };
      }

      // TODO: Implement Firebase Auth user deletion
      // For now, just remove from Firestore
      await this.firestoreService.deleteDocument('users', userId);

      return {
        success: true,
        message: 'Usuario eliminado exitosamente'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al eliminar usuario',
        error: error.message
      };
    }
  }

  /**
   * Change user role (admin only)
   */
  async changeUserRole(userId: string, newRole: 'customer' | 'barber' | 'admin'): Promise<AdminResponse> {
    try {
      // Verify admin permission
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        return {
          success: false,
          message: 'Solo administradores pueden cambiar roles'
        };
      }

      const response = await this.updateUser(userId, { role: newRole });
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al cambiar rol del usuario',
        error: error.message
      };
    }
  }

  /**
   * Promote user to admin
   */
  async promoteToAdmin(userId: string): Promise<AdminResponse> {
    return this.changeUserRole(userId, 'admin');
  }

  /**
   * Demote admin to customer
   */
  async demoteFromAdmin(userId: string): Promise<AdminResponse> {
    return this.changeUserRole(userId, 'customer');
  }

  // ===== STATISTICS =====

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const allUsers = await this.getAllUsers();
      
      return {
        totalUsers: allUsers.length,
        customers: allUsers.filter(u => u.role === 'customer').length,
        barbers: allUsers.filter(u => u.role === 'barber').length,
        admins: allUsers.filter(u => u.role === 'admin').length
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        totalUsers: 0,
        customers: 0,
        barbers: 0,
        admins: 0
      };
    }
  }

  // ===== BARBERSHOP MANAGEMENT =====

  /**
   * Approve barber (if needed)
   */
  async approveBarber(userId: string): Promise<AdminResponse> {
    try {
      const response = await this.updateUser(userId, { 
        role: 'barber'
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al aprobar barbero',
        error: error.message
      };
    }
  }

  /**
   * Get all barbers
   */
  async getAllBarbers(): Promise<User[]> {
    return this.getUsersByRole('barber');
  }

  /**
   * Get all customers
   */
  async getAllCustomers(): Promise<User[]> {
    return this.getUsersByRole('customer');
  }

  /**
   * Get all admins
   */
  async getAllAdmins(): Promise<User[]> {
    return this.getUsersByRole('admin');
  }

  // ===== HELPER METHODS =====

  /**
   * Check if user is admin
   */
  isUserAdmin(user: User | null): boolean {
    return user?.role === 'admin';
  }

  /**
   * Check if current user is admin
   */
  isCurrentUserAdmin(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return this.isUserAdmin(currentUser);
  }

  /**
   * Get where constraint (helper for Firestore queries)
   */
  private getWhereConstraint(field: string, operator: any, value: any) {
    return where(field, operator, value);
  }

  /**
   * Format user for display
   */
  formatUserDisplay(user: User): string {
    const roleIcons: { [key: string]: string } = {
      'customer': '👤',
      'barber': '✂️',
      'admin': '⚙️'
    };
    return `${roleIcons[user.role] || '👤'} ${user.displayName} (${user.email})`;
  }

  /**
   * Get role label
   */
  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'customer': '👤 Cliente',
      'barber': '✂️ Barbero',
      'admin': '⚙️ Administrador'
    };
    return labels[role] || role;
  }
}
