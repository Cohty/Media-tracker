import { getUser, jsonResponse } from '../_auth.js'
export async function onRequestGet({ request, env }) {
  const user = getUser(request, env)
  return jsonResponse({ authenticated: true, email: user.email, isAdmin: user.isAdmin, notLoggedIn: user.notLoggedIn || false })
}
