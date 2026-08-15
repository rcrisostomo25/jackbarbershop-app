import { Component, OnInit, signal, inject, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-sale',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-sale.component.html',
  styleUrl: './product-sale.component.scss'
})
export class ProductSaleComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);

  // Inputs
  selectedProduct = input<Product | null>(null);

  // Signals
  formData = signal<FormGroup | null>(null);
  isLoading = signal(false);
  submitted = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  totalProfit = signal(0);

  // Outputs
  saleClosed = output<void>();

  ngOnInit() {
    this.initializeForm();
  }

  private initializeForm() {
    const form = this.fb.group({
      quantitySold: ['', [Validators.required, Validators.min(1)]]
    });
    this.formData.set(form);
  }

  resetForm() {
    this.submitted.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.totalProfit.set(0);
    this.formData()?.reset();
  }

  calculateProfit() {
    const quantitySold = parseInt(this.formData()?.get('quantitySold')?.value || 0);
    const product = this.selectedProduct();

    if (product && quantitySold > 0) {
      const profit = (product.salePrice - product.costPrice) * quantitySold;
      this.totalProfit.set(profit);
    } else {
      this.totalProfit.set(0);
    }
  }

  async onSubmit() {
    this.submitted.set(true);

    if (!this.formData()?.valid) {
      this.errorMessage.set('Por favor completa el formulario correctamente');
      return;
    }

    const product = this.selectedProduct();
    if (!product || !product.id) {
      this.errorMessage.set('Producto no válido');
      return;
    }

    const quantitySold = parseInt(this.formData()?.get('quantitySold')?.value);

    if (quantitySold > product.quantity) {
      this.errorMessage.set(`Stock insuficiente. Disponible: ${product.quantity}`);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const response = await this.productService.recordSale(product.id, quantitySold);

      if (!response.success) {
        this.errorMessage.set(response.message);
        return;
      }

      this.successMessage.set(`✓ Venta registrada exitosamente. Ganancia: $${response.data?.profit.toFixed(2)}`);
      setTimeout(() => {
        this.resetForm();
        this.saleClosed.emit();
      }, 2000);
    } catch (error: any) {
      this.errorMessage.set('Error al registrar la venta: ' + error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  closeModal() {
    this.resetForm();
    this.saleClosed.emit();
  }

  get quantitySold() {
    return this.formData()?.get('quantitySold');
  }
}
