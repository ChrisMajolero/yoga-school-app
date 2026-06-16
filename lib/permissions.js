export function getMockUser(req) {
  /**
   * Temporal:
   * Hasta que añadamos autenticación real, usaremos una cabecera:
   * x-user-role: admin | teacher | student
   *
   * Luego esto se sustituirá por Auth real.
   */
  const role = req.headers['x-user-role'] || 'admin';

  return {
    id: req.headers['x-user-id'] || null,
    role
  };
}

export function requireAdmin(user) {
  if (!user || user.role !== 'admin') {
    const error = new Error('No tienes permisos de administrador.');
    error.statusCode = 403;
    throw error;
  }
}

export function requireAdminOrTeacher(user) {
  if (!user || !['admin', 'teacher'].includes(user.role)) {
    const error = new Error('No tienes permisos suficientes.');
    error.statusCode = 403;
    throw error;
  }
}