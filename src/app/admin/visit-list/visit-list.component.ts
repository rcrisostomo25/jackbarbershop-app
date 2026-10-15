import { Component, OnInit, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VisitService } from '../../services/visit.service';
import { Visit, ClientVisitStats } from '../../models/visit.model';
import { AuthService } from '../../services/auth.service';
import { VisitRegisterComponent } from '../visit-register/visit-register.component';
import { OfferRedemptionModalComponent } from '../offer-redemption-modal/offer-redemption-modal.component';
import { NotificationModalComponent, NotificationType } from '../../components/notification-modal/notification-modal.component';

@Component({
  selector: 'app-visit-list',
  standalone: true,
  imports: [CommonModule, FormsModule, VisitRegisterComponent, OfferRedemptionModalComponent, NotificationModalComponent],
  templateUrl: './visit-list.component.html',
  styleUrl: './visit-list.component.scss'
})
export class VisitListComponent implements OnInit {
  private visitService = inject(VisitService);
  private authService = inject(AuthService);

  // Signals
  visits = signal<Visit[]>([]);
  filteredVisits = signal<Visit[]>([]);
  clientStats = signal<ClientVisitStats[]>([]);
  searchQuery = signal('');
  showVisitFormModal = signal(false);
  showOfferRedemptionModal = signal(false);
  selectedClientForRedemption = signal<ClientVisitStats | null>(null);
  isLoading = signal(false);
  viewMode = signal<'list' | 'stats'>('list');
  currentUser = signal<any>(null);
  approvalInProgress = signal<string>(''); // Track which visit is being approved/rejected

  // Pagination signals
  pageSize = signal(20); // Visits per page
  currentPageNumber = signal(1);
  totalVisitsCount = signal(0);
  totalPages = signal(0);
  hasNextPage = signal(false);
  hasPreviousPage = signal(false);

  // Notification signals
  notificationVisible = signal(false);
  notificationType = signal<NotificationType>('info');
  notificationTitle = signal('');
  notificationMessage = signal('');
  notificationAutoCloseDelay = signal(3000); // Auto-close after 3 seconds

  @ViewChild('searchInput') searchInput?: ElementRef;

  ngOnInit() {
    // Get current user info for approval tracking
    this.authService.currentUser$.subscribe(user => {
      console.log('✓ Current user updated in visit-list:', user?.id, user?.email);
      this.currentUser.set(user);
    });
    
    this.loadVisits();
  }

  async loadVisits() {
    this.isLoading.set(true);
    try {
      // Clear search when loading new page
      this.searchQuery.set('');
      
      // Get paginated visits
      const response = await this.visitService.getVisitsPaginated(
        this.pageSize(),
        this.currentPageNumber()
      );
      
      this.visits.set(response.visits);
      this.filteredVisits.set(response.visits);
      this.totalVisitsCount.set(response.totalCount);
      this.totalPages.set(Math.ceil(response.totalCount / this.pageSize()));
      this.hasNextPage.set(response.hasNextPage);
      this.hasPreviousPage.set(response.hasPreviousPage);

      // Load client statistics
      const stats = await this.visitService.getClientsVisitStats();
      this.clientStats.set(stats);
    } catch (error: any) {
      console.error('Error loading visits:', error);
      this.showNotification('error', 'Error', 'Error al cargar las visitas', 0);
    } finally {
      this.isLoading.set(false);
    }
  }

  searchVisits() {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      this.filteredVisits.set(this.visits());
    } else {
      const filtered = this.visits().filter(v =>
        v.clientPhone.toLowerCase().includes(query) ||
        v.clientName.toLowerCase().includes(query) ||
        v.servicePerformed.toLowerCase().includes(query) ||
        (v.service && v.service.toLowerCase().includes(query)) ||
        (v.barberName && v.barberName.toLowerCase().includes(query))
      );
      this.filteredVisits.set(filtered);
    }
  }

  clearSearch() {
    this.searchQuery.set('');
    this.filteredVisits.set(this.visits());
    this.searchInput?.nativeElement.focus();
  }

  /**
   * Go to next page
   */
  async nextPage() {
    if (this.hasNextPage()) {
      this.currentPageNumber.set(this.currentPageNumber() + 1);
      await this.loadVisits();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Go to previous page
   */
  async previousPage() {
    if (this.hasPreviousPage()) {
      this.currentPageNumber.set(this.currentPageNumber() - 1);
      await this.loadVisits();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Go to specific page
   */
  async goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.totalPages()) {
      this.currentPageNumber.set(pageNumber);
      await this.loadVisits();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Get array of page numbers to display (e.g., [1, 2, 3, 4, 5])
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const totalPages = this.totalPages();
    const currentPage = this.currentPageNumber();
    
    // Show max 5 page numbers
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    // Adjust if at the beginning
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  openVisitFormModal() {
    this.showVisitFormModal.set(true);
  }

  closeVisitFormModal() {
    this.showVisitFormModal.set(false);
  }

  onVisitRegistered(visit: Visit) {
    this.loadVisits();
    this.closeVisitFormModal();
  }

  async deleteVisit(visit: Visit) {
    if (!visit.id) return;

    if (confirm(`¿Estás seguro de que deseas eliminar esta visita de ${visit.clientName}?`)) {
      this.isLoading.set(true);
      try {
        const response = await this.visitService.deleteVisit(visit.id);
        if (response.success) {
          this.loadVisits();
          this.showNotification('success', 'Eliminado', 'La visita ha sido eliminada exitosamente.', 3000);
        } else {
          this.showNotification('error', 'Error', response.message, 0);
        }
      } catch (error: any) {
        this.showNotification('error', 'Error', `Error al eliminar: ${error.message}`, 0);
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  getFidelizationMessage(visitCount: number): string {
    if (visitCount >= 10) return '🏆 VIP - Más de 10 visitas';
    if (visitCount >= 5) return '⭐ Premium - 5 a 9 visitas';
    if (visitCount >= 3) return '🎖️ Regular - 3 a 4 visitas';
    return '👤 Nuevo - 1 a 2 visitas';
  }

  getFidelizationColor(visitCount: number): string {
    if (visitCount >= 10) return 'vip';
    if (visitCount >= 5) return 'premium';
    if (visitCount >= 3) return 'regular';
    return 'new';
  }

  switchViewMode(mode: 'list' | 'stats') {
    this.viewMode.set(mode);
  }

  /**
   * Open offer redemption modal for a client
   */
  openOfferRedemptionModal(clientStat: ClientVisitStats) {
    this.selectedClientForRedemption.set(clientStat);
    this.showOfferRedemptionModal.set(true);
  }

  /**
   * Close offer redemption modal
   */
  closeOfferRedemptionModal() {
    this.selectedClientForRedemption.set(null);
    this.showOfferRedemptionModal.set(false);
    // Reload to get updated redemptions
    this.loadVisits();
  }

  /**
   * Open public visit registration form in a new tab
   */
  openPublicVisitForm() {
    const baseUrl = window.location.origin;
    const publicUrl = `${baseUrl}/public/visit-form`;
    window.open(publicUrl, '_blank');
  }

  /**
   * Approve a visit (Admin only)
   */
  async approveVisit(visit: Visit) {
    if (!visit.id) {
      console.error('✗ Visit ID is missing');
      this.showNotification('error', 'Error', 'ID de visita inválido', 0);
      return;
    }

    const user = this.currentUser();
    if (!user || !user.id) {
      console.error('✗ Current user is not available:', user);
      this.showNotification('error', 'Error de Autenticación', 'Usuario no autenticado. Por favor recarga la página.', 0);
      return;
    }

    console.log('📋 Aprobando visita:', visit.id, 'por admin:', user.id);
    this.approvalInProgress.set(visit.id);
    
    try {
      const response = await this.visitService.approveVisit(visit.id, user.id);
      console.log('✓ Approve response:', response);
      
      if (response.success) {
        console.log('✓ Visita aprobada exitosamente, recargando lista...');
        await this.loadVisits();
        this.showNotification('success', 'Visita Aprobada', 'La visita ha sido aprobada exitosamente.', 3000);
      } else {
        console.error('✗ Approval failed:', response.message);
        this.showNotification('error', 'Error', response.message, 0);
      }
    } catch (error: any) {
      console.error('✗ Error approving visit:', error);
      this.showNotification('error', 'Error', 'Error al aprobar la visita: ' + error.message, 0);
    } finally {
      this.approvalInProgress.set('');
    }
  }

  /**
   * Reject a visit (Admin only)
   */
  async rejectVisit(visit: Visit) {
    if (!visit.id) {
      console.error('✗ Visit ID is missing');
      this.showNotification('error', 'Error', 'ID de visita inválido', 0);
      return;
    }

    const user = this.currentUser();
    if (!user || !user.id) {
      console.error('✗ Current user is not available:', user);
      this.showNotification('error', 'Error de Autenticación', 'Usuario no autenticado. Por favor recarga la página.', 0);
      return;
    }

    const reason = prompt('¿Cuál es el motivo del rechazo?', '');
    if (reason === null) return; // User cancelled

    if (!reason.trim()) {
      this.showNotification('warning', 'Campo Requerido', 'Por favor ingresa un motivo para el rechazo', 0);
      return;
    }

    console.log('📋 Rechazando visita:', visit.id, 'por admin:', user.id, 'Motivo:', reason);
    this.approvalInProgress.set(visit.id);
    
    try {
      const response = await this.visitService.rejectVisit(visit.id, user.id, reason);
      console.log('✓ Reject response:', response);
      
      if (response.success) {
        console.log('✓ Visita rechazada exitosamente, recargando lista...');
        await this.loadVisits();
        this.showNotification('success', 'Visita Rechazada', `La visita ha sido rechazada.\nMotivo: ${reason}`, 3000);
      } else {
        console.error('✗ Rejection failed:', response.message);
        this.showNotification('error', 'Error', response.message, 0);
      }
    } catch (error: any) {
      console.error('✗ Error rejecting visit:', error);
      this.showNotification('error', 'Error', 'Error al rechazar la visita: ' + error.message, 0);
    } finally {
      this.approvalInProgress.set('');
    }
  }

  /**
   * Get badge info for visit status
   */
  getStatusBadge(status: string): { icon: string; class: string; text: string } {
    switch (status) {
      case 'Aprobado':
        return { icon: '✅', class: 'badge-approved', text: 'Aprobado' };
      case 'Rechazado':
        return { icon: '❌', class: 'badge-rejected', text: 'Rechazado' };
      default:
        return { icon: '⏳', class: 'badge-pending', text: 'Registrado' };
    }
  }

  /**
   * Show notification modal
   */
  showNotification(type: NotificationType, title: string, message: string, autoClose: number = 3000) {
    this.notificationType.set(type);
    this.notificationTitle.set(title);
    this.notificationMessage.set(message);
    this.notificationAutoCloseDelay.set(autoClose);
    this.notificationVisible.set(true);
  }

  /**
   * Check if visit is in pending status
   */
  isPending(visit: Visit): boolean {
    return visit.status === 'Registrado';
  }
}
