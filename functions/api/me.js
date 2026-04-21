import { getUser, jsonResponse } from '../_auth.js'

export async function onRequestGet({ request, env }) {
  const user = getUser(request, env)
  if (user.notLoggedIn) return jsonResponse({ error: 'Not authenticated' }, 401)
  return jsonResponse({ authenticated: true, email: user.email, isAdmin: user.isAdmin })
}
