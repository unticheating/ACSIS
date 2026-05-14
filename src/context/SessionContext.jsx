import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const STORAGE_ACCOUNT = 'acsis.activeAccountId'
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

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeAccountId, setActiveAccountId] = useState(loadAccountId)
  const [academic, setAcademicState] = useState(loadAcademic)

  const activeAccount = useMemo(
    () => demoAccounts.find((a) => a.id === activeAccountId) ?? demoAccounts[0],
    [activeAccountId],
  )

  useEffect(() => {
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
  }, [location.pathname])

  const setActiveAccount = useCallback((id) => {
    setActiveAccountId(id)
    localStorage.setItem(STORAGE_ACCOUNT, id)
  }, [])

  const switchAccount = useCallback(
    (account) => {
      setActiveAccount(account.id)
      navigate(account.entryPath)
    },
    [navigate, setActiveAccount],
  )

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
    }),
    [activeAccount, academic, switchAccount, updateAcademic],
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
