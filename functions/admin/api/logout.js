export async function onRequestPost() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin/login',
      'Set-Cookie':
        'admin_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    },
  });
}
