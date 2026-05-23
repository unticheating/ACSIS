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
    displayName: 'ACSIS Admin',
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
  // Only use sessionStorage for demo accounts. localStorage should only be for real auth.
  const id = sessionStorage.getItem(STORAGE_ACCOUNT)
  if (id && demoAccounts.some((a) => a.id === id)) return id
  return 'super' // default fallback if no demo account active
}

function loadSessionMode() {
  // Check sessionStorage first for demo
  const sMode = sessionStorage.getItem(STORAGE_SESSION_MODE)
  if (sMode === 'demo') return 'demo'

  // Only check localStorage for real auth
  const lMode = localStorage.getItem(STORAGE_SESSION_MODE)
  if (lMode === 'auth' || lMode === 'google') return 'auth'
  
  // Clean up legacy demo from localStorage if it exists
  if (lMode === 'demo') {
    localStorage.removeItem(STORAGE_SESSION_MODE)
    localStorage.removeItem(STORAGE_ACCOUNT)
  }
  
  return null
}

/** @param {Record<string, unknown> | null | undefined} user */
function accountFromAuthUser(user) {
  if (!user?.portal || !user.entryPath) return null
  return {
    id: `auth-${user.uid}`,
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
          setSessionMode('auth')
          localStorage.setItem(STORAGE_SESSION_MODE, 'auth')
        } else {
          setAuthUser(null)
          const stored = localStorage.getItem(STORAGE_SESSION_MODE)
          if (stored === 'auth' || stored === 'google') {
            localStorage.removeItem(STORAGE_SESSION_MODE)
            if (sessionMode !== 'demo') {
              setSessionMode(null)
            }
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const demoAccount = useMemo(
    () => demoAccounts.find((a) => a.id === activeAccountId) ?? demoAccounts[0],
    [activeAccountId],
  )

  const googleAccount = useMemo(() => accountFromAuthUser(authUser), [authUser])

  const activeAccount = useMemo(() => {
    if (sessionMode === 'auth' && googleAccount) return googleAccount
    return demoAccount
  }, [sessionMode, googleAccount, demoAccount])

  const isAuthenticated =
    (sessionMode === 'auth' && Boolean(authUser?.portal)) ||
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
        sessionStorage.setItem(STORAGE_ACCOUNT, match.id)
        return match.id
      }
      return current
    })
  }, [location.pathname, sessionMode])

  const setActiveAccount = useCallback((id) => {
    setActiveAccountId(id)
    if (sessionMode === 'demo') {
      sessionStorage.setItem(STORAGE_ACCOUNT, id)
    } else {
      localStorage.setItem(STORAGE_ACCOUNT, id)
    }
  }, [sessionMode])

  const switchAccount = useCallback(
    (account) => {
      setSessionMode('demo')
      sessionStorage.setItem(STORAGE_SESSION_MODE, 'demo')
      setActiveAccountId(account.id)
      sessionStorage.setItem(STORAGE_ACCOUNT, account.id)
      navigate(account.entryPath)
    },
    [navigate],
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
    sessionStorage.removeItem(STORAGE_SESSION_MODE)
    sessionStorage.removeItem(STORAGE_ACCOUNT)
    navigate('/', { replace: true })
  }, [navigate])

  const refreshAuth = useCallback(async () => {
    const data = await fetchAuthMe()
    if (data.authenticated && data.user) {
      setAuthUser(data.user)
      setSessionMode('auth')
      localStorage.setItem(STORAGE_SESSION_MODE, 'auth')
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
