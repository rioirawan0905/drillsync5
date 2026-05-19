# Cloudflare Zero Trust Implementation Guide

DrillSync5 is designed to work with **Cloudflare Access** (part of Zero Trust) to ensure that only pre-approved personnel can access the operations dashboard.

## 1. Cloudflare Dashboard Setup
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Zero Trust** in the sidebar.
3. Go to **Access > Applications**.
4. Click **Add an Application** and select **Self-hosted**.

## 2. Application Configuration
- **Application Name**: DrillSync5 Ops
- **Application Domain**: Your hosted URL (e.g., `drillsync5.yourcompany.com`)
- **Session Duration**: Select a duration (e.g., 24 hours).

## 3. Policy Configuration (Restricting Emails)
1. Create a new Policy (e.g., "Allow Operations Team").
2. Under **Rules**, set:
   - **Include**: Emails (Add the specific list of emails provided in the constants).
   - **Action**: Allow.
3. Save the Policy.

## 4. Hooking up the Application
1. Once saved, Cloudflare will provide an **AUD (Audience) Tag**.
2. Go to your environment variables (.env) and set:
   - `CLOUDFLARE_TEAM_DOMAIN`: `your-team-name.cloudflareaccess.com`
   - `CLOUDFLARE_AUD_TAG`: The AUD tag you just copied.
   - `APPROVED_EMAILS`: (Optional) If you want an extra layer of verification in the backend code.

## 5. How it Works
- When a user visits the app, Cloudflare intercepts the request.
- If not logged in, they are redirected to your organization's SSO or Cloudflare login page.
- After login, Cloudflare adds a `Cf-Access-Jwt-Assertion` header to all requests.
- Our Node.js server (`server.ts`) verifies this JWT using Cloudflare's public certificates.
- If valid, the user is granted access to the Handover Operations Center.

## 6. SMTP Email Troubleshooting (Gmail)
If emails are failing to send via DrillSync5 even with valid SMTP credentials, check the following:
- **App Password**: Gmail requires an **App Password** (16 characters) if you have 2FA enabled. Your regular Gmail password will NOT work.
  - Go to Google Account -> Security -> 2-Step Verification -> App Passwords.
  - Generate a password for "Mail" on "Other (Custom Name: DrillSync5)".
- **SMTP Configuration**:
  - `SMTP_HOST`: `smtp.gmail.com`
  - `SMTP_PORT`: `587`
  - `SMTP_USER`: Your full Gmail address.
  - `SMTP_PASS`: The 16-character App Password (no spaces).
- **Firewall**: Ensure your hosting environment (e.g. Cloud Run) allows outbound connections on port 587.
