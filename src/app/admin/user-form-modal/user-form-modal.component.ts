import { Component, signal, inject, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form-modal.component.html',
  styleUrl: './user-form-modal.component.scss'
})
export class UserFormModalComponent implements OnInit {
  @Input() initialRole: 'customer' | 'barber' = 'customer';
  @Output() userCreated = new EventEmitter<void>();
  @Output() modalClosed = new EventEmitter<void>();

  private formBuilder = inject(FormBuilder);
  private adminService = inject(AdminService);

  userForm: FormGroup;
  submitted = signal(false);
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  isLoading = signal(false);
  errorMessage = signal('');
  userRole = signal<'customer' | 'barber'>('customer');
  generatedApiKey = signal('');

  constructor() {
    this.userForm = this.formBuilder.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10,}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      apiKey: ['']
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.userRole.set(this.initialRole);
    if (this.initialRole === 'barber') {
      // Sugerir una clave de 4 dígitos pero permitir que el admin la edite
      this.suggestApiKey();
    }
  }

  generateApiKey() {
    // Generar una propuesta de clave de 4 dígitos aleatorios
    const randomKey = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.generatedApiKey.set(randomKey);
    this.userForm.get('apiKey')?.setValue(randomKey);
  }

  suggestApiKey() {
    // Sugerir una clave inicial de 4 dígitos
    this.generateApiKey();
  }

  regenerateApiKey() {
    this.generateApiKey();
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');

    if (password?.value !== confirmPassword?.value) {
      confirmPassword?.setErrors({ 'passwordMismatch': true });
      return { 'passwordMismatch': true };
    } else {
      confirmPassword?.setErrors(null);
      return null;
    }
  }

  get displayName() {
    return this.userForm.get('displayName');
  }

  get email() {
    return this.userForm.get('email');
  }

  get phone() {
    return this.userForm.get('phone');
  }

  get password() {
    return this.userForm.get('password');
  }

  get confirmPassword() {
    return this.userForm.get('confirmPassword');
  }

  get apiKey() {
    return this.userForm.get('apiKey');
  }

  togglePasswordVisibility() {
    this.hidePassword.set(!this.hidePassword());
  }

  toggleConfirmPasswordVisibility() {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
  }

  setRole(role: 'customer' | 'barber') {
    this.userRole.set(role);
    const apiKeyControl = this.userForm.get('apiKey');
    
    if (role === 'barber') {
      // Si es barbero, sugerir una apiKey pero permitir que el admin la edite
      this.suggestApiKey();
      apiKeyControl?.setValidators([Validators.required]);
    } else {
      // Si es cliente, limpiar apiKey y no hacerlo requerido
      apiKeyControl?.setValue('');
      this.generatedApiKey.set('');
      apiKeyControl?.setValidators([]);
    }
    apiKeyControl?.updateValueAndValidity();
  }

  async onSubmit() {
    this.submitted.set(true);
    this.errorMessage.set('');

    if (this.userForm.invalid) {
      return;
    }

    const { displayName, email, phone, password, apiKey } = this.userForm.value;
    this.isLoading.set(true);

    try {
      const response = await this.adminService.createUser(
        email,
        password,
        displayName,
        phone,
        this.userRole(),
        this.userRole() === 'barber' ? apiKey : undefined
      );

      if (response.success) {
        this.userCreated.emit();
        this.closeModal();
      } else {
        this.errorMessage.set(response.message || 'Error al crear usuario');
      }
    } catch (error) {
      this.errorMessage.set('Error al crear usuario. Intenta nuevamente.');
      console.error('Create user error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  closeModal() {
    this.userForm.reset();
    this.submitted.set(false);
    this.errorMessage.set('');
    this.userRole.set('customer');
    this.modalClosed.emit();
  }
}
