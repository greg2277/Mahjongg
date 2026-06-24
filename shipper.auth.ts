/**
 * Generated auth settings for shipper.auth.ts
 * These flags are managed by Shipper Cloud project auth settings.
 */
export const SHIPPER_AUTH_TEMPLATE_VERSION = "convex-better-auth-0.12.2+better-auth-1.6.11" as const;
export const AUTH_CONFIG = {
  authEnabled: true,
  signupEnabled: true,
  emailPasswordEnabled: true,
  googleEnabled: true,
  anonymousEnabled: false,
} as const;

export type AuthConfig = typeof AUTH_CONFIG;
