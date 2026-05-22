# Gwen database backup (`backup_gwen.sql`)

This file is a **pg_dump** of an older ACSIS schema. It does **not** match [`acsis.sql`](acsis.sql) as-is.

## Main inconsistencies

| Topic | In `backup_gwen.sql` | Canonical (`acsis.sql`) |
|--------|----------------------|-------------------------|
| Cohort on members | `institution_members.year_level`, `.section` | Only on `students` (`program_code`, `year_level`, `section_code`) |
| Faculty sections | `course_assignments` (program/year/section per course) | `teaching_terms` (BSIT 3D + AY/sem) → `classes` → `exams` |
| Student profile | `students` keyed by `uid` + `program_id` | `students.member_id` + text `program_code` |
| Class subject | Often only `class_name` | `course_code` + `term_id` |

## Recommended workflows

### Fresh database

```bash
psql -U postgres -d acsis -f sql/acsis.sql
psql -U postgres -d acsis -f sql/migrations/002_google_oauth.sql
psql -U postgres -d acsis -f sql/migrations/006_email_verification.sql
psql -U postgres -d acsis -f sql/seed_super_admin.sql
```

### Restore Gwen backup, then align

```bash
psql -U postgres -d acsis -f sql/backup_gwen.sql
psql -U postgres -d acsis -f sql/backup_gwen_post_import.sql
psql -U postgres -d acsis -f sql/seed_super_admin.sql
```

Do **not** edit the dump line-by-line unless you are regenerating it from a migrated database. Use `backup_gwen_post_import.sql` to apply structural fixes.

## Teacher “My Classes” hierarchy (canonical)

1. **Section** — e.g. BSIT 3D, with academic year and semester (`teaching_terms`, archivable)
2. **Course / class** — subject code + name (`classes`, linked via `term_id`)
3. **Exams** — per class (`exams`)

Super admin: `superadmin@plpasig.edu.ph` / `password123` after running `sql/seed_super_admin.sql` or `node server/seed_super_admin.js`.

---

## For teammates: pulling these changes

### 1. Get the code

```bash
git pull origin <branch-name>
npm install
```

New or important paths:

- `server/routes/teacherTerms.js`, `server/controllers/teachingTermController.js`, `server/services/teachingTermService.js`, `server/repositories/teachingTermRepository.js`
- `server/lib/studentProfile.js`
- `src/views/teacher/TeacherTermClassesPage.jsx`, `src/context/TeacherShellBreadcrumbContext.jsx`, `src/lib/sectionLabel.js`
- `sql/migrations/004_teaching_terms_and_profile_cleanup.sql`, `sql/migrations/006_email_verification.sql`, `sql/backup_gwen_post_import.sql`, `sql/seed_super_admin.sql`

### 2. Update the database (pick one)

**Fresh local DB (simplest)**

```bash
# Drop/recreate acsis, then:
psql -U postgres -d acsis -f sql/acsis.sql
psql -U postgres -d acsis -f sql/migrations/002_google_oauth.sql
psql -U postgres -d acsis -f sql/seed_super_admin.sql
# plus your usual PLP admin seed if needed: sql/seed_plp_admin.sql
```

**Existing DB (keep data)**

```bash
psql -U postgres -d acsis -f sql/migrations/004_teaching_terms_and_profile_cleanup.sql
psql -U postgres -d acsis -f sql/migrations/005_exams_class_id_cleanup.sql
psql -U postgres -d acsis -f sql/migrations/006_email_verification.sql
```

If they previously imported Gwen’s dump:

```bash
psql -U postgres -d acsis -f sql/backup_gwen_post_import.sql
```

### 3. Super admin (optional)

```bash
node server/seed_super_admin.js
```

### 4. Run the app

```bash
# terminal 1
cd server && npm run dev

# terminal 2
npm run dev
```

### 5. Smoke test

1. Teacher → **My Classes** → section card (BSIT 3D).
2. Section page shows **BSIT 3D** as title and **AY … Semester** under it.
3. Add course with subject code → open course → exams list.

If `GET /api/teacher/terms` returns 500, the migration was not applied (`teaching_terms` missing).
