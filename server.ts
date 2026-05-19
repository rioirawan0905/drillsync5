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
      // If not behind Cloudflare and not configured (or in preview), allow demo access or show simple restrictive message
      const isCloudflareConfigured = TEAM_DOMAIN && AUDIENCE_TAG && TEAM_DOMAIN !== "your-team.cloudflareaccess.com";
      
      if (!isCloudflareConfigured) {
        return res.json({ 
          authenticated: true, 
          user: { 
            email: process.env.USER_EMAIL || "admin@drillsync5.com",
            name: "Ops Administrator" 
          },
          isMock: true,
          teamDomain: TEAM_DOMAIN || "drillsync5.cloudflareaccess.com"
        });
      }

      return res.status(401).json({ 
        authenticated: false, 
        error: "Session Expired",
        reason: "MISSING_JWT",
        logoutUrl: `https://${TEAM_DOMAIN}/cdn-cgi/access/logout`,
        teamDomain: TEAM_DOMAIN
      });
    }

    try {
      if (!TEAM_DOMAIN || !AUDIENCE_TAG) {
        // Fallback for when Cloudflare is not yet configured, allowing the user to at least enter the app
        console.warn("[Auth] Cloudflare Zero Trust not configured. Using simplified auth.");
        return res.json({ 
          authenticated: true, 
          user: { email: "admin@drillsync5.com" },
          isMock: true,
          error: "Cloudflare Zero Trust not configured."
        });
      }

      const { payload } = await jwtVerify(jwt, JWKS!, {
        audience: AUDIENCE_TAG,
        issuer: `https://${TEAM_DOMAIN}`,
      });

      // restricted list logic (example)
      const approvedEmails = process.env.APPROVED_EMAILS?.split(',').map(e => e.trim()).filter(Boolean) || [];
      const userEmail = (payload.email as string) || cfEmail;

      if (!userEmail) {
        throw new Error("Could not determine user email");
      }

      if (approvedEmails.length > 0 && !approvedEmails.includes(userEmail)) {
        return res.status(403).json({ 
          authenticated: false, 
          error: "Unauthorized",
          reason: "EMAIL_NOT_APPROVED",
          userEmail,
          logoutUrl: `https://${TEAM_DOMAIN}/cdn-cgi/access/logout`
        });
      }

      res.json({ 
        authenticated: true, 
        user: { email: userEmail },
        teamDomain: TEAM_DOMAIN,
        logoutUrl: `https://${TEAM_DOMAIN}/cdn-cgi/access/logout`
      });
    } catch (error: any) {
      console.error("JWT Verification failed:", error.message);
      res.status(401).json({ 
        authenticated: false, 
        error: "Session Invalid",
        reason: "INVALID_JWT",
        details: error.message,
        teamDomain: TEAM_DOMAIN,
        logoutUrl: `https://${TEAM_DOMAIN}/cdn-cgi/access/logout`
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

      const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
      const smtpPort = process.env.SMTP_PORT || '587';
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (smtpUser && smtpPass) {
        console.log(`[Email] Starting SMTP transport via ${smtpHost}:${smtpPort}...`);
        
        const portNum = parseInt(smtpPort);
        const isSecure = portNum === 465;

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: portNum,
          secure: isSecure, 
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            // Gmail specific adjustments
            minVersion: 'TLSv1.2',
            rejectUnauthorized: false
          }
        });

        console.log(`[Email] Sending mail to: ${emails.join(', ')}`);
        await transporter.sendMail({
          from: `"DrillSync5 Ops" <${smtpUser}>`,
          to: emails.join(', '),
          replyTo: handover.outgoingEmail,
          subject: `Handover Report: ${handover.projectName} - ${handover.status.toUpperCase()}`,
          html: htmlContent,
        });

        console.log(`[Email] Handover report sent successfully.`);
      } else {
        console.warn("[Email Mock] SMTP_USER or SMTP_PASS missing. SMTP settings:", { host: smtpHost, port: smtpPort, user: !!smtpUser, pass: !!smtpPass });
        console.log(`[Email Mock] To: ${emails.join(', ')}`);
      }

      return res.json({ 
        success: true, 
        message: (smtpUser && smtpPass) ? "Email sent successfully" : "Email logged to console (SMTP not configured)",
        isMock: !(smtpUser && smtpPass)
      });
    } catch (error: any) {
      console.error("Email error details:", error);
      res.status(500).json({ 
        error: "Failed to send email notification", 
        details: error.message || "Unknown error",
        tip: "If using Gmail: 1. Use an 'App Password' (16 chars). 2. Ensure 'Less secure app access' is not expected (App Password replaces this). 3. Host might be blocking port 587/465."
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
