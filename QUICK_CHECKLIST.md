# 📋 CHECKLIST: Firebase Cloud Functions Setup

## ✅ Ya Completado (Por mí)

- [x] Creada carpeta `functions/` con estructura correcta
- [x] Instaladas todas las dependencias npm
- [x] Código TypeScript escrito y compilado
- [x] `firebase.json` actualizado
- [x] Email templates profesionales listos
- [x] Documentación técnica y guía de setup creadas

## 👤 Necesitas Hacer (Por ti)

### Paso 1: Google Account Setup
- [ ] Ve a https://myaccount.google.com/security
- [ ] Habilita "Verificación en dos pasos"
- [ ] Espera confirmación

**Tiempo:** 2 minutos

---

### Paso 2: Gmail App Password
- [ ] Ve a https://myaccount.google.com/apppasswords
- [ ] Selecciona Mail + Tu dispositivo
- [ ] Copia la contraseña de 16 caracteres
- [ ] **Guárdala temporalmente (la necesitarás en Paso 3)**

Ejemplo: `abcd efgh ijkl mnop`

**Tiempo:** 1 minuto

---

### Paso 3: Configurar `.env.firebase`
- [ ] Abre `functions/.env.firebase`
- [ ] Reemplaza `GMAIL_EMAIL` con tu email Gmail
- [ ] Reemplaza `GMAIL_PASSWORD` con contraseña del Paso 2
- [ ] Reemplaza `ADMIN_EMAIL` con email del admin
- [ ] Guarda el archivo

**Archivo debe verse así:**
```ini
GMAIL_EMAIL=jackbarbershop@gmail.com
GMAIL_PASSWORD=abcd efgh ijkl mnop
ADMIN_EMAIL=admin@jackbarbershop.com
```

**Tiempo:** 1 minuto

---

### Paso 4: Deploy Functions
```bash
firebase deploy --set-env-file=functions/.env.firebase --only functions
```

Responde **Y** cuando pida confirmación

Espera a ver:
```
✔  Deploy complete!
```

**Tiempo:** 3 minutos

---

### Paso 5: Test
1. Abre http://localhost:4200
2. Ve a Portal Público → Registro de Visita
3. Completa el formulario
4. Click "Registrar Visita"
5. **Revisa tu email** ✉️

**Tiempo:** 2 minutos

---

## 📊 Total Time: ~10 minutos

---

## 🎯 Éxito = Recibiste un Email 💌

Si recibiste un email bonito con los datos de la visita, ¡todo está funcionando! 🎉

---

## ⚠️ Si No Funciona

1. Revisa los logs:
   ```bash
   firebase functions:log
   ```

2. Busca mensajes como:
   - `EAUTH: Invalid login` → Contraseña incorrecta
   - `Invalid email` → Email mal configurado
   - `No credentials` → Falta configuración

3. Si ves errores, ejecuta nuevamente el Paso 3 y Paso 4

---

## 📚 Documentación Completa

- **FIREBASE_FUNCTIONS_SETUP.md** - Guía paso a paso con detalles
- **functions/README.md** - Documentación técnica
- **functions/src/index.ts** - Código fuente comentado

---

## 🚀 Una Vez Funcione

Puedes personalizar:
- [ ] Cambiar el diseño del email (functions/src/index.ts)
- [ ] Agregar más campos (barberName, service, etc.)
- [ ] Enviar a múltiples emails
- [ ] Agregar WhatsApp (próxima fase)
- [ ] Agregar Push Notifications (próxima fase)

---

**Created with ❤️ for Jack Barbershop**
**Last Updated: 2024-10-12**
