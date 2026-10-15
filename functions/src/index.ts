import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";

// Inicializar Firebase Admin
admin.initializeApp();

// Crear transporter lazy (se inicializa con config de Firebase)
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const config = functions.config();
    const email = config.gmail?.email;
    const password = config.gmail?.password;

    if (!email || !password) {
      throw new Error(
        "Gmail credentials not configured. Run: firebase functions:config:set"
      );
    }

    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: email,
        pass: password,
      },
    });
  }
  return transporter;
}

/**
 * Obtiene la lista de emails admins desde la configuración
 * Soporta múltiples emails separados por comas
 */
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

/**
 * Cloud Function: Enviar email cuando se registra una nueva visita
 * Se dispara automáticamente cuando se crea un documento en la colección "visits"
 */
export const onVisitCreated = functions
  .region("us-central1")
  .firestore.document("visits/{visitId}")
  .onCreate(async (snap, context) => {
    try {
      const visitData = snap.data();
      const visitId = context.params.visitId;

      console.log(`📝 Nueva visita registrada: ${visitId}`);

      // Obtener datos de la visita
      const {
        clientName,
        clientPhone,
        service,
        barberName,
        servicePerformed,
        recommendations,
        visitDate,
      } = visitData;

      // Obtener lista de emails admins
      const adminEmails = getAdminEmails();
      const gmailEmailAddress = functions.config().gmail?.email;

      // Crear template HTML del email
      const emailTemplate = generateEmailTemplate({
        visitId,
        clientName,
        clientPhone,
        service,
        barberName,
        servicePerformed,
        recommendations,
        visitDate,
      });

      // Obtener transporter y enviar a cada admin
      const emailTransporter = getTransporter();
      let sentCount = 0;
      const errors: string[] = [];

      for (const adminEmail of adminEmails) {
        try {
          // Preparar opciones de email
          const mailOptions = {
            from: `"Jack Barbershop" <${gmailEmailAddress}>`,
            to: adminEmail,
            subject: `✂️ Nueva Visita Registrada - ${clientName}`,
            html: emailTemplate,
            text: `Nueva visita de ${clientName} (${clientPhone}) registrada exitosamente.`,
          };

          const info = await emailTransporter.sendMail(mailOptions);
          console.log(`✅ Email enviado a ${adminEmail}: ${info.messageId}`);
          sentCount++;
        } catch (error: any) {
          errors.push(`${adminEmail}: ${error.message}`);
          console.error(`❌ Error enviando email a ${adminEmail}:`, error.message);
        }
      }

      console.log(`📧 Emails enviados: ${sentCount}/${adminEmails.length}`);

      return {
        success: sentCount > 0,
        sentCount,
        totalEmails: adminEmails.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      console.error("❌ Error procesando visita:", error.message);
      return { success: false, error: error.message };
    }
  });

/**
 * Cloud Function: Enviar email cuando se aprueba una visita
 * Se dispara cuando el estado de la visita cambia a "Aprobado"
 */
export const onVisitApproved = functions
  .region("us-central1")
  .firestore.document("visits/{visitId}")
  .onUpdate(async (change, context) => {
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();

      // Solo procesar si el estado cambió a "Aprobado"
      if (beforeData.status !== "Aprobado" && afterData.status === "Aprobado") {
        console.log(`✅ Visita aprobada: ${context.params.visitId}`);

        const { clientName, clientPhone, approvedAt } = afterData;
        
        // Obtener lista de emails admins
        const adminEmails = getAdminEmails();
        const gmailEmailAddress = functions.config().gmail?.email;

        // Obtener transporter y enviar a cada admin
        const emailTransporter = getTransporter();
        let sentCount = 0;
        const errors: string[] = [];

        for (const adminEmail of adminEmails) {
          try {
            const mailOptions = {
              from: `"Jack Barbershop" <${gmailEmailAddress}>`,
              to: adminEmail,
              subject: `✅ Visita Aprobada - ${clientName}`,
              html: generateApprovalEmailTemplate({
                clientName,
                clientPhone,
                approvedAt,
                visitId: context.params.visitId,
              }),
              text: `La visita de ${clientName} ha sido aprobada.`,
            };

            const info = await emailTransporter.sendMail(mailOptions);
            console.log(`✅ Email de aprobación enviado a ${adminEmail}: ${info.messageId}`);
            sentCount++;
          } catch (error: any) {
            errors.push(`${adminEmail}: ${error.message}`);
            console.error(`❌ Error enviando email de aprobación a ${adminEmail}:`, error.message);
          }
        }

        console.log(`📧 Emails de aprobación enviados: ${sentCount}/${adminEmails.length}`);

        return {
          success: sentCount > 0,
          sentCount,
          totalEmails: adminEmails.length,
          errors: errors.length > 0 ? errors : undefined,
        };
      }

      return { success: true, message: "No action needed" };
    } catch (error: any) {
      console.error("❌ Error procesando aprobación:", error.message);
      return { success: false, error: error.message };
    }
  });

/**
 * Genera el template HTML para el email de nueva visita
 */
function generateEmailTemplate(visitData: any): string {
  const {
    visitId,
    clientName,
    clientPhone,
    service,
    barberName,
    servicePerformed,
    recommendations,
    visitDate,
  } = visitData;

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    const d =
      date instanceof Date ? date : new Date(date.toDate?.() || date);
    return d.toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Arial', sans-serif;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .content {
          padding: 30px;
        }
        .alert {
          background-color: #d4edda;
          border-left: 4px solid #28a745;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 4px;
          color: #155724;
        }
        .info-section {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e0e0e0;
        }
        .info-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .info-row {
          display: flex;
          margin-bottom: 10px;
        }
        .info-label {
          font-weight: 600;
          color: #333;
          width: 150px;
        }
        .info-value {
          color: #666;
          flex: 1;
        }
        .badge {
          display: inline-block;
          background-color: #e7f3ff;
          color: #0056b3;
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-right: 5px;
          border: 1px solid #b8daff;
        }
        .badge.barber {
          background-color: #f0e6ff;
          color: #6f42c1;
          border-color: #d7c5f0;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💇 Nueva Visita Registrada</h1>
          <p>Sistema de Fidelización Jack Barbershop</p>
        </div>

        <div class="content">
          <div class="alert">
            ✅ Una nueva visita ha sido registrada en el sistema
          </div>

          <div class="info-section">
            <h2 style="color: #333; margin-top: 0;">Información del Cliente</h2>
            <div class="info-row">
              <span class="info-label">👤 Nombre:</span>
              <span class="info-value"><strong>${clientName}</strong></span>
            </div>
            <div class="info-row">
              <span class="info-label">📱 Teléfono:</span>
              <span class="info-value"><strong>${clientPhone}</strong></span>
            </div>
            <div class="info-row">
              <span class="info-label">🆔 ID Visita:</span>
              <span class="info-value"><code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${visitId}</code></span>
            </div>
          </div>

          <div class="info-section">
            <h2 style="color: #333; margin-top: 0;">Detalles del Servicio</h2>
            <div class="info-row">
              <span class="info-label">✂️ Corte:</span>
              <span class="info-value"><strong>${servicePerformed}</strong></span>
            </div>
            ${service ? `
            <div class="info-row">
              <span class="info-label">📦 Paquete:</span>
              <span class="info-value"><span class="badge">${service}</span></span>
            </div>
            ` : ""}
            ${barberName ? `
            <div class="info-row">
              <span class="info-label">💈 Barbero:</span>
              <span class="info-value"><span class="badge barber">${barberName}</span></span>
            </div>
            ` : ""}
            <div class="info-row">
              <span class="info-label">📅 Fecha:</span>
              <span class="info-value"><strong>${formatDate(visitDate)}</strong></span>
            </div>
            ${recommendations ? `
            <div class="info-row">
              <span class="info-label">💡 Recomendaciones:</span>
              <span class="info-value"><em>${recommendations}</em></span>
            </div>
            ` : ""}
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; margin-bottom: 20px;">
              Esta visita está pendiente de aprobación en el panel administrativo.
            </p>
          </div>
        </div>

        <div class="footer">
          <p>💇 Jack Barbershop - Sistema de Fidelización</p>
          <p>© 2024 Todos los derechos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Genera el template HTML para el email de aprobación
 */
function generateApprovalEmailTemplate(data: any): string {
  const { clientName, clientPhone, approvedAt, visitId } = data;

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    const d =
      date instanceof Date ? date : new Date(date.toDate?.() || date);
    return d.toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Arial', sans-serif;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .content {
          padding: 30px;
        }
        .alert {
          background-color: #d4edda;
          border-left: 4px solid #28a745;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 4px;
          color: #155724;
        }
        .info-row {
          display: flex;
          margin-bottom: 10px;
        }
        .info-label {
          font-weight: 600;
          color: #333;
          width: 150px;
        }
        .info-value {
          color: #666;
          flex: 1;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Visita Aprobada</h1>
        </div>

        <div class="content">
          <div class="alert">
            ✅ La visita de ${clientName} ha sido aprobada exitosamente
          </div>

          <div class="info-row">
            <span class="info-label">👤 Cliente:</span>
            <span class="info-value"><strong>${clientName}</strong></span>
          </div>
          <div class="info-row">
            <span class="info-label">📱 Teléfono:</span>
            <span class="info-value"><strong>${clientPhone}</strong></span>
          </div>
          <div class="info-row">
            <span class="info-label">🆔 ID Visita:</span>
            <span class="info-value"><code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${visitId}</code></span>
          </div>
          <div class="info-row">
            <span class="info-label">✅ Aprobado:</span>
            <span class="info-value"><strong>${formatDate(approvedAt)}</strong></span>
          </div>
        </div>

        <div class="footer">
          <p>💇 Jack Barbershop - Sistema de Fidelización</p>
          <p>© 2024 Todos los derechos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
