async function checkApiHealth() {
  const statusEl = document.getElementById('apiStatus');

  if (!statusEl) return;

  try {
    const response = await fetch('/api/health');
    const result = await response.json();

    if (result.ok) {
      statusEl.textContent = 'Backend conectado correctamente con Neon.';
    } else {
      statusEl.textContent = 'La API responde, pero hay un problema.';
    }
  } catch (error) {
    statusEl.textContent = 'No se pudo comprobar la conexión con el backend.';
  }
}

checkApiHealth();