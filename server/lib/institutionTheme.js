/**
 * Institution branding from `themes` + `institutions`.
 */

/**
 * @param {import('pg').Pool} pool
 */
export async function listThemes(pool) {
  const { rows } = await pool.query(
    `SELECT theme_id, theme_name, primary_color, secondary_color, base_color
     FROM themes
     ORDER BY theme_id ASC`,
  )
  return rows.map((r) => ({
    themeId: r.theme_id,
    themeName: r.theme_name,
    primaryColor: r.primary_color,
    secondaryColor: r.secondary_color,
    baseColor: r.base_color,
  }))
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} institutionId
 */
export async function getInstitutionSettings(pool, institutionId) {
  const { rows } = await pool.query(
    `SELECT i.institution_id, i.institution_name, i.acronym, i.logo, i.max_warnings, i.theme_id,
            t.theme_name, t.primary_color, t.secondary_color, t.base_color
     FROM institutions i
     JOIN themes t ON t.theme_id = i.theme_id
     WHERE i.institution_id = $1 AND i.is_active = TRUE`,
    [institutionId],
  )
  if (!rows[0]) return null
  const r = rows[0]
  return {
    institutionId: r.institution_id,
    institutionName: r.institution_name,
    acronym: r.acronym,
    logo: r.logo || null,
    maxWarnings: r.max_warnings,
    theme: {
      themeId: r.theme_id,
      themeName: r.theme_name,
      primaryColor: r.primary_color,
      secondaryColor: r.secondary_color,
      baseColor: r.base_color,
    },
  }
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} uid
 * @param {boolean} isSuperAdmin
 */
export async function getBrandingForUser(pool, uid, isSuperAdmin) {
  if (isSuperAdmin) {
    const { rows } = await pool.query(
      `SELECT i.institution_id, i.institution_name, i.acronym, i.logo, i.max_warnings,
              t.theme_id, t.theme_name, t.primary_color, t.secondary_color, t.base_color
       FROM institutions i
       JOIN themes t ON t.theme_id = i.theme_id
       WHERE i.is_active = TRUE
       ORDER BY i.institution_id ASC
       LIMIT 1`,
    )
    if (!rows[0]) return null
    return mapBrandingRow(rows[0])
  }

  const { rows } = await pool.query(
    `SELECT i.institution_id, i.institution_name, i.acronym, i.logo, i.max_warnings,
            t.theme_id, t.theme_name, t.primary_color, t.secondary_color, t.base_color
     FROM institution_members im
     JOIN institutions i ON i.institution_id = im.institution_id
     JOIN themes t ON t.theme_id = i.theme_id
     WHERE im.uid = $1 AND im.is_active = TRUE AND i.is_active = TRUE
     ORDER BY im.joined_at ASC
     LIMIT 1`,
    [uid],
  )
  if (!rows[0]) return null
  return mapBrandingRow(rows[0])
}

/** @param {Record<string, unknown>} r */
function mapBrandingRow(r) {
  return {
    institutionId: r.institution_id,
    institutionName: r.institution_name,
    acronym: r.acronym,
    logo: r.logo || null,
    maxWarnings: r.max_warnings,
    theme: {
      themeId: r.theme_id,
      themeName: r.theme_name,
      primaryColor: r.primary_color,
      secondaryColor: r.secondary_color,
      baseColor: r.base_color,
    },
  }
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} institutionId
 * @param {number} themeId
 */
export async function setInstitutionTheme(pool, institutionId, themeId) {
  const themeCheck = await pool.query(`SELECT theme_id FROM themes WHERE theme_id = $1`, [themeId])
  if (!themeCheck.rows[0]) {
    return { ok: false, status: 400, error: 'Unknown theme.' }
  }

  const updated = await pool.query(
    `UPDATE institutions SET theme_id = $1, updated_at = NOW()
     WHERE institution_id = $2 AND is_active = TRUE
     RETURNING institution_id`,
    [themeId, institutionId],
  )
  if (!updated.rows[0]) {
    return { ok: false, status: 404, error: 'Institution not found.' }
  }
  return { ok: true }
}
