import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientVisitStats, OfferRedemption } from '../../models/visit.model';
import { VisitService } from '../../services/visit.service';

@Component({
  selector: 'app-offer-redemption-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './offer-redemption-modal.component.html',
  styleUrl: './offer-redemption-modal.component.scss'
})
export class OfferRedemptionModalComponent {
  @Input() clientStats: ClientVisitStats | null = null;
  @Output() offerRedeemed = new EventEmitter<OfferRedemption>();
  @Output() modalClosed = new EventEmitter<void>();

  private visitService = inject(VisitService);

  isLoading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  availableOffers = signal<OfferRedemption[]>([]);
  redeemedOffers = signal<OfferRedemption[]>([]);

  ngOnInit() {
    if (this.clientStats) {
      this.availableOffers.set(
        this.visitService.getAvailableOffers(this.clientStats.totalVisits)
      );
      this.redeemedOffers.set(this.clientStats.redeemedOffers || []);
    }
  }

  /**
   * Check if offer is already redeemed
   */
  isOfferRedeemed(offerType: string): boolean {
    return this.redeemedOffers().some(o => o.offerType === offerType);
  }

  /**
   * Redeem an offer
   */
  async redeemOffer(offerType: string) {
    if (!this.clientStats) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const response = await this.visitService.redeemOfferForClient(
        this.clientStats.phone,
        offerType
      );

      if (response.success && response.data) {
        this.successMessage.set(response.message);
        this.redeemedOffers.update(offers => [...offers, response.data!]);
        this.offerRedeemed.emit(response.data);

        // Close modal after 2 seconds
        setTimeout(() => {
          this.closeModal();
        }, 2000);
      } else {
        this.errorMessage.set(response.message);
      }
    } catch (error: any) {
      console.error('✗ Error redeeming offer:', error);
      this.errorMessage.set('Error al canjear la oferta');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Get offer description by type
   */
  getOfferDescription(offerType: string): string {
    const descriptions: Record<string, string> = {
      promo: 'Acceso a promociones generales',
      discount_5: 'Descuento del 5% en servicios',
      exclusive_products: 'Acceso a productos exclusivos',
      free_cut: 'Corte gratis cada 10 visitas'
    };
    return descriptions[offerType] || '';
  }

  /**
   * Get offer emoji by type
   */
  getOfferEmoji(offerType: string): string {
    const emojis: Record<string, string> = {
      promo: '🎉',
      discount_5: '💰',
      exclusive_products: '🛍️',
      free_cut: '✂️'
    };
    return emojis[offerType] || '🎁';
  }

  /**
   * Close modal
   */
  closeModal() {
    this.successMessage.set('');
    this.errorMessage.set('');
    this.modalClosed.emit();
  }
}
