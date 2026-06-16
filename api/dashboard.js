import { sql } from '../lib/db.js';
import { sendJson, sendError } from '../lib/response.js';
import { getMockUser, requireAdminOrTeacher } from '../lib/permissions.js';

export default async function handler(req, res) {
  try {
    const user = getMockUser(req);
    requireAdminOrTeacher(user);

    if (req.method !== 'GET') {
      return sendError(res, 405, 'Método no permitido.');
    }

    const today = new Date().toISOString().slice(0, 10);

    const studentsCount = await sql`
      select count(*)::int as count
      from students
      where active = true
    `;

    const teachersCount = await sql`
      select count(*)::int as count
      from teachers
      where active = true
    `;

    const upcomingClassesCount = await sql`
      select count(*)::int as count
      from classes
      where status = 'active'
        and class_date >= current_date
    `;

    const bookingsTodayCount = await sql`
      select count(*)::int as count
      from bookings b
      join classes c on c.id = b.class_id
      where c.class_date = current_date
        and b.status in ('reserved', 'attended')
    `;

    const monthlyIncome = await sql`
      select coalesce(sum(amount), 0)::numeric(10,2) as total
      from payments
      where status = 'paid'
        and date_trunc('month', payment_date) = date_trunc('month', current_date)
    `;

    const pendingAmount = await sql`
      select coalesce(sum(pending_amount), 0)::numeric(10,2) as total
      from student_plans
      where status = 'active'
        and pending_amount > 0
    `;

    const upcomingClasses = await sql`
      select *
      from class_summary
      where status = 'active'
        and class_date >= current_date
      order by class_date asc, start_time asc
      limit 8
    `;

    const pendingStudents = await sql`
      select *
      from student_financial_summary
      where pending_amount > 0
      order by pending_amount desc
      limit 8
    `;

    const latestBookings = await sql`
      select
        b.id,
        b.status,
        b.booked_at,
        c.title as class_title,
        c.class_date,
        c.start_time,
        p.full_name as student_name,
        p.email as student_email
      from bookings b
      join classes c on c.id = b.class_id
      join students s on s.id = b.student_id
      join profiles p on p.id = s.profile_id
      order by b.booked_at desc
      limit 8
    `;

    return sendJson(res, 200, {
      ok: true,
      data: {
        date: today,
        metrics: {
          students_active: studentsCount[0].count,
          teachers_active: teachersCount[0].count,
          upcoming_classes: upcomingClassesCount[0].count,
          bookings_today: bookingsTodayCount[0].count,
          monthly_income: monthlyIncome[0].total,
          pending_amount: pendingAmount[0].total
        },
        upcoming_classes: upcomingClasses,
        pending_students: pendingStudents,
        latest_bookings: latestBookings
      }
    });
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      'Error en dashboard.',
      error.message
    );
  }
}