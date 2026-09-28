/** Only a definitive server rejection may destroy the persisted local session. */
export function isInvalidSessionError(error: { status?: number; code?: string; name?: string }): boolean {
  return error.status === 401 || error.status === 403 ||
    error.name === 'AuthSessionMissingError' ||
    ['bad_jwt', 'invalid_token', 'session_not_found', 'refresh_token_not_found'].includes(error.code ?? '');
}
