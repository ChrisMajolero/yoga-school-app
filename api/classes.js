import { sql } from '../lib/db.js';
import { sendJson, sendError } from '../lib/response.js';
import { getMockUser, requireAdmin } from '../lib/permissions.js';

export default async function handler(req, res) {
  try {
    const user = getMockUser(req);

    if (req.method === 'GET') {
      const rows = await sql`
        select *
        from class_summary
        order by class_date asc, start_time asc
      `;

      return sendJson(res, 200, {
        ok: true,
        data: rows
      });
    }

    if (req.method === 'POST') {
      requireAdmin(user);

      const body = await readBody(req);

      if (!body.title || !body.type || !body.class_date || !body.start_time || !body.end_time) {
        return sendError(res, 400, 'Faltan datos obligatorios de la clase.');
      }

      const rows = await sql`
        insert into classes (
          title,
          type,
          teacher_id,
          room_id,
          class_date,
          start_time,
          end_time,
          capacity,
          location,
          description,
          status
        )
        values (
          ${body.title},
          ${body.type},
          ${body.teacher_id || null},
          ${body.room_id || null},
          ${body.class_date},
          ${body.start_time},
          ${body.end_time},
          ${body.capacity || 10},
          ${body.location || null},
          ${body.description || null},
          ${body.status || 'active'}
        )
        returning *
      `;

      return sendJson(res, 201, {
        ok: true,
        message: 'Clase creada correctamente.',
        data: rows[0]
      });
    }

    return sendError(res, 405, 'Método no permitido.');
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      'Error en clases.',
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