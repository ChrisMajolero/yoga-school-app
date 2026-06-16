import { sql } from '../lib/db.js';
import { sendJson, sendError } from '../lib/response.js';
import { getMockUser, requireAdmin } from '../lib/permissions.js';

export default async function handler(req, res) {
  try {
    const user = getMockUser(req);

    if (req.method === 'GET') {
      requireAdmin(user);

      const rows = await sql`
        select
          p.id,
          p.amount,
          p.payment_date,
          p.payment_method,
          p.concept,
          p.status,
          p.notes,
          pr.full_name as student_name,
          pr.email as student_email,
          sp.total_amount,
          sp.paid_amount,
          sp.pending_amount
        from payments p
        join students s on s.id = p.student_id
        join profiles pr on pr.id = s.profile_id
        left join student_plans sp on sp.id = p.student_plan_id
        order by p.payment_date desc, p.created_at desc
      `;

      return sendJson(res, 200, {
        ok: true,
        data: rows
      });
    }

    if (req.method === 'POST') {
      requireAdmin(user);

      const body = await readBody(req);

      if (!body.student_id || !body.amount || !body.payment_method || !body.concept) {
        return sendError(res, 400, 'Faltan datos obligatorios del pago.');
      }

      const rows = await sql`
        select public.register_payment(
          ${body.student_id},
          ${body.student_plan_id || null},
          ${body.amount},
          ${body.payment_method},
          ${body.concept},
          ${body.notes || null}
        ) as result
      `;

      return sendJson(res, 201, rows[0].result);
    }

    return sendError(res, 405, 'Método no permitido.');
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      'Error en pagos.',
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