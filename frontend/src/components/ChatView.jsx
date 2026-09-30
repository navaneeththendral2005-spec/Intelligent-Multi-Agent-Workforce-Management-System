import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import EmptyState from './EmptyState'
import MessageBubble from './MessageBubble'
import ThoughtLine from './ThoughtLine'
import Composer from './Composer'

export default function ChatView({ messages, thinkingAgentId, onSend }) {
  const scrollRef = useRef(null)
  const hideThoughtTimerRef = useRef(null)
  const [showThoughtLine, setShowThoughtLine] = useState(false)

  const isThinking = Boolean(thinkingAgentId)

  useEffect(() => {
    if (isThinking) {
      setShowThoughtLine(true)

      if (hideThoughtTimerRef.current) {
        window.clearTimeout(hideThoughtTimerRef.current)
        hideThoughtTimerRef.current = null
      }
    }
  }, [isThinking])

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages, isThinking, showThoughtLine])

  useEffect(() => {
    return () => {
      if (hideThoughtTimerRef.current) {
        window.clearTimeout(hideThoughtTimerRef.current)
      }
    }
  }, [])

  if (messages.length === 0) {
    return <EmptyState onSend={onSend} />
  }

  const handleThoughtSettle = () => {
    if (hideThoughtTimerRef.current) {
      window.clearTimeout(hideThoughtTimerRef.current)
    }

    /*
     * Keep the completed state visible for a moment so the user
     * can see that CHORUS finished the task instead of appearing
     * to disappear abruptly.
     */
    hideThoughtTimerRef.current = window.setTimeout(() => {
      setShowThoughtLine(false)
      hideThoughtTimerRef.current = null
    }, 1400)
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <AnimatePresence>
            {messages.map(message => (
              <MessageBubble
                key={message.id}
                message={message}
              />
            ))}

            {showThoughtLine && (
              <ThoughtLine
                key="thought-line"
                working={isThinking}
                steps={[
                  'Understanding your request',
                  'Selecting the right agents',
                  'Executing the task',
                  'Preparing the result',
                ]}
                label="Thinking…"
                doneLabel="Thought for"
                glyph="sparkle"
                fontSize={16}
                breathPeriod={1.6}
                breathDepth={0.45}
                settleDuration={350}
                settleBlur={2}
                collapsible
                collapseOnSettle
                showTimer
                onSettle={handleThoughtSettle}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="shrink-0 border-t border-line px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <Composer onSend={onSend} />
        </div>
      </div>
    </>
  )
}
