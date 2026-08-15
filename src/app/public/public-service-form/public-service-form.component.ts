import { Component, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Service } from '../../models/service.model';
import { ServiceService } from '../../services/service.service';
import { BarberApiKeyService } from '../../services/barber-api-key.service';

@Component({
  selector: 'app-public-service-form',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-service-form.component.html',
  styleUrl: './public-service-form.component.scss'
})
export class PublicServiceFormComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private serviceService = inject(ServiceService);
  private apiKeyService = inject(BarberApiKeyService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Route parameters
  barberName = signal<string>('');
  barberId = signal<string>('');

  // Form state
  isLoading = signal(false);
  formData = signal({
    serviceName: '',
    price: '',
    paymentMethod: 'efectivo',
    comments: '',
    apiKey: ''
  });
  formErrors = signal<{ [key: string]: string }>({});
  isSubmitting = signal(false);
  submitSuccess = signal(false);
  savedServiceId = signal<string>('');
  errorMessage = signal<string>('');

  constructor() {
    effect(() => {
      this.route.queryParams.subscribe(params => {
        const barberName = params['barberName'] || '';
        const barberId = params['barberId'] || '';

        if (!barberName || !barberId) {
          this.errorMessage.set('Parámetros inválidos: barberName y barberId son requeridos');
          return;
        }

        this.barberName.set(barberName);
        this.barberId.set(barberId);
      });
    });
  }

  /**
   * Update form field
   */
  updateFormField(field: string, value: string) {
    const current = this.formData();
    this.formData.set({
      ...current,
      [field]: value
    });
    // Clear error for this field
    const errors = this.formErrors();
    if (errors[field]) {
      delete errors[field];
      this.formErrors.set(errors);
    }
  }

  /**
   * Validate form including API key
   */
  validateForm(): boolean {
    const errors: { [key: string]: string } = {};
    const data = this.formData();

    if (!data.serviceName.trim()) {
      errors['serviceName'] = 'Nombre del servicio es requerido';
    }
    if (!data.price || isNaN(Number(data.price)) || Number(data.price) <= 0) {
      errors['price'] = 'Precio debe ser mayor a 0';
    }
    if (!data.paymentMethod) {
      errors['paymentMethod'] = 'Método de pago es requerido';
    }
    if (!data.apiKey.trim()) {
      errors['apiKey'] = 'La clave de acceso es requerida';
    }

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  /**
   * Submit form
   */
  async submitForm() {
    if (!this.validateForm()) return;

    this.isSubmitting.set(true);
    try {
      const data = this.formData();
      
      // Validate API key before submitting
      const isApiKeyValid = await this.apiKeyService.validateApiKey(
        this.barberId(),
        data.apiKey
      );

      if (!isApiKeyValid) {
        const errors = this.formErrors();
        errors['apiKey'] = 'Clave de acceso incorrecta';
        this.formErrors.set(errors);
        this.isSubmitting.set(false);
        return;
      }

      const newService: Omit<Service, 'id'> = {
        serviceName: data.serviceName,
        barberId: this.barberId(),
        barberName: this.barberName(),
        price: Number(data.price),
        paymentMethod: data.paymentMethod as 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'otro',
        comments: data.comments,
        apiKey: data.apiKey,
        isPublicRegistration: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const response = await this.serviceService.addService(newService);

      if (response.success && response.data) {
        const serviceData = response.data as Service;
        this.savedServiceId.set(serviceData.id || '');
        this.submitSuccess.set(true);
      } else {
        this.errorMessage.set(response.message || 'Error al guardar el servicio');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      this.errorMessage.set('Error al registrar el servicio');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Navigate to login
   */
  goToLogin() {
    this.router.navigate(['/login']);
  }

  /**
   * Get payment method label
   */
  getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      'efectivo': '💵 Efectivo',
      'tarjeta': '💳 Tarjeta',
      'yape': '📱 Yape',
      'plin': '📱 Plin',
      'otro': '📝 Otro'
    };
    return labels[method] || method;
  }

  /**
   * Handle input change
   */
  onInputChange(event: Event, field: string) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.updateFormField(field, target.value);
  }

  /**
   * Handle select change
   */
  onSelectChange(event: Event, field: string) {
    const target = event.target as HTMLSelectElement;
    this.updateFormField(field, target.value);
  }

  /**
   * Reload form for registering another service
   */
  reloadForm(): void {
    if (this.isBrowser) {
      window.location.reload();
    }
  }
}
