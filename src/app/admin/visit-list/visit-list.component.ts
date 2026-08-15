import { Component, OnInit, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VisitService } from '../../services/visit.service';
import { Visit, ClientVisitStats } from '../../models/visit.model';
import { AuthService } from '../../services/auth.service';
import { VisitRegisterComponent } from '../visit-register/visit-register.component';
import { OfferRedemptionModalComponent } from '../offer-redemption-modal/offer-redemption-modal.component';

@Component({
  selector: 'app-visit-list',
  standalone: true,
  imports: [CommonModule, FormsModule, VisitRegisterComponent, OfferRedemptionModalComponent],
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

  @ViewChild('searchInput') searchInput?: ElementRef;

  ngOnInit() {
    this.loadVisits();
  }

  async loadVisits() {
    this.isLoading.set(true);
    try {
      const visits = await this.visitService.getVisits();
      this.visits.set(visits);
      this.filteredVisits.set(visits);

      // Load client statistics
      const stats = await this.visitService.getClientsVisitStats();
      this.clientStats.set(stats);
    } catch (error: any) {
      console.error('Error loading visits:', error);
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
        v.servicePerformed.toLowerCase().includes(query)
      );
      this.filteredVisits.set(filtered);
    }
  }

  clearSearch() {
    this.searchQuery.set('');
    this.filteredVisits.set(this.visits());
    this.searchInput?.nativeElement.focus();
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
        } else {
          alert(`Error: ${response.message}`);
        }
      } catch (error: any) {
        alert(`Error al eliminar: ${error.message}`);
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
}
