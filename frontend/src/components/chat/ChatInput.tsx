import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Loader2, Send } from 'lucide-react'

import { Button } from '../ui/Button'

export default function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void
  disabled: boolean
}) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const inputId = useId()

  function adjustHeight() {
    const element = ref.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  function submit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.height = 'auto'
    })
  }

  return (
    <div className="chat-input">
      <div className="chat-input__body">
        <label htmlFor={inputId} className="chat-input__label">Ask your library</label>
        <textarea
          id={inputId}
          ref={ref}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            adjustHeight()
          }}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="What would you like to know?"
          className="chat-input__textarea"
        />
      </div>
      <Button
        onClick={submit}
        disabled={disabled || !text.trim()}
        className="chat-send"
        aria-label="Send message"
        aria-busy={disabled}
      >
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  )
}
