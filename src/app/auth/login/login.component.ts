import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  submitted = signal(false);
  hidePassword = signal(true);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private formBuilder: FormBuilder,
    protected authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  togglePasswordVisibility() {
    this.hidePassword.set(!this.hidePassword());
  }

  async onSubmit() {
    this.submitted.set(true);
    this.errorMessage.set('');

    if (this.loginForm.invalid) {
      return;
    }

    const { email, password } = this.loginForm.value;
    this.isLoading.set(true);

    try {
      const response = await this.authService.login(email, password);

      if (response.success) {
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 500);
      } else {
        this.errorMessage.set(response.message || 'Login fallido');
      }
    } catch (error) {
      this.errorMessage.set('Error en el login. Intenta nuevamente.');
      console.error('Login error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
