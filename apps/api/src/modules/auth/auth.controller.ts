import type { CookieOptions, Request, Response } from 'express';
import { AUTH_CONFIG } from '../../config/auth.js';
import { env } from '../../config/env.js';
import { LoginDto } from './auth.dto.js';
import { authService } from './auth.service.js';

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: AUTH_CONFIG.REFRESH_COOKIE_PATH,
    maxAge: AUTH_CONFIG.REFRESH_TOKEN_TTL_SECONDS * 1000,
  };
}

function clearRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: AUTH_CONFIG.REFRESH_COOKIE_PATH,
  };
}

export class AuthController {
  login = async (req: Request, res: Response) => {
    const dto = LoginDto.fromBody(req.body);
    const { response, refreshToken } = await authService.login(dto);
    res.cookie(AUTH_CONFIG.REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    res.json(response);
  };

  refresh = async (req: Request, res: Response) => {
    const rawToken = req.cookies?.[AUTH_CONFIG.REFRESH_COOKIE_NAME] as string | undefined;
    try {
      const { response, refreshToken } = await authService.refresh(rawToken);
      res.cookie(AUTH_CONFIG.REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
      res.json(response);
    } catch (err) {
      res.clearCookie(AUTH_CONFIG.REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
      throw err;
    }
  };

  logout = async (req: Request, res: Response) => {
    const rawToken = req.cookies?.[AUTH_CONFIG.REFRESH_COOKIE_NAME] as string | undefined;
    await authService.logout(rawToken);
    res.clearCookie(AUTH_CONFIG.REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
    res.status(204).send();
  };

  me = async (req: Request, res: Response) => {
    const user = await authService.me(req.user!.id);
    res.json(user);
  };
}

export const authController = new AuthController();
