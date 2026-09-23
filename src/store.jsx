import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { supabase, isConfigured } from './lib/supabase'
import * as api from './lib/api'
import { colorForName } from './lib/utils'
import { isAdminEmail } from './config'

/* ---------------- shared vocabulary ---------------- */

export const ACCENTS = ['blue', 'teal', 'violet', 'amber', 'rose', 'slate']

const LEGACY_ACCENTS = { night: 'blue', sunset: 'rose', forest: 'teal', ember: 'amber' }

export const accentOf = (board) => {
  const value = board?.accent ?? board?.scene
  if (ACCENTS.includes(value)) return value
  return LEGACY_ACCENTS[value] ?? 'blue'
}

export const DEFAULT_LIST_TITLES = ['To Do', 'Doing', 'Done']

export const PRIORITIES = {
  low: { label: 'Low', chip: 'bg-slate-50 text-slate-600 border-slate-200' },
  medium: { label: 'Medium', chip: 'bg-warning-soft text-warning border-amber-200' },
  high: { label: 'High', chip: 'bg-danger-soft text-danger border-red-200' },
}

export const ROLES = {
  owner: { label: 'Owner', hint: 'Manages the board, its people and their roles' },
  editor: { label: 'Editor', hint: 'Can add, edit and move tasks' },
  viewer: { label: 'Viewer', hint: 'Can read the board only' },
}

/* ---------------- who may do what ---------------- */

export const isAdmin = (user) => isAdminEmail(user?.email)

export const roleOf = (board, userId) => {
  const member = board?.members.find((m) => m.id === userId)
  if (member) return isAdminEmail(member.email) ? 'owner' : (member.role ?? 'editor')
  if (board?.ownerId && board.ownerId === userId) return 'owner'
  return null
}

export const canEdit = (board, user) =>
  isAdmin(user) || ['owner', 'editor'].includes(roleOf(board, user?.id))

export const canManage = (board, user) => isAdmin(user) || roleOf(board, user?.id) === 'owner'

export const folderMembers = (folder) => folder?.members ?? []

export const folderRoleOf = (folder, userId) => {
  const member = folderMembers(folder).find((m) => m.id === userId)
  if (member) return isAdminEmail(member.email) ? 'owner' : (member.role ?? 'editor')
  if (folder?.ownerId && folder.ownerId === userId) return 'owner'
  return null
}

export const canManageFolder = (folder, user) =>
  isAdmin(user) || folderRoleOf(folder, user?.id) === 'owner'

export const canEditFolder = (folder, user) =>
  isAdmin(user) || ['owner', 'editor'].includes(folderRoleOf(folder, user?.id))

export const cardsOfBoard = (state, boardId) => state.cards.filter((c) => c.boardId === boardId)
export const cardsOfList = (state, listId) => state.cards.filter((c) => c.listId === listId)
export const deliverablesOfBoard = (state, boardId) =>
  state.deliverables.filter((d) => d.boardId === boardId)

/* ---------------- assigning to everyone ---------------- */

// A sentinel assigneeId, not a real member: every board member owns the card.
export const EVERYONE = 'everyone'

export const memberFor = (board, assigneeId) => {
  if (assigneeId === EVERYONE) return { id: EVERYONE, name: 'Everyone', all: true }
  return board?.members.find((m) => m.id === assigneeId) ?? null
}

export const isAssignedTo = (card, memberId) =>
  Boolean(memberId) && (card.assigneeId === memberId || card.assigneeId === EVERYONE)

/* ---------------- reminders are per device ---------------- */

const NOTES_KEY = 'novi.reminders'

const loadNotes = (email) => {
  try {
    return JSON.parse(localStorage.getItem(`${NOTES_KEY}.${email}`) ?? '[]')
  } catch {
    return []
  }
}

const saveNotes = (email, notes) => {
  try {
    localStorage.setItem(`${NOTES_KEY}.${email}`, JSON.stringify(notes.slice(0, 50)))
  } catch {
    /* private mode, or storage is full */
  }
}

/* ---------------- state ---------------- */

const initialState = {
  status: isConfigured ? 'loading' : 'unconfigured',
  error: null,
  user: null,
  folders: [],
  boards: [],
  cards: [],
  meetings: [],
  deliverables: [],
  activeBoardId: null,
  notifications: [],
}

const withoutMember = (members, email) => members.filter((m) => m.id !== email)

function reducer(state, action) {
  switch (action.type) {
    case 'status':
      return { ...state, status: action.status, error: action.error ?? null }

    case 'dismissError':
      return { ...state, error: null }

    case 'session': {
      // Supabase re-validates the session whenever the tab regains focus, and
      // fires this again for the person who is already signed in. Treating that
      // as a new sign-in would reset the screen to "loading" with nothing left
      // to trigger a load, so the same person keeps what they already have.
      const sameUser = Boolean(action.user) && state.user?.id === action.user.id
      if (sameUser) return { ...state, user: action.user }

      return {
        ...state,
        user: action.user,
        notifications: action.user ? loadNotes(action.user.email) : [],
        status: action.user ? 'loading' : 'signed-out',
        folders: action.user ? state.folders : [],
        boards: action.user ? state.boards : [],
        cards: action.user ? state.cards : [],
        meetings: action.user ? state.meetings : [],
        deliverables: action.user ? state.deliverables : [],
      }
    }

    case 'hydrate': {
      const { folders, boards, cards, meetings = [], deliverables = [] } = action.data
      const activeBoardId = boards.some((b) => b.id === state.activeBoardId)
        ? state.activeBoardId
        : (boards[0]?.id ?? null)
      return { ...state, folders, boards, cards, meetings, deliverables, activeBoardId, status: 'ready' }
    }

    /* meeting boards */

    case 'addMeeting':
      return {
        ...state,
        meetings: [
          {
            id: action.id,
            boardId: action.boardId,
            title: action.title,
            createdBy: state.user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...state.meetings,
        ],
      }

    case 'renameMeeting':
      return {
        ...state,
        meetings: state.meetings.map((m) => (m.id === action.id ? { ...m, title: action.title } : m)),
      }

    case 'deleteMeeting':
    case 'meetingRemoved':
      return { ...state, meetings: state.meetings.filter((m) => m.id !== action.id) }

    // someone (maybe us) changed a meeting board: patch it in place, newest first
    case 'meetingUpserted': {
      const rest = state.meetings.filter((m) => m.id !== action.meeting.id)
      return {
        ...state,
        meetings: [action.meeting, ...rest].sort((a, b) =>
          (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
        ),
      }
    }

    case 'setActiveBoard':
      return { ...state, activeBoardId: action.id }

    /* folders */

    case 'addFolder':
      return {
        ...state,
        folders: [
          ...state.folders,
          {
            id: action.id,
            name: action.name,
            emoji: action.emoji ?? '📁',
            notes: '',
            ownerId: state.user.id,
            ownerEmail: state.user.email,
            members: [{ ...state.user, role: 'owner' }],
          },
        ],
      }

    case 'renameFolder':
      return {
        ...state,
        folders: state.folders.map((f) => (f.id === action.id ? { ...f, name: action.name } : f)),
      }

    case 'updateFolderNotes':
      return {
        ...state,
        folders: state.folders.map((f) => (f.id === action.id ? { ...f, notes: action.notes } : f)),
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

    /* boards */

    case 'addBoard': {
      const folder = state.folders.find((f) => f.id === action.folderId)
      const inherited = folderMembers(folder).map((m) => ({ ...m, inherited: true }))
      const board = {
        id: action.id,
        folderId: action.folderId,
        name: action.name,
        accent: action.accent ?? 'blue',
        ownerId: state.user.id,
        ownerEmail: state.user.email,
        lists: action.lists,
        members: [
          { ...state.user, role: 'owner' },
          ...inherited.filter((m) => m.id !== state.user.id),
        ],
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
        meetings: state.meetings.filter((m) => m.boardId !== action.id),
        deliverables: state.deliverables.filter((d) => d.boardId !== action.id),
        activeBoardId: state.activeBoardId === action.id ? null : state.activeBoardId,
      }

    /* lists */

    case 'addList':
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.boardId
            ? { ...b, lists: [...b.lists, { id: action.id, title: action.title }] }
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
                lists: b.lists.map((l) => (l.id === action.listId ? { ...l, title: action.title } : l)),
              }
            : b,
        ),
      }

    case 'deleteList':
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.boardId ? { ...b, lists: b.lists.filter((l) => l.id !== action.listId) } : b,
        ),
        cards: state.cards.filter((c) => c.listId !== action.listId),
      }

    /* people */

    case 'addFolderMember': {
      const member = {
        id: action.email,
        email: action.email,
        name: action.name,
        color: colorForName(action.email),
        role: action.role ?? 'editor',
        pending: true,
      }
      return {
        ...state,
        folders: state.folders.map((f) =>
          f.id === action.folderId && !folderMembers(f).some((m) => m.id === member.id)
            ? { ...f, members: [...folderMembers(f), member] }
            : f,
        ),
        boards: state.boards.map((b) =>
          b.folderId === action.folderId && !b.members.some((m) => m.id === member.id)
            ? { ...b, members: [...b.members, { ...member, inherited: true }] }
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
                  m.id === action.memberId && m.inherited ? { ...m, role: action.role } : m,
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
            ? { ...f, members: withoutMember(folderMembers(f), action.memberId) }
            : f,
        ),
        boards: state.boards.map((b) =>
          b.folderId === action.folderId
            ? { ...b, members: b.members.filter((m) => !(m.id === action.memberId && m.inherited)) }
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
      const member = {
        id: action.email,
        email: action.email,
        name: action.name,
        color: colorForName(action.email),
        role: action.role ?? 'editor',
        pending: true,
      }
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.boardId && !b.members.some((m) => m.id === member.id)
            ? { ...b, members: [...b.members, member] }
            : b,
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
          b.id === action.boardId ? { ...b, members: withoutMember(b.members, action.memberId) } : b,
        ),
        cards: state.cards.map((c) =>
          c.boardId === action.boardId && c.assigneeId === action.memberId
            ? { ...c, assigneeId: null }
            : c,
        ),
      }

    /* cards */

    case 'addCard':
      return {
        ...state,
        cards: [
          ...state.cards,
          {
            id: action.id,
            boardId: action.boardId,
            listId: action.listId,
            title: action.title,
            description: '',
            dueDate: null,
            remindBefore: 60,
            assigneeId: action.assigneeId ?? null,
            priority: 'medium',
            done: false,
            day: action.day ?? null,
            price: 0,
            paid: false,
            paidAt: null,
            createdAt: new Date().toISOString(),
          },
        ],
      }

    case 'updateCard':
      return {
        ...state,
        cards: state.cards.map((c) => {
          if (c.id !== action.id) return c
          const next = { ...c, ...action.patch }
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
      const moving = state.cards.find((c) => c.id === action.cardId)
      if (!moving) return state

      const board = state.boards.find((b) => b.id === moving.boardId)
      const lastListId = board?.lists[board.lists.length - 1]?.id
      const changedList = moving.listId !== action.toListId
      const updated = {
        ...moving,
        listId: action.toListId,
        done: action.toListId === lastListId ? true : changedList ? false : moving.done,
      }

      const rest = state.cards.filter((c) => c.id !== action.cardId)
      const others = rest.filter((c) => c.listId !== action.toListId)
      const target = rest.filter((c) => c.listId === action.toListId)
      const index = Math.max(0, Math.min(action.toIndex ?? target.length, target.length))
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
                listId: done
                  ? (lastListId ?? c.listId)
                  : c.listId === lastListId
                    ? (firstListId ?? c.listId)
                    : c.listId,
              }
            : c,
        ),
      }
    }

    /* deliverables & pricing */

    case 'addDeliverable':
      return {
        ...state,
        deliverables: [
          ...state.deliverables,
          {
            id: action.id,
            boardId: action.boardId,
            title: action.title,
            description: '',
            price: action.price ?? 0,
            currency: action.currency ?? 'USD',
            status: 'planned',
            approved: false,
            approvedAt: null,
            paid: false,
            paidAt: null,
            createdAt: new Date().toISOString(),
          },
        ],
      }

    case 'updateDeliverable':
      return {
        ...state,
        deliverables: state.deliverables.map((d) =>
          d.id === action.id ? { ...d, ...action.patch } : d,
        ),
      }

    case 'approveDeliverable':
      return {
        ...state,
        deliverables: state.deliverables.map((d) =>
          d.id === action.id
            ? {
                ...d,
                approved: action.approved,
                approvedAt: action.approved ? new Date().toISOString() : null,
              }
            : d,
        ),
      }

    case 'releasePayment': {
      const paidAt = new Date().toISOString()
      return {
        ...state,
        deliverables: state.deliverables.map((d) =>
          d.boardId === action.boardId && d.status === 'completed' && d.approved && !d.paid
            ? { ...d, paid: true, paidAt }
            : d,
        ),
        cards: state.cards.map((c) =>
          c.boardId === action.boardId && c.done && (c.price || 0) > 0 && !c.paid
            ? { ...c, paid: true, paidAt }
            : c,
        ),
      }
    }

    case 'deleteDeliverable':
      return { ...state, deliverables: state.deliverables.filter((d) => d.id !== action.id) }

    /* reminders */

    case 'markNotified': {
      const notifications = [
        { id: `${action.id}-${Date.now()}`, cardId: action.id, at: Date.now(), read: false },
        ...state.notifications,
      ].slice(0, 50)
      if (state.user) saveNotes(state.user.email, notifications)
      return {
        ...state,
        cards: state.cards.map((c) => (c.id === action.id ? { ...c, notifiedAt: Date.now() } : c)),
        notifications,
      }
    }

    case 'readNotifications': {
      const notifications = state.notifications.map((n) => ({ ...n, read: true }))
      if (state.user) saveNotes(state.user.email, notifications)
      return { ...state, notifications }
    }

    case 'clearNotifications':
      if (state.user) saveNotes(state.user.email, [])
      return { ...state, notifications: [] }

    default:
      return state
  }
}

/* ---------------- writing through to the database ---------------- */

export const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

/** Ids are minted here so the optimistic row and the stored row are the same row. */
function prepare(action) {
  switch (action.type) {
    case 'addFolder':
    case 'addList':
    case 'addCard':
    case 'addMeeting':
    case 'addDeliverable':
      return { ...action, id: action.id ?? newId() }
    case 'addBoard':
      return {
        ...action,
        id: action.id ?? newId(),
        lists: action.lists ?? DEFAULT_LIST_TITLES.map((title) => ({ id: newId(), title })),
      }
    case 'addFolderMember':
    case 'addMember':
      return { ...action, email: (action.email ?? '').trim().toLowerCase() }
    default:
      return action
  }
}

async function persist(action, before, after) {
  const user = after.user
  switch (action.type) {
    case 'addFolder':
      return api.createFolder({
        id: action.id,
        name: action.name,
        emoji: action.emoji ?? '📁',
        ownerEmail: user.email,
        ownerName: user.name,
      })

    case 'renameFolder':
      return api.renameFolder(action.id, action.name)

    case 'updateFolderNotes':
      return api.updateFolderNotes(action.id, action.notes)

    case 'deleteFolder':
      return api.deleteFolder(action.id)

    case 'addBoard':
      return api.createBoard({
        id: action.id,
        folderId: action.folderId,
        name: action.name,
        accent: action.accent ?? 'blue',
        ownerEmail: user.email,
        ownerName: user.name,
        lists: action.lists,
      })

    case 'updateBoard':
      return api.updateBoard(action.id, action.patch)

    case 'deleteBoard':
      return api.deleteBoard(action.id)

    case 'addList': {
      const board = after.boards.find((b) => b.id === action.boardId)
      return api.createList({
        id: action.id,
        boardId: action.boardId,
        title: action.title,
        sortOrder: (board?.lists.length ?? 1) - 1,
      })
    }

    case 'renameList':
      return api.renameList(action.listId, action.title)

    case 'deleteList':
      return api.deleteList(action.listId)

    case 'addFolderMember':
      return api.addMember('folder', action.folderId, {
        email: action.email,
        name: action.name,
        role: action.role ?? 'editor',
      })

    case 'setFolderMemberRole':
      return api.setMemberRole('folder', action.folderId, action.memberId, action.role)

    case 'removeFolderMember': {
      const boardIds = before.boards.filter((b) => b.folderId === action.folderId).map((b) => b.id)
      await api.unassignFromBoards(boardIds, action.memberId)
      return api.removeMember('folder', action.folderId, action.memberId)
    }

    case 'addMember':
      return api.addMember('board', action.boardId, {
        email: action.email,
        name: action.name,
        role: action.role ?? 'editor',
      })

    case 'setMemberRole':
      return api.setMemberRole('board', action.boardId, action.memberId, action.role)

    case 'removeMember':
      await api.unassignFromBoards([action.boardId], action.memberId)
      return api.removeMember('board', action.boardId, action.memberId)

    case 'addCard': {
      const list = after.cards.filter((c) => c.listId === action.listId)
      return api.createCard({
        id: action.id,
        boardId: action.boardId,
        listId: action.listId,
        title: action.title,
        assigneeId: action.assigneeId ?? null,
        day: action.day ?? null,
        sortOrder: list.length - 1,
        createdBy: user.email,
      })
    }

    case 'updateCard':
      return api.updateCard(action.id, action.patch)

    case 'deleteCard':
      return api.deleteCard(action.id)

    case 'moveCard': {
      const ordered = after.cards.filter((c) => c.listId === action.toListId).map((c) => c.id)
      const moved = after.cards.find((c) => c.id === action.cardId)
      const wasDone = before.cards.find((c) => c.id === action.cardId)?.done
      return api.reorderCards(
        action.toListId,
        ordered,
        moved && moved.done !== wasDone ? { id: moved.id, patch: { done: moved.done } } : undefined,
      )
    }

    case 'toggleDone': {
      const card = after.cards.find((c) => c.id === action.id)
      return api.updateCard(action.id, { done: card.done, listId: card.listId })
    }

    case 'markNotified':
      return api.updateCard(action.id, { notifiedAt: Date.now() })

    case 'addMeeting':
      return api.createMeeting({
        id: action.id,
        boardId: action.boardId,
        title: action.title,
        createdBy: user.email,
      })

    case 'renameMeeting':
      return api.renameMeeting(action.id, action.title)

    case 'deleteMeeting':
      return api.deleteMeeting(action.id)

    case 'addDeliverable': {
      const list = after.deliverables.filter((d) => d.boardId === action.boardId)
      return api.createDeliverable({
        id: action.id,
        boardId: action.boardId,
        title: action.title,
        price: action.price ?? 0,
        currency: action.currency ?? 'USD',
        sortOrder: list.length - 1,
        createdBy: user.email,
      })
    }

    case 'updateDeliverable':
      return api.updateDeliverable(action.id, action.patch)

    case 'approveDeliverable':
      return api.approveDeliverable(action.id, action.approved)

    case 'releasePayment':
      return api.releasePayment(action.boardId)

    case 'deleteDeliverable':
      return api.deleteDeliverable(action.id)

    default:
      return undefined
  }
}

/* ---------------- provider ---------------- */

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, localDispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const refresh = useCallback(async () => {
    if (!supabase || !stateRef.current.user) return
    try {
      // Anything invited to this address before they signed in counts as theirs
      await api.acceptInvitations().catch(() => {})
      const data = await api.loadWorkspace()
      localDispatch({ type: 'hydrate', data })
    } catch (error) {
      localDispatch({ type: 'status', status: 'error', error: error.message })
    }
  }, [])

  const dispatch = useCallback(
    (action) => {
      const prepared = prepare(action)
      const before = stateRef.current
      const after = reducer(before, prepared)

      localDispatch(prepared)
      stateRef.current = after

      if (!supabase || !before.user) return

      persist(prepared, before, after)?.catch((error) => {
        // Show the server's version rather than leaving a change that never landed
        console.error('Could not save that change:', error)
        localDispatch({
          type: 'status',
          status: 'ready',
          error: error.message ?? 'That change could not be saved.',
        })
        refresh()
      })
    },
    [refresh],
  )

  /* session */
  useEffect(() => {
    if (!supabase) return undefined

    const toUser = (session) => {
      if (!session?.user?.email) return null
      const email = session.user.email.toLowerCase()
      return {
        id: email,
        email,
        authId: session.user.id,
        name: session.user.user_metadata?.full_name || email.split('@')[0],
        color: colorForName(email),
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      localDispatch({ type: 'session', user: toUser(data.session) })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      localDispatch({ type: 'session', user: toUser(session) })
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  /* first load, then live updates from anyone else working on the same data */
  const userId = state.user?.id
  useEffect(() => {
    if (!supabase || !userId) return undefined

    refresh()

    let timer
    const nudge = () => {
      clearTimeout(timer)
      timer = setTimeout(refresh, 250)
    }

    const channel = supabase.channel(`workspace-${userId}`)
    ;['folders', 'folder_members', 'boards', 'board_members', 'lists', 'cards', 'deliverables'].forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, nudge)
    })

    // Every stroke on a meeting board bumps that board's updated_at. Reloading
    // the whole workspace for each one would be wasteful, so apply it in place.
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_boards' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        if (payload.old?.id) localDispatch({ type: 'meetingRemoved', id: payload.old.id })
      } else if (payload.new) {
        localDispatch({ type: 'meetingUpserted', meeting: api.meetingFrom(payload.new) })
      }
    })
    channel.subscribe()

    // A backgrounded tab — a phone with the screen off, say — misses live
    // updates and may have had its socket dropped, so catch up on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible') nudge()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', nudge)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', nudge)
      supabase.removeChannel(channel)
    }
  }, [userId, refresh])

  const value = useMemo(
    () => ({
      state,
      dispatch,
      refresh,
      dismissError: () => localDispatch({ type: 'dismissError' }),
      signOut: () => supabase?.auth.signOut(),
    }),
    [state, dispatch, refresh],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
