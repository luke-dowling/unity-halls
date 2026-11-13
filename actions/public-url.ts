/**
 * The address people use to reach the app, for links that leave it (verification emails).
 *
 * Behind a reverse proxy (Caddy on the Hetzner server) the incoming request's own URL can come out as plain
 * http or an internal host, so prefer AUTH_URL, the public URL Auth.js is configured with
 * (e.g. https://unityhalls.luke-dowling.dev). Falls back to the request's origin when it isn't set (local dev).
 */
export function publicOrigin(req: Request): string {
  const configured = process.env.AUTH_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Not a valid URL: ignore it and use the request's origin.
    }
  }
  return new URL(req.url).origin;
}
