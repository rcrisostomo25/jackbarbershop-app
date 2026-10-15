# 🚀 GUÍA COMPLETA: CONFIGURAR EMAIL CON FIREBASE CLOUD FUNCTIONS (v2 - Params)

## Resumen Ejecutivo

He creado las **Firebase Cloud Functions** para enviar emails automáticos cuando se registre una visita. Ahora usa el **nuevo sistema de Params de Firebase** (futuro-proof hasta 2027+).

**Tiempo total:** ~5 minutos

---

## ✅ Lo que ya está hecho

- ✅ Estructura de Cloud Functions creada
- ✅ Código TypeScript escrito con Firebase Params
- ✅ Dependencias instaladas
- ✅ Firebase.json configurado
- ✅ Templates HTML de emails listos
- ✅ Archivo `.env.firebase` de ejemplo

## 🔧 Lo que necesitas hacer

### PASO 1: Habilitar Verificación de Dos Factores en Google

1. Ve a https://myaccount.google.com/
2. Click en "Seguridad" (menú izquierdo)
3. Busca "Verificación en dos pasos"
4. Click en "Comenzar" o "Agregar contraseña de aplicación"
5. Sigue los pasos para habilitar 2FA

⏱️ **Tiempo:** 2 minutos

---

### PASO 2: Generar Contraseña de Aplicación Gmail

1. Ve a https://myaccount.google.com/apppasswords
2. En los dropdowns selecciona:
   - **Aplicación:** "Correo"
   - **Dispositivo:** "Windows (o tu dispositivo)"
3. Click en "Generar"
4. **COPIA LA CONTRASEÑA** (16 caracteres separados por espacios)
   
   Ejemplo: `abcd efgh ijkl mnop`

⏱️ **Tiempo:** 1 minuto

---

### PASO 3: Configurar `.env.firebase`

1. Abre el archivo `functions/.env.firebase` en tu editor
2. Reemplaza los valores:

```ini
# Tu email Gmail
GMAIL_EMAIL=jackbarbershop@gmail.com

# La contraseña que copiaste en PASO 2
GMAIL_PASSWORD=abcd efgh ijkl mnop

# Email del admin (puede ser el mismo)
ADMIN_EMAIL=manager@jackbarbershop.com
```

**IMPORTANTE:**
- ⚠️ Este archivo `.env.firebase` **SÍ se sube a GitHub** (no tiene secretos sensibles aquí)
- Los secretos reales se configuran en Firebase Cloud durante el deploy
- La contraseña en `.env.firebase` es solo temporal para el setup

⏱️ **Tiempo:** 1 minuto

---

### PASO 4: Desplegar las Cloud Functions

Abre PowerShell/Terminal en la raíz del proyecto y ejecuta:

```bash
firebase deploy --set-env-file=functions/.env.firebase --only functions
```

**Firebase te pedirá confirmación:**
```
? Set the following environment variables? (Y/n)
GMAIL_EMAIL=jackbarbershop@gmail.com
GMAIL_PASSWORD=abcd efgh ijkl mnop
ADMIN_EMAIL=manager@jackbarbershop.com
```

Responde **Y** (Yes)

**Output esperado:**

```
✔  Deploy complete!

Function URL: https://us-central1-jackbarbershop-8c03b.cloudfunctions.net/onVisitCreated
Function URL: https://us-central1-jackbarbershop-8c03b.cloudfunctions.net/onVisitApproved
```

⏱️ **Tiempo:** 2-3 minutos

---

### PASO 5: Probar que Funciona ✅

1. Abre tu app en http://localhost:4200 (o en producción)
2. Regístrate como admin/barbero
3. Ve a **Portal Público** → **Registro de Visita**
4. Completa el formulario y haz click en "Registrar Visita"
5. **Revisa tu email** (la dirección que configuraste en `ADMIN_EMAIL`)

**Deberías recibir un email bonito** 💌 con:
- ✂️ Nueva Visita Registrada
- 👤 Nombre del cliente
- 📱 Teléfono
- 📦 Paquete de servicio (si existe)
- 💈 Nombre del barbero (si existe)
- 📅 Fecha y hora

⏱️ **Tiempo:** 1 minuto

---

## 📊 Lo que sucede automáticamente ahora

### Cuando se registra una visita:

```
Usuario registra visita
    ↓
Firestore guarda el documento
    ↓
Cloud Function se dispara automáticamente
    ↓
Se envía email al admin
    ↓
Admin recibe notificación ✉️
```

---

## 🔒 Seguridad

- ✅ Las credenciales se guardan en **Firebase Runtime Secrets** (encriptadas)
- ✅ El archivo `.env.firebase` es local, no se sube a GitHub
- ✅ Durante el deploy, Firebase guarda valores de forma segura
- ✅ Los parámetros se inyectan automáticamente en runtime

---

## 📱 Monitoreo

### Ver emails enviados

1. Ve a https://console.firebase.google.com/
2. Selecciona tu proyecto `jackbarbershop-8c03b`
3. Ve a **Functions** en el menú izquierdo
4. Haz click en `onVisitCreated` o `onVisitApproved`
5. Click en la pestaña **Logs**

### Desde línea de comandos

```bash
firebase functions:log
```

---

## ⚠️ Troubleshooting

### Problema: "No me llega el email"

**Solución 1:** Revisa spam/basura en tu email

**Solución 2:** Verifica los logs
```bash
firebase functions:log
```

Busca mensajes de error.

**Solución 3:** Redeploy
```bash
firebase deploy --set-env-file=functions/.env.firebase --only functions
```

### Problema: "EAUTH: Invalid login"

Significa que la contraseña de Gmail es incorrecta.

1. Ve a https://myaccount.google.com/apppasswords nuevamente
2. Genera una **nueva contraseña**
3. Actualiza en `functions/.env.firebase`
4. Redeploy:
   ```bash
   firebase deploy --set-env-file=functions/.env.firebase --only functions
   ```

### Problema: "Function deployment failed"

Revisa que el archivo `.env.firebase` esté bien formateado (sin caracteres especiales).

---

## 🎉 ¡Listo!

Una vez completado el PASO 5 y hayas recibido el primer email, tu sistema de notificaciones está **100% funcional**.

Ahora cada vez que se registre una visita:
- 📧 Recibirás un email automáticamente
- ✅ Recibirás otro email cuando la apruebes
- 📊 Puedes monitorear todo desde Firebase Console

---

## 🚀 Próximas Mejoras (Opcional)

Una vez que esto esté funcionando, podemos agregar:

- 📱 **WhatsApp**: Notificar al cliente cuando su visita esté lista
- 🔔 **Push Notifications**: Notificación en navegador en tiempo real
- 📞 **SMS**: Recordatorio al cliente 1 hora antes

---

## ❓ Preguntas

Si algo no funciona o tienes dudas, revisa:

1. `/functions/README.md` - Documentación técnica
2. Firebase Console Logs → Functions
3. Verifica que seguiste todos los pasos

---

**¡Implementado con ❤️ para Jack Barbershop! 💇**

