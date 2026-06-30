# Supabase Dashboard Configuration Guide — Block 4 Auth

> ## 🔴 EXECUTION GATE — DO NOT RUN THIS GUIDE YET
>
> **`READY_TO_EXECUTE: false`**
>
> This guide is the **end-state deployment runbook** for the Block 4 production smoke test,
> not a list of tasks for today. Most items depend on work that does not exist yet (a design
> decision, a deployed Railway service, a live Vercel domain).
>
> **Do not start until every row in the readiness table below reads `true`.** Claude keeps
> this table in sync as the change progresses and flips `READY_TO_EXECUTE` to `true` once all
> rows are ready — that flip is your signal to run the checklist in Section 8.

### Readiness table

| # | Item | Scope | Unblocks when… | Ready |
|---|------|-------|----------------|-------|
| 0 | Domain + Cloudflare DNS | HOSTED | Domain purchased + DNS configured | `false` |
| 1 | Local ES256 signing keys | LOCAL | Handled inside `sdd-apply` (jwt-auth slice) | `false` |
| 2 | Redirect URL allow-list | HOSTED | Frontend deployed → real Vercel domain exists | `false` |
| 3 | Confirm email enabled | HOSTED | Already verified ON (2026-06-29) | `true` |
| 4 | Email templates (token_hash) | HOSTED | `sdd-design` locked verifyOtp + token_hash (decision #2, 2026-06-29) | `true` |
| 5 | Custom SMTP | HOSTED | Before real user traffic (not required for smoke test) | `false` |
| 6 | Railway backend env vars | HOSTED | Backend implemented + deployed to Railway | `false` |
| 7 | Vercel frontend env vars | HOSTED | Frontend deployed + Railway URL known | `false` |

When all rows read `true`, this guide is safe to execute end-to-end.

---

Each item is tagged with scope: **[LOCAL]** / **[HOSTED]** / **[BOTH]**, and whether it
must be done before the smoke test passes: **[REQUIRED]** / **[RECOMMENDED]**.

---

## 0. Domain + Cloudflare DNS Setup

**[HOSTED] [REQUIRED — FIRST STEP]**

> **This is the FIRST dependency** because domain purchase and DNS propagation take time.
> Complete this before other deployment tasks to avoid blocking the smoke test.

### Steps

1. **Purchase a domain** (e.g., `lazylands.app`, `lazylands.io`, or your preferred TLD)
   - Recommended registrars: Cloudflare Registrar, Namecheap, Google Domains
   - `.app` domains require HTTPS (enforced by HSTS preload list)

2. **Add domain to Cloudflare** (if not using Cloudflare Registrar)
   - Create a Cloudflare account if needed
   - Add your domain and follow the nameserver change instructions
   - Wait for nameserver propagation (can take up to 24-48 hours)

3. **Configure DNS records in Cloudflare**

   | Type | Name | Content | Proxy status | Notes |
   |------|------|---------|--------------|-------|
   | CNAME | `www` | `<your-project>.vercel.app` | DNS only (gray cloud) | Vercel handles SSL |
   | CNAME | `scribe` | `<your-service>.railway.app` | DNS only (gray cloud) | Railway handles SSL |

   > **Why "DNS only" (gray cloud)?** Vercel and Railway provide their own SSL certificates
   > and CDN. Enabling Cloudflare's proxy (orange cloud) can cause certificate conflicts.
   > Use DNS-only unless you specifically need Cloudflare's WAF or caching rules.

4. **Configure custom domain in Vercel**
   - Go to: Vercel → Your Project → Settings → Domains
   - Add `<your-domain>` (apex) or `app.<your-domain>` if you prefer a subdomain
   - Vercel will verify DNS and provision SSL automatically

5. **Configure custom domain in Railway**
   - Go to: Railway → Your Service → Settings → Domains
   - Add `scribe.<your-domain>`
   - Railway will provision SSL automatically

6. **Update environment variables** (see Sections 6 and 7)
   - `API_CORS_ORIGINS` in Railway must include the frontend origin
   - `NEXT_PUBLIC_APP_URL` in Vercel must be `https://<your-domain>` (or `https://app.<your-domain>`)
   - `NEXT_PUBLIC_API_URL` in Vercel must be `https://scribe.<your-domain>`

### Verification

After DNS propagation (usually 5-30 minutes with Cloudflare):

```bash
# Check frontend
curl -I https://<your-domain>
# Expected: HTTP 200, valid SSL certificate

# Check backend
curl -I https://scribe.<your-domain>/health
# Expected: HTTP 200, valid SSL certificate
```

---

## 1. JWT Signing Keys — Local ES256 Setup

**[LOCAL] [REQUIRED]**

Local Supabase uses a legacy HS256 key by default. The backend validates ES256 (asymmetric).
These MUST match or local tokens will fail validation and tests will produce false results.

### Steps

1. Confirm `signing_keys_path` is set in `supabase/config.toml`:

   ```toml
   signing_keys_path = "./signing_keys.json"
   ```

2. Generate a signing key file using the Supabase CLI (command verified against the official
   Supabase CLI docs via Context7 on 2026-06-29):

   ```bash
   supabase gen signing-key --algorithm ES256
   ```

   > `ES256` is the default and recommended algorithm (`RS256` is also supported). The CLI
   > writes the file configured by `signing_keys_path` in `supabase/config.toml`; do not
   > redirect stdout. Pass `--append` to add a key to an existing keys file instead of
   > overwriting.

3. The generated file is a JSON object containing a `keys` array of JWK objects. Example shape
   (values are illustrative — use the actual generated file):

   ```json
   {
     "keys": [
       {
         "kty": "EC",
         "alg": "ES256",
         "use": "sig",
         "kid": "<generated-kid>",
         "crv": "P-256",
         "x": "<base64url>",
         "y": "<base64url>",
         "d": "<private-key-base64url>"
       }
     ]
   }
   ```

4. Keep the configured file out of source control. **Never commit the signing keys file.**
   Recommended path: `supabase/signing_keys.json` with `supabase/signing_keys.json` in `.gitignore`.

5. Restart the local Supabase stack: `supabase stop && supabase start`.

### Verification

After restart, the JWKS endpoint MUST return an ES256 public key:

```bash
curl http://127.0.0.1:54321/auth/v1/.well-known/jwks.json
```

Expected response shape:

```json
{ "keys": [{ "alg": "ES256", "kty": "EC", ... }] }
```

Register a test user locally and inspect the JWT header. It MUST contain `"alg": "ES256"`.

---

## 2. Auth → URL Configuration (Hosted Supabase Dashboard)

**[HOSTED] [REQUIRED]**

Supabase validates redirect URLs. Any URL not in the allow-list will be silently ignored
(the confirmation/reset email link will redirect to the Site URL instead).

### Steps

Go to: **Supabase Dashboard → Your Project → Authentication → URL Configuration**

#### Site URL

Set to your Vercel production domain:

```
https://<your-domain>
```

Replace `<your-domain>` with your actual custom domain (e.g., `lazylands.app`).

#### Redirect URL allow-list

Add ALL of the following entries (one per line):

```
http://localhost:3000/auth/confirm
http://localhost:3000/auth/reset
https://<your-domain>/auth/confirm
https://<your-domain>/auth/reset
```

- The `localhost` entries allow local development and local smoke testing.
- The custom domain entries are required for the production smoke test.
- If you also keep the Vercel preview URL, add entries for that domain too.

> **Why `/auth/confirm` and `/auth/reset` specifically?** These are the callback routes
> defined in the `auth-ui` spec (AU-004, AU-006). They read `token_hash` + `type` from
> the URL and call `supabase.auth.verifyOtp()`. If these paths are missing from the
> allow-list, Supabase will redirect users to the Site URL instead of the callback page,
> and confirmation/reset will silently fail.

---

## 3. Email Confirmation — Enable in Dashboard

**[HOSTED] [REQUIRED]**

Email confirmation is already enabled on the hosted project (verified 2026-06-29), but
confirm it is not accidentally disabled.

### Steps

Go to: **Supabase Dashboard → Authentication → Settings → Email**

Confirm:
- **Confirm email** (or "Enable email confirmations"): **ON**
- **Double confirm changes**: your call (recommended ON for production)

> **Local**: `supabase/config.toml` has `enable_confirmations = false` at line 226 for
> local development convenience. Keep it `false` locally so manual local testing doesn't
> require a real email. CI tests mock Supabase entirely and are not affected by this flag.
> Only the production smoke test uses the hosted project with confirmations ON.

---

## 4. Email Templates (Hosted)

**[HOSTED] [REQUIRED before real users]**

> ✅ **UNBLOCKED — `sdd-design` decision #2 locked the `verifyOtp` + `token_hash` flow**
> (2026-06-29). The `/auth/confirm` and `/auth/reset` pages are client components that read
> `token_hash` + `type` from the URL and call `supabase.auth.verifyOtp({ token_hash, type })`
> (AU-004 / AU-006). **The templates below are REQUIRED**, not optional.

> ⚠️ **Do NOT leave the default `{{ .ConfirmationURL }}` template in place.** `@supabase/ssr`
> defaults to the **PKCE** flow, so the default `ConfirmationURL` emits a `?code=` link. The
> `verifyOtp` callback pages cannot consume a `code` param — they require `token_hash`. You
> MUST replace the default with the explicit `token_hash` format shown below for BOTH templates.

### Confirmation email template

Go to: **Authentication → Email Templates → Confirm signup**

Replace the body's redirect link so it emits `token_hash` (NOT the default `{{ .ConfirmationURL }}`):

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
```

Verify that the resulting URL matches an entry in your redirect allow-list (Section 2).

### Password recovery email template

Go to: **Authentication → Email Templates → Reset password**

Replace the default `{{ .ConfirmationURL }}` link with the explicit `token_hash` format:

```
{{ .SiteURL }}/auth/reset?token_hash={{ .TokenHash }}&type=recovery
```

Verify the resulting URL is in the allow-list.

---

## 5. Custom SMTP for Production — Production Gotcha

**[HOSTED] [RECOMMENDED — required before real user traffic]**

> **Warning**: Supabase's built-in email service (Inbucket) has a hard rate limit of
> **2 emails per hour** by default (`email_sent = 2` in `config.toml`). For a production
> app with real users, this limit will throttle confirmation and reset emails immediately.
> Do NOT rely on Supabase's built-in mailer for real production traffic.

### Steps

Go to: **Authentication → Settings → SMTP Settings**

Enable custom SMTP and configure with a transactional email provider:

| Provider | Notes |
|----------|-------|
| SendGrid | Free tier, reliable delivery |
| Postmark | Excellent deliverability, paid |
| Resend | Simple API, generous free tier |
| AWS SES | Cheapest at scale, more setup |

Required SMTP settings:

| Setting | Where to find it |
|---------|-----------------|
| Host | Your SMTP provider (e.g., `smtp.sendgrid.net`) |
| Port | Usually 587 (TLS) |
| Username | Provider API key or username |
| Password | Provider API key or password |
| Sender name | e.g., "Lazy Lands" |
| Sender email | Must be a verified sender domain |

> SMTP credentials are set only in the Supabase dashboard. They are NOT environment
> variables in Railway or Vercel. Do NOT commit SMTP credentials anywhere.

---

## 6. Railway Backend — Environment Variables

**[HOSTED] [REQUIRED]**

Go to: **Railway → Your Project → Your Service → Variables**

Set these environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `SUPABASE_URL` | `https://<your-project-ref>.supabase.co` | Required for JWKS derivation |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | From Supabase → Settings → API |
| `API_CORS_ORIGINS` | `https://<your-domain>` | Must match Vercel domain exactly |
| `APP_ENV` | `production` | |

**Do NOT set `SUPABASE_JWT_SECRET`** — the backend derives the JWKS URL from `SUPABASE_URL`
and validates tokens via the public JWKS endpoint. No shared secret is required or safe to
ship. If a `SUPABASE_JWT_SECRET` variable exists from a previous setup, remove it.

> The `API_CORS_ORIGINS` variable accepts a comma-separated list if you need multiple
> origins (e.g., staging + production Vercel deployments):
> `https://<your-domain>,https://lazy-lands.vercel.app`

---

## 7. Vercel Frontend — Environment Variables

**[HOSTED] [REQUIRED]**

Go to: **Vercel → Your Project → Settings → Environment Variables**

Set these for Production (and optionally Preview):

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` | Public — safe to expose |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your publishable/public key | From Supabase → Settings → API |
| `NEXT_PUBLIC_API_URL` | `https://scribe.<your-domain>` | Backend base URL |
| `NEXT_PUBLIC_APP_URL` | `https://<your-domain>` | Used to build `emailRedirectTo` |

> `NEXT_PUBLIC_APP_URL` is required for AU-002 (`signUp` with `emailRedirectTo`) and
> AU-005 (`resetPasswordForEmail` with `redirectTo`). Without it, the confirmation and
> reset emails will point to `undefined/auth/confirm`.

---

## 8. Checklist — Ready for Production Smoke Test

Work through this before running the Block 4 smoke test:

**Domain + Cloudflare**
- [ ] Domain purchased
- [ ] Domain added to Cloudflare (or using Cloudflare Registrar)
- [ ] DNS records configured: `<domain>` → Vercel, `scribe.<domain>` → Railway
- [ ] Custom domain configured in Vercel
- [ ] Custom domain configured in Railway
- [ ] `curl -I https://<your-domain>` returns HTTP 200
- [ ] `curl -I https://scribe.<your-domain>/health` returns HTTP 200

**Local setup**
- [ ] Signing keys file generated and NOT committed to git
- [ ] `signing_keys_path` set in `supabase/config.toml`
- [ ] `supabase stop && supabase start` run after config change
- [ ] `curl http://127.0.0.1:54321/auth/v1/.well-known/jwks.json` returns ES256 key

**Hosted Supabase dashboard**
- [ ] Site URL set to Vercel production domain (`https://<your-domain>`)
- [ ] `/auth/confirm` redirect URLs added for localhost and custom domain
- [ ] `/auth/reset` redirect URLs added for localhost and custom domain
- [ ] Email confirmation is enabled
- [ ] Confirmation email template uses token_hash redirect to `/auth/confirm`
- [ ] Password recovery email template uses token_hash redirect to `/auth/reset`
- [ ] Custom SMTP configured (or acknowledged as acceptable for smoke test only)

**Railway**
- [ ] `SUPABASE_URL` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `API_CORS_ORIGINS` includes `https://<your-domain>`
- [ ] `SUPABASE_JWT_SECRET` removed if previously set

**Vercel**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set
- [ ] `NEXT_PUBLIC_API_URL` set to `https://scribe.<your-domain>`
- [ ] `NEXT_PUBLIC_APP_URL` set to `https://<your-domain>`

---

## Next step

After completing this checklist, run the production smoke test defined in
`openspec/changes/block-4-auth/specs/session-management/spec.md` (Production smoke test section).
