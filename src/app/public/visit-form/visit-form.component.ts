import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { VisitService } from '../../services/visit.service';

@Component({
  selector: 'app-visit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './visit-form.component.html',
  styleUrl: './visit-form.component.scss'
})
export class VisitFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private visitService = inject(VisitService);
  private router = inject(Router);

  form!: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  submitted = signal(false);

  ngOnInit() {
    this.initializeForm();
  }

  private initializeForm() {
    this.form = this.fb.group({
      visitKey: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(4), Validators.pattern(/^\d+$/)]],
      clientName: ['', [Validators.required, Validators.minLength(3)]],
      clientPhone: ['', [Validators.required, Validators.pattern(/^\d{7,}$/)]]
    });
  }

  async onSubmit() {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.form.valid) {
      this.errorMessage.set('Por favor completa todos los campos correctamente');
      return;
    }

    this.isLoading.set(true);

    try {
      const { visitKey, clientName, clientPhone } = this.form.value;

      // Validate visit key
      const isValidKey = await this.visitService.validateVisitKey(visitKey);
      if (!isValidKey) {
        this.errorMessage.set('❌ Clave de acceso inválida. Por favor verifica los 4 dígitos.');
        this.isLoading.set(false);
        return;
      }

      // Register visit
      const response = await this.visitService.registerVisit({
        clientName,
        clientPhone,
        visitDate: new Date(),
        servicePerformed: 'Visita registrada desde portal público',
        createdAt: new Date()
      });

      if (!response.success) {
        this.errorMessage.set(response.message || 'Error al registrar la visita');
        this.isLoading.set(false);
        return;
      }

      // Navigate to success page with phone
      this.router.navigate(['/public/visit-success'], { 
        queryParams: { phone: clientPhone } 
      });
    } catch (error: any) {
      console.error('Error registering visit:', error);
      this.errorMessage.set('Error al registrar la visita. Por favor intenta de nuevo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  resetForm() {
    this.form.reset();
    this.submitted.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
