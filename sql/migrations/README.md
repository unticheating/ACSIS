# ACSIS SQL migrations (apply in order on existing databases)

Fresh installs: `sql/acsis.sql` already includes the latest schema. Use these files only when upgrading a database that was created from an older dump.

| File | Purpose |
|------|---------|
| `002_google_oauth.sql` | Google OAuth columns on `users` |
| `003_member_profile.sql` | Member profile fields |
| `004_teaching_terms_and_profile_cleanup.sql` | `teaching_terms`, `classes.term_id`, student profile cleanup |
| `005_exams_class_id_cleanup.sql` | `exams.class_id`, drop legacy `access_code` on exams |
| `006_email_verification.sql` | `email_verification_codes` for login OTP |

## Quick fix: login OTP error

If the API logs `relation "email_verification_codes" does not exist`:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d acsis -f sql/migrations/006_email_verification.sql
```

(Adjust PostgreSQL version path if needed.)

## After Gwen backup import

```bash
psql -U postgres -d acsis -f sql/backup_gwen_post_import.sql
```

That script now also creates `email_verification_codes`.

## Regenerate a data dump for teammates

Migrations change **schema only**. To share data after fixing your DB:

```bash
cd server
node export_database.js
```

Share the new file from `sql/exports/`. Teammates still need `acsis.sql` or the migration files if their schema is behind.
