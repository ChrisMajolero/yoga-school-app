import { sql } from '../lib/db.js';
import { sendJson, sendError } from '../lib/response.js';

export default async function handler(req, res) {
  try {
    const result = await sql`
      select
        'ok' as status,
        now() as server_time
    `;

    return sendJson(res, 200, {
      ok: true,
      message: 'Conexión con Neon correcta.',
      data: result[0]
    });
  } catch (error) {
    return sendError(res, 500, 'Error conectando con Neon.', error.message);
  }
}