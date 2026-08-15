import { Injectable, signal } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser,
  getIdToken,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendEmailVerification as firebaseSendEmailVerification
} from '@angular/fire/auth';
import { where } from '@angular/fire/firestore';
import { FirestoreService } from './firestore.service';
import { User, AuthResponse } from '../models/user.model';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth;
  private firestoreService: FirestoreService;
  
  // Lista de emails que son administradores del sistema
  private adminEmails = new Set([
    'kathee@gmail.com',
    'admin@jackbarbershop.com'
  ]);
  
  currentUser$ = new BehaviorSubject<User | null>(null);
  isLoading = signal(false);
  isAuthenticated$ = new BehaviorSubject<boolean>(false);

  constructor(auth: Auth, firestoreService: FirestoreService) {
    this.auth = auth;
    this.firestoreService = firestoreService;
    this.initializeAuthState();
  }

  // Initialize auth state listener
  private initializeAuthState(): void {
    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          console.log('Auth state changed - user found:', firebaseUser.uid);
          
          let userData = await this.firestoreService.getDocument<User>('users', firebaseUser.uid);
          
          // If no data found, try to create it from Firebase Auth
          if (!userData) {
            console.warn('User data not found during auth state check, creating document');
            
            // Determinar el rol: admin si está en la lista, customer por defecto
            const userEmail = firebaseUser.email || '';
            const isAdmin = this.adminEmails.has(userEmail);
            
            userData = {
              id: firebaseUser.uid,
              email: userEmail,
              displayName: firebaseUser.displayName || 'Usuario',
              phone: '',
              role: isAdmin ? 'admin' : 'customer',
              createdAt: new Date(),
              updatedAt: new Date()
            };

            try {
              await this.firestoreService.setDocument('users', firebaseUser.uid, userData);
              console.log('User document created during auth state initialization with role:', userData.role);
            } catch (firestoreError) {
              console.error('Error creating user document during init:', firestoreError);
            }
          }
          
          this.currentUser$.next(userData || null);
          this.isAuthenticated$.next(true);
        } catch (error) {
          console.error('Error fetching user data during auth state change:', error);
          // Still mark as authenticated even if Firestore fails
          this.isAuthenticated$.next(true);
        }
      } else {
        console.log('Auth state changed - user logged out');
        this.currentUser$.next(null);
        this.isAuthenticated$.next(false);
      }
    });
  }

  // Register new user
  async register(email: string, password: string, displayName: string, phone: string, role: 'customer' | 'barber' | 'admin' = 'customer'): Promise<AuthResponse> {
    this.isLoading.set(true);
    try {
      console.log('Starting registration for email:', email);
      
      const credentialResponse = await createUserWithEmailAndPassword(this.auth, email, password);
      const firebaseUser = credentialResponse.user;
      
      console.log('Firebase user created with UID:', firebaseUser.uid);

      // Update profile
      await updateProfile(firebaseUser, { displayName });
      console.log('Firebase profile updated');

      // Create user document in Firestore
      const newUser: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        displayName: displayName,
        phone: phone,
        role: role,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Saving user to Firestore:', newUser);
      await this.firestoreService.setDocument('users', firebaseUser.uid, newUser);
      console.log('User successfully saved to Firestore');

      this.currentUser$.next(newUser);
      this.isAuthenticated$.next(true);

      return {
        success: true,
        message: 'Usuario registrado exitosamente',
        user: newUser
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = this.getErrorMessage(error.code);
      return {
        success: false,
        message: errorMessage,
        error: error.code
      };
    } finally {
      this.isLoading.set(false);
    }
  }

  // Login user
  async login(email: string, password: string): Promise<AuthResponse> {
    this.isLoading.set(true);
    try {
      const credentialResponse = await signInWithEmailAndPassword(this.auth, email, password);
      const firebaseUser = credentialResponse.user;

      console.log('Firebase user found:', firebaseUser.uid);

      // Try to get user data from Firestore
      let userData = await this.firestoreService.getDocument<User>('users', firebaseUser.uid);
      
      console.log('User data from Firestore:', userData);

      // If user data doesn't exist, create it from Firebase Auth data
      if (!userData) {
        console.warn('User data not found in Firestore, creating from Firebase Auth');
        
        // Try to create the user document
        userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email || email,
          displayName: firebaseUser.displayName || 'Usuario',
          phone: '',
          role: 'customer',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        try {
          await this.firestoreService.setDocument('users', firebaseUser.uid, userData);
          console.log('User document created in Firestore');
        } catch (firestoreError) {
          console.error('Error creating user document:', firestoreError);
          // Continue even if document creation fails
        }
      }

      if (userData) {
        this.currentUser$.next(userData);
        this.isAuthenticated$.next(true);

        return {
          success: true,
          message: 'Sesión iniciada exitosamente',
          user: userData
        };
      } else {
        return {
          success: false,
          message: 'Error al obtener datos del usuario. Intenta nuevamente.'
        };
      }
    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error.code);
      console.error('Login error:', error);
      return {
        success: false,
        message: errorMessage,
        error: error.code
      };
    } finally {
      this.isLoading.set(false);
    }
  }

  // Logout user
  async logout(): Promise<AuthResponse> {
    try {
      await signOut(this.auth);
      this.currentUser$.next(null);
      this.isAuthenticated$.next(false);
      return {
        success: true,
        message: 'User logged out successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Error logging out',
        error: error.code
      };
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      return {
        success: true,
        message: 'Password reset email sent'
      };
    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error.code);
      return {
        success: false,
        message: errorMessage,
        error: error.code
      };
    }
  }

  // Get current user ID token
  async getIdToken(): Promise<string | null> {
    try {
      const user = this.auth.currentUser;
      if (user) {
        return await getIdToken(user);
      }
      return null;
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser$.value;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.isAuthenticated$.value;
  }

  // Get current user as Observable for real-time updates
  getCurrentUser$(): BehaviorSubject<User | null> {
    return this.currentUser$;
  }

  // Get authentication state as Observable
  getAuthState$(): BehaviorSubject<boolean> {
    return this.isAuthenticated$;
  }

  // Update user profile in Firestore
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<AuthResponse> {
    try {
      await this.firestoreService.updateDocument('users', userId, {
        ...updates,
        updatedAt: new Date()
      });

      // Update current user signal
      const currentUser = this.currentUser$.value;
      if (currentUser) {
        const updatedUser = { ...currentUser, ...updates, updatedAt: new Date() };
        this.currentUser$.next(updatedUser);
      }

      return {
        success: true,
        message: 'Perfil actualizado exitosamente'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al actualizar el perfil',
        error: error.code
      };
    }
  }

  // Sync user data from Firebase Auth to Firestore (recovery method)
  async syncUserData(): Promise<AuthResponse> {
    try {
      const firebaseUser = this.auth.currentUser;
      if (!firebaseUser) {
        return {
          success: false,
          message: 'Usuario no autenticado'
        };
      }

      console.log('Syncing user data for:', firebaseUser.uid);

      // Check if user exists in Firestore
      let userData = await this.firestoreService.getDocument<User>('users', firebaseUser.uid);

      if (!userData) {
        console.log('User data not found, creating new document from Firebase Auth');
        
        // Create user document from Firebase Auth data
        userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Usuario',
          phone: '',
          role: 'customer',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await this.firestoreService.setDocument('users', firebaseUser.uid, userData);
        console.log('User document created successfully');
      }

      this.currentUser$.next(userData);
      this.isAuthenticated$.next(true);

      return {
        success: true,
        message: 'Datos sincronizados exitosamente',
        user: userData
      };
    } catch (error: any) {
      console.error('Sync error:', error);
      return {
        success: false,
        message: 'Error al sincronizar datos',
        error: error.code
      };
    }
  }

  // Get user by email from Firestore
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const users = await this.firestoreService.queryCollection<User>('users', [
        where('email', '==', email)
      ]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  // Change user password
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      const user = this.auth.currentUser;
      if (!user || !user.email) {
        return {
          success: false,
          message: 'Usuario no autenticado'
        };
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      return {
        success: true,
        message: 'Contraseña actualizada exitosamente'
      };
    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error.code);
      return {
        success: false,
        message: errorMessage,
        error: error.code
      };
    }
  }

  // Send email verification
  async sendEmailVerification(): Promise<AuthResponse> {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        return {
          success: false,
          message: 'Usuario no autenticado'
        };
      }

      await firebaseSendEmailVerification(user);

      return {
        success: true,
        message: 'Email de verificación enviado'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al enviar email de verificación',
        error: error.code
      };
    }
  }

  // Map Firebase error codes to user-friendly messages (Spanish)
  private getErrorMessage(errorCode: string): string {
    const errorMessages: { [key: string]: string } = {
      'auth/user-not-found': 'Usuario no encontrado. Verifica tu correo electrónico.',
      'auth/wrong-password': 'Contraseña incorrecta. Intenta nuevamente.',
      'auth/email-already-in-use': 'El correo electrónico ya está registrado.',
      'auth/weak-password': 'La contraseña es muy débil. Usa al menos 6 caracteres.',
      'auth/invalid-email': 'Formato de correo electrónico inválido.',
      'auth/operation-not-allowed': 'Esta operación no está permitida.',
      'auth/too-many-requests': 'Demasiados intentos de inicio de sesión. Intenta más tarde.',
      'auth/network-request-failed': 'Error de conexión. Verifica tu conexión a internet.',
      'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
      'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este correo electrónico.',
      'auth/missing-email': 'El correo electrónico es requerido.',
      'auth/missing-password': 'La contraseña es requerida.'
    };

    return errorMessages[errorCode] || 'Ocurrió un error. Intenta nuevamente.';
  }
}
