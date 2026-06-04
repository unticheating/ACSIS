import { OAuth2Client } from 'google-auth-library'
import { config } from '../config.js'

let client = null

export function getOAuthClient() {
  if (!client) {
    client = new OAuth2Client(
      config.google.clientId,
      config.google.clientSecret,
      config.google.callbackUrl,
    )
  }
  return client
}

/**
 * @param {string | undefined} hostedDomain
 * When set (single institution domain from DB), Google limits the account picker to that
 * Workspace domain instead of personal Gmail accounts.
 */
export function getGoogleAuthUrl(hostedDomain) {
  const oauth2 = getOAuthClient()
  const options = {
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    include_granted_scopes: true,
  }
  const domain = typeof hostedDomain === 'string' ? hostedDomain.trim().toLowerCase() : ''
  if (domain) {
    options.hd = domain
  }
  return oauth2.generateAuthUrl(options)
}

/**
 * @param {string} code
 */
export async function exchangeCodeForProfile(code) {
  const oauth2 = getOAuthClient()
  const { tokens } = await oauth2.getToken(code)
  if (!tokens.id_token) {
    throw new Error('Google did not return an ID token')
  }
  const ticket = await oauth2.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.google.clientId,
  })
  const payload = ticket.getPayload()
  if (!payload?.sub || !payload.email) {
    throw new Error('Invalid Google ID token payload')
  }
  return payload
}
