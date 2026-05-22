import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const DetectionsToolbarContext = createContext(null)

export function DetectionsToolbarProvider({ children }) {
  const [toolbar, setToolbarState] = useState(null)

  const setToolbar = useCallback((next) => {
    setToolbarState(next)
  }, [])

  const value = useMemo(() => ({ toolbar, setToolbar }), [toolbar, setToolbar])

  return (
    <DetectionsToolbarContext.Provider value={value}>{children}</DetectionsToolbarContext.Provider>
  )
}

export function useDetectionsToolbar() {
  return useContext(DetectionsToolbarContext)
}
