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
          sp.id,
          sp.student_id,
          sp.plan_id,
          prof.full_name as student_name,
          prof.email as student_email,
          pl.name as plan_name,
          pl.type as plan_type,
          sp.start_date,
          sp.end_date,
          sp.total_classes,
          sp.remaining_classes,
          sp.total_amount,
          sp.paid_amount,
          sp.pending_amount,
          sp.status,
          sp.notes,
          sp.created_at,
          sp.updated_at
        from student_plans sp
        join students s on s.id = sp.student_id
        join profiles prof on prof.id = s.profile_id
        left join plans pl on pl.id = sp.plan_id
        order by sp.created_at desc
      `;

      return sendJson(res, 200, {
        ok: true,
        data: rows
      });
    }

    if (req.method === 'POST') {
      requireAdmin(user);

      const body = await readBody(req);

      if (!body.student_id || !body.plan_id) {
        return sendError(res, 400, 'student_id y plan_id son obligatorios.');
      }

      const planRows = await sql`
        select *
        from plans
        where id = ${body.plan_id}
        limit 1
      `;

      if (!planRows.length) {
        return sendError(res, 404, 'No se ha encontrado el plan indicado.');
      }

      const plan = planRows[0];

      const rows = await sql`
        insert into student_plans (
          student_id,
          plan_id,
          start_date,
          end_date,
          total_classes,
          remaining_classes,
          total_amount,
          paid_amount,
          status,
          notes
        )
        values (
          ${body.student_id},
          ${body.plan_id},
          ${body.start_date || new Date().toISOString().slice(0, 10)},
          ${
            body.end_date ||
            null
          },
          ${body.total_classes ?? plan.total_classes},
          ${body.remaining_classes ?? plan.total_classes},
          ${body.total_amount ?? plan.price},
          ${body.paid_amount ?? 0},
          ${body.status || 'active'},
          ${body.notes || null}
        )
        returning *
      `;

      return sendJson(res, 201, {
        ok: true,
        message: 'Plan asignado al alumno correctamente.',
        data: rows[0]
      });
    }

    return sendError(res, 405, 'Método no permitido.');
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      'Error en planes de alumno.',
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