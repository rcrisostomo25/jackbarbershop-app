import { Component, OnInit, signal, PLATFORM_ID, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';
import { UserFormModalComponent } from './user-form-modal/user-form-modal.component';
import { ProductListComponent } from './product-list/product-list.component';
import { VisitListComponent } from './visit-list/visit-list.component';
import { FidelizationReportComponent } from './fidelization-report/fidelization-report.component';
import { AppointmentListComponent } from './appointment-list/appointment-list.component';
import * as QRCode from 'qrcode';
import { environment } from '../../environments/environment';

interface UserStats {
  totalUsers: number;
  customers: number;
  barbers: number;
  admins: number;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UserFormModalComponent, ProductListComponent, VisitListComponent, FidelizationReportComponent, AppointmentListComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  // Stats
  stats = signal<UserStats>({
    totalUsers: 0,
    customers: 0,
    barbers: 0,
    admins: 0
  });

  // Users lists
  allUsers = signal<User[]>([]);
  customers = signal<User[]>([]);
  barbers = signal<User[]>([]);
  admins = signal<User[]>([]);

  // Current user
  currentUser: User | null = null;

  // UI state
  isLoading = signal(false);
  activeTab = signal<'stats' | 'customers' | 'barbers' | 'admins' | 'products' | 'visits' | 'fidelization-report' | 'appointments'>('stats');
  searchQuery = signal('');
  selectedUser = signal<User | null>(null);
  showApiKey = signal<string | null>(null); // To track which user's apiKey is visible
  barberQRCodes = signal<{ [key: string]: string }>({}); // Store QR codes by user ID
  showUserFormModal = signal(false); // Control modal visibility
  userFormType = signal<'customer' | 'barber'>('customer'); // Track which type of user is being created

  private platformId = inject(PLATFORM_ID);
  private baseUrl = environment.apiUrl.replace('/api', ''); // Use API URL as base

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
    
    // Verify admin access
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit() {
    // Only load data on browser, not on server
    if (isPlatformBrowser(this.platformId)) {
      this.loadData();
    }
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      // Load stats
      const userStats = await this.adminService.getUserStats();
      this.stats.set(userStats);

      // Load users by role
      const [customersData, barbersData, adminsData, allUsersData] = await Promise.all([
        this.adminService.getAllCustomers(),
        this.adminService.getAllBarbers(),
        this.adminService.getAllAdmins(),
        this.adminService.getAllUsers()
      ]);

      this.customers.set(customersData);
      this.barbers.set(barbersData);
      this.admins.set(adminsData);
      this.allUsers.set(allUsersData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Tab navigation
  setActiveTab(tab: 'stats' | 'customers' | 'barbers' | 'admins' | 'products' | 'visits' | 'fidelization-report' | 'appointments') {
    this.activeTab.set(tab);
    this.searchQuery.set('');
  }

  // Modal management
  openUserFormModal(type: 'customer' | 'barber') {
    this.userFormType.set(type);
    this.showUserFormModal.set(true);
  }

  closeUserFormModal() {
    this.showUserFormModal.set(false);
  }

  async onUserCreated() {
    // Reload data and close modal
    await this.loadData();
    this.closeUserFormModal();
  }

  // Handle select change
  onRoleChange(event: Event, userId: string) {
    const target = event.target as HTMLSelectElement;
    const newRole = target.value as 'customer' | 'barber' | 'admin';
    this.changeUserRole(userId, newRole);
  }

  // User management
  async changeUserRole(userId: string, newRole: 'customer' | 'barber' | 'admin') {
    const user = this.allUsers().find(u => u.id === userId);
    if (!user) return;

    this.isLoading.set(true);
    const response = await this.adminService.changeUserRole(userId, newRole);
    
    if (response.success) {
      // Reload data
      await this.loadData();
    } else {
      alert(response.message);
    }
    this.isLoading.set(false);
  }

  async deleteUser(userId: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      return;
    }

    this.isLoading.set(true);
    const response = await this.adminService.deleteUser(userId);
    
    if (response.success) {
      await this.loadData();
    } else {
      alert(response.message);
    }
    this.isLoading.set(false);
  }

  selectUser(user: User) {
    this.selectedUser.set(this.selectedUser()?.id === user.id ? null : user);
  }

  // Filter users
  filterUsers(users: User[]): User[] {
    const query = this.searchQuery().toLowerCase();
    if (!query) return users;
    
    return users.filter(u => 
      u.displayName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.phone.includes(query)
    );
  }

  // Role label
  getRoleLabel(role: string): string {
    return this.adminService.getRoleLabel(role);
  }

  // Format date
  formatDate(date: Date | any): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Toggle API key visibility
   */
  toggleApiKeyVisibility(userId: string) {
    if (this.showApiKey() === userId) {
      this.showApiKey.set(null);
    } else {
      this.showApiKey.set(userId);
    }
  }

  /**
   * Generate QR code for barber registration link
   */
  async generateQRCode(barber: User) {
    try {
      if (!barber.id || !barber.displayName) {
        alert('Datos del barbero incompletos');
        return;
      }

      // Build the public service form URL
      const url = `${this.baseUrl}/public/service-form?barberName=${encodeURIComponent(barber.displayName)}&barberId=${barber.id}`;
      
      // Generate QR code
      const qrCode = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Store QR code
      const qrCodes = this.barberQRCodes();
      qrCodes[barber.id] = qrCode;
      this.barberQRCodes.set(qrCodes);

    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Error al generar el código QR');
    }
  }

  /**
   * Download QR code
   */
  downloadQRCode(barber: User) {
    const qrCode = this.barberQRCodes()[barber.id || ''];
    if (!qrCode) {
      alert('Primero genera el código QR');
      return;
    }

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `qr-${barber.displayName.replace(/\s+/g, '-')}.png`;
    link.click();
  }

  /**
   * Copy URL to clipboard
   */
  copyPublicUrl(barber: User) {
    if (!barber.id || !barber.displayName) {
      alert('Datos del barbero incompletos');
      return;
    }

    const url = `${this.baseUrl}/public/service-form?barberName=${encodeURIComponent(barber.displayName)}&barberId=${barber.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('URL copiada al portapapeles');
    }).catch(() => {
      alert('Error al copiar la URL');
    });
  }

  logout() {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }
}
