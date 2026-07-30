# cPanel Deployment Guide

This application is a Next.js server-rendered app. It must run on a hosting plan that supports Node.js applications in cPanel. If your cPanel account only supports PHP hosting, this app will not run there unless you move it to a VPS or a provider that supports Node.js.

## 1. Confirm hosting support

Your cPanel account must provide:

- Node.js application support
- Node.js 20 or newer
- The ability to set environment variables
- Outbound access to MongoDB Atlas, Shopify, and Razorpay if you use those integrations

If any of these are missing, stop here and confirm with your host first.

## 2. Prepare the app locally

From the `ecommerce` folder:

```bash
npm install
npm run build
npm run package:cpanel
```

The build generates a standalone Node server at:

- `.next/standalone/server.js`

The packaging step also creates a ready-to-upload archive at:

- `dist/cpanel-deploy.zip`

## 3. Upload the deployment files

Upload the contents needed to run the standalone build into your cPanel application directory.

Recommended approach:

1. Upload `dist/cpanel-deploy.zip` to the cPanel application root.
2. Extract it there.

Required items:

- Everything inside `.next/standalone/`
- The entire `.next/static/` folder
- The entire `public/` folder

Recommended final structure inside the cPanel app directory:

```text
app-root/
  server.js
  .next/
    static/
  public/
  package.json
```

Notes:

- The `server.js` file comes from `.next/standalone/server.js`.
- The standalone folder already contains the traced production dependencies needed by Next.js.
- If you upload the whole `.next/standalone/` folder, keep its internal folder structure unchanged.

## 4. Create the Node.js app in cPanel

In cPanel:

1. Open `Setup Node.js App`.
2. Create a new application.
3. Choose a Node.js version compatible with this app, preferably `20.x` or newer.
4. Set the application root to the folder where you uploaded the standalone files.
5. Set the application URL or subdomain.
6. Set the application startup file to `server.js`.

If cPanel asks for an application mode, use `production`.

## 5. Configure environment variables

Set these values in cPanel for the Node.js app.

Required for this project:

- `NODE_ENV=production`
- `PORT` as provided by cPanel, if required by your host
- `GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `MONGODB_FEEDBACK_COLLECTION`
- `MONGODB_NEWSLETTER_COLLECTION`
- `FEEDBACK_ADMIN_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

Required for order confirmation emails (via Resend):

- `RESEND_API_KEY`
- `ORDER_EMAIL_FROM` — the `from` address for order emails, e.g. `Firaang <orders@firaang.com>`

Optional if you use Shopify homepage data:

- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- `SHOPIFY_API_VERSION`

Use `.env.example` as the source template for values.

## 6. Install dependencies only if your host requires it

Many cPanel setups automatically run `npm install`, but the standalone build usually does not need a full install in production because traced dependencies are already included.

If your host insists on installing dependencies from `package.json`, upload the project `package.json` too.

## 7. Restart and test

After saving the app settings:

1. Restart the Node.js app in cPanel.
2. Open the site URL.
3. Verify these routes:

- `/`
- `/shop`
- `/admin/feedback`
- `/admin/newsletter`
- `/api/feedback/health` with the `x-admin-key` header

Also test checkout if Razorpay is enabled.

## 8. Updating the deployment

For each new release:

1. Run `npm run build` locally.
2. Run `npm run package:cpanel` locally.
3. Upload the new `dist/cpanel-deploy.zip`.
4. Extract and replace the deployed files.
5. Restart the app in cPanel.

## Common issues

### Blank page or missing assets

Usually `.next/static/` was not uploaded into the deployed `.next/` folder.

### Server crashes on startup

Usually one of these is missing:

- `MONGODB_URI`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

Check the cPanel Node.js app logs.

### MongoDB connection fails

Make sure MongoDB Atlas allows inbound connections from your hosting provider's IP address.

### cPanel does not offer Node.js apps

That hosting plan cannot run this project as-is. Your options are:

1. Move to a cPanel plan with Node.js support.
2. Deploy on a VPS.
3. Deploy on a platform built for Next.js such as Vercel, Netlify, or Railway.