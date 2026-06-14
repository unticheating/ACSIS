import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Keyboard from 'react-simple-keyboard'
import 'react-simple-keyboard/build/css/index.css'
import { X } from 'lucide-react'

const keyboardLayout = {
  default: [
    "` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
    "{tab} q w e r t y u i o p [ ] \\",
    "{lock} a s d f g h j k l ; ' {enter}",
    "{shift} z x c v b n m , . / {shift}",
    "{arrowleft} {space} {arrowright}"
  ],
  shift: [
    "~ ! @ # $ % ^ & * ( ) _ + {bksp}",
    "{tab} Q W E R T Y U I O P { } |",
    '{lock} A S D F G H J K L : " {enter}',
    "{shift} Z X C V B N M < > ? {shift}",
    "{arrowleft} {space} {arrowright}"
  ]
}

/**
 * Move the caret inside the plain #id-answer input.
 */
function moveInputCaret(direction) {
  const el = document.activeElement
  if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return
  const pos = el.selectionStart ?? 0
  const next = direction === 'left' ? Math.max(0, pos - 1) : Math.min(el.value.length, pos + 1)
  el.setSelectionRange(next, next)
}

/**
 * Move the caret inside a Monaco Editor instance.
 */
function moveMonacoCaret(editor, direction) {
  if (!editor) return
  editor.focus()
  const pos = editor.getPosition()
  if (!pos) return
  if (direction === 'left') {
    editor.trigger('keyboard', 'cursorLeft', null)
  } else {
    editor.trigger('keyboard', 'cursorRight', null)
  }
}

export function ExamKeyboard({ value, onChange, onClose, questionType, editorRef }) {
  const [layoutName, setLayoutName] = useState('default')
  const keyboardRef = useRef()

  const onKeyPress = (button) => {
    if (button === '{shift}' || button === '{lock}') {
      setLayoutName(layoutName === 'default' ? 'shift' : 'default')
      return
    }
    if (button === '{arrowleft}' || button === '{arrowright}') {
      const dir = button === '{arrowleft}' ? 'left' : 'right'
      if (questionType === 'coding' && editorRef?.current) {
        moveMonacoCaret(editorRef.current, dir)
      } else {
        moveInputCaret(dir)
      }
      return
    }
    
    // For Monaco editor, handle typing directly at the cursor
    if (questionType === 'coding' && editorRef?.current) {
      if (button === '{bksp}') {
        editorRef.current.trigger('keyboard', 'deleteLeft', null)
      } else if (button === '{enter}') {
        editorRef.current.trigger('keyboard', 'type', { text: '\n' })
      } else if (button === '{space}') {
        editorRef.current.trigger('keyboard', 'type', { text: ' ' })
      } else if (button === '{tab}') {
        editorRef.current.trigger('keyboard', 'tab', null)
      } else if (!button.startsWith('{') && !button.endsWith('}')) {
        editorRef.current.trigger('keyboard', 'type', { text: button })
      }
      return
    }

    // For diagramming and essay, simulate input on active element
    if (questionType === 'diagramming' || questionType === 'essay') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        const start = activeEl.selectionStart || 0;
        const end = activeEl.selectionEnd || 0;
        const val = activeEl.value;

        let insertText = '';
        let isDelete = false;

        if (button === '{bksp}') {
          isDelete = true;
        } else if (button === '{enter}') {
          if (activeEl.tagName === 'TEXTAREA') insertText = '\n';
        } else if (button === '{space}') {
          insertText = ' ';
        } else if (button === '{tab}') {
          // ignore tab or handle spaces
        } else if (!button.startsWith('{') && !button.endsWith('}')) {
          insertText = button;
        }

        const nativeSetter = Object.getOwnPropertyDescriptor(
          activeEl.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
          'value'
        ).set;

        if (isDelete) {
          if (start > 0 || start !== end) {
            const deleteStart = start === end ? start - 1 : start;
            const before = val.substring(0, deleteStart);
            const after = val.substring(end);
            const newValue = before + after;
            nativeSetter.call(activeEl, newValue);
            activeEl.setSelectionRange(deleteStart, deleteStart);
            activeEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } else if (insertText) {
          const before = val.substring(0, start);
          const after = val.substring(end);
          const newValue = before + insertText + after;
          nativeSetter.call(activeEl, newValue);
          const newPos = start + insertText.length;
          activeEl.setSelectionRange(newPos, newPos);
          activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      return;
    }
  }

  // Ensure keyboard internal state matches parent value if it changed externally
  useEffect(() => {
    if (questionType === 'identification' && keyboardRef.current && value !== keyboardRef.current.getInput()) {
      keyboardRef.current.setInput(value || '')
    }
  }, [value, questionType])

  const preventFocusSteal = (e) => e.preventDefault()

  const content = (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 bg-card border-t border-border shadow-2xl animate-in slide-in-from-bottom-8 duration-300"
      onMouseDown={preventFocusSteal}
      onTouchStart={preventFocusSteal}
    >
      <div className="max-w-4xl mx-auto relative">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 bg-card border border-border rounded-full shadow-sm hover:bg-muted text-muted-foreground transition-colors"
          title="Close keyboard"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="acsis-keyboard-theme">
          <Keyboard
            keyboardRef={(r) => (keyboardRef.current = r)}
            layoutName={layoutName}
            layout={keyboardLayout}
            value={questionType === 'identification' ? (value || '') : undefined}
            onChange={(val) => {
              if (questionType === 'identification') {
                onChange(val)
              }
            }}
            onKeyPress={onKeyPress}
            display={{
              '{bksp}': 'delete',
              '{enter}': 'enter',
              '{shift}': 'shift',
              '{space}': 'space',
              '{lock}': 'caps',
              '{tab}': 'tab',
              '{arrowleft}': '←',
              '{arrowright}': '→'
            }}
            buttonTheme={[
              { class: 'hg-arrow-key', buttons: '{arrowleft} {arrowright}' }
            ]}
            theme={"hg-theme-default acsis-hg-theme"}
          />
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}

