import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { formatDue } from './utils'

const TICK = 20000 // check every 20s

/**
 * Watches every card with a deadline and fires a reminder once the card enters
 * its "remind before" window (or once it goes overdue). Reminders surface as
 * in-app toasts, plus a desktop notification when the browser allows it.
 */
export function useReminders() {
  const { state, dispatch } = useStore()
  const [toasts, setToasts] = useState([])
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  )
  const stateRef = useRef(state)
  stateRef.current = state
  // Cards already handled in this session. The reducer also stores notifiedAt,
  // but this guards the window between firing and the next render.
  const firedRef = useRef(new Set())

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const askPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  useEffect(() => {
    const check = () => {
      const now = Date.now()
      const current = stateRef.current
      const due = current.cards.filter((card) => {
        if (!card.dueDate || card.done || card.notifiedAt) return false
        if (firedRef.current.has(card.id)) return false
        const lead = (card.remindBefore ?? 60) * 60000
        return new Date(card.dueDate).getTime() - lead <= now
      })

      due.forEach((card) => {
        firedRef.current.add(card.id)
        const board = current.boards.find((b) => b.id === card.boardId)
        const overdue = new Date(card.dueDate).getTime() < now
        const body = `${overdue ? 'Overdue' : 'Due'} ${formatDue(card.dueDate)}${
          board ? ` · ${board.name}` : ''
        }`

        dispatch({ type: 'markNotified', id: card.id })
        setToasts((t) => [{ id: card.id + now, cardId: card.id, title: card.title, body, overdue }, ...t].slice(0, 4))

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(card.title, { body, tag: card.id })
          } catch {
            /* some browsers block constructing notifications outside a SW */
          }
        }
      })
    }

    check()
    const timer = setInterval(check, TICK)
    return () => clearInterval(timer)
  }, [dispatch])

  return { toasts, dismissToast, permission, askPermission }
}
