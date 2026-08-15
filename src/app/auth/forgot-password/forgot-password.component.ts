import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  resetForm: FormGroup;
  submitted = signal(false);
  isLoading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  constructor(
    private formBuilder: FormBuilder,
    protected authService: AuthService,
    private router: Router
  ) {
    this.resetForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get email() {
    return this.resetForm.get('email');
  }

  async onSubmit() {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.resetForm.invalid) {
      return;
    }

    const { email } = this.resetForm.value;
    this.isLoading.set(true);

    try {
      const response = await this.authService.resetPassword(email);

      if (response.success) {
        this.successMessage.set('Se ha enviado un enlace de recuperación a tu email');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
        this.errorMessage.set(response.message || 'Error al recuperar contraseña');
      }
    } catch (error) {
      this.errorMessage.set('Error al recuperar contraseña. Intenta nuevamente.');
      console.error('Reset password error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
