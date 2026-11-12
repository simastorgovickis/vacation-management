/**
 * Admin-issued temporary passwords (no email provider needed).
 *
 * When an admin resets a password, the flags below are stored in the Supabase
 * auth user's `app_metadata` (writable only with the service role key, so
 * users can't clear them themselves). While `must_change_password` is set,
 * middleware sends the user to /auth/set-password and blocks everything else.
 * An unused temporary password stops working after TEMP_PASSWORD_TTL_HOURS.
 */

export const TEMP_PASSWORD_TTL_HOURS = 72

export const SET_PASSWORD_PATH = '/auth/set-password'

type AuthUserLike = { app_metadata?: Record<string, unknown> | null } | null | undefined

export function mustChangePassword(user: AuthUserLike): boolean {
  return user?.app_metadata?.must_change_password === true
}

export function isTemporaryPasswordExpired(user: AuthUserLike, now = new Date()): boolean {
  if (!mustChangePassword(user)) return false
  const expiresAt = user?.app_metadata?.temp_password_expires_at
  if (typeof expiresAt !== 'string') return false
  const t = new Date(expiresAt).getTime()
  return !Number.isNaN(t) && now.getTime() > t
}

export function temporaryPasswordMetadata(now = new Date()) {
  return {
    must_change_password: true,
    temp_password_expires_at: new Date(
      now.getTime() + TEMP_PASSWORD_TTL_HOURS * 60 * 60 * 1000
    ).toISOString(),
  }
}

export const clearedTemporaryPasswordMetadata = {
  must_change_password: false,
  temp_password_expires_at: null,
}
