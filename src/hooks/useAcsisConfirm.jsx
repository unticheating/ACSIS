import { useCallback, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'

/**
 * Promise-based confirm dialog (replaces window.confirm).
 * @returns {{ confirm: (options: object) => Promise<boolean>, ConfirmDialog: JSX.Element }}
 */
export function useAcsisConfirm() {
  const [pending, setPending] = useState(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setPending({
        title: options.title ?? 'Confirm',
        description: options.description ?? '',
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        destructive: Boolean(options.destructive),
        resolve,
      })
    })
  }, [])

  const close = (value) => {
    pending?.resolve(value)
    setPending(null)
  }

  const ConfirmDialog = (
    <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && close(false)}>
      {pending ? (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pending.title}</DialogTitle>
            {pending.description ? (
              <DialogDescription className="whitespace-pre-wrap">{pending.description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <button type="button" className="acsis-btn-ghost" onClick={() => close(false)}>
              {pending.cancelLabel}
            </button>
            <button
              type="button"
              className={pending.destructive ? 'acsis-btn-ghost' : 'acsis-mc-create-btn'}
              style={
                pending.destructive
                  ? { color: '#b91c1c', borderColor: '#fecaca' }
                  : undefined
              }
              onClick={() => close(true)}
            >
              {pending.confirmLabel}
            </button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )

  return { confirm, ConfirmDialog }
}
