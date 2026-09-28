type SetupErrorLike = {
  code?: unknown;
  message?: unknown;
};

export function getSetupErrorMessage(cause: unknown): string {
  const error = isErrorLike(cause) ? cause : null;
  const code = typeof error?.code === 'string' ? error.code : '';
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

  if (
    code === '23505'
    || message.includes('already associated with a business')
    || message.includes('duplicate')
  ) {
    return 'This account is already connected to a business. Refresh the page to continue to your workspace.';
  }

  if (code === '42501' || message.includes('authentication is required')) {
    return 'Your session could not be verified. Sign in again, then return to setup.';
  }

  if (code === '22023' || message.includes('valid business type')) {
    return 'Check your business name and type, then try again.';
  }

  if (
    message.includes('fetch')
    || message.includes('network')
    || message.includes('connection')
  ) {
    return 'We could not reach Calora. Check your connection and try again.';
  }

  return 'Something went wrong. Your business was not created. Please try again.';
}

function isErrorLike(value: unknown): value is SetupErrorLike {
  return typeof value === 'object' && value !== null;
}
