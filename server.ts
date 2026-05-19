import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { createRemoteJWKSet, jwtVerify } from "jose";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const PORT = 3000;

// Cloudflare Access Configuration
const TEAM_DOMAIN = process.env.CLOUDFLARE_TEAM_DOMAIN; // e.g., 'your-team.cloudflareaccess.com'
const CERTS_URL = `https://${TEAM_DOMAIN}/cdn-cgi/access/certs`;
const AUDIENCE_TAG = process.env.CLOUDFLARE_AUD_TAG; // The Application Audience (AUD) tag

async function startServer() {
  const app = express();
  app.use(express.json());

  // JWKS Client for Cloudflare
  const JWKS = TEAM_DOMAIN ? createRemoteJWKSet(new URL(CERTS_URL)) : null;

  // Session Verification Endpoint
  app.get("/api/session", async (req, res) => {
    const jwt = req.headers["cf-access-jwt-assertion"] as string;

    // Optional: Get email directly from header injected by Cloudflare (if configured)
    const cfEmail = req.headers["cf-access-authenticated-user-email"] as string;

    if (!isProduction && !jwt) {
      // Development Mock
      return res.json({ 
        authenticated: true, 
        user: { email: "dev-user@example.com", name: "Dev Admin" },
        mock: true 
      });
    }

    if (!jwt) {
      return res.status(401).json({ 
        authenticated: false, 
        error: "Missing Access Token",
        logoutUrl: TEAM_DOMAIN ? `https://${TEAM_DOMAIN}/cdn-cgi/access/logout` : null
      });
    }

    try {
      if (!JWKS || !AUDIENCE_TAG) {
        throw new Error("Cloudflare Zero Trust not configured in environment (TEAM_DOMAIN or AUD_TAG missing)");
      }

      const { payload } = await jwtVerify(jwt, JWKS, {
        audience: AUDIENCE_TAG,
        issuer: `https://${TEAM_DOMAIN}`,
      });

      // restricted list logic (example)
      const approvedEmails = process.env.APPROVED_EMAILS?.split(',').map(e => e.trim()).filter(Boolean) || [];
      const userEmail = (payload.email as string) || cfEmail;

      if (!userEmail) {
        throw new Error("Could not determine user email from token or headers");
      }

      if (approvedEmails.length > 0 && !approvedEmails.includes(userEmail)) {
        return res.status(403).json({ 
          authenticated: false, 
          error: `Unauthorized: ${userEmail} is not in the approved list.`,
          logoutUrl: TEAM_DOMAIN ? `https://${TEAM_DOMAIN}/cdn-cgi/access/logout` : null
        });
      }

      res.json({ 
        authenticated: true, 
        user: { email: userEmail },
        logoutUrl: TEAM_DOMAIN ? `https://${TEAM_DOMAIN}/cdn-cgi/access/logout` : null
      });
    } catch (error: any) {
      console.error("JWT Verification failed:", error.message);
      res.status(401).json({ 
        authenticated: false, 
        error: "Invalid Access Token",
        logoutUrl: TEAM_DOMAIN ? `https://${TEAM_DOMAIN}/cdn-cgi/access/logout` : null
      });
    }
  });

  // Email Notification System logic
  app.post("/api/send-handover-email", async (req, res) => {
    const { handover } = req.body;
    
    if (!handover) {
      return res.status(400).json({ error: "No handover data provided" });
    }

    try {
      const emails = Array.isArray(handover.incomingEmail) ? handover.incomingEmail : [handover.incomingEmail];
      
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1e293b; color: white; padding: 24px;">
            <h1 style="margin: 0; font-size: 20px;">Operation Handover Report</h1>
            <p style="margin: 4px 0 0; opacity: 0.8;">${handover.projectName} - ${handover.location}</p>
          </div>
          <div style="padding: 24px; color: #334155;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
              <div>
                <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Outgoing Personnel</p>
                <p style="margin: 4px 0; font-weight: 600;">${handover.outgoingName}</p>
              </div>
              <div>
                <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Incoming Personnel</p>
                <p style="margin: 4px 0; font-weight: 600;">${handover.incomingName}</p>
              </div>
            </div>
            
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Status</p>
              <p style="margin: 4px 0; font-weight: 700; color: ${handover.status === 'urgent' ? '#dc2626' : '#2563eb'}; text-transform: capitalize;">
                ${handover.status}
              </p>
            </div>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Handover Notes</h2>
              <p style="white-space: pre-wrap; line-height: 1.6;">${handover.notes}</p>
            </div>

            <div>
              <h2 style="font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Action Items</h2>
              <div style="line-height: 1.6;">
                ${handover.actionItems.map((item: any) => `
                  <div style="margin-bottom: 12px; padding: 12px; background-color: #f8fafc; border-radius: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                      <strong style="font-size: 14px;">${item.task}</strong>
                      <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; background-color: white;">${item.status}</span>
                    </div>
                    ${item.remarks ? `<p style="margin: 8px 0 0; font-size: 12px; color: #64748b; font-style: italic;">Remarks: ${item.remarks}</p>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
            This is an automated notification from DrillSync5 Operation Management.
          </div>
        </div>
      `;

      /**
       * EMAIL NOTIFICATION SYSTEM
       */
      
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (smtpHost && smtpUser && smtpPass) {
        console.log(`[Email] Attempting to send via ${smtpHost}:${smtpPort}...`);
        
        const portNum = parseInt(smtpPort || "587");
        const isSecure = portNum === 465;

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: portNum,
          secure: isSecure, 
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          // For Gmail port 587, STARTTLS is used automatically if secure is false
          tls: {
            rejectUnauthorized: false
          }
        });

        await transporter.sendMail({
          from: `"DrillSync5 Ops" <${smtpUser}>`,
          to: emails.join(', '),
          subject: `Handover Report: ${handover.projectName} - ${handover.status.toUpperCase()}`,
          html: htmlContent,
        });

        console.log(`[Email] Handover report sent successfully to ${emails.join(', ')}`);
      } else {
        console.warn("[Email Mock] SMTP configuration missing. Logging email content instead.");
        console.log(`[Email Mock] To: ${emails.join(', ')}`);
        console.log(`[Email Mock] Subject: Handover Report: ${handover.projectName}`);
      }

      res.json({ 
        success: true, 
        message: smtpHost ? "Email sent successfully" : "Email logged to console (SMTP not configured)",
        isMock: !smtpHost
      });
    } catch (error: any) {
      console.error("Email error details:", error);
      res.status(500).json({ 
        error: "Failed to send email notification", 
        details: error.message || "Unknown error",
        tip: "If using Gmail, ensure you are using an 'App Password' (16 characters) and not your regular password. Verify SMTP_HOST is 'smtp.gmail.com' and SMTP_PORT is 587. Check if your hosting allows outbound mail."
      });
    }
  });

  // Serve static files / Vite middleware
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Mode: ${isProduction ? "production" : "development"}`);
  });
}

startServer();
