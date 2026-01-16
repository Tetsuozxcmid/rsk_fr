// src/pages/api/auth/logout.js
export default async function handler(req, res) {
  console.log('Logout API called', req.method, req.headers.cookie);

  if (req.method !== 'POST') {
    console.log('Method not allowed');
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    console.log('Sending logout request to ROSDK...');

    const response = await fetch(
      'https://api.rosdk.ru/auth/users_interaction/logout/',
      {
        method: 'POST',
        headers: {
          cookie: req.headers.cookie || '',
        },
        credentials: 'include',
      }
    );

    console.log('Rosdk response status:', response.status);

    const text = await response.text(); // читаем тело для логов
    console.log('Rosdk response body:', text);

    if (!response.ok) {
      console.error('Rosdk logout failed', response.status, text);
      return res.status(500).json({ success: false, error: 'Rosdk logout failed', body: text });
    }

    console.log('Rosdk logout successful');

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Rosdk logout error:', err);
    res.status(500).json({ success: false, error: 'Server logout failed', details: err.toString() });
  }
}
