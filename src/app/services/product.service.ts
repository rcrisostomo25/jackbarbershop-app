import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, QueryConstraint, Timestamp } from '@angular/fire/firestore';
import { Product, ProductResponse, SaleResponse, ProductFilter } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private firestore = inject(Firestore);
  private collectionName = 'products';

  /**
   * Add a new product
   */
  async addProduct(product: Omit<Product, 'id'>): Promise<ProductResponse> {
    try {
      const productsCollection = collection(this.firestore, this.collectionName);
      const newProduct = {
        ...product,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      const docRef = await addDoc(productsCollection, newProduct);
      console.log('✓ Product created:', docRef.id);
      return {
        success: true,
        message: 'Producto registrado exitosamente',
        data: { ...product, id: docRef.id } as Product
      };
    } catch (error: any) {
      console.error('✗ Error adding product:', error);
      return {
        success: false,
        message: 'Error al registrar el producto',
        error: error.message
      };
    }
  }

  /**
   * Get all products
   */
  async getProducts(): Promise<Product[]> {
    try {
      const productsCollection = collection(this.firestore, this.collectionName);
      const q = query(productsCollection);
      const querySnapshot = await getDocs(q);
      const products: Product[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        products.push({
          id: doc.id,
          name: data.name,
          quantity: data.quantity,
          costPrice: data.costPrice,
          salePrice: data.salePrice,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy
        } as Product);
      });

      console.log(`✓ Retrieved ${products.length} products`);
      return products;
    } catch (error: any) {
      console.error('✗ Error getting products:', error);
      return [];
    }
  }

  /**
   * Search products by name
   */
  async searchProducts(searchQuery: string): Promise<Product[]> {
    try {
      const products = await this.getProducts();
      if (!searchQuery.trim()) {
        return products;
      }
      return products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } catch (error: any) {
      console.error('✗ Error searching products:', error);
      return [];
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product | null> {
    try {
      const products = await this.getProducts();
      return products.find(p => p.id === id) || null;
    } catch (error: any) {
      console.error('✗ Error getting product by ID:', error);
      return null;
    }
  }

  /**
   * Update a product
   */
  async updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'createdAt' | 'createdBy'>>): Promise<ProductResponse> {
    try {
      const productDoc = doc(this.firestore, this.collectionName, id);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      await updateDoc(productDoc, updateData);
      console.log('✓ Product updated:', id);
      return {
        success: true,
        message: 'Producto actualizado exitosamente'
      };
    } catch (error: any) {
      console.error('✗ Error updating product:', error);
      return {
        success: false,
        message: 'Error al actualizar el producto',
        error: error.message
      };
    }
  }

  /**
   * Record a sale and update inventory
   */
  async recordSale(productId: string, quantitySold: number): Promise<SaleResponse> {
    try {
      const product = await this.getProductById(productId);
      
      if (!product) {
        return {
          success: false,
          message: 'Producto no encontrado'
        };
      }

      if (product.quantity < quantitySold) {
        return {
          success: false,
          message: `Stock insuficiente. Disponible: ${product.quantity}`
        };
      }

      // Calculate profit
      const profit = (product.salePrice - product.costPrice) * quantitySold;

      // Update inventory
      await this.updateProduct(productId, {
        quantity: product.quantity - quantitySold
      });

      console.log(`✓ Sale recorded: ${quantitySold} units of product ${productId}`);
      return {
        success: true,
        message: 'Venta registrada exitosamente',
        data: {
          productId,
          quantitySold,
          profit
        }
      };
    } catch (error: any) {
      console.error('✗ Error recording sale:', error);
      return {
        success: false,
        message: 'Error al registrar la venta',
        error: error.message
      };
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string): Promise<ProductResponse> {
    try {
      const productDoc = doc(this.firestore, this.collectionName, id);
      await deleteDoc(productDoc);
      console.log('✓ Product deleted:', id);
      return {
        success: true,
        message: 'Producto eliminado exitosamente'
      };
    } catch (error: any) {
      console.error('✗ Error deleting product:', error);
      return {
        success: false,
        message: 'Error al eliminar el producto',
        error: error.message
      };
    }
  }
}
