# 📚 Ejemplos de Código - Usando AuthService

## 1️⃣ Obtener el Usuario Actual

### Opción A: Acceso directo (síncrono)
```typescript
import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  template: `
    <div *ngIf="currentUser">
      <h1>{{ currentUser.displayName }}</h1>
      <p>Email: {{ currentUser.email }}</p>
      <p>Teléfono: {{ currentUser.phone }}</p>
      <p>Rol: {{ currentUser.role }}</p>
    </div>
  `
})
export class ProfileComponent {
  currentUser = this.authService.getCurrentUser();

  constructor(private authService: AuthService) {}
}
```

### Opción B: Observable para actualizaciones en tiempo real
```typescript
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

@Component({
  selector: 'app-profile',
  template: `
    <div *ngIf="currentUser$ | async as user">
      <h1>{{ user.displayName }}</h1>
      <p>Email: {{ user.email }}</p>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  currentUser$ = this.authService.getCurrentUser$();

  constructor(private authService: AuthService) {}
}
```

---

## 2️⃣ Verificar si Usuario está Autenticado

```typescript
import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-header',
  template: `
    <nav>
      <div *ngIf="isAuthenticated">
        <span>Bienvenido</span>
        <button (click)="logout()">Logout</button>
      </div>
      <div *ngIf="!isAuthenticated">
        <a routerLink="/login">Login</a>
        <a routerLink="/register">Register</a>
      </div>
    </nav>
  `
})
export class HeaderComponent {
  isAuthenticated = this.authService.isAuthenticated();

  constructor(private authService: AuthService, private router: Router) {}

  async logout() {
    const response = await this.authService.logout();
    if (response.success) {
      this.router.navigate(['/login']);
    }
  }
}
```

---

## 3️⃣ Mostrar Contenido Basado en Rol

### Opción A: En el componente
```typescript
import { Component, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

@Component({
  selector: 'app-dashboard',
  template: `
    <div *ngIf="currentUser">
      <!-- Para Clientes -->
      <div *ngIf="isCustomer()">
        <h2>Panel de Cliente</h2>
        <app-appointments-customer></app-appointments-customer>
      </div>

      <!-- Para Barberos -->
      <div *ngIf="isBarber()">
        <h2>Panel de Barbero</h2>
        <app-appointments-barber></app-appointments-barber>
        <app-availability></app-availability>
      </div>

      <!-- Para Admin -->
      <div *ngIf="isAdmin()">
        <h2>Panel de Administración</h2>
        <app-admin-dashboard></app-admin-dashboard>
      </div>
    </div>
  `
})
export class DashboardComponent {
  currentUser = this.authService.getCurrentUser();

  constructor(private authService: AuthService) {}

  isCustomer(): boolean {
    return this.currentUser?.role === 'customer';
  }

  isBarber(): boolean {
    return this.currentUser?.role === 'barber';
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }
}
```

### Opción B: Usando método helper
```typescript
getRoleLabel(role: string): string {
  const labels: { [key: string]: string } = {
    'customer': '👤 Cliente',
    'barber': '✂️ Barbero',
    'admin': '⚙️ Administrador'
  };
  return labels[role] || role;
}

// En template:
<p>{{ getRoleLabel(currentUser.role) }}</p>
```

---

## 4️⃣ Actualizar Perfil del Usuario

```typescript
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-edit-profile',
  template: `
    <form [formGroup]="editForm" (ngSubmit)="onSubmit()">
      <input formControlName="displayName" placeholder="Nombre">
      <input formControlName="phone" placeholder="Teléfono">
      <button [disabled]="isLoading()">
        {{ isLoading() ? 'Guardando...' : 'Guardar' }}
      </button>
      <p *ngIf="successMessage()" class="success">{{ successMessage() }}</p>
      <p *ngIf="errorMessage()" class="error">{{ errorMessage() }}</p>
    </form>
  `
})
export class EditProfileComponent {
  editForm: FormGroup;
  isLoading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    const user = this.authService.getCurrentUser();
    this.editForm = this.formBuilder.group({
      displayName: [user?.displayName || '', Validators.required],
      phone: [user?.phone || '', Validators.required]
    });
  }

  async onSubmit() {
    if (this.editForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const user = this.authService.getCurrentUser();
    if (!user) return;

    const response = await this.authService.updateUserProfile(user.id, {
      displayName: this.editForm.value.displayName,
      phone: this.editForm.value.phone
    });

    if (response.success) {
      this.successMessage.set('Perfil actualizado');
      setTimeout(() => this.successMessage.set(''), 3000);
    } else {
      this.errorMessage.set(response.message || 'Error al actualizar');
    }

    this.isLoading.set(false);
  }
}
```

---

## 5️⃣ Cambiar Contraseña

```typescript
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-change-password',
  template: `
    <form [formGroup]="changeForm" (ngSubmit)="onSubmit()">
      <input type="password" formControlName="currentPassword" 
             placeholder="Contraseña actual">
      <input type="password" formControlName="newPassword" 
             placeholder="Nueva contraseña">
      <input type="password" formControlName="confirmPassword" 
             placeholder="Confirmar contraseña">
      
      <button [disabled]="isLoading()">
        {{ isLoading() ? 'Cambiando...' : 'Cambiar Contraseña' }}
      </button>
      
      <p *ngIf="successMessage()" class="success">{{ successMessage() }}</p>
      <p *ngIf="errorMessage()" class="error">{{ errorMessage() }}</p>
    </form>
  `
})
export class ChangePasswordComponent {
  changeForm: FormGroup;
  isLoading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.changeForm = this.formBuilder.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(group: AbstractControl): any {
    const newPwd = group.get('newPassword');
    const confirmPwd = group.get('confirmPassword');
    
    if (newPwd?.value !== confirmPwd?.value) {
      confirmPwd?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  async onSubmit() {
    if (this.changeForm.invalid) return;

    this.isLoading.set(true);
    const { currentPassword, newPassword } = this.changeForm.value;

    const response = await this.authService.changePassword(
      currentPassword,
      newPassword
    );

    if (response.success) {
      this.successMessage.set('Contraseña actualizada');
      this.changeForm.reset();
    } else {
      this.errorMessage.set(response.message);
    }

    this.isLoading.set(false);
  }
}
```

---

## 6️⃣ Buscar Usuario por Email

```typescript
import { Component, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

@Component({
  selector: 'app-user-search',
  template: `
    <div>
      <input [(ngModel)]="searchEmail" placeholder="Buscar por email">
      <button (click)="searchUser()">Buscar</button>
      
      <div *ngIf="foundUser()">
        <h3>{{ foundUser()?.displayName }}</h3>
        <p>Email: {{ foundUser()?.email }}</p>
        <p>Teléfono: {{ foundUser()?.phone }}</p>
        <p>Rol: {{ foundUser()?.role }}</p>
      </div>
      
      <p *ngIf="notFound()">Usuario no encontrado</p>
    </div>
  `
})
export class UserSearchComponent {
  searchEmail = '';
  foundUser = signal<User | null>(null);
  notFound = signal(false);

  constructor(private authService: AuthService) {}

  async searchUser() {
    if (!this.searchEmail) return;

    this.notFound.set(false);
    const user = await this.authService.getUserByEmail(this.searchEmail);

    if (user) {
      this.foundUser.set(user);
    } else {
      this.notFound.set(true);
      this.foundUser.set(null);
    }
  }
}
```

---

## 7️⃣ Suscribirse a Cambios en Tiempo Real

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-realtime-user',
  template: `
    <div *ngIf="currentUser">
      <h1>{{ currentUser.displayName }}</h1>
      <p>Última actualización: {{ currentUser.updatedAt | date }}</p>
    </div>
  `
})
export class RealtimeUserComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();

  constructor(private authService: AuthService) {}

  ngOnInit() {
    // Suscribirse a cambios del usuario
    this.authService.getCurrentUser$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        console.log('Usuario actualizado:', user);
      });

    // Suscribirse a cambios de autenticación
    this.authService.getAuthState$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        console.log('Estado auth:', isAuthenticated);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## 8️⃣ Proteger Componente sin Guard

```typescript
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-protected',
  template: `
    <div *ngIf="isAuthenticated">
      <h1>Contenido Protegido</h1>
    </div>
    <div *ngIf="!isAuthenticated">
      <p>Debes estar autenticado para ver este contenido</p>
    </div>
  `
})
export class ProtectedComponent implements OnInit {
  isAuthenticated = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    } else {
      this.isAuthenticated = true;
    }
  }
}
```

---

## 9️⃣ Enviar Email de Verificación

```typescript
import { Component, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-email-verification',
  template: `
    <div>
      <p>Verifica tu email para activar tu cuenta</p>
      <button (click)="sendVerification()" [disabled]="isLoading()">
        {{ isLoading() ? 'Enviando...' : 'Enviar Email de Verificación' }}
      </button>
      <p *ngIf="successMessage()" class="success">{{ successMessage() }}</p>
      <p *ngIf="errorMessage()" class="error">{{ errorMessage() }}</p>
    </div>
  `
})
export class EmailVerificationComponent {
  isLoading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  constructor(private authService: AuthService) {}

  async sendVerification() {
    this.isLoading.set(true);
    const response = await this.authService.sendEmailVerification();

    if (response.success) {
      this.successMessage.set('Email enviado. Revisa tu bandeja de entrada');
    } else {
      this.errorMessage.set(response.message);
    }

    this.isLoading.set(false);
  }
}
```

---

## 🔟 Interceptor para Agregar Token a Requests

```typescript
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Si no hay usuario autenticado, enviar request sin modificar
    if (!this.authService.isAuthenticated()) {
      return next.handle(req);
    }

    // Obtener token y agregarlo a headers
    return new Promise<string | null>(resolve => {
      this.authService.getIdToken().then(token => {
        resolve(token);
      }).catch(() => {
        resolve(null);
      });
    }).then((token: string | null) => {
      if (token) {
        // Agregar token al header Authorization
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        return next.handle(authReq);
      }
      return next.handle(req);
    });
  }
}
```

**Registrar en app.config.ts:**
```typescript
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './services/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... otros providers
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
};
```

---

## 📝 Notas Importantes

1. **Siempre manejar errores** con try-catch o verificar `response.success`
2. **Usar signals para estado reactivo** en lugar de variables normales
3. **Subscribirse a observables** con `takeUntil()` para evitar memory leaks
4. **Limpiar subscripciones en ngOnDestroy**
5. **Verificar autenticación antes de operaciones sensibles**

---

**Última actualización:** 2026-07-25
