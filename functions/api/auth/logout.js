export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': [
        'mt_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
        'mt_email=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
      ].join(', ')
    }
  })
}
