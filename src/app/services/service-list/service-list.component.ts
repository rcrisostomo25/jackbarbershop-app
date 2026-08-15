import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceService } from '../../services/service.service';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { Service } from '../../models/service.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-list.component.html',
  styleUrl: './service-list.component.scss'
})
export class ServiceListComponent implements OnInit {
  private serviceService = inject(ServiceService);
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  private platformId = inject(PLATFORM_ID);

  // Data
  services = signal<Service[]>([]);
  barbers = signal<User[]>([]);
  currentUser = signal<User | null>(null);

  // UI State
  isLoading = signal(false);
  selectedDate = signal(new Date().toISOString().split('T')[0]);
  selectedBarberId = signal('');
  searchQuery = signal('');
  showFilters = signal(false);
  
  // Date Range Filter
  useDateRange = signal(false);
  dateRangeStart = signal('');
  dateRangeEnd = signal('');

  // Summary
  totalRevenue = signal(0);
  totalServices = signal(0);

  // Service Form Modal
  showServiceFormModal = signal(false);
  isSubmittingForm = signal(false);
  isEditMode = signal(false);
  editingServiceId = signal<string | null>(null);
  formData = signal({
    serviceName: '',
    price: '',
    paymentMethod: 'efectivo',
    comments: '',
    selectedBarberId: '', // For admin selecting barber
    serviceDate: '' // For admin registering past services
  });
  formErrors = signal<{ [key: string]: string }>({});

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeComponent();
    }
  }

  private async initializeComponent() {
    const user = this.authService.getCurrentUser();
    this.currentUser.set(user);

    if (!user) return;

    // Load barbers for dropdown
    await this.loadBarbers();

    // Load services for today
    this.loadServices();
  }

  /**
   * Load all barbers for the filter dropdown
   */
  private async loadBarbers() {
    try {
      const allUsers = await this.adminService.getAllUsers();
      const barbers = allUsers.filter(u => u.role === 'barber');
      this.barbers.set(barbers);
    } catch (error) {
      console.error('Error loading barbers:', error);
    }
  }

  /**
   * Load services based on current filters
   */
  async loadServices() {
    this.isLoading.set(true);
    try {
      const user = this.currentUser();
      let services: Service[] = [];

      if (this.useDateRange()) {
        // Load services by date range
        const startDateString = this.dateRangeStart();
        const endDateString = this.dateRangeEnd();

        if (!startDateString || !endDateString) {
          alert('Por favor selecciona ambas fechas para el rango');
          this.isLoading.set(false);
          return;
        }

        const [startYear, startMonth, startDay] = startDateString.split('-').map(Number);
        const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);

        const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
        const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

        if (user?.role === 'admin') {
          services = await this.serviceService.getServices({
            startDate,
            endDate
          });
          
          // Also get services with serviceDate in range
          const allServices = await this.serviceService.getServices({});
          const servicesByServiceDate = allServices.filter(s => {
            if (s.serviceDate) {
              const serviceDate = new Date(s.serviceDate);
              return serviceDate >= startDate && serviceDate <= endDate;
            }
            return false;
          });
          
          // Merge and remove duplicates
          const merged = [...services];
          for (const service of servicesByServiceDate) {
            if (!merged.find(s => s.id === service.id)) {
              merged.push(service);
            }
          }
          services = merged;
        } else if (user?.role === 'barber') {
          services = await this.serviceService.getServices({
            barberId: user.id,
            startDate,
            endDate
          });
        }
      } else {
        // Load services by single date
        const dateString = this.selectedDate();
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day, 0, 0, 0, 0);

        if (user?.role === 'admin') {
          // For admin, get services and filter by serviceDate if available, otherwise by createdAt
          services = await this.serviceService.getServicesByDate(date);
          
          // Also get services from all time that have serviceDate matching the selected date
          const allServices = await this.serviceService.getServices({});
          const servicesByServiceDate = allServices.filter(s => {
            if (s.serviceDate) {
              const serviceDate = new Date(s.serviceDate);
              return serviceDate.getFullYear() === year && 
                     serviceDate.getMonth() === month - 1 && 
                     serviceDate.getDate() === day;
            }
            return false;
          });
          
          // Merge and remove duplicates
          const merged = [...services];
          for (const service of servicesByServiceDate) {
            if (!merged.find(s => s.id === service.id)) {
              merged.push(service);
            }
          }
          services = merged;
        } else if (user?.role === 'barber') {
          services = await this.serviceService.getBarberServicesByDate(user.id!, date);
        }
      }

      // Apply barber filter if selected (only when not in date range mode or for admins)
      if (this.selectedBarberId()) {
        services = services.filter(s => s.barberId === this.selectedBarberId());
      }

      // Apply search filter
      if (this.searchQuery()) {
        const query = this.searchQuery().toLowerCase();
        services = services.filter(s =>
          s.serviceName.toLowerCase().includes(query) ||
          s.barberName.toLowerCase().includes(query) ||
          s.comments?.toLowerCase().includes(query)
        );
      }

      this.services.set(services);
      this.calculateSummary();
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary() {
    const servicesList = this.services();
    this.totalServices.set(servicesList.length);
    this.totalRevenue.set(
      servicesList.reduce((sum, s) => sum + s.price, 0)
    );
  }

  /**
   * Toggle filters panel
   */
  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  /**
   * Reset filters
   */
  resetFilters() {
    this.selectedDate.set(new Date().toISOString().split('T')[0]);
    this.selectedBarberId.set('');
    this.searchQuery.set('');
    this.useDateRange.set(false);
    this.dateRangeStart.set('');
    this.dateRangeEnd.set('');
    this.loadServices();
  }

  /**
   * Format date to dd/mm/yyyy HH:mm (UTC-5)
   */
  formatDate(date: Date): string {
    return this.formatDateAndTime(date);
  }

  /**
   * Format date and time as dd/mm/yyyy HH:mm (UTC-5)
   */
  formatDateAndTime(date: Date): string {
    const dateObj = new Date(date);
    return this.convertToUTC5(dateObj, 'datetime');
  }

  /**
   * Format only date as dd/mm/yyyy (UTC-5)
   */
  formatDateOnly(date: Date): string {
    const dateObj = new Date(date);
    return this.convertToUTC5(dateObj, 'date');
  }

  /**
   * Format only time as HH:mm (UTC-5)
   */
  formatTimeOnly(date: Date): string {
    const dateObj = new Date(date);
    return this.convertToUTC5(dateObj, 'time');
  }

  /**
   * Convert date to UTC-5 timezone and format
   */
  private convertToUTC5(date: Date, format: 'date' | 'time' | 'datetime'): string {
    // Get UTC date/time
    const utcDate = new Date(date.getTime());
    
    // Convert to UTC-5 (subtract 5 hours)
    const utc5Date = new Date(utcDate.getTime() - (5 * 60 * 60 * 1000));
    
    // Extract components
    const day = String(utc5Date.getUTCDate()).padStart(2, '0');
    const month = String(utc5Date.getUTCMonth() + 1).padStart(2, '0');
    const year = utc5Date.getUTCFullYear();
    const hours = String(utc5Date.getUTCHours()).padStart(2, '0');
    const minutes = String(utc5Date.getUTCMinutes()).padStart(2, '0');

    switch (format) {
      case 'date':
        return `${day}/${month}/${year}`;
      case 'time':
        return `${hours}:${minutes}`;
      case 'datetime':
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      default:
        return `${day}/${month}/${year}`;
    }
  }

  /**
   * Get formatted current date from selectedDate string (dd/mm/yyyy)
   */
  getCurrentDateFormatted(): string {
    const dateString = this.selectedDate();
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    return this.formatDateOnly(date);
  }

  /**
   * Format currency
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value);
  }

  /**
   * Get barber name from ID
   */
  getBarberName(barberId: string): string {
    const barber = this.barbers().find(b => b.id === barberId);
    return barber?.displayName || 'Desconocido';
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
   * Delete a service
   */
  async deleteService(serviceId: string, serviceName: string) {
    const confirmed = confirm(`¿Eliminar el servicio "${serviceName}"?`);
    if (!confirmed) return;

    try {
      const response = await this.serviceService.deleteService(serviceId);
      if (response.success) {
        this.loadServices();
      } else {
        alert('Error: ' + response.message);
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Error al eliminar el servicio');
    }
  }

  /**
   * Open service form modal for creating new service
   */
  openServiceFormModal() {
    this.isEditMode.set(false);
    this.editingServiceId.set(null);
    this.resetServiceForm();
    // If admin, set default date to today
    if (this.currentUser()?.role === 'admin') {
      const today = new Date().toISOString().split('T')[0];
      const current = this.formData();
      this.formData.set({
        ...current,
        serviceDate: today
      });
    }
    this.showServiceFormModal.set(true);
  }

  /**
   * Open service form modal for editing existing service
   */
  openEditServiceModal(service: Service) {
    this.isEditMode.set(true);
    this.editingServiceId.set(service.id || null);
    
    const serviceDate = service.serviceDate ? 
      new Date(service.serviceDate).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0];
    
    this.formData.set({
      serviceName: service.serviceName,
      price: service.price.toString(),
      paymentMethod: service.paymentMethod,
      comments: service.comments || '',
      selectedBarberId: service.barberId,
      serviceDate: serviceDate
    });
    this.formErrors.set({});
    this.showServiceFormModal.set(true);
  }

  /**
   * Close service form modal
   */
  closeServiceFormModal() {
    this.showServiceFormModal.set(false);
    this.resetServiceForm();
  }

  /**
   * Reset service form data
   */
  private resetServiceForm() {
    const today = new Date().toISOString().split('T')[0];
    this.formData.set({
      serviceName: '',
      price: '',
      paymentMethod: 'efectivo',
      comments: '',
      selectedBarberId: '',
      serviceDate: today
    });
    this.formErrors.set({});
  }

  /**
   * Validate service form
   */
  private validateServiceForm(): boolean {
    const errors: { [key: string]: string } = {};
    const data = this.formData();
    const user = this.currentUser();

    // Validate barber selection for admin
    if (user?.role === 'admin' && !data.selectedBarberId) {
      errors['selectedBarberId'] = 'Debes seleccionar un barbero';
    }

    if (!data.serviceName.trim()) {
      errors['serviceName'] = 'El nombre del servicio es requerido';
    }

    if (!data.price) {
      errors['price'] = 'El precio es requerido';
    } else if (isNaN(Number(data.price)) || Number(data.price) <= 0) {
      errors['price'] = 'El precio debe ser un número mayor a 0';
    }

    if (!data.paymentMethod) {
      errors['paymentMethod'] = 'El método de pago es requerido';
    }

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  /**
   * Submit service form (create or update)
   */
  async submitServiceForm() {
    if (!this.validateServiceForm()) {
      return;
    }

    this.isSubmittingForm.set(true);
    try {
      const user = this.currentUser();
      if (!user) {
        alert('Error: Usuario no autenticado');
        return;
      }

      const data = this.formData();

      if (this.isEditMode()) {
        // Update existing service
        const serviceId = this.editingServiceId();
        if (!serviceId) {
          alert('Error: Service ID no encontrado');
          return;
        }

        const updatedService: any = {
          serviceName: data.serviceName,
          price: Number(data.price),
          paymentMethod: data.paymentMethod as 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'otro',
          comments: data.comments,
          updatedAt: new Date()
        };

        // If admin, also update barberId and serviceDate
        if (user.role === 'admin' && data.selectedBarberId) {
          // Find barber name
          const selectedBarber = this.barbers().find(b => b.id === data.selectedBarberId);
          updatedService.barberId = data.selectedBarberId;
          updatedService.barberName = selectedBarber?.displayName || 'Desconocido';
        }

        if (user.role === 'admin' && data.serviceDate) {
          const [year, month, day] = data.serviceDate.split('-').map(Number);
          updatedService.serviceDate = new Date(year, month - 1, day);
        }

        const response = await this.serviceService.updateService(serviceId, updatedService);
        if (response.success) {
          this.closeServiceFormModal();
          await this.loadServices();
        } else {
          alert('Error: ' + response.message);
        }
      } else {
        // Create new service
        const newService: any = {
          serviceName: data.serviceName,
          price: Number(data.price),
          paymentMethod: data.paymentMethod as 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'otro',
          comments: data.comments,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        if (user.role === 'admin') {
          // Admin registering service - must select barber
          if (!data.selectedBarberId) {
            alert('Por favor selecciona un barbero');
            return;
          }
          const selectedBarber = this.barbers().find(b => b.id === data.selectedBarberId);
          newService.barberId = data.selectedBarberId;
          newService.barberName = selectedBarber?.displayName || 'Desconocido';

          // Add service date if provided
          if (data.serviceDate) {
            const [year, month, day] = data.serviceDate.split('-').map(Number);
            newService.serviceDate = new Date(year, month - 1, day);
          }
        } else {
          // Barber registering their own service
          newService.barberId = user.id!;
          newService.barberName = user.displayName || 'Desconocido';
        }

        const response = await this.serviceService.addService(newService);
        if (response.success) {
          this.closeServiceFormModal();
          await this.loadServices();
        } else {
          alert('Error: ' + response.message);
        }
      }
    } catch (error) {
      console.error('Error submitting service form:', error);
      alert('Error al procesar el servicio');
    } finally {
      this.isSubmittingForm.set(false);
    }
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
   * Handle input event for form fields
   */
  onInputChange(event: Event, field: string) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.updateFormField(field, target.value);
  }

  /**
   * Handle select change event
   */
  onSelectChange(event: Event, field: string) {
    const target = event.target as HTMLSelectElement;
    this.updateFormField(field, target.value);
  }
}
