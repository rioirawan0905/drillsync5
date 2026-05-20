import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { createRemoteJWKSet, jwtVerify } from "jose";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const PORT = 3000;

// Initialize Firebase Admin using the provisioned config
const firebaseProject = firebaseConfig.projectId;
const firestoreDbId = firebaseConfig.firestoreDatabaseId;

console.log(`[Firebase] Initializing. Env Project: ${process.env.GOOGLE_CLOUD_PROJECT || 'unknown'}, Config Project: ${firebaseProject}, Database: ${firestoreDbId}`);

// Force project ID in environment for libraries that check it
if (firebaseProject) {
  process.env.GOOGLE_CLOUD_PROJECT = firebaseProject;
}

// Initialize Firebase Admin using a named app to avoid conflicts with potential ambient initialization
let firebaseApp: admin.app.App;

if (admin.apps.length === 0) {
  firebaseApp = admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
  console.log(`[Firebase] Default app initialized with ambient credentials`);
} else {
  firebaseApp = admin.app();
  console.log(`[Firebase] Using existing default app`);
}

const adminDb = getFirestore(firebaseApp, firestoreDbId);
console.log(`[Firebase] Firestore instance created for database: ${firestoreDbId} in project: ${firebaseProject}`);
const HANDOVERS_COLLECTION = "handovers";

// Cloudflare Access Configuration
const TEAM_DOMAIN = process.env.CLOUDFLARE_TEAM_DOMAIN;
const CERTS_URL = `https://${TEAM_DOMAIN}/cdn-cgi/access/certs`;
const AUDIENCE_TAG = process.env.CLOUDFLARE_AUD_TAG;

// Define custom user type for Express
interface AuthUser {
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // JWKS Client for Cloudflare
  const JWKS = TEAM_DOMAIN ? createRemoteJWKSet(new URL(CERTS_URL)) : null;

  // Middleware to verify Cloudflare Access on API routes
  const verifyAuth = async (req: Request, res: Response, next: NextFunction) => {
    const jwt = (req.headers["cf-access-jwt-assertion"] as string) || 
                (req.headers["Cf-Access-Jwt-Assertion"] as string);

    const cfEmail = (req.headers["cf-access-authenticated-user-email"] as string) ||
                    (req.headers["Cf-Access-Authenticated-User-Email"] as string);

    if (!isProduction && !jwt) {
      req.user = { email: process.env.USER_EMAIL || "admin@drillsync5.com" };
      return next();
    }

    if (!jwt) {
      // Mock for if cloudflare isn't configured but we are in prod (shouldn't happen with JWT enabled)
      if (!TEAM_DOMAIN || !AUDIENCE_TAG) {
        req.user = { email: "admin@drillsync5.com" };
        return next();
      }
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      if (!TEAM_DOMAIN || !AUDIENCE_TAG) {
        req.user = { email: "admin@drillsync5.com" };
        return next();
      }

      const { payload } = await jwtVerify(jwt, JWKS!, {
        audience: AUDIENCE_TAG,
        issuer: `https://${TEAM_DOMAIN}`,
      });

      const userEmail = (payload.email as string) || cfEmail;
      if (!userEmail) throw new Error("No user email in token");

      req.user = { email: userEmail };
      next();
    } catch (error) {
      console.error("[Auth Middleware] JWT failed:", error);
      res.status(401).json({ error: "Invalid session" });
    }
  };

  // Session Verification Endpoint
  app.get("/api/session", async (req, res) => {
    // Cloudflare Access headers are usually lowercase in Express
    const jwt = (req.headers["cf-access-jwt-assertion"] as string) || 
                (req.headers["Cf-Access-Jwt-Assertion"] as string);

    const cfEmail = (req.headers["cf-access-authenticated-user-email"] as string) ||
                    (req.headers["Cf-Access-Authenticated-User-Email"] as string);

    if (!isProduction && !jwt) {
      console.log("[Auth] Development mode: No JWT found, providing mock session.");
      return res.json({ 
        authenticated: true, 
        user: { 
          email: process.env.USER_EMAIL || "admin@drillsync5.com",
          name: "Ops Administrator" 
        },
        isMock: true 
      });
    }

    if (!jwt) {
      console.log("[Auth] No JWT assertion header found.");
      const isCloudflareConfigured = TEAM_DOMAIN && AUDIENCE_TAG && TEAM_DOMAIN !== "your-team.cloudflareaccess.com";
      
      if (!isCloudflareConfigured) {
        return res.json({ 
          authenticated: true, 
          user: { 
            email: process.env.USER_EMAIL || "admin@drillsync5.com",
            name: "Ops Administrator" 
          },
          isMock: true
        });
      }

      return res.status(401).json({ 
        authenticated: false, 
        error: "Session Expired",
        reason: "MISSING_JWT",
        logoutUrl: "/cdn-cgi/access/logout"
      });
    }

    try {
      if (!TEAM_DOMAIN || !AUDIENCE_TAG) {
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

      const userEmail = (payload.email as string) || cfEmail;

      if (!userEmail) {
        throw new Error("Could not determine user email");
      }

      const approvedEmails = process.env.APPROVED_EMAILS?.split(',').map(e => e.trim()).filter(Boolean) || [];
      if (approvedEmails.length > 0 && !approvedEmails.includes(userEmail)) {
        return res.status(403).json({ 
          authenticated: false, 
          error: "Unauthorized",
          reason: "EMAIL_NOT_APPROVED",
          userEmail,
          logoutUrl: "/cdn-cgi/access/logout"
        });
      }

      res.json({ 
        authenticated: true, 
        user: { email: userEmail },
        logoutUrl: "/cdn-cgi/access/logout"
      });
    } catch (error: any) {
      console.error("[Auth] JWT Verification failed:", error.message);
      res.status(401).json({ 
        authenticated: false, 
        error: "Session Invalid",
        reason: "INVALID_JWT",
        details: error.message,
        logoutUrl: "/cdn-cgi/access/logout"
      });
    }
  });

  // Handover API Routes
  app.get("/api/handovers", verifyAuth, async (req, res) => {
    try {
      console.log(`[API] Fetching handovers from ${HANDOVERS_COLLECTION}...`);
      const snapshot = await adminDb.collection(HANDOVERS_COLLECTION)
        .orderBy("timestamp", "desc")
        .get();
      
      const handovers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`[API] Successfully fetched ${handovers.length} handovers.`);
      res.json(handovers);
    } catch (error: any) {
      console.error("[API] Get handovers failed. Firebase Config:", {
        project: firebaseProject,
        database: firestoreDbId,
        ambientProject: process.env.GOOGLE_CLOUD_PROJECT
      });
      console.error("[API] Error details:", error);
      res.status(500).json({ 
        error: "Failed to fetch records from database",
        details: error.message,
        code: error.code,
        metadata: {
          project: firebaseProject,
          database: firestoreDbId
        }
      });
    }
  });

  app.post("/api/handovers", verifyAuth, async (req, res) => {
    const { handover } = req.body;
    if (!handover || !handover.id) {
      return res.status(400).json({ error: "Invalid handover data" });
    }

    try {
      const userEmail = req.user?.email || "unknown";
      
      // Ensure ownerEmail matches the currently authenticated Cloudflare user
      const finalHandover = {
        ...handover,
        ownerEmail: userEmail,
        updatedAt: new Date().toISOString()
      };

      await adminDb.collection(HANDOVERS_COLLECTION).doc(handover.id).set(finalHandover, { merge: true });
      
      res.json({ success: true, id: handover.id });
    } catch (error: any) {
      console.error("[API] Save handover failed:", error);
      res.status(500).json({ 
        error: "Failed to save record to database",
        details: error.message,
        code: error.code
      });
    }
  });

  app.delete("/api/handovers/:id", verifyAuth, async (req, res) => {
    const { id } = req.params;
    try {
      // For security, we could check ownership here, but allowing all authenticated Zero Trust users to manage records for now
      await adminDb.collection(HANDOVERS_COLLECTION).doc(id).delete();
      res.json({ success: true });
    } catch (error: any) {
      console.error("[API] Delete handover failed:", error);
      res.status(500).json({ error: "Failed to delete record" });
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

      console.log(`[Email] Config: Host=${smtpHost}, Port=${smtpPort}, User=${smtpUser ? 'SET' : 'MISSING'}`);

      if (smtpUser && smtpPass) {
        console.log(`[Email] Starting SMTP transport via ${smtpHost}:${smtpPort}... (User: ${smtpUser})`);
        
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
            // Gmail and many others need these specific adjustments
            minVersion: 'TLSv1.2',
            rejectUnauthorized: false
          },
          connectionTimeout: 10000, // 10 seconds
          greetingTimeout: 10000,
        });

        // Verify connection configuration
        try {
          await transporter.verify();
          console.log("[Email] SMTP connection verified.");
        } catch (verifyError: any) {
          console.error("[Email] SMTP Verification failed:", verifyError);
          throw new Error(`SMTP connection failed: ${verifyError.message}`);
        }

        console.log(`[Email] Sending mail to: ${emails.join(', ')}`);
        await transporter.sendMail({
          from: `"DrillSync5 Ops" <${smtpUser}>`,
          to: emails.join(', '),
          replyTo: handover.ownerEmail || handover.outgoingEmail,
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
