# DrillSync5 - Handover Management System

## Overview
DrillSync5 is a specialized handover management platform for drilling operations (MLN Phase 5). It enables personnel to record shift activities, track pending actions, and automatically notify incoming staff via email.

## Key Features
- **Smart Handover Dashboard**: Real-time metrics on urgent issues and personnel activity.
- **Editable Records**: Modify existing handovers and resend notifications.
- **Zero Trust Integration**: Seamlessly integrates with **Cloudflare Access** for secure, SSO-based authentication.
- **Automated Email Reports**: Professional HTML handover reports sent via SMTP.

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Motion, Recharts.
- **Backend**: Express (Node.js), Nodemailer, Jose (JWT verification).
- **Deployment**: Optimized for Cloud Run/Node.js environments.

## Deployment & Production
### 1. GitHub Integration
This project includes a GitHub Action in `.github/workflows/verify.yml` that lints and builds the code on every push to `main`.

### 2. Cloudflare Zero Trust
Follow the instructions in `CLOUDFLARE_GUIDE.md` to set up Cloudflare Access.
- Set `CLOUDFLARE_TEAM_DOMAIN` and `CLOUDFLARE_AUD_TAG` in your environment variables.
- The server will automatically verify JWT assertions from Cloudflare.

### 3. SMTP Email Setup
Configure the following environment variables to enable real email notifications:
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_PORT` (defaults to 587)

## Local Development
```bash
npm install
npm run dev
```
Open `http://localhost:3000` to preview the app. In development, authentication is automatically mocked.

## Build for Production
```bash
npm run build
npm start
```
The build process bundles the server into `dist/server.cjs` for zero-dependency execution in production containers.
