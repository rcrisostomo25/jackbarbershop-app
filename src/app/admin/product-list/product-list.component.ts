import { Component, OnInit, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { AuthService } from '../../services/auth.service';
import { ProductFormComponent } from '../product-form/product-form.component';
import { ProductSaleComponent } from '../product-sale/product-sale.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductFormComponent, ProductSaleComponent],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss'
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductService);
  private authService = inject(AuthService);

  // Signals
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  searchQuery = signal('');
  showProductFormModal = signal(false);
  showProductSaleModal = signal(false);
  selectedProduct = signal<Product | null>(null);
  isLoading = signal(false);

  @ViewChild('searchInput') searchInput?: ElementRef;

  ngOnInit() {
    this.loadProducts();
  }

  async loadProducts() {
    this.isLoading.set(true);
    try {
      const products = await this.productService.getProducts();
      this.products.set(products);
      this.filteredProducts.set(products);
    } catch (error: any) {
      console.error('Error loading products:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  searchProducts() {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      this.filteredProducts.set(this.products());
    } else {
      const filtered = this.products().filter(p =>
        p.name.toLowerCase().includes(query)
      );
      this.filteredProducts.set(filtered);
    }
  }

  clearSearch() {
    this.searchQuery.set('');
    this.filteredProducts.set(this.products());
    this.searchInput?.nativeElement.focus();
  }

  openProductFormModal() {
    this.showProductFormModal.set(true);
  }

  closeProductFormModal() {
    this.showProductFormModal.set(false);
  }

  openProductSaleModal(product: Product) {
    this.selectedProduct.set(product);
    this.showProductSaleModal.set(true);
  }

  closeProductSaleModal() {
    this.showProductSaleModal.set(false);
    this.selectedProduct.set(null);
    this.loadProducts();
  }

  openEditProductModal(product: Product) {
    this.selectedProduct.set(product);
    this.showProductFormModal.set(true);
  }

  async onProductCreated(product: Product) {
    this.loadProducts();
    this.closeProductFormModal();
  }

  async deleteProduct(product: Product) {
    if (!product.id) return;

    if (confirm(`¿Estás seguro de que deseas eliminar el producto "${product.name}"?`)) {
      this.isLoading.set(true);
      try {
        const response = await this.productService.deleteProduct(product.id);
        if (response.success) {
          this.loadProducts();
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

  calculateProfit(product: Product): number {
    return (product.salePrice - product.costPrice) * product.quantity;
  }

  calculateMarginPercentage(product: Product): number {
    if (product.costPrice === 0) return 0;
    return ((product.salePrice - product.costPrice) / product.costPrice) * 100;
  }
}
