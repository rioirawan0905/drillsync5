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

    if (!isProduction && !jwt) {
      // Development Mock
      return res.json({ 
        authenticated: true, 
        user: { email: "dev-user@example.com", name: "Dev Admin" },
        mock: true 
      });
    }

    if (!jwt) {
      return res.status(401).json({ authenticated: false, error: "Missing Access Token" });
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
      const approvedEmails = process.env.APPROVED_EMAILS?.split(',') || [];
      const userEmail = payload.email as string;

      if (approvedEmails.length > 0 && !approvedEmails.includes(userEmail)) {
        return res.status(403).json({ 
          authenticated: false, 
          error: "Unauthorized: Email not in pre-approved list" 
        });
      }

      res.json({ authenticated: true, user: { email: userEmail } });
    } catch (error: any) {
      console.error("JWT Verification failed:", error.message);
      res.status(401).json({ authenticated: false, error: "Invalid Access Token" });
    }
  });

  // Email Notification System logic
  app.post("/api/send-handover-email", async (req, res) => {
    const { handover } = req.body;
    
    if (!handover) {
      return res.status(400).json({ error: "No handover data provided" });
    }

    try {
      /**
       * EMAIL NOTIFICATION SYSTEM
       * 
       * TO USE A REAL EMAIL SERVICE:
       * 1. If using Nodemailer directly (SMTP):
       *    - Uncomment the transporter configuration below.
       *    - Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS to your .env file.
       * 
       * 2. If using EmailJS, SendGrid, or Postmark:
       *    - Replace this block with their respective SDK calls.
       */
      
      /* Example Nodemailer Transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.example.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false, 
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      */

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
              <ul style="padding-left: 20px; line-height: 1.6;">
                ${handover.actionItems.map((item: string) => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
            This is an automated notification from ShiftBridge Operation Management.
          </div>
        </div>
      `;

      console.log(`[Email Mock] Sending handover email to ${handover.incomingEmail}`);
      // In a real implementation:
      // await transporter.sendMail({
      //   from: '"ShiftBridge Ops" <noreply@shiftbridge.com>',
      //   to: handover.incomingEmail,
      //   subject: `Handover Report: ${handover.projectName} - ${handover.status.toUpperCase()}`,
      //   html: htmlContent,
      // });

      res.json({ success: true, message: "Email simulation successful" });
    } catch (error) {
      console.error("Email error:", error);
      res.status(500).json({ error: "Failed to send email notification" });
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
