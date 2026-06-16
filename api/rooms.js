import { sql } from '../lib/db.js';
import { sendJson, sendError } from '../lib/response.js';
import { getMockUser, requireAdmin } from '../lib/permissions.js';

export default async function handler(req, res) {
  try {
    const user = getMockUser(req);

    if (req.method === 'GET') {
      const rows = await sql`
        select
          id,
          name,
          location,
          capacity,
          active,
          created_at,
          updated_at
        from rooms
        order by name asc
      `;

      return sendJson(res, 200, {
        ok: true,
        data: rows
      });
    }

    if (req.method === 'POST') {
      requireAdmin(user);

      const body = await readBody(req);

      if (!body.name) {
        return sendError(res, 400, 'El nombre de la sala es obligatorio.');
      }

      const rows = await sql`
        insert into rooms (
          name,
          location,
          capacity,
          active
        )
        values (
          ${body.name},
          ${body.location || null},
          ${body.capacity || 10},
          ${body.active ?? true}
        )
        returning *
      `;

      return sendJson(res, 201, {
        ok: true,
        message: 'Sala creada correctamente.',
        data: rows[0]
      });
    }

    return sendError(res, 405, 'Método no permitido.');
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      'Error en salas.',
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