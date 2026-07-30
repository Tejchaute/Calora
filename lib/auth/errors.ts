import type { AuthErrorCode } from '@/types/auth';

export class AuthError extends Error {
  code: AuthErrorCode;
  cause?: unknown;

  constructor(code: AuthErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }

  static invalidCredentials(cause?: unknown) {
    return new AuthError('INVALID_CREDENTIALS', 'Invalid email or password.', cause);
  }

  static userNotFound(cause?: unknown) {
    return new AuthError('USER_NOT_FOUND', 'No account found with this email.', cause);
  }

  static emailAlreadyRegistered(cause?: unknown) {
    return new AuthError('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists.', cause);
  }

  static weakPassword(cause?: unknown) {
    return new AuthError('WEAK_PASSWORD', 'Password is too weak. Use at least 8 characters.', cause);
  }

  static networkError(cause?: unknown) {
    return new AuthError('NETWORK_ERROR', 'Network error. Please check your connection.', cause);
  }

  static sessionExpired(cause?: unknown) {
    return new AuthError('SESSION_EXPIRED', 'Your session has expired. Please sign in again.', cause);
  }

  static sessionRefreshFailed(cause?: unknown) {
    return new AuthError('SESSION_REFRESH_FAILED', 'Failed to refresh your session. Please sign in again.', cause);
  }

  static profileNotFound(cause?: unknown) {
    return new AuthError('PROFILE_NOT_FOUND', 'Profile not found. Please contact support.', cause);
  }

  static rateLimited(cause?: unknown) {
    return new AuthError('RATE_LIMITED', 'Too many attempts. Please try again later.', cause);
  }

  static unknown(cause?: unknown) {
    return new AuthError('UNKNOWN', 'An unexpected error occurred.', cause);
  }

  static fromSupabaseError(error: { message?: string; code?: string; status?: number }): AuthError {
    const msg = error.message ?? 'An unexpected error occurred.';
    const lower = msg.toLowerCase();

    if (lower.includes('invalid login') || lower.includes('invalid credentials')) return AuthError.invalidCredentials(error);
    if (lower.includes('user not found') || lower.includes('no user found')) return AuthError.userNotFound(error);
    if (lower.includes('already registered') || lower.includes('already been registered')) return AuthError.emailAlreadyRegistered(error);
    if (lower.includes('password') && lower.includes('weak')) return AuthError.weakPassword(error);
    if (lower.includes('rate limit') || error.status === 429) return AuthError.rateLimited(error);
    if (lower.includes('network') || lower.includes('fetch')) return AuthError.networkError(error);
    if (lower.includes('expired') || lower.includes('jwt')) return AuthError.sessionExpired(error);
    return AuthError.unknown(error);
  }
}
