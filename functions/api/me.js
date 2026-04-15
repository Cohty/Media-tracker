import { getUser, jsonResponse } from '../_auth.js'

export async function onRequestGet({ request, env }) {
  const user = getUser(request, env)
  if (!user) return jsonResponse({ authenticated: false, email: null, isAdmin: false })
  return jsonResponse({ authenticated: true, email: user.email, isAdmin: user.isAdmin })
}
