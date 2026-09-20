import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { uid, colorForName, decodePayload, nameFromEmail } from './lib/utils'
import { ADMIN_EMAIL, isAdminEmail } from './config'

const STORAGE_KEY = 'novi.task-manager.v1'

export const ACCENTS = ['blue', 'teal', 'violet', 'amber', 'rose', 'slate']

// Boards created before the redesign carry a scene name; map those to an accent.
const LEGACY_ACCENTS = {
  night: 'blue',
  sunset: 'rose',
  forest: 'teal',
  violet: 'violet',
  ember: 'amber',
  slate: 'slate',
}

export const accentOf = (board) => {
  const value = board?.accent ?? board?.scene
  if (ACCENTS.includes(value)) return value
  return LEGACY_ACCENTS[value] ?? 'blue'
}

/**
 * Board roles. Owner manages the board and who is on it, editor does the work,
 * viewer can read it but cannot add or change anything.
 */
export const ROLES = {
  owner: { label: 'Owner', hint: 'Manages the board, its people and their roles' },
  editor: { label: 'Editor', hint: 'Can add, edit and move tasks' },
  viewer: { label: 'Viewer', hint: 'Can read the board only' },
}

/** The workspace admin outranks whatever role a board or folder records. */
export const isAdmin = (user) => isAdminEmail(user?.email)

export const roleOf = (board, userId) => {
  const member = board?.members.find((m) => m.id === userId)
  if (!member) return null
  if (isAdminEmail(member.email)) return 'owner'
  if (member.role) return member.role
  // Boards saved before roles existed: the creator owns it, everyone else edits.
  if (board.ownerId) return board.ownerId === userId ? 'owner' : 'editor'
  return board.members[0]?.id === userId ? 'owner' : 'editor'
}

export const canEdit = (board, user) =>
  isAdmin(user) || ['owner', 'editor'].includes(roleOf(board, user?.id))

export const canManage = (board, user) => isAdmin(user) || roleOf(board, user?.id) === 'owner'

/**
 * Folder membership is the source of truth for who works on a client or
 * project: adding someone to a folder puts them on every board inside it.
 */
export const folderMembers = (folder) => folder?.members ?? []

export const folderRoleOf = (folder, userId) => {
  const member = folderMembers(folder).find((m) => m.id === userId)
  if (member) return isAdminEmail(member.email) ? 'owner' : member.role ?? 'editor'
  // Folders saved before membership existed belong to whoever opens them.
  return folderMembers(folder).length === 0 ? 'owner' : null
}

export const canManageFolder = (folder, user) =>
  isAdmin(user) || folderRoleOf(folder, user?.id) === 'owner'

export const DEFAULT_LISTS = () => [
  { id: uid('list'), title: 'To Do' },
  { id: uid('list'), title: 'Doing' },
  { id: uid('list'), title: 'Done' },
]

export const PRIORITIES = {
  low: { label: 'Low', chip: 'bg-slate-50 text-slate-600 border-slate-200' },
  medium: { label: 'Medium', chip: 'bg-warning-soft text-warning border-amber-200' },
  high: { label: 'High', chip: 'bg-danger-soft text-danger border-red-200' },
}

/* ---------------- seed ---------------- */

function seed() {
  const folderId = uid('fold')
  const boardId = uid('board')
  const lists = DEFAULT_LISTS()
  const owner = {
    id: uid('user'),
    name: 'Hussein',
    email: ADMIN_EMAIL,
    color: colorForName('Hussein'),
    role: 'owner',
  }
  const ali = {
    id: uid('user'),
    name: 'Ali',
    email: 'ali@teka.co',
    color: colorForName('Ali'),
    role: 'editor',
  }

  const inTwoDays = new Date(Date.now() + 2 * 86400000)
  inTwoDays.setHours(17, 0, 0, 0)
  const tomorrow = new Date(Date.now() + 86400000)
  tomorrow.setHours(10, 30, 0, 0)

  return {
    user: null,
    folders: [
      {
        id: folderId,
        name: 'Clients',
        emoji: '\u{1F4BC}',
        ownerId: owner.id,
        members: [owner, ali],
      },
    ],
    boards: [
      {
        id: boardId,
        folderId,
        name: 'Teka and Fontain tasks',
        accent: 'blue',
        ownerId: owner.id,
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
      const email = action.email?.trim() ?? ''
      const everyone = [
        ...state.folders.flatMap((f) => folderMembers(f)),
        ...state.boards.flatMap((b) => b.members),
      ]
      const existing =
        (email && everyone.find((m) => m.email?.toLowerCase() === email.toLowerCase())) ||
        everyone.find((m) => m.name.toLowerCase() === name.toLowerCase())

      const user = {
        ...(existing ?? { id: uid('user'), color: colorForName(email || name), role: 'editor' }),
        name: name || existing?.name || nameFromEmail(email),
        email: email || existing?.email,
      }
      const admin = isAdminEmail(user.email)

      // The admin owns everything; anyone else joins what they are not on yet.
      const seat = (members) => {
        const current = members.find((m) => m.id === user.id)
        if (current) {
          return members.map((m) =>
            m.id === user.id ? { ...m, ...user, role: admin ? 'owner' : (m.role ?? 'editor') } : m,
          )
        }
        const role = admin || members.length === 0 ? 'owner' : 'editor'
        return [...members, { ...user, role }]
      }

      return {
        ...state,
        user,
        folders: state.folders.map((f) => ({
          ...f,
          ownerId: admin ? user.id : f.ownerId,
          members: seat(folderMembers(f)),
        })),
        boards: state.boards.map((b) => ({
          ...b,
          ownerId: admin ? user.id : b.ownerId,
          members: seat(b.members),
        })),
      }
    }

    case 'logout':
      return { ...state, user: null }

    case 'addFolder': {
      const folder = {
        id: uid('fold'),
        name: action.name,
        emoji: action.emoji ?? '\u{1F4C1}',
        ownerId: state.user?.id ?? null,
        members: state.user ? [{ ...state.user, role: 'owner' }] : [],
      }
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
        accent: action.accent ?? 'blue',
        ownerId: state.user?.id ?? null,
        lists: DEFAULT_LISTS(),
        members: state.user ? [{ ...state.user, role: 'owner' }] : [],
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

    case 'addFolderMember': {
      const folder = state.folders.find((f) => f.id === action.folderId)
      if (!folder) return state
      const email = (action.email ?? '').trim()
      const name = (action.name ?? '').trim() || (email ? nameFromEmail(email) : '')
      if (!name) return state

      const taken = folderMembers(folder).some(
        (m) =>
          m.name.toLowerCase() === name.toLowerCase() ||
          (email && m.email?.toLowerCase() === email.toLowerCase()),
      )
      if (taken) return state

      const member = {
        id: uid('user'),
        name,
        email: email || undefined,
        color: colorForName(email || name),
        role: action.role ?? 'editor',
      }

      return {
        ...state,
        folders: state.folders.map((f) =>
          f.id === action.folderId ? { ...f, members: [...folderMembers(f), member] } : f,
        ),
        // everyone in a folder is on that folder's boards
        boards: state.boards.map((b) =>
          b.folderId === action.folderId && !b.members.some((m) => m.id === member.id)
            ? { ...b, members: [...b.members, member] }
            : b,
        ),
      }
    }

    case 'setFolderMemberRole':
      return {
        ...state,
        folders: state.folders.map((f) =>
          f.id === action.folderId
            ? {
                ...f,
                members: folderMembers(f).map((m) =>
                  m.id === action.memberId ? { ...m, role: action.role } : m,
                ),
              }
            : f,
        ),
        boards: state.boards.map((b) =>
          b.folderId === action.folderId
            ? {
                ...b,
                members: b.members.map((m) =>
                  m.id === action.memberId ? { ...m, role: action.role } : m,
                ),
              }
            : b,
        ),
      }

    case 'removeFolderMember': {
      const boardIds = state.boards.filter((b) => b.folderId === action.folderId).map((b) => b.id)
      return {
        ...state,
        folders: state.folders.map((f) =>
          f.id === action.folderId
            ? { ...f, members: folderMembers(f).filter((m) => m.id !== action.memberId) }
            : f,
        ),
        boards: state.boards.map((b) =>
          b.folderId === action.folderId
            ? { ...b, members: b.members.filter((m) => m.id !== action.memberId) }
            : b,
        ),
        cards: state.cards.map((c) =>
          boardIds.includes(c.boardId) && c.assigneeId === action.memberId
            ? { ...c, assigneeId: null }
            : c,
        ),
      }
    }

    case 'addMember': {
      const name = action.name.trim()
      if (!name) return state
      const board = state.boards.find((b) => b.id === action.boardId)
      if (!board) return state
      const invitedEmail = action.email?.trim().toLowerCase()
      const alreadyOnBoard = board.members.some(
        (m) =>
          m.name.toLowerCase() === name.toLowerCase() ||
          (invitedEmail && m.email?.toLowerCase() === invitedEmail),
      )
      if (alreadyOnBoard) return state
      const member = {
        id: uid('user'),
        name,
        email: action.email?.trim() || undefined,
        color: colorForName(action.email?.trim() || name),
        role: action.role ?? 'editor',
      }
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.boardId ? { ...b, members: [...b.members, member] } : b,
        ),
      }
    }

    case 'setMemberRole':
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.boardId
            ? {
                ...b,
                members: b.members.map((m) =>
                  m.id === action.memberId ? { ...m, role: action.role } : m,
                ),
              }
            : b,
        ),
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

    case 'importFolder': {
      const { folder, boards = [], cards = [] } = action.payload
      if (!folder) return state
      const exists = state.folders.some((f) => f.id === folder.id)
      const boardIds = boards.map((b) => b.id)
      return {
        ...state,
        folders: exists
          ? state.folders.map((f) => (f.id === folder.id ? folder : f))
          : [...state.folders, folder],
        boards: [...state.boards.filter((b) => !boardIds.includes(b.id)), ...boards],
        cards: [...state.cards.filter((c) => !boardIds.includes(c.boardId)), ...cards],
        activeBoardId: boards[0]?.id ?? state.activeBoardId,
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
    if (payload?.folder) dispatch({ type: 'importFolder', payload })
    else if (payload?.board) dispatch({ type: 'importBoard', payload })
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
