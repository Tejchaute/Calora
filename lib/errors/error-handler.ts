import { toast } from "sonner";

interface HandleErrorOptions {
  fallbackMessage?: string;
  showToast?: boolean;
  log?: boolean;
}

export function handleError(
  error: unknown,
  options: HandleErrorOptions = {}
) {
  const {
    fallbackMessage = "Something went wrong.",
    showToast = true,
    log = true,
  } = options;

  const databaseError = Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error
  );

  if (log) {
    const diagnostic = error && typeof error === 'object'
      ? {
          code: 'code' in error ? error.code : undefined,
          message: 'message' in error ? error.message : fallbackMessage,
        }
      : { message: fallbackMessage };

    console.error('[Calora]', diagnostic);
  }

  let message = fallbackMessage;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim() !== "" &&
    !databaseError
  ) {
    message = error.message;
  }

  if (showToast) {
    toast.error(message);
  }

  return message;
}
