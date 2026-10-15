# 📧 Configurar Múltiples Destinatarios para Notificaciones

## ✅ Ahora Soportado: Enviar Emails a Múltiples Admins

Las Cloud Functions han sido actualizadas para enviar notificaciones a **múltiples emails simultáneamente**.

---

## 🚀 Cómo Configurar Múltiples Emails

### Comando Rápido

```bash
firebase functions:config:set admin.emails='email1@gmail.com,email2@gmail.com,email3@gmail.com'
```

### Ejemplos

**Un solo email (original):**
```bash
firebase functions:config:set admin.emails='ronald2517@gmail.com'
```

**Dos emails:**
```bash
firebase functions:config:set admin.emails='ronald2517@gmail.com,manager@barbershop.com'
```

**Tres emails:**
```bash
firebase functions:config:set admin.emails='ronald2517@gmail.com,manager@barbershop.com,owner@barbershop.com'
```

**Cuatro o más:**
```bash
firebase functions:config:set admin.emails='email1@gmail.com,email2@gmail.com,email3@gmail.com,email4@gmail.com,email5@gmail.com'
```

---

## ⚙️ Requisitos

✅ **Formato correcto:**
- Emails separados por comas (`,`)
- Sin espacios entre emails
- Cada email debe ser válido

❌ **Incorrecto:**
- `email1@gmail.com, email2@gmail.com` (espacios)
- `email1@gmail.com;email2@gmail.com` (punto y coma)
- `email1@gmail.com email2@gmail.com` (espacio)

✅ **Correcto:**
- `email1@gmail.com,email2@gmail.com,email3@gmail.com`

---

## 📊 Cómo Funciona

### Cuando se registra una visita:

```
1. Usuario registra visita en Portal Público
2. Firestore guarda documento
3. Trigger onVisitCreated se activa
4. Sistema lee configuración admin.emails
5. Extrae la lista de emails
6. Envía email a CADA dirección
7. Registra resultado de cada envío
```

### Ejemplo en Logs:

```
📝 Nueva visita registrada: visit_12345
✅ Email enviado a ronald2517@gmail.com: msgid123
✅ Email enviado a manager@barbershop.com: msgid456
✅ Email enviado a owner@barbershop.com: msgid789
📧 Emails enviados: 3/3
```

---

## 🔧 Cambios Realizados en el Código

### Función auxiliar nueva: `getAdminEmails()`

```typescript
function getAdminEmails(): string[] {
  const config = functions.config();
  const adminEmailsConfig = config.admin?.emails || config.admin?.email;

  if (!adminEmailsConfig) {
    return ["admin@jackbarbershop.com"];
  }

  // Si contiene comas, es una lista
  if (adminEmailsConfig.includes(",")) {
    return adminEmailsConfig.split(",").map((email: string) => email.trim());
  }

  // Si no, es un email único
  return [adminEmailsConfig];
}
```

### Funcionamiento:

1. Lee la configuración `admin.emails`
2. Si contiene comas, separa en array
3. Si es un email único, lo pone en array
4. Devuelve lista de emails

### Envío a múltiples emails:

```typescript
for (const adminEmail of adminEmails) {
  try {
    await emailTransporter.sendMail({
      from: `"Jack Barbershop" <${gmailEmailAddress}>`,
      to: adminEmail,
      subject: `✂️ Nueva Visita Registrada - ${clientName}`,
      html: emailTemplate,
    });
    sentCount++;
  } catch (error) {
    errors.push(`${adminEmail}: ${error.message}`);
  }
}
```

---

## ✨ Características

### ✅ Envío paralelo inteligente
- Envía a múltiples emails simultáneamente
- No espera a que uno termine para enviar al siguiente
- Más rápido y eficiente

### ✅ Manejo de errores robusto
- Si un email falla, los otros siguen enviando
- No interrumpe la creación de la visita
- Registra qué emails fallaron y por qué

### ✅ Logging detallado
- Ve exactamente cuántos emails se enviaron
- Identifica problemas rápidamente
- Útil para debugging

### ✅ Backwards compatible
- Sigue funcionando con un solo email
- No requiere cambios si usas un email único
- Flexible para agregar/quitar emails

---

## 📝 Próximos Pasos

### 1. Configura tus emails
```bash
firebase functions:config:set admin.emails='email1@gmail.com,email2@gmail.com'
```

### 2. Registra una visita
- Abre tu app
- Ve a Portal Público → Registro de Visita
- Completa el formulario
- Registra

### 3. Verifica los emails
- Todos los destinatarios deberían recibir el email
- Si no, revisa los logs: `firebase functions:log`

### 4. Monitorea los logs
```bash
firebase functions:log
```

---

## 🆘 Troubleshooting

### "No recibimos ningún email"
1. Verifica que los emails están bien configurados
2. Revisa carpeta SPAM
3. Consulta logs: `firebase functions:log`

### "Solo algunos emails reciben"
1. Verifica que todos los emails son válidos
2. Revisa logs para ver cuáles fallaron
3. Confirma que Gmail está configurado correctamente

### "Error: admin.emails no está configurado"
```bash
# Verifica la configuración actual
firebase functions:config:get

# Si no aparece admin.emails, configúralo:
firebase functions:config:set admin.emails='tu-email@gmail.com'
```

---

## 📋 Ver Configuración Actual

```bash
firebase functions:config:get
```

Deberías ver:
```json
{
  "admin": {
    "emails": "email1@gmail.com,email2@gmail.com"
  },
  "gmail": {
    "email": "tu-gmail@gmail.com",
    "password": "tu-app-password"
  }
}
```

---

## 🎯 Casos de Uso

### Barbershop pequeña (1 dueño)
```bash
firebase functions:config:set admin.emails='dueno@barbershop.com'
```

### Barbershop mediana (dueño + manager)
```bash
firebase functions:config:set admin.emails='dueno@barbershop.com,manager@barbershop.com'
```

### Barbershop grande (3+ admins)
```bash
firebase functions:config:set admin.emails='dueno@barbershop.com,manager1@barbershop.com,manager2@barbershop.com,receptionist@barbershop.com'
```

---

## 💡 Tips

1. **Agrega en orden**: Dueño, manager, otros
2. **Usa emails corporativos**: Si tienes, mejor que personales
3. **Revisa regularmente**: Verifica que la lista sea correcta
4. **Documenta**: Mantén un registro de quién recibe qué

---

## 📞 Soporte

Si necesitas:
- Cambiar la configuración: Usa `firebase functions:config:set`
- Ver logs: Usa `firebase functions:log`
- Firebase Console: https://console.firebase.google.com/project/jackbarbershop-app/functions

---

**Última actualización**: 2026-10-13
**Status**: ✅ Activo y funcionando
