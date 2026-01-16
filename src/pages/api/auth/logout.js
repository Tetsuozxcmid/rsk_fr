// logout.js

export async function logout() {
  try {
    // 1. Отправляем POST на Node-прокси (удаляет куки rosdk)
    const response = await fetch('https://api.rosdk.ru/auth/users_interaction/logout/', {
      method: 'POST',
      credentials: 'include', // обязательно для куки rosdk
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Logout failed on server', response.status);
      return;
    }

    // 2. После успешного ответа удаляем локальные куки
    const localCookies = [
      "users_access_token",
      "access_token",
      "token",
      "refresh_token",
      "session",
      "userData",
      "role",
      "learn",
      "organization"
    ];

    localCookies.forEach(name => {
      document.cookie = `${name}=; Max-Age=0; path=/;`;
    });

    // 3. Жёсткая очистка хранилищ
    localStorage.clear();
    sessionStorage.clear();

    // 4. Перенаправление на страницу логина
    window.location.href = '/login';

  } catch (error) {
    console.error('Logout error:', error);
  }
}
