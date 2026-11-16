import ChatInput from './ChatInput'
import ScopeSelector from './ScopeSelector'
import { useChatSession } from './chatSessionStore'

export default function ChatComposer() {
  const { error, scope, thinking, loadingChat, send, changeScope } = useChatSession()

  return (
    <div className="chat-dock">
      <div className="mx-auto max-w-3xl space-y-2">
        {error && <p className="chat-error" role="alert">{error}</p>}
        <ScopeSelector value={scope} onChange={changeScope} />
        <ChatInput onSend={send} disabled={thinking || loadingChat} />
      </div>
    </div>
  )
}
