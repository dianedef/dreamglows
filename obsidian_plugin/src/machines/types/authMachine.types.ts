export type AuthContext = {
  user: User | null;
  error: string | null;
};

export type AuthEvents =
  | { type: 'LOGIN' }
  | { type: 'LOGOUT' }
  | { type: 'AUTH_SUCCESS', user: User }
  | { type: 'AUTH_FAILURE', error: string }; 