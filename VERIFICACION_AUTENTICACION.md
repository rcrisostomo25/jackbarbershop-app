# ✅ Checklist de Verificación - Autenticación Firebase

## 📋 Verificaciones Técnicas

### 1. Build y Compilación
- [ ] Ejecuta: `ng build`
- [ ] Resultado: Build completado sin errores
- [ ] Bundle size: ~1.37 MB (dentro del presupuesto)

### 2. Dev Server
- [ ] Ejecuta: `ng serve`
- [ ] Servidor inicia en: http://localhost:4200
- [ ] No hay errores en la consola del navegador

### 3. Firebase Conectado
- [ ] Abre las herramientas de desarrollador (F12)
- [ ] Consola: No debe haber errores de Firebase
- [ ] Verifica que Firebase está inicializado
- [ ] Comprueba que puedes acceder a: https://console.firebase.google.com

### 4. Firestore Creado
- [ ] En Firebase Console → Firestore
- [ ] Verifica que existe la colección `users`
- [ ] Estructura de documento es correcta

---

## 🧪 Pruebas de Funcionalidad

### Test 1: Registro de Usuario
1. Abre http://localhost:4200
2. Haz clic en **"Registrarse"**
3. Completa el formulario:
   - Nombre: `Test User`
   - Email: `test@example.com`
   - Teléfono: `1234567890`
   - Rol: **Cliente**
   - Contraseña: `test123456`
   - Confirmar: `test123456`
4. Haz clic en **"Crear Cuenta"**
5. **✅ Esperado:** Redirige a Dashboard con datos del usuario

**Verificar en Firestore:**
- Abre Firebase Console → Firestore
- Colección `users` → documento con email `test@example.com`
- Contiene: email, displayName, phone, role, createdAt, updatedAt

**Verificar en Firebase Auth:**
- Firebase Console → Authentication → Users
- Debe existir usuario con email `test@example.com`

---

### Test 2: Login
1. Si ya estás en Dashboard, haz logout
2. Vuelve a http://localhost:4200 (debería redirigir a /login)
3. Ingresa:
   - Email: `test@example.com`
   - Contraseña: `test123456`
4. Haz clic en **"Iniciar Sesión"**
5. **✅ Esperado:** Redirige a Dashboard con datos del usuario

---

### Test 3: Persistencia de Sesión
1. Estando en Dashboard
2. Recarga la página (F5)
3. **✅ Esperado:** Permaneces en Dashboard sin redirigir a login
4. **✅ Esperado:** Los datos del usuario se mantienen (nombre, email, rol)

---

### Test 4: Protección de Rutas
1. Logout desde Dashboard
2. Intenta acceder manualmente a: http://localhost:4200/dashboard
3. **✅ Esperado:** Redirige automáticamente a /login
4. Intenta acceder a: http://localhost:4200/profile
5. **✅ Esperado:** Redirige automáticamente a /login

---

### Test 5: Recuperación de Contraseña
1. En login, haz clic en **"¿Olvidaste tu contraseña?"**
2. Ingresa el email: `test@example.com`
3. Haz clic en **"Enviar enlace"**
4. **✅ Esperado:** Muestra mensaje "Email de verificación enviado"
5. **✅ Esperado:** Redirige a login después de 2 segundos

**Verificar email:**
- Ve a tu bandeja de entrada (Gmail, Yahoo, etc.)
- Deberías recibir email de Firebase con enlace de recuperación
- Si usas dominio de prueba, revisa en Firebase Console

---

### Test 6: Validaciones de Formulario

#### Test 6a: Validación en Registro
1. Abre formulario de registro
2. Intenta registrar sin llenar campos
3. **✅ Esperado:** Muestra mensajes de error (campo requerido)
4. Ingresa email inválido: `notanemail`
5. **✅ Esperado:** Muestra "formato de email inválido"
6. Ingresa teléfono con < 10 dígitos: `123456`
7. **✅ Esperado:** Muestra "teléfono inválido"
8. Ingresa contraseña < 6 caracteres: `12345`
9. **✅ Esperado:** Muestra "contraseña muy débil"
10. Confirma contraseña diferente
11. **✅ Esperado:** Muestra "las contraseñas no coinciden"

#### Test 6b: Validación en Login
1. Ingresa email vacío
2. **✅ Esperado:** Muestra "campo requerido"
3. Ingresa contraseña vacía
4. **✅ Esperado:** Muestra "campo requerido"

---

### Test 7: Mensajes de Error en Español
1. En login, intenta con email no registrado: `noexiste@example.com`
2. **✅ Esperado:** Error en español: "Usuario no encontrado..."
3. Intenta con contraseña incorrecta
4. **✅ Esperado:** Error en español: "Contraseña incorrecta..."
5. En registro, usa email ya registrado
6. **✅ Esperado:** Error en español: "El correo ya está registrado..."

---

### Test 8: Múltiples Roles

#### Test 8a: Registrar como Barbero
1. Registro: Selecciona rol **Barbero** (✂️)
2. Completa formulario y registra
3. **✅ Esperado:** Dashboard muestra "✂️ Barbero"
4. En Firestore, documento del usuario debe tener `role: "barber"`

#### Test 8b: Registrar como Cliente
1. Logout
2. Registro: Selecciona rol **Cliente** (👤)
3. Completa y registra con nuevo email
4. **✅ Esperado:** Dashboard muestra "👤 Cliente"
5. En Firestore, documento debe tener `role: "customer"`

---

### Test 9: Logout
1. En Dashboard, haz clic en **"Cerrar Sesión"**
2. **✅ Esperado:** Redirige a /login
3. **✅ Esperado:** Usuario actual se limpia
4. Intenta acceder a dashboard manualmente
5. **✅ Esperado:** Redirige a login

---

### Test 10: Visibilidad de Contraseña
1. En formulario de login
2. Contraseña debe mostrar puntos: `•••••`
3. Haz clic en el ícono de ojo
4. **✅ Esperado:** Contraseña se ve como texto claro
5. Haz clic de nuevo
6. **✅ Esperado:** Vuelve a mostrar puntos

---

## 📊 Verificaciones en Firebase Console

### Colección `users`

Cada documento debe tener esta estructura:

```json
{
  "id": "UID_auto_generado",
  "email": "usuario@example.com",
  "displayName": "Nombre Usuario",
  "phone": "1234567890",
  "role": "customer" o "barber",
  "profilePicture": "" (vacío si no hay),
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
```

### Authentication → Users

- ✅ Debe haber un usuario por cada registro realizado
- ✅ Email debe coincidir con el documento en Firestore
- ✅ UID debe ser igual al `id` del documento en Firestore

---

## 🐛 Troubleshooting

### "Error: Firestore not initialized"
```
Solución:
1. Verifica que appConfig.ts tenga provideFirestore
2. Verifica que environment.ts tenga firebase config
3. Reinicia el servidor: ng serve
```

### "Authentication plugin not found"
```
Solución:
1. Verifica que appConfig.ts tenga provideAuth
2. Instala AngularFire: npm install @angular/fire
3. Reinicia el servidor
```

### "El usuario se desconecta al recargar la página"
```
Solución:
1. Verifica que onAuthStateChanged esté en AuthService
2. Verifica que initializeAuthState se llama en constructor
3. Revisa que Firebase está correctamente inicializado
```

### "Los datos del usuario no se guardan en Firestore"
```
Solución:
1. Verifica FirestoreService.setDocument() no falla
2. Verifica que la colección 'users' existe en Firestore
3. Revisa las reglas de Firestore permiten write en /users/{uid}
4. Mira la consola del navegador para errores específicos
```

### "Mensaje de error en inglés en lugar de español"
```
Solución:
1. Verifica AuthService.getErrorMessage mapea el código de error
2. Si es un código nuevo, agrega su traducción al mapping
3. Los códigos deben empezar con 'auth/'
```

---

## 📈 Performance

Métricas esperadas:

| Métrica | Valor esperado |
|---------|---|
| Bundle size | < 1.5 MB |
| Tiempo de carga inicial | < 3 segundos |
| Tiempo de login | < 2 segundos |
| Tiempo de registro | < 3 segundos |
| Persistencia de sesión | Inmediata (< 100ms) |

---

## 🎓 Comandos Útiles

```bash
# Ver logs en tiempo real
tail -f src/main.ts

# Revisar errores de compilación
ng build --watch

# Ejecutar tests
ng test

# Build producción
ng build --configuration production

# Limpiar cache
ng cache clean

# Reinstalar dependencias
npm install

# Actualizar Angular Fire
npm update @angular/fire
```

---

## 📞 Si Algo no Funciona

1. **Abre la consola del navegador (F12)**
   - Tab "Console" para errores
   - Tab "Network" para ver requests a Firebase
   - Busca mensajes de error específicos

2. **Verifica la conexión a Firebase**
   ```typescript
   // En console del navegador, pega:
   window.location.href
   // Debe incluir localhost:4200
   ```

3. **Reinicia todo**
   ```bash
   # Terminal 1: Cierra ng serve (Ctrl+C)
   ng cache clean
   ng serve
   
   # Terminal 2: Limpia cache del navegador
   # Abre DevTools → Estorage → Clear site data
   ```

4. **Verifica credenciales de Firebase**
   - Ve a https://console.firebase.google.com
   - Selecciona tu proyecto: jackbarbershop-app
   - Copia las credenciales en environment.ts

---

## ✅ Resultado Final Esperado

- ✅ Registro funciona y guarda en Firestore
- ✅ Login funciona con datos persistentes
- ✅ Rutas están protegidas
- ✅ Errores en español
- ✅ Diseño Bootstrap responsive
- ✅ Sin errores en consola
- ✅ Build successful

**Una vez todo verificado, ¡tu autenticación está lista para producción!**

---

**Última actualización:** 2026-07-25
