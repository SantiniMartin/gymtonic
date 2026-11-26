import argon2 from 'argon2';

/**
Hash y verificación de contraseñas con argon2id.
Es el único lugar de la API que conoce el algoritmo.
 */
export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Hash corrupto o con formato desconocido: se trata como contraseña incorrecta.
    return false;
  }
}

/**
Hash válido de una contraseña que nadie conoce. Se usa para verificar contra algo
cuando el usuario no existe, así el tiempo de respuesta no revela qué emails están registrados.
 */
let dummyHashPromise: Promise<string> | undefined;
export function getDummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hashPassword('gymtonic-dummy-password-for-timing');
  return dummyHashPromise;
}
