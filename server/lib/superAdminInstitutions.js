/**
 * Platform-wide institution listing for super administrators.
 */

/**
 * @param {import('pg').Pool} pool
 */
export async function listInstitutionsForSuperAdmin(pool) {
  const { rows } = await pool.query(
    `SELECT i.institution_id, i.institution_name, i.acronym, i.logo, i.is_active,
            t.theme_id, t.theme_name, t.primary_color, t.secondary_color, t.base_color
     FROM institutions i
     JOIN themes t ON t.theme_id = i.theme_id
     ORDER BY i.institution_name ASC, i.institution_id ASC`,
  )
  return rows.map((r) => ({
    institutionId: r.institution_id,
    institutionName: r.institution_name,
    acronym: r.acronym,
    logo: r.logo || null,
    isActive: r.is_active,
    theme: {
      themeId: r.theme_id,
      themeName: r.theme_name,
      primaryColor: r.primary_color,
      secondaryColor: r.secondary_color,
      baseColor: r.base_color,
    },
  }))
}
