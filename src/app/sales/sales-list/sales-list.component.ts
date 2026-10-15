import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../services/sales.service';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { Sale } from '../../models/sale.model';
import { Product } from '../../models/product.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-sales-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.scss'
})
export class SalesListComponent implements OnInit {
  private salesService = inject(SalesService);
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  // Data
  sales = signal<Sale[]>([]);
  products = signal<Product[]>([]);
  currentUser = signal<User | null>(null);

  // UI State
  isLoading = signal(false);
  selectedDate = signal(new Date().toISOString().split('T')[0]);
  searchQuery = signal('');
  showFilters = signal(false);
  
  // Date Range Filter
  useDateRange = signal(false);
  dateRangeStart = signal('');
  dateRangeEnd = signal('');

  // Summary
  totalRevenue = signal(0);
  totalSales = signal(0);

  // Sale Form Modal
  showSaleFormModal = signal(false);
  isSubmittingForm = signal(false);
  isEditMode = signal(false);
  editingSaleId = signal<string | null>(null);
  formData = signal({
    productId: '',
    productName: '',
    description: '',
    quantity: '',
    salePrice: '',
    comments: '',
    saleDate: ''
  });
  formErrors = signal<{ [key: string]: string }>({});

  // Sale Details Modal
  showDetailsModal = signal(false);
  selectedSaleForDetails = signal<Sale | null>(null);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeComponent();
    }
  }

  private async initializeComponent() {
    const user = this.authService.getCurrentUser();
    this.currentUser.set(user);

    if (!user) return;

    // Load products
    await this.loadProducts();

    // Load sales for today
    this.loadSales();
  }

  /**
   * Load all products for the dropdown
   */
  private async loadProducts() {
    try {
      const allProducts = await this.productService.getProducts();
      this.products.set(allProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  /**
   * Load sales based on current filters
   */
  async loadSales() {
    this.isLoading.set(true);
    try {
      let sales: Sale[] = [];

      if (this.useDateRange()) {
        // Load sales by date range
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

        sales = await this.salesService.getSales({
          startDate,
          endDate
        });
      } else {
        // Load sales by single date
        const dateString = this.selectedDate();
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day, 0, 0, 0, 0);

        sales = await this.salesService.getSalesByDate(date);
      }

      // Apply search filter
      if (this.searchQuery()) {
        const query = this.searchQuery().toLowerCase();
        sales = sales.filter(s =>
          s.productName.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.comments?.toLowerCase().includes(query)
        );
      }

      this.sales.set(sales);
      this.calculateSummary();
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary() {
    const salesList = this.sales();
    this.totalSales.set(salesList.length);
    this.totalRevenue.set(
      salesList.reduce((sum, s) => sum + s.totalPrice, 0)
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
    this.searchQuery.set('');
    this.useDateRange.set(false);
    this.dateRangeStart.set('');
    this.dateRangeEnd.set('');
    this.loadSales();
  }

  /**
   * Open sale form modal for new sale
   */
  openNewSaleModal() {
    this.isEditMode.set(false);
    this.editingSaleId.set(null);
    const today = new Date().toISOString().split('T')[0];
    this.formData.set({
      productId: '',
      productName: '',
      description: '',
      quantity: '',
      salePrice: '',
      comments: '',
      saleDate: today
    });
    this.formErrors.set({});
    this.showSaleFormModal.set(true);
  }

  /**
   * Open sale form modal for editing existing sale
   */
  openEditSaleModal(sale: Sale) {
    this.isEditMode.set(true);
    this.editingSaleId.set(sale.id || null);
    
    const saleDate = sale.saleDate ? 
      new Date(sale.saleDate).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0];
    
    this.formData.set({
      productId: sale.productId,
      productName: sale.productName,
      description: sale.description || '',
      quantity: sale.quantity.toString(),
      salePrice: sale.salePrice.toString(),
      comments: sale.comments || '',
      saleDate: saleDate
    });
    this.formErrors.set({});
    this.showSaleFormModal.set(true);
  }

  /**
   * Close sale form modal
   */
  closeSaleFormModal() {
    this.showSaleFormModal.set(false);
    this.resetSaleForm();
  }

  /**
   * Reset sale form data
   */
  private resetSaleForm() {
    const today = new Date().toISOString().split('T')[0];
    this.formData.set({
      productId: '',
      productName: '',
      description: '',
      quantity: '',
      salePrice: '',
      comments: '',
      saleDate: today
    });
  }

  /**
   * Validate sale form
   */
  private validateSaleForm(): boolean {
    const errors: { [key: string]: string } = {};
    const data = this.formData();

    if (!data.productName.trim()) {
      errors['productName'] = 'El producto es requerido';
    }

    const quantity = parseInt(data.quantity);
    if (!data.quantity || quantity <= 0) {
      errors['quantity'] = 'La cantidad debe ser mayor a 0';
    }

    const salePrice = parseFloat(data.salePrice);
    if (!data.salePrice || salePrice <= 0) {
      errors['salePrice'] = 'El precio de venta debe ser mayor a 0';
    }

    if (!data.saleDate) {
      errors['saleDate'] = 'La fecha de venta es requerida';
    }

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  /**
   * Submit sale form (create or update)
   */
  async submitSaleForm() {
    if (!this.validateSaleForm()) {
      return;
    }

    this.isSubmittingForm.set(true);
    try {
      const data = this.formData();
      const quantity = parseInt(data.quantity);
      const salePrice = parseFloat(data.salePrice);
      const totalPrice = quantity * salePrice;

      const [year, month, day] = data.saleDate.split('-').map(Number);
      const saleDate = new Date(year, month - 1, day, 12, 0, 0, 0);

      const saleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'> = {
        productId: data.productId,
        productName: data.productName,
        description: data.description,
        quantity,
        salePrice,
        totalPrice,
        comments: data.comments,
        saleDate
      };

      if (this.isEditMode()) {
        const saleId = this.editingSaleId();
        if (saleId) {
          const result = await this.salesService.updateSale(saleId, saleData as any);
          if (result.success) {
            alert('✓ Venta actualizada exitosamente');
            this.closeSaleFormModal();
            this.loadSales();
          } else {
            alert(`✗ Error: ${result.message}`);
          }
        }
      } else {
        const result = await this.salesService.addSale(saleData as any);
        if (result.success) {
          alert('✓ Venta registrada exitosamente');
          this.closeSaleFormModal();
          this.loadSales();
        } else {
          alert(`✗ Error: ${result.message}`);
        }
      }
    } catch (error) {
      console.error('Error submitting sale:', error);
      alert('✗ Error al procesar la venta');
    } finally {
      this.isSubmittingForm.set(false);
    }
  }

  /**
   * Delete a sale
   */
  async deleteSale(saleId: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta venta?')) {
      return;
    }

    try {
      const result = await this.salesService.deleteSale(saleId);
      if (result.success) {
        alert('✓ Venta eliminada exitosamente');
        this.loadSales();
      } else {
        alert(`✗ Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('✗ Error al eliminar la venta');
    }
  }

  /**
   * Open sale details modal
   */
  openSaleDetailsModal(sale: Sale) {
    this.selectedSaleForDetails.set(sale);
    this.showDetailsModal.set(true);
  }

  /**
   * Close sale details modal
   */
  closeSaleDetailsModal() {
    this.showDetailsModal.set(false);
    this.selectedSaleForDetails.set(null);
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
   * Convert date to UTC-5 timezone and format
   */
  private convertToUTC5(date: Date, format: 'date' | 'time' | 'datetime'): string {
    const utcDate = new Date(date.getTime());
    const utc5Date = new Date(utcDate.getTime() - (5 * 60 * 60 * 1000));

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
        return '';
    }
  }

  /**
   * Format currency
   */
  formatCurrency(value: number): string {
    return `S/. ${value.toFixed(2)}`;
  }

  /**
   * Truncate text
   */
  truncateText(text: string | undefined, length: number): string {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
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
    
    // If product selection changed, update productName
    if (field === 'productId') {
      const selectedId = target.value;
      if (selectedId === 'otros') {
        const current = this.formData();
        this.formData.set({
          ...current,
          productName: 'Otros'
        });
      } else {
        const selectedProduct = this.products().find(p => p.id === selectedId);
        if (selectedProduct) {
          const current = this.formData();
          this.formData.set({
            ...current,
            productName: selectedProduct.name,
            salePrice: selectedProduct.salePrice.toString()
          });
        }
      }
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
}
