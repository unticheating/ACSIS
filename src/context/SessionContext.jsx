import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchAuthMe, logoutAuth } from '@/lib/authApi.js'

const STORAGE_ACCOUNT = 'acsis.activeAccountId'
const STORAGE_SESSION_MODE = 'acsis.sessionMode'
const STORAGE_ACADEMIC = 'acsis.academic'

/** @type {{ id: string, displayName: string, roleLabel: string, portal: 'admin' | 'teacher' | 'student' | 'super_admin', entryPath: string, avatarLetter: string, isSuperAdmin?: boolean }[]} */
export const demoAccounts = [
  {
    id: 'super',
    displayName: 'ACSIS Super Admin',
    roleLabel: 'Super administrator',
    portal: 'super_admin',
    entryPath: '/super-admin',
    avatarLetter: 'S',
    isSuperAdmin: true,
  },
  {
    id: 'admin',
    displayName: 'PLP Admin',
    roleLabel: 'Administrator',
    portal: 'admin',
    entryPath: '/admin',
    avatarLetter: 'A',
  },
  {
    id: 'faculty',
    displayName: 'JUANITO ALVAREZ JR',
    roleLabel: 'Faculty',
    portal: 'teacher',
    entryPath: '/teacher',
    avatarLetter: 'J',
  },
  {
    id: 'student',
    displayName: 'RICHELLE D. BENITEZ',
    roleLabel: 'Student',
    portal: 'student',
    entryPath: '/student/my-classes',
    avatarLetter: 'R',
  },
]

function loadAcademic() {
  try {
    const raw = localStorage.getItem(STORAGE_ACADEMIC)
    if (!raw) return { yearLabel: 'A.Y. 2025-2026', semester: '1st Semester' }
    const p = JSON.parse(raw)
    return {
      yearLabel: typeof p.yearLabel === 'string' ? p.yearLabel : 'A.Y. 2025-2026',
      semester: typeof p.semester === 'string' ? p.semester : '1st Semester',
    }
  } catch {
    return { yearLabel: 'A.Y. 2025-2026', semester: '1st Semester' }
  }
}

function loadAccountId() {
  const id = localStorage.getItem(STORAGE_ACCOUNT)
  if (id && demoAccounts.some((a) => a.id === id)) return id
  return 'admin'
}

function loadSessionMode() {
  const mode = localStorage.getItem(STORAGE_SESSION_MODE)
  if (mode === 'demo' || mode === 'google') return mode
  return null
}

/** @param {Record<string, unknown> | null | undefined} user */
function accountFromAuthUser(user) {
  if (!user?.portal || !user.entryPath) return null
  return {
    id: `google-${user.uid}`,
    displayName: user.displayName,
    roleLabel: user.roleLabel || 'User',
    portal: user.portal,
    entryPath: user.entryPath,
    avatarLetter: user.avatarLetter,
    isSuperAdmin: user.isSuperAdmin,
  }
}

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeAccountId, setActiveAccountId] = useState(loadAccountId)
  const [sessionMode, setSessionMode] = useState(loadSessionMode)
  const [academic, setAcademicState] = useState(loadAcademic)
  const [authUser, setAuthUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchAuthMe()
        if (cancelled) return
        if (data.authenticated && data.user) {
          setAuthUser(data.user)
          setSessionMode('google')
          localStorage.setItem(STORAGE_SESSION_MODE, 'google')
        } else {
          setAuthUser(null)
          if (localStorage.getItem(STORAGE_SESSION_MODE) === 'google') {
            localStorage.removeItem(STORAGE_SESSION_MODE)
            setSessionMode(null)
          }
        }
      } catch {
        /* API offline — demo mode still works */
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const demoAccount = useMemo(
    () => demoAccounts.find((a) => a.id === activeAccountId) ?? demoAccounts[0],
    [activeAccountId],
  )

  const googleAccount = useMemo(() => accountFromAuthUser(authUser), [authUser])

  const activeAccount = useMemo(() => {
    if (sessionMode === 'google' && googleAccount) return googleAccount
    return demoAccount
  }, [sessionMode, googleAccount, demoAccount])

  const isAuthenticated =
    (sessionMode === 'google' && Boolean(authUser?.portal)) ||
    (sessionMode === 'demo' && Boolean(demoAccount))

  useEffect(() => {
    if (sessionMode !== 'demo') return
    const path = location.pathname
    const portal = path.startsWith('/super-admin')
      ? 'super_admin'
      : path.startsWith('/admin')
        ? 'admin'
        : path.startsWith('/teacher')
          ? 'teacher'
          : path.startsWith('/student')
            ? 'student'
            : null
    if (!portal) return
    const match = demoAccounts.find((a) => a.portal === portal)
    if (!match) return
    setActiveAccountId((current) => {
      if (match.id !== current) {
        localStorage.setItem(STORAGE_ACCOUNT, match.id)
        return match.id
      }
      return current
    })
  }, [location.pathname, sessionMode])

  const setActiveAccount = useCallback((id) => {
    setActiveAccountId(id)
    localStorage.setItem(STORAGE_ACCOUNT, id)
  }, [])

  const switchAccount = useCallback(
    (account) => {
      setSessionMode('demo')
      localStorage.setItem(STORAGE_SESSION_MODE, 'demo')
      setActiveAccount(account.id)
      navigate(account.entryPath)
    },
    [navigate, setActiveAccount],
  )

  const logout = useCallback(async () => {
    try {
      await logoutAuth()
    } catch {
      /* ignore */
    }
    setAuthUser(null)
    setSessionMode(null)
    localStorage.removeItem(STORAGE_SESSION_MODE)
    localStorage.removeItem(STORAGE_ACCOUNT)
    navigate('/', { replace: true })
  }, [navigate])

  const refreshAuth = useCallback(async () => {
    const data = await fetchAuthMe()
    if (data.authenticated && data.user) {
      setAuthUser(data.user)
      setSessionMode('google')
      localStorage.setItem(STORAGE_SESSION_MODE, 'google')
      return data.user
    }
    setAuthUser(null)
    return null
  }, [])

  const updateAcademic = useCallback((next) => {
    setAcademicState((prev) => {
      const merged = { ...prev, ...next }
      localStorage.setItem(STORAGE_ACADEMIC, JSON.stringify(merged))
      return merged
    })
  }, [])

  const value = useMemo(
    () => ({
      accounts: demoAccounts,
      activeAccount,
      switchAccount,
      academic,
      updateAcademic,
      authUser,
      authLoading,
      isAuthenticated,
      sessionMode,
      logout,
      refreshAuth,
    }),
    [
      activeAccount,
      academic,
      authLoading,
      authUser,
      isAuthenticated,
      logout,
      refreshAuth,
      sessionMode,
      switchAccount,
      updateAcademic,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return ctx
}
