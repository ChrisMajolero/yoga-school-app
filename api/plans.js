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
          type,
          total_classes,
          duration_days,
          price,
          active,
          description,
          created_at,
          updated_at
        from plans
        order by active desc, price asc, name asc
      `;

      return sendJson(res, 200, {
        ok: true,
        data: rows
      });
    }

    if (req.method === 'POST') {
      requireAdmin(user);

      const body = await readBody(req);

      if (!body.name || !body.type || body.price === undefined) {
        return sendError(res, 400, 'Nombre, tipo y precio son obligatorios.');
      }

      const rows = await sql`
        insert into plans (
          name,
          type,
          total_classes,
          duration_days,
          price,
          active,
          description
        )
        values (
          ${body.name},
          ${body.type},
          ${body.total_classes || null},
          ${body.duration_days || null},
          ${body.price},
          ${body.active ?? true},
          ${body.description || null}
        )
        returning *
      `;

      return sendJson(res, 201, {
        ok: true,
        message: 'Plan creado correctamente.',
        data: rows[0]
      });
    }

    return sendError(res, 405, 'Método no permitido.');
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      'Error en planes.',
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