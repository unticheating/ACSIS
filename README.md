acsis

anti cheating student integrity system

to be developed by

HACKERRR

ausin nlng readmesasunod no pressure dinagdag ko lng po kau

## Google sign-in (`@plpasig.edu.ph`)

1. Copy `.env.example` to `.env` in the project root and set:
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Google Cloud Console)
   - `GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback`
   - `ALLOWED_EMAIL_DOMAIN=plpasig.edu.ph`
   - `SESSION_SECRET` (long random string)
   - `DATABASE_URL` (optional for local dev without PostgreSQL)

2. In Google Cloud Console → OAuth client → **Authorized redirect URIs**, add the callback URL above.

3. Run the auth API and frontend (two terminals):

   ```bash
   npm install --prefix server
   npm run dev:api
   npm run dev
   ```

4. Open http://localhost:5173 and use **Sign in with Google** with a verified `@plpasig.edu.ph` account.

5. With PostgreSQL: run `sql/acsis.sql`, then `sql/migrations/002_google_oauth.sql`. Users need an `institution_members` row (or `is_super_admin`) to reach a portal after login.
