import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { uid, colorForName, decodePayload } from './lib/utils'

const STORAGE_KEY = 'novi.task-manager.v1'

export const SCENES = ['night', 'sunset', 'forest', 'violet', 'ember', 'slate']

export const DEFAULT_LISTS = () => [
  { id: uid('list'), title: 'To Do' },
  { id: uid('list'), title: 'Doing' },
  { id: uid('list'), title: 'Done' },
]

export const PRIORITIES = {
  low: { label: 'Low', chip: 'bg-sky-400/15 text-sky-200 border-sky-300/25' },
  medium: { label: 'Medium', chip: 'bg-amber-400/15 text-amber-200 border-amber-300/25' },
  high: { label: 'High', chip: 'bg-rose-500/15 text-rose-200 border-rose-400/25' },
}

/* ---------------- seed ---------------- */

function seed() {
  const folderId = uid('fold')
  const boardId = uid('board')
  const lists = DEFAULT_LISTS()
  const owner = { id: uid('user'), name: 'Hussein', color: colorForName('Hussein') }
  const ali = { id: uid('user'), name: 'Ali', color: colorForName('Ali') }

  const inTwoDays = new Date(Date.now() + 2 * 86400000)
  inTwoDays.setHours(17, 0, 0, 0)
  const tomorrow = new Date(Date.now() + 86400000)
  tomorrow.setHours(10, 30, 0, 0)

  return {
    user: null,
    folders: [{ id: folderId, name: 'Clients', emoji: '\u{1F4BC}' }],
    boards: [
      {
        id: boardId,
        folderId,
        name: 'Teka and Fontain tasks',
        scene: 'night',
        lists,
        members: [owner, ali],
        createdAt: Date.now(),
      },
    ],
    cards: [
      {
        id: uid('card'),
        boardId,
        listId: lists[0].id,
        title: 'Create 2 posts next week by ALI',
        description: 'Draft the copy and visuals, then hand over for review.',
        dueDate: inTwoDays.toISOString(),
        remindBefore: 60,
        assigneeId: ali.id,
        priority: 'high',
        done: false,
        createdAt: Date.now(),
      },
      {
        id: uid('card'),
        boardId,
        listId: lists[1].id,
        title: 'Shoot the storefront photos',
        description: '',
        dueDate: tomorrow.toISOString(),
        remindBefore: 60,
        assigneeId: owner.id,
        priority: 'medium',
        done: false,
        createdAt: Date.now(),
      },
      {
        id: uid('card'),
        boardId,
        listId: lists[2].id,
        title: 'Send the September invoice',
        description: '',
        dueDate: null,
        remindBefore: 60,
        assigneeId: owner.id,
        priority: 'low',
        done: true,
        createdAt: Date.now(),
      },
    ],
    activeBoardId: boardId,
    notifications: [],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.boards)) return seed()
    return { ...seed(), ...parsed, notifications: parsed.notifications ?? [] }
  } catch {
    return seed()
  }
}

/* ---------------- reducer ---------------- */

function reducer(state, action) {
  switch (action.type) {
    case 'login': {
      const name = action.name.trim()
      const existing = state.boards
        .flatMap((b) => b.members)
        .find((m) => m.name.toLowerCase() === name.toLowerCase())
      const user = existing ?? { id: uid('user'), name, color: colorForName(name) }
      const boards = state.boards.map((b) =>
        b.members.some((m) => m.id === user.id) ? b : { ...b, members: [...b.members, user] },
      )
      return { ...state, user, boards }
    }

    case 'logout':
      return { ...state, user: null }

    case 'addFolder': {
      const folder = { id: uid('fold'), name: action.name, emoji: action.emoji ?? '\u{1F4C1}' }
      return { ...state, folders: [...state.folders, folder] }
    }

    case 'renameFolder':
      return {
        ...state,
        folders: state.folders.map((f) => (f.id === action.id ? { ...f, name: action.name } : f)),
      }

    case 'deleteFolder': {
      const boardIds = state.boards.filter((b) => b.folderId === action.id).map((b) => b.id)
      return {
        ...state,
        folders: state.folders.filter((f) => f.id !== action.id),
        boards: state.boards.filter((b) => b.folderId !== action.id),
        cards: state.cards.filter((c) => !boardIds.includes(c.boardId)),
        activeBoardId: boardIds.includes(state.activeBoardId) ? null : state.activeBoardId,
      }
    }

    case 'addBoard': {
      const board = {
        id: uid('board'),
        folderId: action.folderId ?? state.folders[0]?.id ?? null,
        name: action.name,
        scene: action.scene ?? 'night',
        lists: DEFAULT_LISTS(),
        members: state.user ? [state.user] : [],
        createdAt: Date.now(),
      }
      return { ...state, boards: [...state.boards, board], activeBoardId: board.id }
    }

    case 'updateBoard':
      return {
        ...state,
        boards: state.boards.map((b) => (b.id === action.id ? { ...b, ...action.patch } : b)),
      }

    case 'deleteBoard':
      return {
        ...state,
        boards: state.boards.filter((b) => b.id !== action.id),
        cards: state.cards.filter((c) => c.boardId !== action.id),
        activeBoardId: state.activeBoardId === action.id ? null : state.activeBoardId,
      }

    case 'setActiveBoard':
      return { ...state, activeBoardId: action.id }

    case 'addList':
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.boardId
            ? { ...b, lists: [...b.lists, { id: uid('list'), title: action.title }] }
            : b,
        ),
      }

    case 'renameList':
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.boardId
            ? {
                ...b,
                lists: b.lists.map((l) =>
                  l.id === action.listId ? { ...l, title: action.title } : l,
                ),
              }
            : b,
        ),
      }

    case 'deleteList':
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.boardId
            ? { ...b, lists: b.lists.filter((l) => l.id !== action.listId) }
            : b,
        ),
        cards: state.cards.filter((c) => c.listId !== action.listId),
      }

    case 'addMember': {
      const name = action.name.trim()
      if (!name) return state
      const board = state.boards.find((b) => b.id === action.boardId)
      if (!board) return state
      if (board.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) return state
      const member = { id: uid('user'), name, color: colorForName(name) }
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.boardId ? { ...b, members: [...b.members, member] } : b,
        ),
      }
    }

    case 'removeMember':
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.boardId
            ? { ...b, members: b.members.filter((m) => m.id !== action.memberId) }
            : b,
        ),
        cards: state.cards.map((c) =>
          c.boardId === action.boardId && c.assigneeId === action.memberId
            ? { ...c, assigneeId: null }
            : c,
        ),
      }

    case 'addCard': {
      const card = {
        id: uid('card'),
        boardId: action.boardId,
        listId: action.listId,
        title: action.title,
        description: '',
        dueDate: null,
        remindBefore: 60,
        assigneeId: action.assigneeId ?? null,
        priority: 'medium',
        done: false,
        createdAt: Date.now(),
      }
      return { ...state, cards: [...state.cards, card] }
    }

    case 'updateCard':
      return {
        ...state,
        cards: state.cards.map((c) => {
          if (c.id !== action.id) return c
          const next = { ...c, ...action.patch }
          // a new deadline means the old reminder no longer applies
          if ('dueDate' in action.patch && action.patch.dueDate !== c.dueDate) next.notifiedAt = null
          if ('remindBefore' in action.patch && action.patch.remindBefore !== c.remindBefore) {
            next.notifiedAt = null
          }
          return next
        }),
      }

    case 'deleteCard':
      return {
        ...state,
        cards: state.cards.filter((c) => c.id !== action.id),
        notifications: state.notifications.filter((n) => n.cardId !== action.id),
      }

    case 'moveCard': {
      const { cardId, toListId, toIndex } = action
      const moving = state.cards.find((c) => c.id === cardId)
      if (!moving) return state

      const board = state.boards.find((b) => b.id === moving.boardId)
      const lastListId = board?.lists[board.lists.length - 1]?.id
      const changedList = moving.listId !== toListId
      const updated = {
        ...moving,
        listId: toListId,
        done: toListId === lastListId ? true : changedList ? false : moving.done,
      }

      const rest = state.cards.filter((c) => c.id !== cardId)
      const others = rest.filter((c) => c.listId !== toListId)
      const target = rest.filter((c) => c.listId === toListId)
      const index = Math.max(0, Math.min(toIndex ?? target.length, target.length))
      target.splice(index, 0, updated)
      return { ...state, cards: [...others, ...target] }
    }

    case 'toggleDone': {
      const card = state.cards.find((c) => c.id === action.id)
      if (!card) return state
      const board = state.boards.find((b) => b.id === card.boardId)
      const lastListId = board?.lists[board.lists.length - 1]?.id
      const firstListId = board?.lists[0]?.id
      const done = !card.done
      return {
        ...state,
        cards: state.cards.map((c) =>
          c.id === action.id
            ? {
                ...c,
                done,
                listId: done ? lastListId ?? c.listId : c.listId === lastListId ? firstListId ?? c.listId : c.listId,
              }
            : c,
        ),
      }
    }

    case 'markNotified':
      return {
        ...state,
        cards: state.cards.map((c) => (c.id === action.id ? { ...c, notifiedAt: Date.now() } : c)),
        notifications: [
          { id: uid('note'), cardId: action.id, at: Date.now(), read: false },
          ...state.notifications,
        ].slice(0, 50),
      }

    case 'readNotifications':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) }

    case 'clearNotifications':
      return { ...state, notifications: [] }

    case 'importBoard': {
      const { board, cards } = action.payload
      if (!board) return state
      const folderId = state.folders.some((f) => f.id === board.folderId)
        ? board.folderId
        : state.folders[0]?.id ?? null
      const exists = state.boards.some((b) => b.id === board.id)
      const boards = exists
        ? state.boards.map((b) => (b.id === board.id ? { ...board, folderId } : b))
        : [...state.boards, { ...board, folderId }]
      return {
        ...state,
        boards,
        cards: [...state.cards.filter((c) => c.boardId !== board.id), ...(cards ?? [])],
        activeBoardId: board.id,
      }
    }

    case 'reset':
      return { ...seed(), user: state.user }

    default:
      return state
  }
}

/* ---------------- context ---------------- */

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable: the app still works for this session */
    }
  }, [state])

  // Accept invite links of the form ?join=<code>
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('join')
    if (!code) return
    const payload = decodePayload(code)
    if (payload?.board) dispatch({ type: 'importBoard', payload })
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

export const cardsOfBoard = (state, boardId) => state.cards.filter((c) => c.boardId === boardId)
export const cardsOfList = (state, listId) => state.cards.filter((c) => c.listId === listId)
