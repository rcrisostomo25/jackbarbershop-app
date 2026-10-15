# 📧 Firebase Cloud Functions - Email Notifications

Este directorio contiene las Cloud Functions para enviar notificaciones por email cuando se registra una visita en la barbería.

## 🏗️ Estructura

```
functions/
├── src/
│   └── index.ts          # Funciones principales
├── lib/                  # Código compilado (generado)
├── package.json          # Dependencias
└── tsconfig.json         # Configuración TypeScript
```

## 🔧 Funciones Disponibles

### 1. `onVisitCreated` 
- **Trigger**: Se ejecuta cuando se crea un nuevo documento en `visits`
- **Acción**: Envía email al admin notificando la nueva visita
- **Incluye**: Datos del cliente, servicio, barbero, fecha

### 2. `onVisitApproved`
- **Trigger**: Se ejecuta cuando una visita es aprobada (status → "Aprobado")
- **Acción**: Envía email de confirmación de aprobación

## 🚀 Instalación y Configuración

### Paso 1: Instalar Dependencias

Las dependencias ya están instaladas en `functions/node_modules/`, pero si necesitas reinstalar:

```bash
cd functions
npm install
```

### Paso 2: Configurar Gmail SMTP

Necesitas una contraseña de aplicación de Gmail (no tu contraseña normal):

#### a. Habilitar verificación de dos factores en tu cuenta Google
1. Ve a https://myaccount.google.com/
2. Ve a "Seguridad" en el menú izquierdo
3. Habilita "Verificación en dos pasos"

#### b. Generar contraseña de aplicación
1. Ve a https://myaccount.google.com/apppasswords
2. Selecciona "Mail" como aplicación
3. Selecciona "Windows (o tu dispositivo)" 
4. Google te mostrará una contraseña de 16 caracteres
5. **Copia esa contraseña**

#### c. Configurar en Firebase
Ejecuta los siguientes comandos en tu terminal (desde la raíz del proyecto):

```bash
# Configurar email de Gmail
firebase functions:config:set gmail.email="tu-email@gmail.com"

# Configurar contraseña de aplicación
firebase functions:config:set gmail.password="16-character-password"

# Configurar email del admin para recibir notificaciones
firebase functions:config:set admin.email="admin@tudominio.com"
```

**Ejemplo real:**
```bash
firebase functions:config:set gmail.email="jackbarbershop@gmail.com"
firebase functions:config:set gmail.password="abcd efgh ijkl mnop"
firebase functions:config:set admin.email="owner@jackbarbershop.com"
```

#### d. Verificar configuración
```bash
firebase functions:config:get
```

Deberías ver algo como:
```json
{
  "gmail": {
    "email": "jackbarbershop@gmail.com",
    "password": "abcd efgh ijkl mnop"
  },
  "admin": {
    "email": "owner@jackbarbershop.com"
  }
}
```

### Paso 3: Desplegar las Functions

```bash
firebase deploy --only functions
```

Output esperado:
```
✔  Deploy complete!

Function URL: https://us-central1-jackbarbershop-8c03b.cloudfunctions.net/onVisitCreated
Function URL: https://us-central1-jackbarbershop-8c03b.cloudfunctions.net/onVisitApproved
```

## 🧪 Pruebas Locales

### Opción 1: Usar el emulador de Firebase

```bash
# Desde la raíz del proyecto
firebase emulators:start --only firestore,functions
```

Luego, desde otra terminal, ejecuta:
```bash
# Registra una visita desde la app
# El emulador ejecutará las functions localmente
```

### Opción 2: Hacer deploy a staging y probar en la nube

```bash
firebase deploy --only functions
```

Luego registra una visita desde la app web.

## 📊 Monitoreo

### Ver logs de las functions

```bash
firebase functions:log
```

O en el [Firebase Console](https://console.firebase.google.com/):
1. Ve a "Functions" en el menú izquierdo
2. Selecciona la función que quieres ver
3. Click en "Logs"

## ⚠️ Solución de Problemas

### Email no se envía

1. **Verificar configuración:**
   ```bash
   firebase functions:config:get
   ```

2. **Revisar logs:**
   ```bash
   firebase functions:log
   ```

3. **Comprobar credenciales:**
   - ¿Usaste contraseña de aplicación de Gmail? (no tu contraseña normal)
   - ¿El email está correctamente configurado?

4. **Reintentar deploy:**
   ```bash
   firebase deploy --only functions
   ```

### Error: "EAUTH: Invalid login"

- Significa que la contraseña de Gmail es incorrecta
- Ve a https://myaccount.google.com/apppasswords
- Genera una nueva contraseña
- Ejecuta `firebase functions:config:set gmail.password="nueva-password"`
- Deploy nuevamente

### Error: "Timeout"

- Significa que las functions están tardando mucho o hay problema de conexión
- Verifica que no hay restricciones de firewall
- Revisa si Gmail tiene restricciones de SMTP

## 📝 Estructura del Email

### Email de Nueva Visita

```
Asunto: ✂️ Nueva Visita Registrada - [Nombre Cliente]

Contenido:
- Información del cliente (nombre, teléfono)
- Detalles del servicio (corte, paquete, barbero)
- Fecha y hora de la visita
- Recomendaciones (si existen)
```

### Email de Aprobación

```
Asunto: ✅ Visita Aprobada - [Nombre Cliente]

Contenido:
- Confirmación de aprobación
- Datos del cliente
- Fecha de aprobación
```

## 🔐 Seguridad

- ✅ Las credenciales se guardan en Firebase Config (encriptadas)
- ✅ Nunca se guardan en el código
- ✅ El archivo `.env.local` es solo informativo
- ✅ No está commiteado al git

## 📱 Próximos Pasos

Cuando quieras escalar:

1. **Agregar WhatsApp**: Integrar Twilio o WhatsApp Business API
2. **Agregar Push Notifications**: Usar Firebase Cloud Messaging
3. **Agregar SMS**: Integrar Twilio SMS
4. **Agregar Estadísticas**: Trackear envíos y bounce rates

## ❓ Preguntas Frecuentes

**P: ¿Cuánto cuesta?**
A: Cloud Functions es gratuito hasta 2M invocaciones/mes. Gmail SMTP es gratuito.

**P: ¿Qué pasa si no configuro las credentials?**
A: Las functions se desplogarán pero no podrán enviar emails. Verás un error en los logs.

**P: ¿Puedo cambiar el diseño del email?**
A: Sí, edita el HTML en `src/index.ts` en la función `generateEmailTemplate`.

**P: ¿Se pueden enviar a múltiples emails?**
A: Sí, modificando la config y la lógica en las functions.

---

**Creado con ❤️ para Jack Barbershop**
