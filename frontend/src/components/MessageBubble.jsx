import { useState } from 'react'
import { motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AGENTS } from '../data/agents'

const API_BASE_URL = 'http://127.0.0.1:8000'

/* =========================================================
   ASSISTANT MARKDOWN FORMATTER
   ========================================================= */

function formatAssistantMarkdown(content) {
  if (!content) return ''

  let formatted = String(content)
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim()

  const headings = [
    'EXECUTIVE SUMMARY',
    'RESEARCH SUMMARY',
    'KEY FINDINGS',
    'KEY TAKEAWAYS',
    'KEY POINTS',
    'INTRODUCTION',
    'OVERVIEW',
    'BACKGROUND',
    'APPLICATIONS',
    'BENEFITS',
    'ADVANTAGES',
    'CHALLENGES',
    'LIMITATIONS',
    'RISKS',
    'USE CASES',
    'IMPLEMENTATION',
    'RECOMMENDATIONS',
    'BEST PRACTICES',
    'FUTURE TRENDS',
    'FUTURE DIRECTIONS',
    'CONCLUSION',
    'REFERENCES',
  ]

  /*
   * -------------------------------------------------------
   * 1. Convert accidentally bolded headings into Markdown
   * headings.
   *
   * Example:
   *
   * **RESEARCH SUMMARY**
   *
   * becomes:
   *
   * ## RESEARCH SUMMARY
   * -------------------------------------------------------
   */

  for (const heading of headings) {
    const escaped = heading.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )

    formatted = formatted.replace(
      new RegExp(
        `(^|\\n)\\s*\\*\\*${escaped}\\*\\*\\s*(?=\\n|$)`,
        'gi'
      ),
      `$1## ${heading}`
    )
  }

  /*
   * -------------------------------------------------------
   * 2. Handle a response where the entire section was
   * accidentally wrapped in bold.
   *
   * Example:
   *
   * **RESEARCH SUMMARY
   * Generative AI has evolved...
   * **
   *
   * becomes:
   *
   * ## RESEARCH SUMMARY
   *
   * Generative AI has evolved...
   * -------------------------------------------------------
   */

  for (const heading of headings) {
    const escaped = heading.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )

    formatted = formatted.replace(
      new RegExp(
        `(^|\\n)\\s*\\*\\*${escaped}\\s*(?=\\n)`,
        'gi'
      ),
      `$1## ${heading}\n\n`
    )
  }

  /*
   * -------------------------------------------------------
   * 3. Convert plain uppercase headings appearing on their
   * own line into Markdown headings.
   *
   * Example:
   *
   * RESEARCH SUMMARY
   * Generative AI has evolved...
   *
   * becomes:
   *
   * ## RESEARCH SUMMARY
   *
   * Generative AI has evolved...
   * -------------------------------------------------------
   */

  for (const heading of headings) {
    const escaped = heading.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )

    formatted = formatted.replace(
      new RegExp(
        `(^|\\n)\\s*${escaped}\\s*(?=\\n|$)`,
        'gi'
      ),
      `$1## ${heading}`
    )
  }

  /*
   * -------------------------------------------------------
   * 4. Handle headings returned inline with their content.
   *
   * Example:
   *
   * RESEARCH SUMMARY Generative AI has evolved...
   *
   * becomes:
   *
   * ## RESEARCH SUMMARY
   *
   * Generative AI has evolved...
   * -------------------------------------------------------
   */

  for (const heading of headings) {
    const escaped = heading.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )

    formatted = formatted.replace(
      new RegExp(
        `(^|\\n|(?<!#)\\s)${escaped}\\s+(?=[A-Z])`,
        'g'
      ),
      (match, prefix) => {
        let linePrefix = ''

        if (prefix === '\n') {
          linePrefix = '\n'
        } else if (prefix === ' ') {
          linePrefix = '\n\n'
        }

        return `${linePrefix}## ${heading}\n\n`
      }
    )
  }

  /*
   * -------------------------------------------------------
   * 5. Remove an accidental closing bold marker that may
   * remain after converting a whole bold section.
   *
   * Only removes a standalone trailing **.
   * -------------------------------------------------------
   */

  formatted = formatted.replace(
    /\n\s*\*\*\s*$/g,
    ''
  )

  /*
   * -------------------------------------------------------
   * 6. Prevent excessive blank lines.
   * -------------------------------------------------------
   */

  formatted = formatted
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return formatted
}

/* =========================================================
   MESSAGE BUBBLE
   ========================================================= */

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  const agent = !isUser
    ? AGENTS.find(
        (item) => item.id === message.agentId
      )
    : null

  /* =======================================================
     USER MESSAGE
     ======================================================= */

  if (isUser) {
    const uploadedFiles =
      getUploadedFiles(message.attachment)

    return (
      <motion.div
        initial={{
          opacity: 0,
          y: 8,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.3,
          ease: 'easeOut',
        }}
        className="flex justify-end"
      >
        <div className="flex max-w-[75%] flex-col items-end gap-1.5">

          {/* =================================================
              UPLOADED FILE INDICATOR
             ================================================= */}

          {uploadedFiles.length > 0 && (
            <div className="flex max-w-full items-center gap-2 rounded-xl border border-line bg-ink/[0.035] px-3 py-1.5 text-xs text-ink/60">
              <span className="text-sm">
                📎
              </span>

              <span className="truncate">
                {uploadedFiles.length === 1
                  ? `File uploaded · ${uploadedFiles[0]}`
                  : `${uploadedFiles.length} files uploaded`}
              </span>
            </div>
          )}

          {/* =================================================
              USER MESSAGE
             ================================================= */}

          <div className="rounded-3xl rounded-br-lg border border-line bg-paper px-4 py-3 text-[15px] leading-relaxed text-ink shadow-sm">
            {message.content}
          </div>
        </div>
      </motion.div>
    )
  }

  /* =======================================================
     ASSISTANT MESSAGE
     ======================================================= */

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.3,
        ease: 'easeOut',
      }}
      className="flex max-w-[82%] flex-col items-start gap-2"
    >

      {/* ===================================================
          AGENT IDENTITY
         =================================================== */}

      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor:
              agent?.color || '#999',
          }}
        />

        <span
          className="text-xs font-semibold tracking-wide"
          style={{
            color:
              agent?.color || 'inherit',
          }}
        >
          {agent?.name ?? 'CHORUS'}
        </span>
      </div>

      {/* ===================================================
          RESPONSE
         =================================================== */}

      {message.content && (
        <div className="w-full text-[15px] leading-7 text-ink">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{

              /* =============================================
                 H1
                 ============================================= */

              h1: ({ children }) => (
                <h1 className="mb-5 mt-3 text-2xl font-bold tracking-tight text-ink">
                  {children}
                </h1>
              ),

              /* =============================================
                 H2
                 ============================================= */

              h2: ({ children }) => (
                <h2 className="mb-3 mt-7 text-xl font-bold tracking-tight text-ink">
                  {children}
                </h2>
              ),

              /* =============================================
                 H3
                 ============================================= */

              h3: ({ children }) => (
                <h3 className="mb-3 mt-6 text-lg font-bold tracking-tight text-ink">
                  {children}
                </h3>
              ),

              /* =============================================
                 PARAGRAPH
                 ============================================= */

              p: ({ children }) => (
                <p className="mb-5 leading-7 last:mb-0">
                  {children}
                </p>
              ),

              /* =============================================
                 BOLD TEXT
                 ============================================= */

              strong: ({ children }) => (
                <strong className="font-semibold">
                  {children}
                </strong>
              ),

              /* =============================================
                 ITALIC TEXT
                 ============================================= */

              em: ({ children }) => (
                <em className="italic">
                  {children}
                </em>
              ),

              /* =============================================
                 UNORDERED LIST
                 ============================================= */

              ul: ({ children }) => (
                <ul className="mb-4 ml-5 list-disc space-y-1.5">
                  {children}
                </ul>
              ),

              /* =============================================
                 ORDERED LIST
                 ============================================= */

              ol: ({ children }) => (
                <ol className="mb-4 ml-5 list-decimal space-y-1.5">
                  {children}
                </ol>
              ),

              /* =============================================
                 LIST ITEM
                 ============================================= */

              li: ({ children }) => (
                <li className="pl-1">
                  {children}
                </li>
              ),

              /* =============================================
                 HORIZONTAL RULE
                 ============================================= */

              hr: () => (
                <hr className="my-6 border-0 border-t border-line" />
              ),

              /* =============================================
                 BLOCKQUOTE
                 ============================================= */

              blockquote: ({ children }) => (
                <blockquote className="my-4 border-l-2 border-line pl-4 text-ink/70 italic">
                  {children}
                </blockquote>
              ),

              /* =============================================
                 CODE
                 ============================================= */

              code: ({
                className,
                children,
                ...props
              }) => {
                const isInline =
                  !className &&
                  !String(children).includes('\n')

                if (isInline) {
                  return (
                    <code
                      {...props}
                      className="rounded-md bg-ink/5 px-1.5 py-0.5 font-mono text-[13px]"
                    >
                      {children}
                    </code>
                  )
                }

                return (
                  <code
                    {...props}
                    className="block overflow-x-auto rounded-xl border border-line bg-ink/[0.04] p-4 font-mono text-[13px] leading-relaxed"
                  >
                    {children}
                  </code>
                )
              },

              /* =============================================
                 CODE BLOCK
                 ============================================= */

              pre: ({ children }) => (
                <pre className="my-4 overflow-x-auto rounded-xl">
                  {children}
                </pre>
              ),

              /* =============================================
                 LINKS
                 ============================================= */

              a: ({
                href,
                children,
              }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2 transition hover:opacity-60"
                >
                  {children}
                </a>
              ),

              /* =============================================
                 TABLE
                 ============================================= */

              table: ({ children }) => (
                <div className="my-5 overflow-x-auto rounded-xl border border-line">
                  <table className="w-full border-collapse text-sm">
                    {children}
                  </table>
                </div>
              ),

              /* =============================================
                 TABLE HEADER
                 ============================================= */

              thead: ({ children }) => (
                <thead className="bg-ink/[0.04]">
                  {children}
                </thead>
              ),

              /* =============================================
                 TABLE HEADER CELL
                 ============================================= */

              th: ({ children }) => (
                <th className="border-b border-line px-3 py-2.5 text-left font-semibold">
                  {children}
                </th>
              ),

              /* =============================================
                 TABLE DATA CELL
                 ============================================= */

              td: ({ children }) => (
                <td className="border-t border-line px-3 py-2.5">
                  {children}
                </td>
              ),
            }}
          >
            {formatAssistantMarkdown(message.content)}
          </ReactMarkdown>
        </div>
      )}

      {/* ===================================================
          GENERATED FILE
         =================================================== */}

      {message.fileAction && (
        <FileCard
          fileAction={message.fileAction}
        />
      )}

      {/* ===================================================
          EMAIL ACTION
         =================================================== */}

      {message.emailAction && (
        <EmailCard
          emailAction={message.emailAction}
        />
      )}
    </motion.div>
  )
}

/* =========================================================
   UPLOADED FILE HELPERS
   ========================================================= */

function getUploadedFiles(attachment) {
  if (!attachment) {
    return []
  }

  /* Multiple uploaded files */

  if (
    Array.isArray(
      attachment.files
    )
  ) {
    return attachment.files
      .map(
        (file) =>
          file?.originalName ||
          file?.original_name ||
          file?.filename ||
          ''
      )
      .filter(Boolean)
  }

  /* Single uploaded file */

  const filename =
    attachment.originalName ||
    attachment.original_name ||
    attachment.filename ||
    ''

  return filename
    ? [filename]
    : []
}

/* =========================================================
   FILE CARD
   ========================================================= */

function FileCard({ fileAction }) {
  const [downloading, setDownloading] =
    useState(false)

  const [error, setError] =
    useState('')

  const filename =
    fileAction.filename ||
    'generated_document'

  const fileType = (
    fileAction.file_type ||
    'file'
  ).toUpperCase()

  const downloadUrl =
    fileAction.download_url

  const handleDownload = async () => {
    if (!downloadUrl) {
      setError(
        'Download link is not available.'
      )
      return
    }

    setDownloading(true)
    setError('')

    try {
      const url =
        downloadUrl.startsWith('http')
          ? downloadUrl
          : `${API_BASE_URL}${downloadUrl}`

      const response =
        await fetch(url)

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(
              () => ({})
            )

        throw new Error(
          errorData.detail ||
            `Download failed (${response.status}).`
        )
      }

      const blob =
        await response.blob()

      const blobUrl =
        window.URL.createObjectURL(
          blob
        )

      const link =
        document.createElement('a')

      link.href = blobUrl
      link.download = filename

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(
        blobUrl
      )
    } catch (err) {
      console.error(
        'CHORUS file download error:',
        err
      )

      setError(
        err.message ||
          'Unable to download the file.'
      )
    } finally {
      setDownloading(false)
    }
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 6,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.25,
      }}
      className="mt-2 w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-paper shadow-sm"
    >
      <div className="flex items-center gap-4 p-4">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-lg text-paper">
          📄
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-ink">
            {filename}
          </h3>

          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-ink/45">
            {fileType} document
          </p>
        </div>
      </div>

      <div className="border-t border-line bg-ink/[0.02] p-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {downloading
            ? 'Preparing download...'
            : '↓ Download Document'}
        </button>
      </div>

      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </motion.div>
  )
}

/* =========================================================
   EMAIL CARD
   ========================================================= */

function EmailCard({ emailAction }) {
  const initialRecipient =
    emailAction?.to ||
    emailAction?.recipient ||
    emailAction?.email ||
    ''

  const [to, setTo] =
    useState(initialRecipient)

  const [subject, setSubject] =
    useState(
      emailAction?.subject || ''
    )

  const [emailMessage, setEmailMessage] =
    useState(
      emailAction?.message || ''
    )

  const [step, setStep] =
    useState('edit')

  const [sending, setSending] =
    useState(false)

  const [sent, setSent] =
    useState(false)

  const [cancelled, setCancelled] =
    useState(false)

  const [error, setError] =
    useState('')

  /* =======================================================
     RECIPIENT VALIDATION
     ======================================================= */

  const isValidRecipient = (
    value
  ) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value.trim()
    )
  }

  /* =======================================================
     CONTINUE TO CONFIRMATION
     ======================================================= */

  const handleContinue = () => {
    setError('')

    const recipient =
      to.trim()

    if (!recipient) {
      setError(
        'Please enter the recipient email address.'
      )
      return
    }

    if (
      !isValidRecipient(
        recipient
      )
    ) {
      setError(
        'Please enter a valid recipient email address.'
      )
      return
    }

    if (!subject.trim()) {
      setError(
        'Please enter an email subject.'
      )
      return
    }

    if (!emailMessage.trim()) {
      setError(
        'Please enter the email content.'
      )
      return
    }

    setTo(recipient)
    setStep('confirm')
  }

  /* =======================================================
     CANCEL / REJECT
     ======================================================= */

  const handleCancel = () => {
    /*
     * Cancellation never calls the backend.
     * Therefore /api/send-email is NOT called.
     */

    setError('')
    setSending(false)
    setCancelled(true)
  }

  /* =======================================================
     SEND EMAIL
     ======================================================= */

  const handleSend = async () => {
    setError('')

    const recipient =
      to.trim()

    const trimmedSubject =
      subject.trim()

    const trimmedMessage =
      emailMessage.trim()

    if (!recipient) {
      setError(
        'Missing email recipient. Please enter a recipient email address.'
      )

      setStep('edit')
      return
    }

    if (
      !isValidRecipient(
        recipient
      )
    ) {
      setError(
        'Please enter a valid recipient email address.'
      )

      setStep('edit')
      return
    }

    if (!trimmedSubject) {
      setError(
        'Missing email subject.'
      )

      setStep('edit')
      return
    }

    if (!trimmedMessage) {
      setError(
        'Missing email message.'
      )

      setStep('edit')
      return
    }

    setSending(true)

    const payload = {
      platform:
        emailAction?.platform ||
        'gmail',

      to: recipient,

      cc:
        emailAction?.cc ||
        null,

      bcc:
        emailAction?.bcc ||
        null,

      subject:
        trimmedSubject,

      message:
        trimmedMessage,

      attachments:
        Array.isArray(
          emailAction?.attachments
        )
          ? emailAction.attachments
          : [],
    }

    console.log(
      'CHORUS /api/send-email payload:',
      {
        ...payload,
        message: '[hidden]',
      }
    )

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/api/send-email`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        )

      let data = {}

      try {
        data =
          await response.json()
      } catch {
        data = {}
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            'Failed to send email.'
        )
      }

      if (!data.sent) {
        throw new Error(
          data.message_text ||
            data.message ||
            'The email was not sent.'
        )
      }

      setSent(true)
      setStep('sent')

    } catch (err) {
      console.error(
        'CHORUS email error:',
        err
      )

      setError(
        err.message ||
          'Failed to send email.'
      )

    } finally {
      setSending(false)
    }
  }

  /* =======================================================
     CANCELLED / REJECTED
     ======================================================= */

  if (cancelled) {
    return (
      <motion.div
        initial={{
          opacity: 0,
          y: 6,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="mt-2 w-full max-w-xl rounded-2xl border border-line bg-paper p-5 shadow-sm"
      >
        <div className="flex items-start gap-3">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink">
            ×
          </div>

          <div>
            <h3 className="font-semibold text-ink">
              Email cancelled
            </h3>

            <p className="mt-1 text-sm text-ink/60">
              The email was rejected and was not sent.
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  /* =======================================================
     SENT
     ======================================================= */

  if (sent) {
    return (
      <motion.div
        initial={{
          opacity: 0,
          y: 6,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="mt-2 w-full max-w-xl rounded-2xl border border-line bg-paper p-5 shadow-sm"
      >
        <div className="flex items-start gap-3">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
            ✓
          </div>

          <div>
            <h3 className="font-semibold text-ink">
              Email sent successfully
            </h3>

            <p className="mt-1 text-sm text-ink/60">
              Your email was sent through Gmail.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-xl bg-ink/[0.04] p-4 text-sm">
          <div>
            <span className="font-semibold">
              To:
            </span>{' '}
            {to}
          </div>

          <div>
            <span className="font-semibold">
              Subject:
            </span>{' '}
            {subject}
          </div>
        </div>
      </motion.div>
    )
  }

  /* =======================================================
     CONFIRMATION
     ======================================================= */

  if (step === 'confirm') {
    return (
      <div className="mt-2 w-full max-w-xl rounded-2xl border border-line bg-paper p-5 shadow-sm">

        <div className="mb-4">
          <h3 className="text-base font-semibold text-ink">
            Confirm email
          </h3>

          <p className="mt-1 text-sm text-ink/60">
            Please review the details before sending.
          </p>
        </div>

        <div className="space-y-3 text-sm">

          <div>
            <div className="mb-1 font-semibold text-ink/70">
              Recipient
            </div>

            <div className="rounded-xl border border-line bg-ink/[0.03] px-3 py-2">
              {to}
            </div>
          </div>

          <div>
            <div className="mb-1 font-semibold text-ink/70">
              Subject
            </div>

            <div className="rounded-xl border border-line bg-ink/[0.03] px-3 py-2">
              {subject}
            </div>
          </div>

          <div>
            <div className="mb-1 font-semibold text-ink/70">
              Message
            </div>

            <div className="whitespace-pre-wrap rounded-xl border border-line bg-ink/[0.03] px-3 py-3 leading-relaxed">
              {emailMessage}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">

          <button
            type="button"
            disabled={sending}
            onClick={() => {
              setError('')
              setStep('edit')
            }}
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink/[0.04] disabled:opacity-50"
          >
            Edit
          </button>

          <button
            type="button"
            disabled={sending}
            onClick={handleCancel}
            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={sending}
            onClick={handleSend}
            className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending
              ? 'Sending...'
              : '✓ Confirm & Send'}
          </button>

        </div>
      </div>
    )
  }

  /* =======================================================
     EDIT
     ======================================================= */

  return (
    <div className="mt-2 w-full max-w-xl rounded-2xl border border-line bg-paper p-5 shadow-sm">

      <div className="mb-5">
        <h3 className="text-base font-semibold text-ink">
          ✉ Email
        </h3>

        <p className="mt-1 text-sm text-ink/60">
          Review or enter the email details before sending.
        </p>
      </div>

      <div className="space-y-4">

        {/* Recipient */}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink/70">
            Recipient
          </label>

          <input
            type="email"
            value={to}
            onChange={(event) => {
              setTo(
                event.target.value
              )
              setError('')
            }}
            placeholder="recipient@example.com"
            autoComplete="email"
            className="w-full rounded-xl border border-line bg-transparent px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-ink/40"
          />
        </div>

        {/* Subject */}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink/70">
            Subject
          </label>

          <input
            type="text"
            value={subject}
            onChange={(event) => {
              setSubject(
                event.target.value
              )
              setError('')
            }}
            placeholder="Email subject"
            className="w-full rounded-xl border border-line bg-transparent px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-ink/40"
          />
        </div>

        {/* Content */}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink/70">
            Content
          </label>

          <textarea
            value={emailMessage}
            onChange={(event) => {
              setEmailMessage(
                event.target.value
              )
              setError('')
            }}
            placeholder="Write your email..."
            rows={6}
            className="w-full resize-none rounded-xl border border-line bg-transparent px-3 py-2.5 text-sm leading-relaxed text-ink outline-none transition placeholder:text-ink/30 focus:border-ink/40"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">

        <button
          type="button"
          onClick={handleCancel}
          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleContinue}
          className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:opacity-85"
        >
          Continue
        </button>

      </div>
    </div>
  )
}