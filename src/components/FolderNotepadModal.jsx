import { useEffect, useState } from 'react'
import { Modal, Button } from './ui'
import { useStore, canEditFolder } from '../store'

/**
 * One free-form notepad per folder — general points jotted down before they
 * are worth turning into an actual task on one of the folder's boards.
 * Saves on blur/close, the same as a card's description field.
 */
export default function FolderNotepadModal({ folder, onClose }) {
  const { state, dispatch } = useStore()
  const mayEdit = canEditFolder(folder, state.user)
  const [notes, setNotes] = useState(folder.notes ?? '')

  useEffect(() => setNotes(folder.notes ?? ''), [folder.id, folder.notes])

  const save = () => {
    if (mayEdit && notes !== (folder.notes ?? '')) {
      dispatch({ type: 'updateFolderNotes', id: folder.id, notes })
    }
  }

  const close = () => {
    save()
    onClose()
  }

  return (
    <Modal
      open
      onClose={close}
      title={`${folder.emoji ? `${folder.emoji} ` : ''}${folder.name} — Notepad`}
      subtitle="General points and notes, before they become tasks on a board."
      wide
    >
      <textarea
        autoFocus
        rows={16}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={save}
        readOnly={!mayEdit}
        placeholder={
          mayEdit
            ? 'Jot down anything worth remembering — turn a line into a task whenever it is ready.'
            : 'Nothing has been written here yet.'
        }
        className="w-full resize-y rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-3"
      />

      {!mayEdit && (
        <p className="mt-2 text-xs text-ink-3">
          You have view-only access to this folder, so this notepad cannot be changed.
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <Button variant="ghost" onClick={close}>
          Done
        </Button>
      </div>
    </Modal>
  )
}
