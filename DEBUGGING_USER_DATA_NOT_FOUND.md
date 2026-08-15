# 🐛 Solución: "User data not found" - Debugging

## 🔍 ¿Qué significa este error?

El mensaje **"User data not found"** significa:
- ✅ Tu usuario EXISTE en Firebase Authentication
- ❌ Pero NO EXISTE el documento en la colección `users` de Firestore

## 🛠️ Causas Comunes

1. **El registro falló silenciosamente** - Firebase Auth se creó pero Firestore no
2. **Permisos de Firestore** - No puede escribir en la colección
3. **Conexión a Internet** - Se perdió durante el registro
4. **El documento fue borrado** - Manualmente en Firebase Console

---

## ✅ Soluciones Rápidas

### Opción 1: Verificar Firestore (La más rápida)

1. Abre https://console.firebase.google.com
2. Selecciona tu proyecto: **jackbarbershop-app**
3. Ve a **Firestore Database**
4. Busca la colección **`users`**
5. **¿Ves documentos?** Si SÍ, ve a Opción 2
6. **¿Ves la colección vacía?** Entonces sigue con Opción 3

---

### Opción 2: Si Existe la Colección `users`

**Verifica que el documento tenga la estructura correcta:**

```json
{
  "id": "UID_de_firebase",
  "email": "tu@email.com",
  "displayName": "Tu Nombre",
  "phone": "1234567890",
  "role": "customer",
  "profilePicture": "",
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
```

**Si el documento es diferente:**
1. Elimina el documento
2. Eliminaste la cuenta en Firebase Auth
3. Intenta registrarte de nuevo

---

### Opción 3: Si NO Existe la Colección `users`

**Primera solución - Automática (RECOMENDADO):**

La nueva versión del AuthService **crea automáticamente el documento** si no existe.

1. Abre http://localhost:4200/login
2. Ingresa tus credenciales
3. El sistema ahora debería:
   - ✅ Reconocer que no existe el documento
   - ✅ Crear el documento automáticamente
   - ✅ Redirigirte al Dashboard

**Si aún falla:**

---

## 🔧 Diagnóstico Avanzado

### Paso 1: Abre la Consola del Navegador

1. En http://localhost:4200
2. Presiona **F12**
3. Abre la pestaña **Console**

### Paso 2: Intenta Login y Lee los Logs

```
Busca mensajes como:

✅ "Firebase user found: abc123..." 
   → Significa que Firebase Auth funcionó

✅ "User data from Firestore: null"
   → Significa que Firestore está vacío (es lo esperado si es la primera vez)

✅ "User data not found in Firestore, creating from Firebase Auth"
   → El sistema detectó que falta el documento

✅ "User document created in Firestore"
   → El documento se creó exitosamente
   → DEBERÍAS ver Dashboard ahora
```

### Paso 3: Si Ves Errores

```
❌ "Error creating user document: permission-denied"
   → Las reglas de Firestore no permiten escribir
   → Ve a Firestore → Rules y agrega:
   
   match /users/{userId} {
     allow write: if request.auth.uid == userId;
     allow read: if request.auth.uid == userId;
   }

❌ "Error creating user document: failed-precondition"
   → Firestore no está habilitado
   → Ve a Firebase Console → Firestore → "Create Database"

❌ Otros errores de Firestore
   → Anota el código de error exacto
   → Busca la solución en Firebase Docs
```

---

## 🔑 Cómo Verificar Credenciales en Firebase Console

### 1. Ve a Firebase Console

```
https://console.firebase.google.com
↓
Selecciona "jackbarbershop-app"
↓
Authentication (en el menú izquierdo)
↓
Busca tu email
```

### 2. Verifica que el usuario existe

Deberías ver:
- Email
- UID (copia esto)
- Fecha de creación

### 3. Ahora va a Firestore Database

```
Firestore Database (en el menú izquierdo)
↓
Colección "users"
↓
Busca el documento con ID = al UID que copiaste
```

**¿Lo encontraste?**
- ✅ SÍ → El problema puede ser en la estructura, revisa Opción 2
- ❌ NO → Sigue los pasos de Opción 3

---

## 🆘 Plan B: Sincronización Manual

Si todo lo anterior falla, hay un **método de emergencia** para sincronizar datos:

### Método: Sync en la Consola del Navegador

```javascript
// En F12 → Console, pega esto:

angular.getComponent(document.querySelector('app-root')).injector.get(AuthService).syncUserData()
  .then(response => console.log('Sync result:', response))
  .catch(err => console.error('Sync error:', err));
```

**Esto debería:**
1. Obtener tus datos de Firebase Auth
2. Crear el documento en Firestore si no existe
3. Actualizar tu sesión

---

## 📋 Pasos Resumidos para Resolver

1. **Abre Firebase Console** → Verifica que el usuario existe en Authentication
2. **Ve a Firestore Database** → Busca la colección `users`
3. **¿Está vacía la colección?** → Intenta login otra vez (ahora debería crear automáticamente)
4. **¿Aún no funciona?** → Abre F12 y copia los errores exactos
5. **Comparte los errores** → Con los logs exactos podemos resolver el problema

---

## 🛠️ Mejoras que Se Aplicaron

El auth.service ahora:

✅ Agrega **logging detallado** para debugging
✅ Crea el documento **automáticamente** si no existe
✅ Maneja **errores de Firestore** más graciosamente
✅ Sincroniza datos en **onAuthStateChanged** automáticamente
✅ Tiene un método `.syncUserData()` para recuperación manual

---

## 📝 Checklist de Verificación

- [ ] Verificaste que el usuario existe en Firebase Authentication
- [ ] Verificaste que Firestore Database existe
- [ ] Intentaste login de nuevo después del cambio
- [ ] Abriste F12 Console y viste los logs
- [ ] Copiaste los mensajes de error exactos
- [ ] Revisaste que las reglas de Firestore permiten `write`

---

## 🚀 Si Ya Funciona

**¡Felicidades!** El sistema debería haber:

1. Detectado que el documento no existe
2. Creado el documento automáticamente
3. Redirigido al Dashboard
4. Guardado tu sesión

**Verifica en Firebase Console:**
- Ve a Firestore Database → `users` collection
- Deberías ver tu documento con los datos:
  - email: tu@email.com
  - displayName: Tu Nombre
  - phone: tu_teléfono
  - role: customer o barber
  - createdAt: (timestamp actual)

---

## 📞 Si Nada de Esto Funciona

Proporciona esta información:

```
1. Email que usas:
2. ¿Es la primera vez que lo registras?
3. ¿Qué dice la consola (F12 → Console)? (copia y pega)
4. ¿Qué dice Firebase Console → Authentication?
5. ¿Existe la colección "users" en Firestore?
6. ¿Cuál es tu UID de Firebase? (cópialo de Authentication)
```

Con esta información podemos resolver el problema específicamente.

---

**Última actualización:** 2026-07-25
