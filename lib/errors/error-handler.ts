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

  if (log) {
    console.error(error);
  }

  let message = fallbackMessage;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim() !== ""
  ) {
    message = error.message;
  }

  if (showToast) {
    toast.error(message);
  }

  return message;
}