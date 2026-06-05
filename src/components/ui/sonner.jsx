import { Toaster as Sonner } from 'sonner'

/** Shadcn-style toaster — bottom center, ACSIS immersive alert styling */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      expand
      visibleToasts={3}
      offset={24}
      mobileOffset={{ bottom: 16, left: 16, right: 16 }}
      gap={10}
      closeButton
      richColors={false}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'acsis-toast',
          error: 'acsis-toast acsis-toast--error',
          success: 'acsis-toast acsis-toast--success',
          info: 'acsis-toast acsis-toast--info',
          warning: 'acsis-toast acsis-toast--warning',
          title: 'acsis-toast__title',
          description: 'acsis-toast__description',
          closeButton: 'acsis-toast__close',
          actionButton: 'acsis-toast__action',
          cancelButton: 'acsis-toast__cancel',
        },
      }}
    />
  )
}
