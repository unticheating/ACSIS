import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'

/** Longer than @hello-pangea/dnd default (120ms) so vertical scroll is easier on mobile. */
const LONG_PRESS_MS = 450
const FORCE_PRESS_THRESHOLD = 0.15
const ESCAPE_KEY = 27

const idle = { type: 'IDLE' }
const noop = () => {}

function bindEvents(el, bindings, sharedOptions) {
  bindings.forEach(({ eventName, fn, options }) => {
    el.addEventListener(eventName, fn, { ...sharedOptions, ...options })
  })
  return () => {
    bindings.forEach(({ eventName, fn, options }) => {
      el.removeEventListener(eventName, fn, { ...sharedOptions, ...options })
    })
  }
}

function getWindowBindings({ cancel, getPhase }) {
  return [
    { eventName: 'orientationchange', fn: cancel },
    { eventName: 'resize', fn: cancel },
    {
      eventName: 'contextmenu',
      fn: (event) => {
        event.preventDefault()
      },
    },
    {
      eventName: 'keydown',
      fn: (event) => {
        if (getPhase().type !== 'DRAGGING') {
          cancel()
          return
        }
        if (event.keyCode === ESCAPE_KEY) {
          event.preventDefault()
        }
        cancel()
      },
    },
    { eventName: 'visibilitychange', fn: cancel },
  ]
}

function getHandleBindings({ cancel, completed, getPhase }) {
  return [
    {
      eventName: 'touchmove',
      options: { capture: false },
      fn: (event) => {
        const phase = getPhase()
        if (phase.type !== 'DRAGGING') {
          cancel()
          return
        }
        phase.hasMoved = true
        const { clientX, clientY } = event.touches[0]
        event.preventDefault()
        phase.actions.move({ x: clientX, y: clientY })
      },
    },
    {
      eventName: 'touchend',
      fn: (event) => {
        const phase = getPhase()
        if (phase.type !== 'DRAGGING') {
          cancel()
          return
        }
        event.preventDefault()
        phase.actions.drop({ shouldBlockNextClick: true })
        completed()
      },
    },
    {
      eventName: 'touchcancel',
      fn: (event) => {
        if (getPhase().type !== 'DRAGGING') {
          cancel()
          return
        }
        event.preventDefault()
        cancel()
      },
    },
    {
      eventName: 'touchforcechange',
      fn: (event) => {
        const phase = getPhase()
        if (phase.type === 'IDLE') return

        const touch = event.touches[0]
        if (!touch || touch.force < FORCE_PRESS_THRESHOLD) return

        const shouldRespect = phase.actions.shouldRespectForcePress()
        if (phase.type === 'PENDING') {
          if (shouldRespect) cancel()
          return
        }
        if (shouldRespect) {
          if (phase.hasMoved) {
            event.preventDefault()
            return
          }
          cancel()
          return
        }
        event.preventDefault()
      },
    },
    { eventName: 'visibilitychange', fn: cancel },
  ]
}

/**
 * Touch sensor for @hello-pangea/dnd with a longer long-press delay so list scroll
 * is not accidentally interrupted on mobile.
 *
 * @param {import('@hello-pangea/dnd').SensorAPI} api
 */
export default function useLongPressTouchSensor(api) {
  const phaseRef = useRef(idle)
  const unbindEventsRef = useRef(noop)

  const getPhase = useCallback(() => phaseRef.current, [])
  const setPhase = useCallback((phase) => {
    phaseRef.current = phase
  }, [])

  const listenForCaptureRef = useRef(noop)

  const stop = useCallback(() => {
    const current = phaseRef.current
    if (current.type === 'IDLE') return
    if (current.type === 'PENDING') {
      clearTimeout(current.longPressTimerId)
    }
    setPhase(idle)
    unbindEventsRef.current()
    listenForCaptureRef.current()
  }, [setPhase])

  const cancel = useCallback(() => {
    const phase = phaseRef.current
    stop()
    if (phase.type === 'DRAGGING') {
      phase.actions.cancel({ shouldBlockNextClick: true })
    }
    if (phase.type === 'PENDING') {
      phase.actions.abort()
    }
  }, [stop])

  const bindCapturingEvents = useCallback(() => {
    const options = { capture: true, passive: false }
    const args = { cancel, completed: stop, getPhase }
    const unbindTarget = bindEvents(window, getHandleBindings(args), options)
    const unbindWindow = bindEvents(window, getWindowBindings(args), options)
    unbindEventsRef.current = () => {
      unbindTarget()
      unbindWindow()
    }
  }, [cancel, getPhase, stop])

  const startDragging = useCallback(() => {
    const phase = getPhase()
    if (phase.type !== 'PENDING') return
    const actions = phase.actions.fluidLift(phase.point)
    setPhase({ type: 'DRAGGING', actions, hasMoved: false })
  }, [getPhase, setPhase])

  const startPendingDrag = useCallback(
    (actions, point) => {
      if (getPhase().type !== 'IDLE') return
      const longPressTimerId = setTimeout(startDragging, LONG_PRESS_MS)
      setPhase({ type: 'PENDING', point, actions, longPressTimerId })
      bindCapturingEvents()
    },
    [bindCapturingEvents, getPhase, setPhase, startDragging],
  )

  const startCaptureBinding = useMemo(
    () => ({
      eventName: 'touchstart',
      fn(event) {
        if (event.defaultPrevented) return
        const draggableId = api.findClosestDraggableId(event)
        if (!draggableId) return
        const actions = api.tryGetLock(draggableId, stop, { sourceEvent: event })
        if (!actions) return
        const touch = event.touches[0]
        unbindEventsRef.current()
        startPendingDrag(actions, { x: touch.clientX, y: touch.clientY })
      },
    }),
    [api, startPendingDrag, stop],
  )

  const listenForCapture = useCallback(() => {
    unbindEventsRef.current = bindEvents(window, [startCaptureBinding], {
      capture: true,
      passive: false,
    })
  }, [startCaptureBinding])

  listenForCaptureRef.current = listenForCapture

  useLayoutEffect(() => {
    listenForCapture()
    return () => {
      unbindEventsRef.current()
      const phase = getPhase()
      if (phase.type === 'PENDING') {
        clearTimeout(phase.longPressTimerId)
        setPhase(idle)
      }
    }
  }, [getPhase, listenForCapture, setPhase])

  // Required for Safari touchmove preventDefault during drag.
  useLayoutEffect(() => {
    return bindEvents(window, [
      {
        eventName: 'touchmove',
        fn: () => {},
        options: { capture: false, passive: false },
      },
    ])
  }, [])
}
