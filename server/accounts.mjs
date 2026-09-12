import {DatabaseSync} from 'node:sqlite'
import {createHash, randomBytes, randomUUID, scrypt, timingSafeEqual} from 'node:crypto'
import {promisify} from 'node:util'
import {mkdirSync} from 'node:fs'
import path from 'node:path'
import {OAuth2Client} from 'google-auth-library'

const derive = promisify(scrypt)
const digest = value => createHash('sha256').update(value).digest('hex')
const base64Digest = value => createHash('sha256').update(value).digest('base64url')

async function hash(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${(await derive(password, salt, 64, {N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024})).toString('hex')}`
}

async function verify(password, stored) {
  const actual = await hash(password, stored.split(':')[0])
  return timingSafeEqual(Buffer.from(actual), Buffer.from(stored))
}

const validKey = key => typeof key === 'string' && /^(corpus-(theme|completed|saved-courses|practice-v1|chat-v1)|corpus-note-[a-zA-Z0-9_-]{1,100})$/.test(key)

function validValue(key, value) {
  if (value === null) return true
  if (typeof value !== 'string') return false
  if (key.startsWith('corpus-note-')) return value.length <= 8000
  if (key === 'corpus-theme') return ['light', 'dark'].includes(value)
  try {
    const parsed = JSON.parse(value)
    if (['corpus-completed', 'corpus-saved-courses'].includes(key)) return Array.isArray(parsed) && parsed.length <= 1000 && parsed.every(id => typeof id === 'string' && id.length <= 100)
    if (key === 'corpus-practice-v1') return parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length <= 2000 && Object.entries(parsed).every(([id, result]) => id.length <= 100 && result && Number.isSafeInteger(result.seen) && result.seen >= 0 && result.seen <= 1000000 && Number.isSafeInteger(result.correct) && result.correct >= 0 && result.correct <= result.seen && typeof result.wrong === 'boolean')
    if (key === 'corpus-chat-v1') return Array.isArray(parsed) && parsed.length <= 20 && parsed.every(message => message && ['user', 'assistant'].includes(message.role) && typeof message.text === 'string' && message.text.length <= 5000 && typeof message.context === 'string' && message.context.length <= 500 && (!message.sources || (Array.isArray(message.sources) && message.sources.length <= 2 && message.sources.every(source => source && typeof source.url === 'string' && /^https:\/\//.test(source.url) && source.url.length <= 1000 && typeof source.label === 'string' && source.label.length <= 150))))
  } catch {
    return false
  }
  return false
}

function mergeValue(key, value, before, current) {
  if (value === null || !current) return value
  if (['corpus-completed', 'corpus-saved-courses'].includes(key)) {
    const incoming = JSON.parse(value)
    const previous = JSON.parse(before || '[]')
    const saved = JSON.parse(current)
    return JSON.stringify([...new Set([...saved.filter(id => !previous.includes(id) || incoming.includes(id)), ...incoming.filter(id => !previous.includes(id))])])
  }
  if (key === 'corpus-practice-v1') {
    const incoming = JSON.parse(value)
    const previous = JSON.parse(before || '{}')
    const saved = JSON.parse(current)
    for (const [id, result] of Object.entries(incoming)) {
      const oldResult = previous[id] || {seen: 0, correct: 0}
      const delta = result.seen - oldResult.seen
      if (delta > 0) saved[id] = {seen: (saved[id]?.seen || 0) + delta, correct: (saved[id]?.correct || 0) + Math.max(0, result.correct - oldResult.correct), wrong: result.wrong}
    }
    return JSON.stringify(saved)
  }
  return value
}

function cookieValue(req, name) {
  return req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1) || ''
}

function passwordIsValid(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128
}

export function createAccountHandler(config = process.env, dependencies = {}) {
  let db
  let active = 0
  const available = !config.RAILWAY_ENVIRONMENT_ID || Boolean(config.RAILWAY_VOLUME_MOUNT_PATH)
  const googleAvailable = Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET)
  const makeGoogleClient = dependencies.makeGoogleClient || ((clientId, clientSecret, redirectUri) => new OAuth2Client(clientId, clientSecret, redirectUri))

  const database = () => {
    if (db) return db
    const directory = config.RAILWAY_VOLUME_MOUNT_PATH || config.ACCOUNT_DATA_DIR || path.resolve('.data')
    mkdirSync(directory, {recursive: true, mode: 0o700})
    db = new DatabaseSync(path.join(directory, 'mycorpus.sqlite'))
    db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA foreign_keys=ON;
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users(
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        recovery TEXT NOT NULL,
        password_enabled INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,expires INTEGER);
      CREATE TABLE IF NOT EXISTS entries(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,key TEXT,value TEXT,PRIMARY KEY(user_id,key));
      CREATE TABLE IF NOT EXISTS history(seq INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,id TEXT,kind TEXT,payload TEXT,created TEXT,UNIQUE(user_id,id));
      CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER,until INTEGER);
      CREATE TABLE IF NOT EXISTS identities(provider TEXT,subject TEXT,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,email TEXT NOT NULL,created TEXT NOT NULL,PRIMARY KEY(provider,subject),UNIQUE(provider,user_id));
      CREATE TABLE IF NOT EXISTS oauth_states(state TEXT PRIMARY KEY,verifier TEXT NOT NULL,nonce TEXT NOT NULL,link_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS history_by_account ON history(user_id,seq);
      CREATE INDEX IF NOT EXISTS sessions_by_account ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS identities_by_account ON identities(user_id);
    `)
    const columns = db.prepare('PRAGMA table_info(users)').all().map(column => column.name)
    if (!columns.includes('password_enabled')) db.exec('ALTER TABLE users ADD COLUMN password_enabled INTEGER NOT NULL DEFAULT 1')
    return db
  }

  return async (req, res) => {
    const responseCookies = []
    const send = (status, body) => {
      const headers = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}
      if (responseCookies.length) headers['Set-Cookie'] = responseCookies
      res.writeHead(status, headers)
      res.end(JSON.stringify(body))
    }
    const redirect = (location, status = 302) => {
      const headers = {Location: location, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer'}
      if (responseCookies.length) headers['Set-Cookie'] = responseCookies
      res.writeHead(status, headers)
      res.end()
    }

    if (!available) return send(503, {available: false, error: 'Les comptes seront disponibles après la configuration du stockage persistant.'})

    try {
      const d = database()
      const url = new URL(req.url, 'http://localhost')
      const route = url.pathname.replace('/api/account/', '')
      const origin = (config.APP_ORIGIN || `${config.RAILWAY_ENVIRONMENT_ID ? 'https' : 'http'}://${req.headers.host || 'localhost:5173'}`).replace(/\/$/, '')
      const secure = origin.startsWith('https:')
      const redirectUri = config.GOOGLE_REDIRECT_URI || `${origin}/api/account/google/callback`
      const token = cookieValue(req, 'mycorpus_session')
      const user = d.prepare('SELECT u.id,u.email,u.name,u.password_enabled AS passwordEnabled FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?').get(digest(token), Date.now())
      const state = id => Object.fromEntries(d.prepare('SELECT key,value FROM entries WHERE user_id=?').all(id).map(row => [row.key, row.value]))
      const googleLinked = id => Boolean(id && d.prepare("SELECT 1 FROM identities WHERE provider='google' AND user_id=?").get(id))
      const publicUser = account => account ? {id: account.id, email: account.email, name: account.name, hasPassword: Boolean(account.passwordEnabled ?? account.password_enabled), googleLinked: googleLinked(account.id)} : null
      const accountResponse = account => ({available: true, user: publicUser(account), state: account ? state(account.id) : {}, google: {available: googleAvailable, linked: googleLinked(account?.id)}})
      const addCookie = (name, value, maxAge) => responseCookies.push(`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`)
      const session = account => {
        const sessionToken = randomBytes(32).toString('base64url')
        d.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now())
        d.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(sessionToken), account.id, Date.now() + 2592000000)
        addCookie('mycorpus_session', sessionToken, 2592000)
        return accountResponse(account)
      }
      const oauthResult = (result, detail) => {
        const destination = new URL('/', origin)
        destination.searchParams.set('compte', 'google')
        destination.searchParams.set('resultat', result)
        if (detail) destination.searchParams.set('detail', detail)
        return destination.href
      }
      const limitAttempt = (key, maximum) => {
        const now = Date.now()
        d.prepare('DELETE FROM limits WHERE until<?').run(now)
        const limit = d.prepare('SELECT * FROM limits WHERE key=?').get(key)
        if (limit && limit.until > now && limit.count >= maximum) return false
        d.prepare('INSERT INTO limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END').run(key, now + 900000, now, now)
        return true
      }

      if (req.method === 'GET') {
        if (route === 'session') return send(200, accountResponse(user))

        if (route === 'google/start') {
          if (!googleAvailable) return send(503, {error: 'La connexion Google n’est pas encore configurée.'})
          const linking = url.searchParams.get('mode') === 'link'
          if (linking && !user) return send(401, {error: 'Connectez-vous d’abord avec votre mot de passe pour lier Google.'})
          const ipKey = digest(`google:${req.socket.remoteAddress || 'unknown'}`)
          if (!limitAttempt(ipKey, 30)) return send(429, {error: 'Trop de tentatives. Réessayez dans quinze minutes.'})
          d.prepare('DELETE FROM oauth_states WHERE expires<?').run(Date.now())
          const oauthState = randomBytes(32).toString('base64url')
          const verifier = randomBytes(48).toString('base64url')
          const nonce = randomBytes(32).toString('base64url')
          d.prepare('INSERT INTO oauth_states VALUES(?,?,?,?,?)').run(digest(oauthState), verifier, nonce, linking ? user.id : null, Date.now() + 600000)
          addCookie('mycorpus_oauth_state', oauthState, 600)
          const client = makeGoogleClient(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, redirectUri)
          return redirect(client.generateAuthUrl({
            access_type: 'online',
            scope: ['openid', 'email', 'profile'],
            prompt: 'select_account',
            state: oauthState,
            nonce,
            code_challenge: base64Digest(verifier),
            code_challenge_method: 'S256',
          }))
        }

        if (route === 'google/callback') {
          addCookie('mycorpus_oauth_state', '', 0)
          if (!googleAvailable) return redirect(oauthResult('erreur', 'indisponible'))
          if (url.searchParams.get('error')) return redirect(oauthResult('annule'))
          const oauthState = url.searchParams.get('state') || ''
          const stateCookie = cookieValue(req, 'mycorpus_oauth_state')
          const saved = oauthState && stateCookie && digest(oauthState) === digest(stateCookie) ? d.prepare('SELECT * FROM oauth_states WHERE state=?').get(digest(oauthState)) : null
          if (!saved || saved.expires < Date.now()) {
            if (saved) d.prepare('DELETE FROM oauth_states WHERE state=?').run(saved.state)
            return redirect(oauthResult('erreur', 'session'))
          }
          d.prepare('DELETE FROM oauth_states WHERE state=?').run(saved.state)
          const code = url.searchParams.get('code')
          if (!code) return redirect(oauthResult('erreur', 'reponse'))

          const client = makeGoogleClient(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, redirectUri)
          let profile
          try {
            const {tokens} = await client.getToken({code, codeVerifier: saved.verifier, redirect_uri: redirectUri})
            if (!tokens.id_token) return redirect(oauthResult('erreur', 'identite'))
            const ticket = await client.verifyIdToken({idToken: tokens.id_token, audience: config.GOOGLE_CLIENT_ID})
            profile = ticket.getPayload()
          } catch {
            return redirect(oauthResult('erreur', 'reponse'))
          }
          const email = typeof profile?.email === 'string' ? profile.email.trim().toLowerCase() : ''
          if (!profile?.sub || profile.nonce !== saved.nonce || profile.email_verified !== true || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return redirect(oauthResult('erreur', 'identite'))

          const identity = d.prepare("SELECT user_id FROM identities WHERE provider='google' AND subject=?").get(profile.sub)
          let account
          if (saved.link_user_id) {
            if (!user || user.id !== saved.link_user_id) return redirect(oauthResult('erreur', 'connexion'))
            if (identity && identity.user_id !== user.id) return redirect(oauthResult('erreur', 'deja_lie'))
            const linkedIdentity = d.prepare("SELECT subject FROM identities WHERE provider='google' AND user_id=?").get(user.id)
            if (linkedIdentity && linkedIdentity.subject !== profile.sub) return redirect(oauthResult('erreur', 'deja_lie'))
            const conflictingAccount = d.prepare('SELECT id FROM users WHERE email=? AND id<>?').get(email, user.id)
            if (conflictingAccount) return redirect(oauthResult('erreur', 'conflit'))
            d.prepare("INSERT INTO identities(provider,subject,user_id,email,created) VALUES('google',?,?,?,?) ON CONFLICT(provider,subject) DO UPDATE SET email=excluded.email").run(profile.sub, user.id, email, new Date().toISOString())
            account = d.prepare('SELECT id,email,name,password_enabled AS passwordEnabled FROM users WHERE id=?').get(user.id)
            session(account)
            return redirect(oauthResult('lie'))
          }

          if (identity) {
            account = d.prepare('SELECT id,email,name,password_enabled AS passwordEnabled FROM users WHERE id=?').get(identity.user_id)
          } else {
            const conflictingAccount = d.prepare('SELECT id FROM users WHERE email=?').get(email)
            if (conflictingAccount) return redirect(oauthResult('erreur', 'conflit'))
            account = {id: randomUUID(), email, name: String(profile.name || email.split('@')[0]).trim().slice(0, 60), passwordEnabled: 0}
            if (account.name.length < 2) account.name = 'Étudiant'
            const disabled = `disabled:${randomBytes(32).toString('hex')}`
            d.exec('BEGIN IMMEDIATE')
            try {
              d.prepare('INSERT INTO users(id,email,name,password,recovery,password_enabled) VALUES(?,?,?,?,?,0)').run(account.id, account.email, account.name, disabled, digest(randomBytes(32).toString('hex')))
              d.prepare("INSERT INTO identities(provider,subject,user_id,email,created) VALUES('google',?,?,?,?)").run(profile.sub, account.id, email, new Date().toISOString())
              d.exec('COMMIT')
            } catch (error) {
              d.exec('ROLLBACK')
              throw error
            }
          }
          session(account)
          return redirect(oauthResult('connecte'))
        }

        if (!user) return send(401, {error: 'Connectez-vous pour accéder à votre compte.'})
        if (route === 'history') return send(200, {items: d.prepare('SELECT seq,kind,payload,created FROM history WHERE user_id=? AND seq<? ORDER BY seq DESC LIMIT 40').all(user.id, Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER).map(row => ({...row, payload: JSON.parse(row.payload)}))})
        if (route === 'export') return send(200, {user: publicUser(user), state: state(user.id), history: d.prepare('SELECT kind,payload,created FROM history WHERE user_id=? ORDER BY seq').all(user.id).map(row => ({...row, payload: JSON.parse(row.payload)}))})
        return send(404, {error: 'Route inconnue.'})
      }

      if (req.method !== 'POST') return send(405, {error: 'Méthode non autorisée.'})
      if (req.headers['x-mycorpus-request'] !== '1' || !req.headers['content-type']?.startsWith('application/json') || (req.headers.origin && req.headers.origin !== origin)) return send(403, {error: 'Origine de la requête refusée.'})
      let raw = ''
      for await (const chunk of req) {
        raw += chunk
        if (Buffer.byteLength(raw) > 1024 * 1024) return send(413, {error: 'Données trop volumineuses.'})
      }
      let body
      try {
        body = JSON.parse(raw)
      } catch {
        return send(400, {error: 'Requête invalide.'})
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400, {error: 'Requête invalide.'})

      if (['register', 'login', 'recover', 'password', 'delete'].includes(route)) {
        const ipKey = digest(`ip:${req.socket.remoteAddress || 'unknown'}`)
        if (!limitAttempt(ipKey, 120)) return send(429, {error: 'Trop de tentatives. Réessayez plus tard.'})
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : user?.email || ''
        const key = digest(`${route}:${email}`)
        if (!limitAttempt(key, 10)) return send(429, {error: 'Trop de tentatives. Réessayez dans quinze minutes.'})
        if (['register', 'login', 'recover'].includes(route) && !passwordIsValid(body.password)) return send(400, {error: 'Le mot de passe doit contenir entre 12 et 128 caractères.'})
        if (route === 'password' && !passwordIsValid(body.newPassword)) return send(400, {error: 'Le nouveau mot de passe doit contenir entre 12 et 128 caractères.'})
        if (active >= 2) return send(429, {error: 'Réessayez dans quelques secondes.'})
        active++
        try {
          const account = ['password', 'delete'].includes(route) && user ? d.prepare('SELECT * FROM users WHERE id=?').get(user.id) : d.prepare('SELECT * FROM users WHERE email=?').get(email)
          if (route === 'register') {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.length > 60) return send(400, {error: 'Vérifiez votre nom et votre adresse e-mail.'})
            if (account) return send(409, {error: 'Inscription impossible avec cette adresse. Essayez de vous connecter.'})
            const recovery = randomBytes(20).toString('hex')
            const created = {id: randomUUID(), email, name: body.name.trim(), passwordEnabled: 1}
            const password = await hash(body.password)
            d.prepare('INSERT INTO users(id,email,name,password,recovery,password_enabled) VALUES(?,?,?,?,?,1)').run(created.id, email, created.name, password, digest(recovery))
            return send(201, {...session(created), recovery})
          }
          if (route === 'recover') {
            if (!account || !account.password_enabled || typeof body.recovery !== 'string' || digest(body.recovery.trim()) !== account.recovery) return send(400, {error: 'Adresse ou code de récupération incorrect.'})
            const recovery = randomBytes(20).toString('hex')
            const password = await hash(body.password)
            const changed = d.prepare('UPDATE users SET password=?,recovery=? WHERE id=? AND recovery=?').run(password, digest(recovery), account.id, account.recovery)
            if (!changed.changes) return send(400, {error: 'Ce code a déjà été utilisé.'})
            d.prepare('DELETE FROM sessions WHERE user_id=?').run(account.id)
            return send(200, {...session(account), recovery})
          }
          if (route === 'login') {
            if (!account || !account.password_enabled) {
              await hash(body.password, '00000000000000000000000000000000')
              return send(401, {error: 'Adresse ou mot de passe incorrect.'})
            }
            if (!await verify(body.password, account.password) || d.prepare('SELECT password FROM users WHERE id=?').get(account.id)?.password !== account.password) return send(401, {error: 'Adresse ou mot de passe incorrect.'})
            d.prepare('DELETE FROM limits WHERE key=?').run(key)
            return send(200, session(account))
          }
          if (!user || !account || user.id !== account.id) return send(401, {error: 'Connexion requise.'})
          if (route === 'delete') {
            if (account.password_enabled && (!passwordIsValid(body.password) || !await verify(body.password, account.password))) return send(401, {error: 'Mot de passe incorrect.'})
            d.prepare('DELETE FROM users WHERE id=?').run(user.id)
            addCookie('mycorpus_session', '', 0)
            return send(200, {ok: true})
          }
          if (account.password_enabled && (!passwordIsValid(body.password) || !await verify(body.password, account.password))) return send(401, {error: 'Mot de passe incorrect.'})
          const recovery = account.password_enabled ? null : randomBytes(20).toString('hex')
          const password = await hash(body.newPassword)
          if (recovery) d.prepare('UPDATE users SET password=?,recovery=?,password_enabled=1 WHERE id=?').run(password, digest(recovery), user.id)
          else d.prepare('UPDATE users SET password=? WHERE id=?').run(password, user.id)
          d.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id)
          const updated = d.prepare('SELECT id,email,name,password_enabled AS passwordEnabled FROM users WHERE id=?').get(user.id)
          return send(200, {...session(updated), ...(recovery ? {recovery} : {})})
        } finally {
          active--
        }
      }

      if (!user) return send(401, {error: 'Votre session a expiré. Reconnectez-vous.'})
      if (route === 'logout') {
        d.prepare('DELETE FROM sessions WHERE token=?').run(digest(token))
        addCookie('mycorpus_session', '', 0)
        return send(200, {ok: true})
      }
      if (route === 'sync') {
        if (body.userId !== user.id) return send(409, {error: 'Le compte connecté a changé. Rechargez votre compte avant de poursuivre.'})
        if (!Array.isArray(body.operations) || body.operations.length > 100) return send(400, {error: 'Synchronisation invalide.'})
        for (const operation of body.operations) {
          if (!operation || !operation.payload || typeof operation.payload !== 'object' || Array.isArray(operation.payload) || typeof operation.id !== 'string' || operation.id.length > 100 || !['value', 'exploration', 'course', 'quiz', 'chat'].includes(operation.kind) || JSON.stringify(operation.payload ?? null).length > 100000 || (operation.kind === 'value' && (!validKey(operation.payload?.key) || !validValue(operation.payload.key, operation.payload.value) || !validValue(operation.payload.key, operation.payload.before ?? null)))) return send(400, {error: 'Données invalides.'})
        }
        d.exec('BEGIN IMMEDIATE')
        try {
          for (const operation of body.operations) {
            const inserted = d.prepare('INSERT OR IGNORE INTO history(user_id,id,kind,payload,created) VALUES(?,?,?,?,?)').run(user.id, operation.id, operation.kind, JSON.stringify(operation.payload), new Date().toISOString())
            if (inserted.changes && operation.kind === 'value') {
              if (operation.payload.value === null) d.prepare('DELETE FROM entries WHERE user_id=? AND key=?').run(user.id, operation.payload.key)
              else d.prepare('INSERT INTO entries VALUES(?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value').run(user.id, operation.payload.key, mergeValue(operation.payload.key, operation.payload.value, operation.payload.before, d.prepare('SELECT value FROM entries WHERE user_id=? AND key=?').get(user.id, operation.payload.key)?.value))
            }
          }
          d.exec('COMMIT')
        } catch (error) {
          d.exec('ROLLBACK')
          throw error
        }
        return send(200, {ok: true})
      }
      return send(404, {error: 'Route inconnue.'})
    } catch (error) {
      console.error('Account request failed:', error.code || error.name)
      return send(500, {error: 'Le compte est momentanément indisponible. Vos modifications restent en attente.'})
    }
  }
}
