import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { DEFAULT_THEME_ID, defaultPalette, paletteById, THEME_PALETTES } from '@/config/themePalettes.js'
import {
  applyInstitutionTheme,
  readDemoInstitution,
  readDemoThemeId,
  writeDemoInstitution,
  writeDemoThemeId,
} from '@/lib/institutionThemeApply.js'
import { useSession } from '@/context/SessionContext.jsx'
import { useTheme } from '@/context/ThemeContext.jsx'

const InstitutionThemeContext = createContext(null)

const defaultInstitution = {
  institutionName: 'ACSIS',
  acronym: '',
  logo: null,
  maxWarnings: 3,
  emailDomain: null,
}

/** @param {{ themeId: number, themeName: string, primaryColor: string, secondaryColor: string, baseColor: string }} theme @param {boolean} isDark */
function applyFromTheme(theme, isDark) {
  applyInstitutionTheme({ ...theme, themeName: theme.themeName }, isDark)
}

/** @param {Record<string, unknown> | null | undefined} branding */
function institutionFromBranding(branding) {
  if (!branding) return { ...defaultInstitution, theme: defaultPalette() }
  return {
    institutionName: branding.institutionName || defaultInstitution.institutionName,
    acronym: branding.acronym || defaultInstitution.acronym,
    logo: branding.logo ?? null,
    maxWarnings: branding.maxWarnings ?? defaultInstitution.maxWarnings,
    emailDomain: branding.emailDomain ?? defaultInstitution.emailDomain,
    theme: branding.theme || defaultPalette(),
  }
}

const platformInstitution = {
  institutionName: 'ACSIS Platform',
  acronym: 'ACSIS',
  logo: null,
  maxWarnings: 3,
}

export function InstitutionThemeProvider({ children }) {
  const { authUser, sessionMode, activeAccount, refreshAuth } = useSession()
  const { theme: colorMode } = useTheme()
  const isDark = colorMode === 'dark'
  const [institution, setInstitution] = useState(() => {
    const demo = readDemoInstitution()
    return { ...demo, theme: paletteById(readDemoThemeId()) }
  })

  useEffect(() => {
    const isPlatformOperator =
      authUser?.isSuperAdmin === true ||
      authUser?.portal === 'super_admin' ||
      (sessionMode === 'demo' && activeAccount?.portal === 'super_admin')

    if (isPlatformOperator) {
      const slate = defaultPalette()
      setInstitution({ ...platformInstitution, theme: slate })
      applyFromTheme(slate, isDark)
      return
    }

    const branding = authUser?.branding
    if (branding?.theme) {
      const next = institutionFromBranding(branding)
      setInstitution(next)
      applyFromTheme(next.theme, isDark)
      writeDemoThemeId(next.theme.themeId)
      return
    }

    if (sessionMode === 'demo') {
      const demo = readDemoInstitution()
      const theme = paletteById(readDemoThemeId())
      setInstitution({ ...demo, theme })
      applyFromTheme(theme, isDark)
      return
    }

    const slate = defaultPalette()
    setInstitution({ ...defaultInstitution, theme: slate })
    applyFromTheme(slate, isDark)
  }, [
    authUser?.branding,
    authUser?.isSuperAdmin,
    authUser?.portal,
    sessionMode,
    activeAccount?.portal,
    activeAccount?.id,
    isDark,
  ])

  const setInstitutionTheme = useCallback(
    async (themeId, { persistDemo = false } = {}) => {
      const nextTheme = paletteById(themeId)
      setInstitution((prev) => ({ ...prev, theme: nextTheme }))
      applyFromTheme(nextTheme, isDark)
      writeDemoThemeId(themeId)
      if (sessionMode === 'auth') {
        await refreshAuth()
      }
    },
    [refreshAuth, sessionMode, isDark],
  )

  const applyInstitution = useCallback(
    (partial, { persistDemo = false } = {}) => {
      setInstitution((prev) => {
        const merged = { ...prev, ...partial }
        if (persistDemo || sessionMode === 'demo') {
          writeDemoInstitution({
            institutionName: merged.institutionName,
            acronym: merged.acronym,
            logo: merged.logo,
            maxWarnings: merged.maxWarnings,
          })
        }
        return merged
      })
      if (partial.theme) {
        applyFromTheme(partial.theme, isDark)
      }
    },
    [sessionMode, isDark],
  )

  const value = useMemo(
    () => ({
      institution,
      acronym: institution.acronym,
      logo: institution.logo,
      theme: institution.theme,
      palettes: THEME_PALETTES,
      setInstitutionTheme,
      applyInstitution,
      refreshBranding: refreshAuth,
    }),
    [institution, setInstitutionTheme, applyInstitution, refreshAuth],
  )

  return (
    <InstitutionThemeContext.Provider value={value}>{children}</InstitutionThemeContext.Provider>
  )
}

export function useInstitutionTheme() {
  const ctx = useContext(InstitutionThemeContext)
  if (!ctx) {
    throw new Error('useInstitutionTheme must be used within InstitutionThemeProvider')
  }
  return ctx
}
