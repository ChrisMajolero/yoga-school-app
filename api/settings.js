import { sql } from '../lib/db.js';
import { sendJson, sendError } from '../lib/response.js';
import { getMockUser, requireAdmin } from '../lib/permissions.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await sql`
        select setting_key, setting_value
        from app_settings
        order by setting_key asc
      `;

      return sendJson(res, 200, {
        ok: true,
        data: rows
      });
    }

    if (req.method === 'PUT') {
      const user = getMockUser(req);
      requireAdmin(user);

      const body = await readBody(req);

      if (!body.setting_key || !body.setting_value) {
        return sendError(res, 400, 'Faltan setting_key o setting_value.');
      }

      const rows = await sql`
        insert into app_settings (
          setting_key,
          setting_value
        )
        values (
          ${body.setting_key},
          ${JSON.stringify(body.setting_value)}
        )
        on conflict (setting_key)
        do update set
          setting_value = excluded.setting_value,
          updated_at = now()
        returning *
      `;

      return sendJson(res, 200, {
        ok: true,
        message: 'Configuración actualizada.',
        data: rows[0]
      });
    }

    return sendError(res, 405, 'Método no permitido.');
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      'Error en settings.',
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