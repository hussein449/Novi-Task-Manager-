import { supabase } from './supabase'
import { colorForName } from './utils'

/**
 * Everything the app knows about people is keyed by their email address: it is
 * the one identifier that exists before someone has an account, which is what
 * lets you invite a colleague and assign them work the same afternoon.
 */

const clean = (email) => (email ?? '').trim().toLowerCase()

export const personFrom = (row) => ({
  id: clean(row.email),
  email: clean(row.email),
  name: row.display_name || row.email,
  color: colorForName(clean(row.email)),
  role: row.role,
  pending: !row.accepted_at,
})

const cardFrom = (row) => ({
  id: row.id,
  boardId: row.board_id,
  listId: row.list_id,
  title: row.title,
  description: row.description ?? '',
  dueDate: row.due_date,
  remindBefore: row.remind_before ?? 60,
  assigneeId: clean(row.assignee_email) || null,
  priority: row.priority ?? 'medium',
  done: Boolean(row.done),
  day: row.day ?? null,
  notifiedAt: row.notified_at ? new Date(row.notified_at).getTime() : null,
  sortOrder: row.sort_order ?? 0,
  createdAt: row.created_at,
})

export const meetingFrom = (row) => ({
  id: row.id,
  boardId: row.board_id,
  title: row.title,
  createdBy: clean(row.created_by),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

/* ---------------- reading ---------------- */

/** Marks invitations that were waiting for this address as accepted. */
export const acceptInvitations = async () => {
  const { error } = await supabase.rpc('accept_my_invitations')
  if (error) throw error
}

export async function loadWorkspace() {
  const [folders, folderMembers, boards, boardMembers, lists, cards, meetings] = await Promise.all([
    supabase.from('folders').select('*').order('created_at'),
    supabase.from('folder_members').select('*'),
    supabase.from('boards').select('*').order('created_at'),
    supabase.from('board_members').select('*'),
    supabase.from('lists').select('*').order('sort_order'),
    supabase.from('cards').select('*').order('sort_order'),
    supabase.from('meeting_boards').select('*').order('updated_at', { ascending: false }),
  ])

  const failed = [folders, folderMembers, boards, boardMembers, lists, cards, meetings].find(
    (r) => r.error,
  )
  if (failed) throw failed.error

  const membersByFolder = new Map()
  folderMembers.data.forEach((row) => {
    const list = membersByFolder.get(row.folder_id) ?? []
    list.push(personFrom(row))
    membersByFolder.set(row.folder_id, list)
  })

  const membersByBoard = new Map()
  boardMembers.data.forEach((row) => {
    const list = membersByBoard.get(row.board_id) ?? []
    list.push(personFrom(row))
    membersByBoard.set(row.board_id, list)
  })

  const shapedFolders = folders.data.map((row) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    notes: row.notes ?? '',
    ownerEmail: clean(row.owner_email),
    ownerId: clean(row.owner_email),
    members: membersByFolder.get(row.id) ?? [],
  }))

  const shapedBoards = boards.data.map((row) => {
    const folder = shapedFolders.find((f) => f.id === row.folder_id)
    const inherited = (folder?.members ?? []).map((m) => ({ ...m, inherited: true }))
    const own = membersByBoard.get(row.id) ?? []
    // Someone added to the board directly overrides the role they inherit
    const merged = [...own, ...inherited.filter((m) => !own.some((o) => o.id === m.id))]

    return {
      id: row.id,
      folderId: row.folder_id,
      name: row.name,
      accent: row.accent,
      ownerEmail: clean(row.owner_email),
      ownerId: clean(row.owner_email),
      members: merged,
      lists: lists.data
        .filter((l) => l.board_id === row.id)
        .map((l) => ({ id: l.id, title: l.title, sortOrder: l.sort_order })),
    }
  })

  return {
    folders: shapedFolders,
    boards: shapedBoards,
    cards: cards.data.map(cardFrom),
    meetings: meetings.data.map(meetingFrom),
  }
}

/* ---------------- folders ---------------- */

export const createFolder = async ({ id, name, emoji, ownerEmail, ownerName }) => {
  const { error } = await supabase.from('folders').insert({
    id,
    name,
    emoji,
    owner_email: ownerEmail,
  })
  if (error) throw error

  const { error: memberError } = await supabase.from('folder_members').insert({
    folder_id: id,
    email: ownerEmail,
    display_name: ownerName || ownerEmail,
    role: 'owner',
    invited_by: ownerEmail,
    accepted_at: new Date().toISOString(),
  })
  if (memberError) throw memberError
}

export const renameFolder = async (id, name) => {
  const { error } = await supabase.from('folders').update({ name }).eq('id', id)
  if (error) throw error
}

export const updateFolderNotes = async (id, notes) => {
  const { error } = await supabase.rpc('update_folder_notes', { p_folder: id, p_notes: notes })
  if (error) throw error
}

export const deleteFolder = async (id) => {
  const { error } = await supabase.from('folders').delete().eq('id', id)
  if (error) throw error
}

/* ---------------- boards and lists ---------------- */

export const createBoard = async ({ id, folderId, name, accent, ownerEmail, ownerName, lists }) => {
  const { error } = await supabase.from('boards').insert({
    id,
    folder_id: folderId,
    name,
    accent,
    owner_email: ownerEmail,
  })
  if (error) throw error

  const { error: memberError } = await supabase.from('board_members').insert({
    board_id: id,
    email: ownerEmail,
    display_name: ownerName || ownerEmail,
    role: 'owner',
    invited_by: ownerEmail,
    accepted_at: new Date().toISOString(),
  })
  if (memberError) throw memberError

  const { error: listError } = await supabase.from('lists').insert(
    lists.map((l, index) => ({ id: l.id, board_id: id, title: l.title, sort_order: index })),
  )
  if (listError) throw listError
}

export const updateBoard = async (id, patch) => {
  const row = {}
  if ('name' in patch) row.name = patch.name
  if ('accent' in patch) row.accent = patch.accent
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('boards').update(row).eq('id', id)
  if (error) throw error
}

export const deleteBoard = async (id) => {
  const { error } = await supabase.from('boards').delete().eq('id', id)
  if (error) throw error
}

export const createList = async ({ id, boardId, title, sortOrder }) => {
  const { error } = await supabase
    .from('lists')
    .insert({ id, board_id: boardId, title, sort_order: sortOrder })
  if (error) throw error
}

export const renameList = async (id, title) => {
  const { error } = await supabase.from('lists').update({ title }).eq('id', id)
  if (error) throw error
}

export const deleteList = async (id) => {
  const { error } = await supabase.from('lists').delete().eq('id', id)
  if (error) throw error
}

/* ---------------- cards ---------------- */

export const createCard = async (card) => {
  const { error } = await supabase.from('cards').insert({
    id: card.id,
    board_id: card.boardId,
    list_id: card.listId,
    title: card.title,
    description: card.description ?? '',
    due_date: card.dueDate,
    remind_before: card.remindBefore ?? 60,
    assignee_email: card.assigneeId,
    priority: card.priority ?? 'medium',
    done: Boolean(card.done),
    day: card.day ?? null,
    sort_order: card.sortOrder ?? 0,
    created_by: card.createdBy,
  })
  if (error) throw error
}

export const updateCard = async (id, patch) => {
  const row = {}
  if ('title' in patch) row.title = patch.title
  if ('description' in patch) row.description = patch.description
  if ('dueDate' in patch) row.due_date = patch.dueDate
  if ('remindBefore' in patch) row.remind_before = patch.remindBefore
  if ('assigneeId' in patch) row.assignee_email = patch.assigneeId
  if ('priority' in patch) row.priority = patch.priority
  if ('done' in patch) row.done = patch.done
  if ('day' in patch) row.day = patch.day
  if ('listId' in patch) row.list_id = patch.listId
  if ('notifiedAt' in patch) {
    row.notified_at = patch.notifiedAt ? new Date(patch.notifiedAt).toISOString() : null
  }
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('cards').update(row).eq('id', id)
  if (error) throw error
}

export const deleteCard = async (id) => {
  const { error } = await supabase.from('cards').delete().eq('id', id)
  if (error) throw error
}

/** One call per drag: the destination list plus its card ids in their new order. */
export const reorderCards = async (listId, orderedIds, extra) => {
  const { error } = await supabase.rpc('reorder_cards', { p_list: listId, p_ids: orderedIds })
  if (error) throw error
  if (extra?.id) await updateCard(extra.id, extra.patch)
}

/* ---------------- people ---------------- */

const memberTable = (scope) => (scope === 'folder' ? 'folder_members' : 'board_members')
const memberKey = (scope) => (scope === 'folder' ? 'folder_id' : 'board_id')

export const addMember = async (scope, targetId, { email, name, role }) => {
  const { error } = await supabase.from(memberTable(scope)).upsert(
    {
      [memberKey(scope)]: targetId,
      email: clean(email),
      display_name: name,
      role,
    },
    { onConflict: `${memberKey(scope)},email` },
  )
  if (error) throw error
}

export const setMemberRole = async (scope, targetId, email, role) => {
  const { error } = await supabase
    .from(memberTable(scope))
    .update({ role })
    .eq(memberKey(scope), targetId)
    .eq('email', clean(email))
  if (error) throw error
}

export const removeMember = async (scope, targetId, email) => {
  const { error } = await supabase
    .from(memberTable(scope))
    .delete()
    .eq(memberKey(scope), targetId)
    .eq('email', clean(email))
  if (error) throw error
}

/** Unassign someone's cards when they lose access to a board. */
export const unassignFromBoards = async (boardIds, email) => {
  if (boardIds.length === 0) return
  const { error } = await supabase
    .from('cards')
    .update({ assignee_email: null })
    .in('board_id', boardIds)
    .eq('assignee_email', clean(email))
  if (error) throw error
}

/**
 * Invites through the edge function, which records the membership and tries to
 * send the email. It always returns a link, so an inviter can pass it on by
 * hand when no email provider is configured.
 */
export const sendInvite = async ({ scope, id, email, name, role, label }) => {
  const { data, error } = await supabase.functions.invoke('invite', {
    body: {
      scope,
      id,
      email: clean(email),
      name,
      role,
      label,
      appUrl: window.location.origin,
    },
  })

  if (error) {
    // The function replies with a helpful message in the body; surface that.
    let message = error.message
    try {
      const body = await error.context?.json()
      if (body?.error) message = body.error
    } catch {
      /* keep the original message */
    }
    throw new Error(message)
  }

  return data
}

/* ---------------- meeting boards ---------------- */

export const createMeeting = async ({ id, boardId, title, createdBy }) => {
  const { error } = await supabase
    .from('meeting_boards')
    .insert({ id, board_id: boardId, title, created_by: createdBy })
  if (error) throw error
}

export const renameMeeting = async (id, title) => {
  const { error } = await supabase.from('meeting_boards').update({ title }).eq('id', id)
  if (error) throw error
}

export const deleteMeeting = async (id) => {
  const { error } = await supabase.from('meeting_boards').delete().eq('id', id)
  if (error) throw error
}

export const itemFrom = (row) => ({
  id: row.id,
  meetingId: row.meeting_id,
  kind: row.kind,
  x: row.x,
  y: row.y,
  w: row.w,
  h: row.h,
  color: row.color,
  text: row.text ?? '',
  points: row.points ?? null,
  size: row.size,
  z: row.z ?? 0,
  createdBy: clean(row.created_by),
  updatedAt: row.updated_at,
})

export const loadMeetingItems = async (meetingId) => {
  const { data, error } = await supabase
    .from('meeting_items')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('z')
  if (error) throw error
  return data.map(itemFrom)
}

/**
 * Insert or update one note, text box or stroke. `stamp` is the updated_at the
 * caller will recognise when the realtime echo of this write comes back.
 */
export const saveMeetingItem = async (item, stamp = new Date().toISOString()) => {
  const { error } = await supabase.from('meeting_items').upsert({
    id: item.id,
    meeting_id: item.meetingId,
    kind: item.kind,
    x: item.x,
    y: item.y,
    w: item.w ?? null,
    h: item.h ?? null,
    color: item.color,
    text: item.text ?? '',
    points: item.points ?? null,
    size: item.size ?? null,
    z: item.z ?? 0,
    created_by: item.createdBy,
    updated_at: stamp,
  })
  if (error) throw error
}

export const deleteMeetingItem = async (id) => {
  const { error } = await supabase.from('meeting_items').delete().eq('id', id)
  if (error) throw error
}

export const clearMeetingItems = async (meetingId) => {
  const { error } = await supabase.from('meeting_items').delete().eq('meeting_id', meetingId)
  if (error) throw error
}
