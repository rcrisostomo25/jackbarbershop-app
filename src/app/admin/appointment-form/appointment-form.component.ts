import { Component, OnInit, signal, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppointmentService } from '../../services/appointment.service';
import { Appointment } from '../../models/appointment.model';
import { User } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-form.component.html',
  styleUrl: './appointment-form.component.scss'
})
export class AppointmentFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private appointmentService = inject(AppointmentService);
  private authService = inject(AuthService);

  // Inputs
  isEditMode = input(false);
  initialData = input<any>({});
  barbers = input<User[]>([]);

  // Outputs
  appointmentSaved = output<Appointment>();
  modalClosed = output<void>();

  // Signals
  formData = signal<FormGroup>(this.createEmptyForm());
  isLoading = signal(false);
  submitted = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit() {
    this.initializeForm();
  }

  private createEmptyForm(): FormGroup {
    return this.fb.group({
      barberId: ['', [Validators.required]],
      clientName: ['', [Validators.required, Validators.minLength(3)]],
      clientPhone: ['', [Validators.required, Validators.pattern(/^\d{7,}$/)]],
      appointmentDate: ['', [Validators.required]],
      appointmentTime: ['09:00', [Validators.required]],
      cutType: [''],
      status: ['scheduled', [Validators.required]],
      notes: ['']
    });
  }

  private initializeForm() {
    try {
      const initialData = this.initialData();
      const form = this.fb.group({
        barberId: [initialData?.barberId || '', [Validators.required]],
        clientName: [initialData?.clientName || '', [Validators.required, Validators.minLength(3)]],
        clientPhone: [initialData?.clientPhone || '', [Validators.required, Validators.pattern(/^\d{7,}$/)]],
        appointmentDate: [this.formatDateForInput(initialData?.appointmentDate || new Date()), [Validators.required]],
        appointmentTime: [initialData?.appointmentTime || '09:00', [Validators.required]],
        cutType: [initialData?.cutType || ''],
        status: [initialData?.status || 'scheduled', [Validators.required]],
        notes: [initialData?.notes || '']
      });
      this.formData.set(form);
    } catch (error) {
      console.error('Error initializing form:', error);
      this.formData.set(this.createEmptyForm());
    }
  }

  formatDateForInput(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  onBarberChange() {
    const form = this.formData();
    if (!form) return;

    const selectedBarberId = form.get('barberId')?.value;
    const selectedBarber = this.barbers().find(b => b.id === selectedBarberId);
    
    if (selectedBarber) {
      form.patchValue({
        barberName: selectedBarber.displayName
      });
    }
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

      // Find barber name if not already set
      let barberName = formValue.barberName;
      if (!barberName) {
        const selectedBarber = this.barbers().find(b => b.id === formValue.barberId);
        barberName = selectedBarber?.displayName || 'Desconocido';
      }

      const appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> = {
        barberId: formValue.barberId,
        barberName: barberName,
        clientName: formValue.clientName,
        clientPhone: formValue.clientPhone,
        appointmentDate: new Date(formValue.appointmentDate),
        appointmentTime: formValue.appointmentTime,
        cutType: formValue.cutType || undefined,
        status: formValue.status,
        notes: formValue.notes || undefined,
        createdBy: currentUser?.id
      };

      let response;
      if (this.isEditMode()) {
        // Update existing appointment - don't change createdBy
        const appointmentId = this.initialData().id;
        if (!appointmentId) {
          this.errorMessage.set('Error: ID de cita no encontrado');
          this.isLoading.set(false);
          return;
        }
        
        // For updates, remove createdBy since it shouldn't change
        const { createdBy, ...updateData } = appointmentData;
        response = await this.appointmentService.updateAppointment(appointmentId, updateData);
      } else {
        // Create new appointment
        response = await this.appointmentService.createAppointment(appointmentData);
      }

      if (!response.success) {
        this.errorMessage.set(response.message);
        return;
      }

      this.successMessage.set(
        this.isEditMode() ? '✓ Cita actualizada exitosamente' : '✓ Cita registrada exitosamente'
      );

      if (response.data) {
        this.appointmentSaved.emit(response.data);
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

  get barberId() {
    return this.formData()?.get('barberId');
  }

  get clientName() {
    return this.formData()?.get('clientName');
  }

  get clientPhone() {
    return this.formData()?.get('clientPhone');
  }

  get appointmentDate() {
    return this.formData()?.get('appointmentDate');
  }

  get appointmentTime() {
    return this.formData()?.get('appointmentTime');
  }

  get cutType() {
    return this.formData()?.get('cutType');
  }

  get status() {
    return this.formData()?.get('status');
  }

  get notes() {
    return this.formData()?.get('notes');
  }
}
