import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';
import type { AuthError } from '@/lib/auth/errors';

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'WEAK_PASSWORD'
  | 'NETWORK_ERROR'
  | 'SESSION_EXPIRED'
  | 'SESSION_REFRESH_FAILED'
  | 'PROFILE_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export type AuthErrorType = AuthErrorCode;

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: AuthError | null;
  initialized: boolean;
  isPasswordRecovery: boolean;
}

export interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}
