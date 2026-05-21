# Import ACSIS database (group setup)

Use this when another machine needs the same data as your exported dump (classes, enrollments, exams, demo accounts).

## Prerequisites

- PostgreSQL 12+ installed and running
- `psql` available in your terminal (PostgreSQL bin folder on `PATH`)

## 1. Create the database (first time only)

```bash
psql -U postgres -c "CREATE DATABASE acsis;"
```

On Windows, if `psql` is not on PATH, use the full path, for example:

```text
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE acsis;"
```

## 2. Apply the schema

From the project root (`ACSIS/`):

```bash
psql -U postgres -d acsis -f sql/acsis.sql
```

This creates tables, enums, indexes, and triggers.

## 3. Import the data dump

Pick the latest file in `sql/exports/` (for example `acsis_dump_2026-05-22.sql`):

```bash
psql -U postgres -d acsis -f sql/exports/acsis_dump_2026-05-22.sql
```

The dump clears public tables and reloads all rows, then fixes serial sequences.

## 4. Configure the app

Copy `.env.example` to `.env` and set:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/acsis
```

Adjust username, password, host, and port to match your PostgreSQL install.

## 5. Run the app

```bash
npm install
npm run dev:api
npm run dev
```

## Demo logins (after import)

If the export included seeded users:

| Role    | Email                   | Password      |
|---------|-------------------------|---------------|
| Admin   | admin@plpasig.edu.ph    | password123   |
| Teacher | teacher@plpasig.edu.ph  | password123   |
| Student | student@plpasig.edu.ph  | password123   |

Sample class access code (if present in dump): `PLP-DEFAULT`

## Regenerate the export (on the machine with the latest data)

```bash
cd server
node export_database.js
```

Output is written to `sql/exports/acsis_dump_YYYY-MM-DD.sql`. Share that file with your group (Git, Drive, zip, etc.).

## Troubleshooting

- **“database acsis does not exist”** — Run step 1.
- **“relation does not exist”** — Run step 2 (`acsis.sql`) before the data dump.
- **“invalid input value for enum exam_status”** — Use a dump exported after the exam status fix (`draft`, `waiting`, `open`, `closed` only).
- **Login works but no classes** — Re-import the data dump or enroll with the class access code from the teacher.
