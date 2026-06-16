import { sql } from '../lib/db.js';
import { sendJson, sendError } from '../lib/response.js';
import { getMockUser, requireAdmin } from '../lib/permissions.js';

export default async function handler(req, res) {
  try {
    const user = getMockUser(req);

    if (req.method === 'GET') {
      const rows = await sql`
        select
          t.id,
          t.bio,
          t.active,
          p.full_name,
          p.email,
          p.phone,
          p.status,
          t.created_at,
          t.updated_at
        from teachers t
        join profiles p on p.id = t.profile_id
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

      const profileRows = await sql`
        insert into profiles (
          full_name,
          email,
          phone,
          role,
          status
        )
        values (
          ${body.full_name},
          ${body.email.toLowerCase()},
          ${body.phone || null},
          'teacher',
          'active'
        )
        on conflict (email)
        do update set
          full_name = excluded.full_name,
          phone = excluded.phone,
          role = 'teacher',
          status = 'active',
          updated_at = now()
        returning id
      `;

      const teacherRows = await sql`
        insert into teachers (
          profile_id,
          bio,
          active
        )
        values (
          ${profileRows[0].id},
          ${body.bio || null},
          true
        )
        on conflict (profile_id)
        do update set
          bio = excluded.bio,
          active = true,
          updated_at = now()
        returning *
      `;

      return sendJson(res, 201, {
        ok: true,
        message: 'Profesor creado correctamente.',
        data: teacherRows[0]
      });
    }

    return sendError(res, 405, 'Método no permitido.');
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      'Error en profesores.',
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