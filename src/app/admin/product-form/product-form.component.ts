import { Component, OnInit, signal, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss'
})
export class ProductFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private authService = inject(AuthService);

  // Signals
  formData = signal<FormGroup | null>(null);
  isLoading = signal(false);
  submitted = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  editingProductId = signal<string | null>(null);

  // Outputs
  productCreated = output<Product>();
  modalClosed = output<void>();

  ngOnInit() {
    this.initializeForm();
  }

  private initializeForm() {
    const form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      quantity: ['', [Validators.required, Validators.min(1)]],
      costPrice: ['', [Validators.required, Validators.min(0)]],
      salePrice: ['', [Validators.required, Validators.min(0)]]
    });
    this.formData.set(form);
  }

  resetForm() {
    this.submitted.set(false);
    this.errorMessage.set('');
    this.isEditMode.set(false);
    this.editingProductId.set(null);
    this.formData()?.reset();
  }

  setEditMode(product: Product) {
    this.isEditMode.set(true);
    this.editingProductId.set(product.id || null);
    this.formData()?.patchValue({
      name: product.name,
      quantity: product.quantity,
      costPrice: product.costPrice,
      salePrice: product.salePrice
    });
  }

  async onSubmit() {
    this.submitted.set(true);

    if (!this.formData()?.valid) {
      this.errorMessage.set('Por favor completa todos los campos correctamente');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const formValue = this.formData()?.value;

      if (this.isEditMode()) {
        // Update product
        const productId = this.editingProductId();
        const response = await this.productService.updateProduct(productId!, {
          name: formValue.name,
          quantity: parseInt(formValue.quantity),
          costPrice: parseFloat(formValue.costPrice),
          salePrice: parseFloat(formValue.salePrice)
        });

        if (!response.success) {
          this.errorMessage.set(response.message);
          return;
        }
      } else {
        // Create new product
        const currentUser = this.authService.getCurrentUser();
        const response = await this.productService.addProduct({
          name: formValue.name,
          quantity: parseInt(formValue.quantity),
          costPrice: parseFloat(formValue.costPrice),
          salePrice: parseFloat(formValue.salePrice),
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: currentUser?.id
        });

        if (!response.success) {
          this.errorMessage.set(response.message);
          return;
        }

        if (response.data) {
          this.productCreated.emit(response.data);
        }
      }

      this.resetForm();
      this.modalClosed.emit();
    } catch (error: any) {
      this.errorMessage.set('Error al procesar el formulario: ' + error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  closeModal() {
    this.resetForm();
    this.modalClosed.emit();
  }

  get name() {
    return this.formData()?.get('name');
  }

  get quantity() {
    return this.formData()?.get('quantity');
  }

  get costPrice() {
    return this.formData()?.get('costPrice');
  }

  get salePrice() {
    return this.formData()?.get('salePrice');
  }
}
