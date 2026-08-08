# Object storage (Cloudflare R2)

BookSavat stores user-generated **images** (public) and **PDFs** (private) in
[Cloudflare R2](https://developers.cloudflare.com/r2/). The Next.js / oRPC app never
streams file bytes through Vercel for uploads — the browser PUTs directly to a
presigned R2 URL.

## Cloudflare dashboard setup

1. Open [dash.cloudflare.com](https://dash.cloudflare.com) → **R2 Object Storage**.
2. **Create bucket** (e.g. `booksavat`).
3. **Manage R2 API Tokens** → **Create Account API token**:
   - Permissions: **Object Read & Write** for that bucket (or the account).
   - Copy **Access Key ID** and **Secret Access Key** (shown once).
4. Copy your **Account ID** from the R2 overview sidebar.
5. **Public access for images**
   - Enable the bucket’s **R2.dev subdomain**, or attach a custom domain
     (e.g. `media.booksavat.com`).
   - Set `R2_PUBLIC_BASE_URL` to that origin **without** a trailing slash.
6. **CORS** (bucket → Settings → CORS) so browsers can upload from the app:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3456",
      "https://booksavat.com",
      "https://www.booksavat.com"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

Add Vercel preview origins if you upload from preview deploys.

7. Keep the bucket **private by default**. Serve images via the public domain only for
   keys under `public/`. Keys under `private/` must stay non-public — downloads use
   short-lived signed GET URLs.

## Environment variables

| Variable | Notes |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET` | Bucket name, e.g. `booksavat` |
| `R2_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_PUBLIC_BASE_URL` | Public origin for `public/*` objects (no trailing slash) |
| `R2_DEV_PING_ENABLED` | `true` to enable protected smoke-test procedures |

Also set these on Vercel (Production / Preview) when you enable uploads in hosted envs.

## Key layout

| Prefix | Visibility | Use |
| --- | --- | --- |
| `public/…` | Public URL via `R2_PUBLIC_BASE_URL` | Avatars, club images, post images, dev ping |
| `private/…` | Signed GET only | Booklist PDFs |

## Dev ping (PR1 smoke test)

When `R2_DEV_PING_ENABLED=true` and you are signed in:

1. Call `storage.createDevUploadUrl` with an image `contentType` and `contentLength` (max 2 MB).
2. `PUT` the file bytes to `uploadUrl` with the same `Content-Type` (and length).
3. Call `storage.verifyDevObject` with the returned `key`.
4. Open `publicUrl` in a browser.

These procedures return `FORBIDDEN` when the flag is not `true`.

## Code map

- [`lib/storage/r2.server.ts`](../lib/storage/r2.server.ts) — S3 client, presign PUT/GET, HEAD
- [`lib/storage/constants.ts`](../lib/storage/constants.ts) — MIME allowlists and size caps
- [`lib/storage/keys.ts`](../lib/storage/keys.ts) — key builders
- [`server/contracts/storage.contract.ts`](../server/contracts/storage.contract.ts) — oRPC surface
