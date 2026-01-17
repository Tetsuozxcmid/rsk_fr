export default async function handler(req, res) {
  console.log('Logout API called', req.method, req.headers.cookie);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    console.log('Sending logout request to ROSDK...');

    const response = await fetch(
      'https://api.rosdk.ru/auth/users_interaction/logout/',
      {
        method: 'POST',
        headers: {
          'Cookie': req.headers.cookie || '',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: "no-store",
      }
    );

    console.log('Rosdk response status:', response.status);
    
    // Получаем куки из ответа ROSDK API
    const setCookieHeader = response.headers.get('set-cookie');
    
    // Устанавливаем все куки из ответа ROSDK в ответ нашего API
    if (setCookieHeader) {
      // Разделяем multiple Set-Cookie headers
      const cookies = setCookieHeader.split(', ');
      cookies.forEach(cookie => {
        res.setHeader('Set-Cookie', cookie);
      });
    } else {
      // Если ROSDK не вернул куки, устанавливаем свои для удаления
      res.setHeader('Set-Cookie', [
        'users_access_token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None',
        'userData=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None'
      ]);
    }

    const text = await response.text();
    console.log('Rosdk response body:', text);

    res.status(response.status).json({ 
      success: response.ok,
      message: response.ok ? 'Successfully logged out' : 'Logout failed'
    });
    
  } catch (err) {
    console.error('Rosdk logout error:', err);
    res.status(500).json({ success: false, error: 'Server logout failed' });
  }
}