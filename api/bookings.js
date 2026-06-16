import { sql } from '../lib/db.js';
import { sendJson, sendError } from '../lib/response.js';
import { getMockUser, requireAdminOrTeacher } from '../lib/permissions.js';

export default async function handler(req, res) {
  try {
    const user = getMockUser(req);

    if (req.method === 'GET') {
      requireAdminOrTeacher(user);

      const rows = await sql`
        select
          b.id,
          b.status,
          b.booked_at,
          b.cancelled_at,
          b.attended_at,
          b.notes,

          c.title as class_title,
          c.class_date,
          c.start_time,
          c.end_time,

          s.id as student_id,
          p.full_name as student_name,
          p.email as student_email

        from bookings b
        join classes c on c.id = b.class_id
        join students s on s.id = b.student_id
        join profiles p on p.id = s.profile_id
        order by c.class_date desc, c.start_time desc
      `;

      return sendJson(res, 200, {
        ok: true,
        data: rows
      });
    }

    if (req.method === 'POST') {
      const body = await readBody(req);

      if (!body.student_id || !body.class_id) {
        return sendError(res, 400, 'Faltan student_id o class_id.');
      }

      const rows = await sql`
        select public.book_class(
          ${body.student_id},
          ${body.class_id}
        ) as result
      `;

      return sendJson(res, 201, rows[0].result);
    }

    if (req.method === 'PUT') {
      requireAdminOrTeacher(user);

      const body = await readBody(req);

      if (!body.booking_id || !body.status) {
        return sendError(res, 400, 'Faltan booking_id o status.');
      }

      const rows = await sql`
        select public.mark_attendance(
          ${body.booking_id},
          ${body.status},
          ${body.changed_by || null},
          ${body.notes || null}
        ) as result
      `;

      return sendJson(res, 200, rows[0].result);
    }

    if (req.method === 'DELETE') {
      const body = await readBody(req);

      if (!body.booking_id) {
        return sendError(res, 400, 'Falta booking_id.');
      }

      const rows = await sql`
        select public.cancel_booking(
          ${body.booking_id}
        ) as result
      `;

      return sendJson(res, 200, rows[0].result);
    }

    return sendError(res, 405, 'Método no permitido.');
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      'Error en reservas.',
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