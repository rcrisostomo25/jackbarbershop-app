# 🚀 Guía Rápida: Autenticación de Firebase en JackBarberShop

## ✅ Estado Actual

La autenticación con Firebase está **COMPLETAMENTE IMPLEMENTADA** con:
- ✅ Registro de usuarios (email/contraseña)
- ✅ Inicio de sesión
- ✅ Recuperación de contraseña
- ✅ Colección de usuarios en Firestore
- ✅ Protección de rutas (AuthGuard)
- ✅ Control de acceso por rol (RoleGuard)
- ✅ Mensajes de error en español
- ✅ Interfaz con Bootstrap 5.3.3 minimalista

---

## 🧪 Cómo Probar la Autenticación

### Opción 1: Registro desde la UI

1. Abre http://localhost:4200
2. Haz clic en **"Registrarse"**
3. Completa el formulario con:
   - Nombre completo: `Juan García`
   - Email: `juan@example.com`
   - Teléfono: `1234567890`
   - Contraseña: `123456`
   - Selecciona rol: **Cliente** o **Barbero**
4. Haz clic en **"Crear Cuenta"**
5. ¡Serás redirigido al Dashboard!

### Opción 2: Login

1. Usa las credenciales creadas en el registro
2. Email: `juan@example.com`
3. Contraseña: `123456`
4. Haz clic en **"Iniciar Sesión"**

### Opción 3: Recuperar Contraseña

1. En la página de login, haz clic en **"¿Olvidaste tu contraseña?"**
2. Ingresa tu email
3. Haz clic en **"Enviar enlace de recuperación"**
4. Recibirás un email de Firebase (ve a tu bandeja de entrada)

---

## 📊 Dónde se guardan los datos

### Firebase Authentication
- **Ubicación:** Console de Firebase (Authentication → Users)
- **Datos:** Email, UID, fecha de creación
- **URL:** https://console.firebase.google.com

### Firestore Database
- **Colección:** `users`
- **Documentos:** Uno por usuario, con UID como ID
- **Datos:**
  ```
  {
    id: "UID_del_usuario",
    email: "usuario@example.com",
    displayName: "Juan García",
    phone: "1234567890",
    role: "customer" o "barber",
    profilePicture: "url_opcional",
    createdAt: Timestamp,
    updatedAt: Timestamp
  }
  ```

---

## 🔐 Seguridad Implementada

1. **Contraseñas hasheadas:** Firebase las encripta automáticamente
2. **Tokens JWT:** Se generan automáticamente
3. **Protección de rutas:** Solo usuarios autenticados acceden a `/dashboard`
4. **Control por rol:** Diferentes accesos según rol (customer/barber/admin)
5. **Límite de intentos:** Firebase bloquea automáticamente después de muchos intentos fallidos
6. **Session persistencia:** El estado se mantiene al recargar la página

---

## 🛠️ Archivos Clave

| Archivo | Propósito |
|---------|----------|
| `src/app/services/auth.service.ts` | Lógica de autenticación |
| `src/app/services/firestore.service.ts` | Operaciones con Firestore |
| `src/app/guards/auth.guard.ts` | Protección de rutas |
| `src/app/guards/role.guard.ts` | Control de acceso por rol |
| `src/app/auth/login/` | Componente de login |
| `src/app/auth/register/` | Componente de registro |
| `src/app/auth/forgot-password/` | Componente de recuperación |
| `src/app/dashboard/` | Componente principal |
| `src/environments/environment.ts` | Config de Firebase |

---

## 📱 Funcionalidades Disponibles

### En el AuthService:

```typescript
// Métodos principales
authService.register(email, password, name, phone, role)
authService.login(email, password)
authService.logout()
authService.resetPassword(email)
authService.updateUserProfile(userId, updates)
authService.changePassword(currentPwd, newPwd)
authService.getUserByEmail(email)
authService.sendEmailVerification()

// Verificaciones
authService.getCurrentUser()      // Retorna User | null
authService.isAuthenticated()     // Retorna boolean
authService.getCurrentUser$()     // Observable
authService.getAuthState$()       // Observable
```

---

## 🎯 Próximos Pasos Sugeridos

1. **Conectar Firebase Email Verification:**
   - Enviar email de verificación en registro
   - Permitir login solo si email está verificado

2. **Agregar campos adicionales del usuario:**
   - Dirección
   - Foto de perfil
   - Horarios disponibles (para barberos)
   - Rating (para barberos)

3. **Implementar módulos de citas:**
   - Agendar citas
   - Ver mis citas
   - Cancelar citas

4. **Dashboard específico por rol:**
   - Cliente: Ver citas, cambiar perfil
   - Barbero: Ver citas asignadas, disponibilidad
   - Admin: Gestionar usuarios, citas, barberos

5. **Notificaciones:**
   - Email de confirmación de cita
   - Recordatorio de cita
   - Notificaciones push

---

## 🐛 Si algo falla

### Error: "Email ya está registrado"
→ Usa un email diferente o usa la opción "Recuperar contraseña"

### Error: "Contraseña débil"
→ Usa una contraseña de al menos 6 caracteres

### No se guardan los datos en Firestore
→ Verifica que:
1. Firebase está conectado correctamente
2. La colección `users` existe en Firestore
3. Las reglas de Firestore permiten escritura

### No se puede iniciar sesión
→ Verifica:
1. El email está registrado
2. La contraseña es correcta
3. La conexión a internet funciona

---

## 📞 Contacto

Para más detalles, revisa:
- [AUTENTICACION_FIREBASE.md](./AUTENTICACION_FIREBASE.md) - Documentación completa
- Firebase Console: https://console.firebase.google.com
- AngularFire Docs: https://github.com/angular/angularfire

---

**Última actualización:** 2026-07-25
