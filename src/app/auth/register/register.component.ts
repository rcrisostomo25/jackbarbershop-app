import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  registerForm: FormGroup;
  submitted = signal(false);
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private formBuilder: FormBuilder,
    protected authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.formBuilder.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10,}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
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
    return this.registerForm.get('displayName');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get phone() {
    return this.registerForm.get('phone');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  togglePasswordVisibility() {
    this.hidePassword.set(!this.hidePassword());
  }

  toggleConfirmPasswordVisibility() {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
  }

  async onSubmit() {
    this.submitted.set(true);
    this.errorMessage.set('');

    if (this.registerForm.invalid) {
      return;
    }

    const { displayName, email, phone, password } = this.registerForm.value;
    this.isLoading.set(true);

    try {
      // Siempre registrar como cliente desde el formulario público
      const response = await this.authService.register(
        email,
        password,
        displayName,
        phone,
        'customer' // Solo permitir registro de clientes
      );

      if (response.success) {
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 500);
      } else {
        this.errorMessage.set(response.message || 'Registro fallido');
      }
    } catch (error) {
      this.errorMessage.set('Error en el registro. Intenta nuevamente.');
      console.error('Register error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
