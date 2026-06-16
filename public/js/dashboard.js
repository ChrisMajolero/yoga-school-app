async function loadDashboard() {
  const backendStatus = document.getElementById('backendStatus');
  const studentsCount = document.getElementById('studentsCount');
  const classesCount = document.getElementById('classesCount');
  const classesList = document.getElementById('classesList');

  try {
    const healthResponse = await fetch('/api/health');
    const health = await healthResponse.json();

    backendStatus.textContent = health.ok ? 'OK' : 'Error';

    const students = await apiGet('/api/students');
    studentsCount.textContent = students.length;

    const classes = await apiGet('/api/classes');
    classesCount.textContent = classes.length;

    if (!classes.length) {
      classesList.textContent = 'Todavía no hay clases creadas.';
      return;
    }

    classesList.innerHTML = classes.map(item => `
      <article class="class-item">
        <strong>${item.title}</strong>
        <span>${item.class_date} · ${item.start_time} - ${item.end_time}</span>
        <br />
        <span>${item.reserved_count || 0}/${item.capacity} reservas</span>
      </article>
    `).join('');
  } catch (error) {
    backendStatus.textContent = 'Error';
    classesList.textContent = error.message;
  }
}

loadDashboard();