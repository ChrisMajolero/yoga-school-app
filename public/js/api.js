async function apiGet(endpoint) {
  const response = await fetch(endpoint, {
    headers: {
      'x-user-role': 'admin'
    }
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.message || 'Error en la API');
  }

  return result.data;
}