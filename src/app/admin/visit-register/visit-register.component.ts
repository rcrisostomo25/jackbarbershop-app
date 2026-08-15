import { Component, OnInit, signal, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VisitService } from '../../services/visit.service';
import { Visit } from '../../models/visit.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-visit-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './visit-register.component.html',
  styleUrl: './visit-register.component.scss'
})
export class VisitRegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private visitService = inject(VisitService);
  private authService = inject(AuthService);

  // Signals
  formData = signal<FormGroup | null>(null);
  isLoading = signal(false);
  submitted = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Outputs
  visitRegistered = output<Visit>();
  modalClosed = output<void>();

  ngOnInit() {
    this.initializeForm();
  }

  private initializeForm() {
    const form = this.fb.group({
      clientPhone: ['', [Validators.required, Validators.pattern(/^\d{7,}$/)]],
      clientName: ['', [Validators.required, Validators.minLength(3)]],
      servicePerformed: ['', [Validators.required, Validators.minLength(3)]],
      recommendations: ['', []]
    });
    this.formData.set(form);
  }

  resetForm() {
    this.submitted.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.formData()?.reset();
  }

  async onSubmit() {
    this.submitted.set(true);

    if (!this.formData()?.valid) {
      this.errorMessage.set('Por favor completa todos los campos correctamente');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const formValue = this.formData()?.value;
      const currentUser = this.authService.getCurrentUser();

      const response = await this.visitService.registerVisit({
        clientPhone: formValue.clientPhone,
        clientName: formValue.clientName,
        servicePerformed: formValue.servicePerformed,
        recommendations: formValue.recommendations || undefined,
        visitDate: new Date(),
        createdAt: new Date(),
        createdBy: currentUser?.id
      });

      if (!response.success) {
        this.errorMessage.set(response.message);
        return;
      }

      this.successMessage.set('✓ Visita registrada exitosamente');
      if (response.data) {
        this.visitRegistered.emit(response.data);
      }

      setTimeout(() => {
        this.resetForm();
        this.modalClosed.emit();
      }, 1500);
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

  get clientPhone() {
    return this.formData()?.get('clientPhone');
  }

  get clientName() {
    return this.formData()?.get('clientName');
  }

  get servicePerformed() {
    return this.formData()?.get('servicePerformed');
  }

  get recommendations() {
    return this.formData()?.get('recommendations');
  }
}
