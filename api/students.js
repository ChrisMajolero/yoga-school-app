import { sql } from '../lib/db.js';
import { sendJson, sendError } from '../lib/response.js';
import { getMockUser, requireAdminOrTeacher, requireAdmin } from '../lib/permissions.js';

export default async function handler(req, res) {
  try {
    const user = getMockUser(req);

    if (req.method === 'GET') {
      requireAdminOrTeacher(user);

      const rows = await sql`
        select
          s.id,
          s.level,
          s.notes,
          s.health_notes,
          s.start_date,
          s.active,
          p.full_name,
          p.email,
          p.phone,
          p.status,
          p.created_at
        from students s
        join profiles p on p.id = s.profile_id
        order by p.full_name asc
      `;

      return sendJson(res, 200, {
        ok: true,
        data: rows
      });
    }

    if (req.method === 'POST') {
      requireAdmin(user);

      const body = await readBody(req);

      if (!body.full_name || !body.email) {
        return sendError(res, 400, 'Nombre y email son obligatorios.');
      }

      const rows = await sql`
        select public.create_student_profile(
          ${body.full_name},
          ${body.email},
          ${body.phone || null},
          ${body.level || null},
          ${body.notes || null},
          ${body.health_notes || null}
        ) as student_id
      `;

      return sendJson(res, 201, {
        ok: true,
        message: 'Alumno creado correctamente.',
        data: {
          student_id: rows[0].student_id
        }
      });
    }

    return sendError(res, 405, 'Método no permitido.');
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      'Error en alumnos.',
      error.message
    );
  }
}

async function readBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString();

  if (!rawBody) return {};

  return JSON.parse(rawBody);
}