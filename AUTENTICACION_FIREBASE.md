# Autenticación con Firebase en JackBarberShop

## 📋 Descripción General

La aplicación utiliza **Firebase Authentication** con el método de **correo electrónico/contraseña** como mecanismo de autenticación. Todos los usuarios (clientes, barberos y administradores) utilizan el mismo sistema de autenticación.

Los datos adicionales del usuario se almacenan en una colección **`users`** de Firestore, vinculada con el email del usuario.

---

## 🔐 Flujo de Autenticación

### 1. **Registro (Sign Up)**

```
Usuario → Formulario Registro → AuthService.register() 
  ↓
Firebase Auth: createUserWithEmailAndPassword()
  ↓
Firestore: Crear documento en colección 'users' con UID como ID
  ↓
Actualizar currentUser$ signal
  ↓
Redirigir a Dashboard
```

**Datos guardados en registro:**
- `id`: UID de Firebase Auth
- `email`: Correo electrónico
- `displayName`: Nombre completo
- `phone`: Teléfono
- `role`: Tipo de usuario (customer/barber)
- `createdAt`: Fecha de creación
- `updatedAt`: Fecha de última actualización

### 2. **Inicio de Sesión (Sign In)**

```
Usuario → Formulario Login → AuthService.login()
  ↓
Firebase Auth: signInWithEmailAndPassword()
  ↓
Firestore: getDocument('users', uid)
  ↓
Actualizar currentUser$ signal
  ↓
Redirigir a Dashboard
```

### 3. **Cierre de Sesión (Sign Out)**

```
Usuario → Click Logout → AuthService.logout()
  ↓
Firebase Auth: signOut()
  ↓
Limpiar currentUser$ signal
  ↓
Redirigir a Login
```

---

## 📁 Estructura de Firestore

### Colección: `users`

```
users/
├── {uid}/
│   ├── id: "uid"
│   ├── email: "usuario@example.com"
│   ├── displayName: "Juan García"
│   ├── phone: "1234567890"
│   ├── role: "customer" | "barber" | "admin"
│   ├── profilePicture: "url_imagen" (opcional)
│   ├── createdAt: Timestamp
│   └── updatedAt: Timestamp
```

**Reglas de Firestore recomendadas:**

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios solo pueden leer/escribir sus propios datos
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Admin puede leer todos los usuarios
    match /users/{document=**} {
      allow read: if request.auth.token.admin == true;
    }
  }
}
```

---

## 🛠️ Servicios Implementados

### AuthService (`src/app/services/auth.service.ts`)

#### Métodos principales:

#### `register(email, password, displayName, phone, role)`
Registra un nuevo usuario con Firebase Authentication y crea su perfil en Firestore.

```typescript
const response = await this.authService.register(
  'usuario@example.com',
  'password123',
  'Juan García',
  '1234567890',
  'customer'
);

if (response.success) {
  console.log('Usuario registrado:', response.user);
}
```

**Validaciones:**
- Email debe ser válido
- Contraseña mínimo 6 caracteres
- Email no debe estar registrado

---

#### `login(email, password)`
Autentica un usuario con correo y contraseña.

```typescript
const response = await this.authService.login(
  'usuario@example.com',
  'password123'
);

if (response.success) {
  // Redirigir a dashboard
}
```

---

#### `logout()`
Cierra la sesión del usuario actual.

```typescript
const response = await this.authService.logout();
if (response.success) {
  // Redirigir a login
}
```

---

#### `resetPassword(email)`
Envía un email de recuperación de contraseña.

```typescript
const response = await this.authService.resetPassword('usuario@example.com');
if (response.success) {
  console.log('Email de recuperación enviado');
}
```

---

#### `updateUserProfile(userId, updates)`
Actualiza el perfil del usuario en Firestore.

```typescript
const response = await this.authService.updateUserProfile(uid, {
  displayName: 'Nuevo Nombre',
  phone: '9876543210'
});
```

---

#### `changePassword(currentPassword, newPassword)`
Cambia la contraseña del usuario autenticado.

```typescript
const response = await this.authService.changePassword(
  'contraseña_actual',
  'nueva_contraseña'
);
```

---

#### `getUserByEmail(email)`
Obtiene un usuario desde Firestore usando su email.

```typescript
const user = await this.authService.getUserByEmail('usuario@example.com');
```

---

#### `sendEmailVerification()`
Envía un email de verificación al usuario actual.

```typescript
const response = await this.authService.sendEmailVerification();
```

---

#### `getCurrentUser()`
Obtiene el usuario autenticado actualmente.

```typescript
const user = this.authService.getCurrentUser();
console.log(user.email);
```

---

#### `isAuthenticated()`
Verifica si hay un usuario autenticado.

```typescript
if (this.authService.isAuthenticated()) {
  // Usuario autenticado
}
```

---

#### Observables para estado en tiempo real:

```typescript
// Suscribirse a cambios del usuario actual
this.authService.getCurrentUser$().subscribe(user => {
  if (user) {
    console.log('Usuario actualizado:', user);
  }
});

// Suscribirse a cambios del estado de autenticación
this.authService.getAuthState$().subscribe(isAuth => {
  console.log('Autenticado:', isAuth);
});
```

---

## 🛡️ Protección de Rutas

### AuthGuard (`src/app/guards/auth.guard.ts`)

Protege rutas que requieren autenticación:

```typescript
// En app.routes.ts
{
  path: 'dashboard',
  component: DashboardComponent,
  canActivate: [AuthGuard]
}
```

Si un usuario no autenticado intenta acceder, es redirigido a `/login`.

---

### RoleGuard (`src/app/guards/role.guard.ts`)

Protege rutas basadas en el rol del usuario:

```typescript
// En app.routes.ts
{
  path: 'admin',
  component: AdminComponent,
  canActivate: [RoleGuard],
  data: { roles: ['admin'] }
}
```

---

## 🎨 Componentes de Autenticación

### LoginComponent
Formulario de inicio de sesión con validación en tiempo real.

**Ubicación:** `src/app/auth/login/`

**Validaciones:**
- Email válido
- Contraseña mínimo 6 caracteres

---

### RegisterComponent
Formulario de registro con selección de rol.

**Ubicación:** `src/app/auth/register/`

**Validaciones:**
- Nombre completo mínimo 3 caracteres
- Email válido y no registrado
- Teléfono mínimo 10 dígitos
- Contraseña mínimo 6 caracteres
- Las contraseñas deben coincidir

**Roles disponibles:**
- 👤 Cliente (customer)
- ✂️ Barbero (barber)

---

### ForgotPasswordComponent
Formulario para recuperar contraseña.

**Ubicación:** `src/app/auth/forgot-password/`

---

## 📊 Interfaz User Model

```typescript
export interface User {
  id: string;                  // UID de Firebase
  email: string;               // Correo electrónico
  displayName: string;         // Nombre completo
  phone: string;               // Teléfono
  role: 'customer' | 'barber' | 'admin';  // Rol del usuario
  profilePicture?: string;     // URL de foto de perfil
  createdAt: Date;             // Fecha de creación
  updatedAt: Date;             // Fecha de última actualización
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  error?: string;
}
```

---

## 🌍 Variables de Entorno

### Firebase Configuration (`src/environments/environment.ts`)

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "jackbarbershop-app.firebaseapp.com",
    projectId: "jackbarbershop-app",
    storageBucket: "jackbarbershop-app.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  }
};
```

---

## 🚨 Manejo de Errores

Los errores de Firebase se convierten a mensajes en español:

| Error Code | Mensaje |
|-----------|---------|
| `auth/user-not-found` | Usuario no encontrado. Verifica tu correo electrónico. |
| `auth/wrong-password` | Contraseña incorrecta. Intenta nuevamente. |
| `auth/email-already-in-use` | El correo electrónico ya está registrado. |
| `auth/weak-password` | La contraseña es muy débil. Usa al menos 6 caracteres. |
| `auth/invalid-email` | Formato de correo electrónico inválido. |
| `auth/too-many-requests` | Demasiados intentos de inicio de sesión. Intenta más tarde. |
| `auth/network-request-failed` | Error de conexión. Verifica tu conexión a internet. |
| `auth/user-disabled` | Esta cuenta ha sido deshabilitada. |

---

## 🔍 Debugging

### Ver estado actual en consola:

```typescript
// En cualquier componente
constructor(private authService: AuthService) {
  console.log('Usuario actual:', this.authService.getCurrentUser());
  console.log('¿Autenticado?', this.authService.isAuthenticated());
}
```

### Monitorear cambios en tiempo real:

```typescript
this.authService.getCurrentUser$().subscribe(user => {
  console.log('Estado del usuario cambió:', user);
});
```

---

## 🎯 Casos de Uso

### 1. Proteger componente que necesita usuario autenticado

```typescript
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

@Component({
  selector: 'app-profile',
  template: `
    <div *ngIf="currentUser">
      <h1>{{ currentUser.displayName }}</h1>
      <p>{{ currentUser.email }}</p>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  currentUser: User | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
  }
}
```

### 2. Mostrar contenido basado en rol

```typescript
<div *ngIf="currentUser?.role === 'admin'">
  Panel de Administración
</div>

<div *ngIf="currentUser?.role === 'barber'">
  Panel del Barbero
</div>

<div *ngIf="currentUser?.role === 'customer'">
  Mis Citas
</div>
```

### 3. Actualizar perfil del usuario

```typescript
async updateProfile() {
  const response = await this.authService.updateUserProfile(
    this.authService.getCurrentUser()!.id,
    {
      displayName: this.newName,
      phone: this.newPhone
    }
  );
  
  if (response.success) {
    console.log('Perfil actualizado');
  }
}
```

---

## 📚 Documentación Oficial

- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [AngularFire](https://github.com/angular/angularfire)

---

## ✅ Checklist de Seguridad

- ✅ Contraseñas hasheadas automáticamente por Firebase
- ✅ Tokens JWT generados automáticamente
- ✅ HTTPS forzado en producción
- ✅ Reglas de Firestore restrictivas (solo acceso a propios datos)
- ✅ Protección contra fuerza bruta (Firebase limita intentos)
- ✅ Manejo de sesiones con observables
- ✅ Redireccionamiento automático si no autenticado

---

**Última actualización:** 2026-07-25
