/** Parámetros de autenticación. Cambiarlos acá afecta a toda la API. */
export const AUTH_CONFIG = {
  /** Vida del access token (va en el header Authorization). */
  ACCESS_TOKEN_TTL_SECONDS: 15 * 60,
  /** Vida del refresh token (va en cookie httpOnly). */
  REFRESH_TOKEN_TTL_SECONDS: 7 * 24 * 60 * 60,
  /** Nombre de la cookie del refresh token. */
  REFRESH_COOKIE_NAME: 'gt_refresh',
  /** La cookie solo viaja a las rutas de auth: no se manda en cada request de la API. */
  REFRESH_COOKIE_PATH: '/api/auth',
  /** Rate limit del login: intentos fallidos por IP dentro de la ventana. */
  LOGIN_MAX_FAILED_ATTEMPTS: 10,
  LOGIN_WINDOW_MS: 15 * 60 * 1000,
  /** Largo máximo de contraseña aceptado (evita hashear entradas enormes). */
  PASSWORD_MAX_LENGTH: 128,
} as const;
