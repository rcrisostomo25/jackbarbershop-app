# 🚀 COMANDOS RÁPIDOS - Firebase Cloud Functions Setup

## TL;DR (Too Long; Didn't Read) - Versión ultra rápida

```bash
# 1. Genera contraseña app en: https://myaccount.google.com/apppasswords

# 2. Edita functions/.env.firebase con tus datos

# 3. Deploy
firebase deploy --set-env-file=functions/.env.firebase --only functions

# 4. Prueba registrando una visita en tu app

# 5. Revisa tu email ✉️
```

---

## Comandos Completos

### Ver configuración actual
```bash
firebase functions:config:list
```

### Ver logs en tiempo real
```bash
firebase functions:log
```

### Ver logs filtrados
```bash
firebase functions:log --limit 50
```

### Deploy completo (todo)
```bash
firebase deploy
```

### Deploy solo functions
```bash
firebase deploy --only functions --set-env-file=functions/.env.firebase
```

### Emular functions localmente
```bash
firebase emulators:start --only functions,firestore
```

---

## Archivo `.env.firebase` - Referencia

```ini
# Gmail SMTP email (tu cuenta Gmail)
GMAIL_EMAIL=tu-email@gmail.com

# App password de Gmail (16 caracteres)
# NO es tu contraseña de Google normal
GMAIL_PASSWORD=abcd efgh ijkl mnop

# Email del admin que recibe notificaciones
ADMIN_EMAIL=admin@jackbarbershop.com
```

---

## Flujo Completo en 5 Pasos

### Paso 1: Google Account Setup
```
1. Ve a https://myaccount.google.com/security
2. Habilita "Verificación en dos pasos"
3. Espera confirmación
```

### Paso 2: Gmail App Password
```
1. Ve a https://myaccount.google.com/apppasswords
2. Selecciona Mail + Tu dispositivo
3. Copia el código de 16 caracteres
```

### Paso 3: Configurar Archivo
```bash
# Edita functions/.env.firebase
GMAIL_EMAIL=jackbarbershop@gmail.com
GMAIL_PASSWORD=abcd efgh ijkl mnop
ADMIN_EMAIL=manager@jackbarbershop.com
```

### Paso 4: Deploy
```bash
cd d:\Ronald\proyectos\front_web\hsms\v2\jackbarbershop-app
firebase deploy --set-env-file=functions/.env.firebase --only functions
```

### Paso 5: Test
```
1. Abre http://localhost:4200
2. Portal Público → Registro de Visita
3. Completa y registra
4. Revisa tu email 💌
```

---

## Troubleshooting Rápido

### Error: "EAUTH: Invalid login"
```bash
# La contraseña es incorrecta
# 1. Genera nueva en https://myaccount.google.com/apppasswords
# 2. Actualiza functions/.env.firebase
# 3. Redeploy:
firebase deploy --set-env-file=functions/.env.firebase --only functions
```

### Error: "No credentials found"
```bash
# El archivo .env.firebase no se cargó
# Verifica que el archivo existe en:
# functions/.env.firebase

# Redeploy especificando la ruta:
firebase deploy --set-env-file=functions/.env.firebase --only functions
```

### Ver error completo
```bash
firebase functions:log --limit 100
```

---

## Variables de Entorno (Reference)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `GMAIL_EMAIL` | Tu email Gmail | jackbarbershop@gmail.com |
| `GMAIL_PASSWORD` | App password (16 caracteres) | abcd efgh ijkl mnop |
| `ADMIN_EMAIL` | Email que recibe notificaciones | manager@jackbarbershop.com |

---

## Archivos Importantes

```
jackbarbershop-app/
├── functions/
│   ├── src/index.ts              ← Código TypeScript
│   ├── .env.firebase             ← Configuración (EDITA ESTO)
│   ├── lib/                       ← Compilado (generado)
│   └── package.json              ← Dependencias
├── firebase.json                 ← Configuración Firebase
├── FIREBASE_FUNCTIONS_SETUP.md   ← Guía completa
└── QUICK_CHECKLIST.md            ← Checklist paso a paso
```

---

## Cheat Sheet - Métodos HTTP (si necesitas)

```bash
# Solo rebuild
cd functions && npm run build

# Ver qué se va a desplegar
firebase functions:describe

# Ver zona horaria de una function
firebase functions:log --function=onVisitCreated
```

---

## Video Resumen (conceptual)

1. **Generar contraseña Gmail** (2 min)
   - https://myaccount.google.com/apppasswords

2. **Editar archivo .env.firebase** (1 min)
   - Reemplaza valores con tus datos

3. **Deploy a Firebase** (3 min)
   - `firebase deploy --set-env-file=functions/.env.firebase --only functions`

4. **Prueba la app** (2 min)
   - Registra una visita
   - Revisa tu email

**Total: ~10 minutos ⏱️**

---

## Preguntas Comunes

**P: ¿Dónde pongo la contraseña de Gmail?**
R: En `functions/.env.firebase` variable `GMAIL_PASSWORD`

**P: ¿Se sube el .env.firebase a GitHub?**
R: No, está en `.gitignore` (es local)

**P: ¿Cómo veo si se envió el email?**
R: `firebase functions:log` o Firebase Console → Functions → Logs

**P: ¿Qué pasa si me olvido de configurar?**
R: El deploy fallará indicando qué falta

**P: ¿Puedo usar otro email (no Gmail)?**
R: Sí, pero necesitas configurar SMTP diferente (requiere cambiar código)

---

**¡Necesitas ayuda? Lee `FIREBASE_FUNCTIONS_SETUP.md` para una guía completa!**
