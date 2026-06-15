# MongoDB Setup Guide (From Scratch)

This guide is tailored to this project and fixes production errors like: "Could not subscribe right now".

## 1) Is MongoDB free or paid?

- You can start free using MongoDB Atlas M0 (shared cluster).
- Free tier is enough for low to moderate traffic and development.
- You only need paid plans when you need more storage, performance, backups, or strict production SLAs.

## 2) Create MongoDB Atlas from scratch

1. Create an account at MongoDB Atlas.
2. Create a Project (example: Firaang).
3. Create a Cluster using the free tier (M0).
4. Create a Database User:
   - Username: choose a dedicated app user (example: Firaang_app)
   - Password: strong password
   - Role: Read and write to any database (or least privilege for your db)
5. Configure Network Access:
   - For cPanel shared hosting, start with: 0.0.0.0/0 (Allow from anywhere)
   - Restrict later when possible.
6. In Atlas, click Connect -> Drivers -> Node.js and copy the connection string.

Example URI format:

mongodb+srv://<username>:<password>@<cluster-host>/?retryWrites=true&w=majority

## 3) Environment variables required by this app

Set these in your deployment environment (cPanel Node.js app env vars):

- MONGODB_URI
- MONGODB_DB_NAME=firaangi
- MONGODB_FEEDBACK_COLLECTION=feedback
- MONGODB_NEWSLETTER_COLLECTION=newsletter_subscribers
- FEEDBACK_ADMIN_KEY=<strong-random-secret>

Important:
- Do not wrap values in quotes.
- URL-encode special characters in DB password (for example @, #, %, /).
- Restart the Node.js app after saving env vars.

## 4) Database and collection design used by this project

Database name:
- Firaang (or value from MONGODB_DB_NAME)

Collections:

1. feedback
- name: string (optional)
- email: string (optional)
- message: string (required)
- submittedAt: date (required)

2. newsletter_subscribers
- email: string (required, normalized lowercase)
- subscribedAt: date (required)

## 5) Required indexes

The app auto-creates these indexes at runtime, but you can create them manually once:

Use mongosh and run:

use Firaang

db.feedback.createIndex(
  { submittedAt: -1 },
  { name: "feedback_submittedAt_desc" }
)

db.newsletter_subscribers.createIndex(
  { email: 1 },
  { name: "newsletter_email_unique", unique: true }
)

## 6) Quick verification checklist (production)

1. Build succeeds:
- npm run build

2. Health endpoint (feedback + mongo ping):
- GET /api/feedback/health
- Header: x-admin-key = FEEDBACK_ADMIN_KEY

3. Newsletter subscribe test:
- POST /api/newsletter
- Body: { "email": "you@example.com" }

Expected result:
- First time: { "ok": true, "duplicate": false }
- Re-submit same email: { "ok": true, "duplicate": true }

## 7) Why "Could not subscribe right now" happens

Most common causes:
- MONGODB_URI missing or invalid.
- DB password contains special character but is not URL-encoded.
- Atlas network access does not allow your hosting IP.
- MongoDB user does not have proper permissions.
- Environment variables were changed but Node app was not restarted.

## 8) cPanel-specific notes

- Set environment variables in cPanel Node.js application settings (not only .env file uploads).
- Restart application after env update.
- Check application logs in cPanel for connection/auth errors.

## 9) Optional hardening for later

- Restrict Atlas network allowlist from 0.0.0.0/0 to specific IP ranges.
- Create least-privilege DB role for this app.
- Rotate database user password periodically.
