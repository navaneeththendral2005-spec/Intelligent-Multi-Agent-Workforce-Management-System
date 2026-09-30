import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_HISTORY_MESSAGES = 12

const STORAGE_KEY = 'chorus_conversations'
const ACTIVE_CHAT_KEY = 'chorus_active_chat'

const API_BASE_URL = 'http://127.0.0.1:8000'
const API_URL = `${API_BASE_URL}/api/chat`
const UPLOAD_URL = `${API_BASE_URL}/api/upload`

function createChatId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createMessageId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createNewChat() {
  const now = new Date().toISOString()

  return {
    id: createChatId(),
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function normalizeConversation(conversation) {
  if (!conversation || typeof conversation !== 'object') {
    return null
  }

  return {
    id: conversation.id || createChatId(),
    title: conversation.title || 'New chat',
    createdAt: conversation.createdAt || new Date().toISOString(),
    updatedAt: conversation.updatedAt || new Date().toISOString(),
    messages: Array.isArray(conversation.messages)
      ? conversation.messages
      : [],
  }
}

function loadStoredConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map(normalizeConversation)
      .filter(Boolean)
  } catch (error) {
    console.error('Failed to load CHORUS conversations:', error)
    return []
  }
}

function loadActiveChatId() {
  try {
    return localStorage.getItem(ACTIVE_CHAT_KEY)
  } catch {
    return null
  }
}

function saveConversations(conversations) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(conversations)
    )
  } catch (error) {
    console.error('Failed to save CHORUS conversations:', error)
  }
}

function saveActiveChatId(chatId) {
  try {
    if (chatId) {
      localStorage.setItem(ACTIVE_CHAT_KEY, chatId)
    } else {
      localStorage.removeItem(ACTIVE_CHAT_KEY)
    }
  } catch (error) {
    console.error('Failed to save active CHORUS chat:', error)
  }
}

function getInitialState() {
  const storedConversations = loadStoredConversations()
  const storedActiveChatId = loadActiveChatId()

  // First-ever run:
  // create exactly one initial chat.
  if (storedConversations.length === 0) {
    const newChat = createNewChat()

    return {
      conversations: [newChat],
      activeChatId: newChat.id,
    }
  }

  // Reload:
  // restore the previously active chat.
  if (storedActiveChatId) {
    const matchingChat = storedConversations.find(
      chat => chat.id === storedActiveChatId
    )

    if (matchingChat) {
      return {
        conversations: storedConversations,
        activeChatId: matchingChat.id,
      }
    }
  }

  // If the stored active chat no longer exists,
  // use the most recently updated conversation.
  const sorted = [...storedConversations].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() -
      new Date(a.updatedAt).getTime()
  )

  return {
    conversations: storedConversations,
    activeChatId: sorted[0]?.id || null,
  }
}

function getHistoryMessages(messages) {
  return messages
    .filter(message => {
      return (
        message &&
        (message.role === 'user' || message.role === 'assistant')
      )
    })
    .slice(-MAX_HISTORY_MESSAGES)
    .map(message => ({
      role: message.role,
      content: message.content || '',
      ...(message.attachment
        ? { attachment: message.attachment }
        : {}),
    }))
}

function normalizeUploadResult(data, browserFile) {
  const size = Number.isFinite(Number(data?.size))
    ? Number(data.size)
    : browserFile.size

  return {
    // Server-side identifiers
    id: data?.id || data?.file_id || null,
    fileId: data?.file_id || data?.id || null,

    // Names
    filename:
      data?.filename ||
      browserFile.name,

    originalName:
      data?.original_name ||
      browserFile.name,

    // File metadata
    contentType:
      data?.content_type ||
      browserFile.type ||
      'application/octet-stream',

    size,

    sizeLabel: formatFileSize(size),

    // IMPORTANT:
    // Keep the actual server-side file path.
    // This is what the backend/Data Analyst needs.
    filePath:
      data?.file_path ||
      data?.path ||
      data?.stored_path ||
      '',

    // Also preserve snake_case variants because
    // the FastAPI/Pydantic backend accepts these names.
    file_path:
      data?.file_path ||
      data?.path ||
      data?.stored_path ||
      '',

    path:
      data?.path ||
      data?.file_path ||
      data?.stored_path ||
      '',

    stored_path:
      data?.stored_path ||
      data?.file_path ||
      data?.path ||
      '',
  }
}

export function useChat() {
  const initialStateRef = useRef(null)

  if (!initialStateRef.current) {
    initialStateRef.current = getInitialState()
  }

  const [conversations, setConversations] = useState(
    initialStateRef.current.conversations
  )

  const [activeChatId, setActiveChatId] = useState(
    initialStateRef.current.activeChatId
  )

  const [isLoading, setIsLoading] = useState(false)

  const [error, setError] = useState(null)

  /*
   * Persist conversations whenever they change.
   */
  useEffect(() => {
    saveConversations(conversations)
  }, [conversations])

  /*
   * Persist active chat whenever it changes.
   */
  useEffect(() => {
    saveActiveChatId(activeChatId)
  }, [activeChatId])

  /*
   * Find the active conversation.
   */
  const activeChat =
    conversations.find(chat => chat.id === activeChatId) || null

  /*
   * Create a brand-new chat.
   *
   * IMPORTANT:
   * This is ONLY called explicitly by the New Chat action.
   * Reload does not call this automatically.
   */
  const createChat = useCallback(() => {
    const newChat = createNewChat()

    setConversations(previous => [
      ...previous,
      newChat,
    ])

    setActiveChatId(newChat.id)
    setError(null)

    return newChat
  }, [])

  /*
   * Select an existing conversation.
   */
  const selectChat = useCallback((chatId) => {
    setActiveChatId(chatId)
    setError(null)
  }, [])

  /*
   * Delete a conversation.
   *
   * If the final conversation is deleted:
   * - conversations becomes []
   * - activeChatId becomes null
   * - NO new chat is automatically created
   */
  const deleteChat = useCallback((chatId) => {
    setConversations(previous => {
      const remaining = previous.filter(
        chat => chat.id !== chatId
      )

      return remaining
    })

    setActiveChatId(previousActiveId => {
      if (previousActiveId !== chatId) {
        return previousActiveId
      }

      const remaining = conversations.filter(
        chat => chat.id !== chatId
      )

      if (remaining.length === 0) {
        return null
      }

      const sorted = [...remaining].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime()
      )

      return sorted[0]?.id || null
    })

    setError(null)
  }, [conversations])

  /*
   * Upload browser files to FastAPI.
   *
   * This function is deterministic and does NOT consume LLM quota.
   */
  const uploadFiles = useCallback(async (files) => {
    if (!files || files.length === 0) {
      return []
    }

    const uploadedFiles = []

    for (const file of files) {
      const formData = new FormData()

      formData.append('file', file)

      const response = await fetch(
        UPLOAD_URL,
        {
          method: 'POST',
          body: formData,
        }
      )

      let data = null

      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok || !data?.success) {
        const detail =
          data?.detail ||
          data?.message ||
          `Failed to upload ${file.name}`

        throw new Error(
          typeof detail === 'string'
            ? detail
            : JSON.stringify(detail)
        )
      }

      const uploadedFile = normalizeUploadResult(
        data,
        file
      )

      /*
       * Do not continue silently if the backend
       * failed to provide a usable server path.
       *
       * The upload may technically succeed, but
       * Data Analyst/Document agents won't be able
       * to open the file without it.
       */
      if (!uploadedFile.filePath) {
        throw new Error(
          `Upload succeeded but the server did not return a file path for ${file.name}.`
        )
      }

      uploadedFiles.push(uploadedFile)
    }

    return uploadedFiles
  }, [])

  /*
   * Send a user message.
   */
  const sendMessage = useCallback(async (
    text,
    options = {}
  ) => {
    const trimmed = String(text || '').trim()

    const files = Array.isArray(options.files)
      ? options.files
      : []

    const mode = options.mode || null

    /*
     * Nothing to send.
     */
    if (!trimmed && files.length === 0) {
      return
    }

    /*
     * A chat must exist before sending.
     *
     * Normally this is already true, but this fallback
     * also protects the UI if the final chat was deleted.
     */
    let chatId = activeChatId

    if (!chatId) {
      const newChat = createNewChat()

      setConversations(previous => [
        ...previous,
        newChat,
      ])

      setActiveChatId(newChat.id)

      chatId = newChat.id
    }

    setError(null)
    setIsLoading(true)

    try {
      /*
       * ----------------------------------------------------
       * STEP 1 — Upload attachments
       * ----------------------------------------------------
       *
       * No LLM call happens here.
       */
      let uploadedAttachments = []

      if (files.length > 0) {
        uploadedAttachments = await uploadFiles(files)
      }

      /*
       * ----------------------------------------------------
       * STEP 2 — Build attachment metadata
       * ----------------------------------------------------
       *
       * Preserve both singular and plural structures
       * so existing UI/history behavior remains compatible.
       */
      let attachment = null

      if (uploadedAttachments.length === 1) {
        attachment = uploadedAttachments[0]
      } else if (uploadedAttachments.length > 1) {
        attachment = {
          files: uploadedAttachments,
        }
      }

      /*
       * ----------------------------------------------------
       * STEP 3 — Add user message locally
       * ----------------------------------------------------
       */
      const userMessage = {
        id: createMessageId(),
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
        ...(attachment
          ? { attachment }
          : {}),
        ...(mode
          ? { mode }
          : {}),
      }

      /*
       * Capture the history BEFORE adding the new message.
       * This prevents the current request from being duplicated
       * in the history sent to the backend.
       */
      const currentChat =
        conversations.find(
          chat => chat.id === chatId
        )

      const currentMessages =
        currentChat?.messages || []

      const history = getHistoryMessages(
        currentMessages
      )

      /*
       * Add user message immediately so the UI feels responsive.
       */
      setConversations(previous =>
        previous.map(chat => {
          if (chat.id !== chatId) {
            return chat
          }

          const nextTitle =
            chat.messages.length === 0 && trimmed
              ? trimmed.slice(0, 50)
              : chat.title

          return {
            ...chat,
            title: nextTitle,
            updatedAt: new Date().toISOString(),
            messages: [
              ...chat.messages,
              userMessage,
            ],
          }
        })
      )

      /*
       * ----------------------------------------------------
       * STEP 4 — Send request to FastAPI
       * ----------------------------------------------------
       *
       * The important part is that uploadedAttachments
       * now contain file_path.
       */
      const requestBody = {
        message: trimmed,
        history,
        attachment,
        attachments: uploadedAttachments,
        mode,
      }

      const response = await fetch(
        API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      )

      let data = null

      try {
        data = await response.json()
        console.log('🔥 CHORUS API RESPONSE:', data)
      } catch {
        data = null
      }

      if (!response.ok) {
        const detail =
          data?.detail ||
          data?.message ||
          `Request failed with status ${response.status}`

        throw new Error(
          typeof detail === 'string'
            ? detail
            : JSON.stringify(detail)
        )
      }

      if (!data?.success) {
        const detail =
          data?.detail ||
          data?.message ||
          data?.response ||
          'CHORUS could not complete the request.'

        throw new Error(
          typeof detail === 'string'
            ? detail
            : JSON.stringify(detail)
        )
      }

      /*
       * ----------------------------------------------------
       * STEP 5 — Add assistant response
       * ----------------------------------------------------
       */
      const assistantMessage = {
        id: createMessageId(),
        role: 'assistant',
        content:
          data.response ||
          'I completed the request.',
        createdAt: new Date().toISOString(),
        ...(data.email_action
          ? { emailAction: data.email_action }
          : {}),
        ...(data.file_action
          ? { fileAction: data.file_action }
          : {}),
      }

      setConversations(previous =>
        previous.map(chat => {
          if (chat.id !== chatId) {
            return chat
          }

          return {
            ...chat,
            updatedAt: new Date().toISOString(),
            messages: [
              ...chat.messages,
              assistantMessage,
            ],
          }
        })
      )

      return {
        userMessage,
        assistantMessage,
        uploadedAttachments,
        data,
      }
    } catch (requestError) {
      console.error(
        'CHORUS request failed:',
        requestError
      )

      const message =
        requestError?.message ||
        'Something went wrong while processing your request.'

      setError(message)

      /*
       * Show the actual backend/upload error in the chat.
       * This is intentionally not the generic
       * "backend is not running" message.
       */
      const errorMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: `⚠️ ${message}`,
        createdAt: new Date().toISOString(),
        isError: true,
      }

      setConversations(previous =>
        previous.map(chat => {
          if (chat.id !== chatId) {
            return chat
          }

          return {
            ...chat,
            updatedAt: new Date().toISOString(),
            messages: [
              ...chat.messages,
              errorMessage,
            ],
          }
        })
      )

      return {
        error: message,
      }
    } finally {
      setIsLoading(false)
    }
  }, [
    activeChatId,
    conversations,
    uploadFiles,
  ])

  /*
   * Rename a conversation.
   */
  const renameChat = useCallback((chatId, title) => {
    const trimmedTitle =
      String(title || '').trim()

    if (!trimmedTitle) {
      return
    }

    setConversations(previous =>
      previous.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              title: trimmedTitle,
              updatedAt: new Date().toISOString(),
            }
          : chat
      )
    )
  }, [])

  /*
   * Clear current error.
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /*
   * UI-friendly thinking state.
   *
   * The backend currently returns one completed JSON response rather
   * than a token/event stream, so the frontend treats the whole
   * request lifecycle as CHORUS "thinking".
   */
  const thinkingAgentId =
    isLoading
      ? 'orchestrator'
      : null

  return {
    conversations,
    chats: conversations,

    activeChat,
    activeChatId,

    messages: activeChat?.messages || [],

    isLoading,
    loading: isLoading,
    thinkingAgentId,

    error,

    createChat,
    newChat: createChat,

    selectChat,
    setActiveChat: selectChat,

    deleteChat,
    renameChat,

    sendMessage,
    uploadFiles,

    clearError,
  }
}