import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const STEP_INTERVAL = 1400

function SparkleGlyph({ settled = false, breathDepth = 0.45 }) {
  return (
    <motion.span
      aria-hidden="true"
      className="relative flex h-5 w-5 shrink-0 items-center justify-center text-clay"
      animate={
        settled
          ? { rotate: 0, scale: 1 }
          : {
              rotate: [0, 8, -6, 0],
              scale: [
                1,
                1 + breathDepth * 0.18,
                1 - breathDepth * 0.08,
                1,
              ],
            }
      }
      transition={
        settled
          ? { duration: 0.2 }
          : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <span className="text-[15px] leading-none">✦</span>
      <span className="absolute h-1 w-1 rounded-full bg-clay/70 blur-[1px]" />
    </motion.span>
  )
}

function formatThoughtTime(seconds) {
  if (!Number.isFinite(seconds)) return '0s'
  if (seconds < 10) return `${seconds.toFixed(1)}s`
  return `${Math.round(seconds)}s`
}

export default function ThoughtLine({
  working = false,
  steps = [],
  label = 'Thinking…',
  doneLabel = 'Thought for',
  glyph = 'sparkle',
  fontSize = 16,
  breathPeriod = 1.6,
  breathDepth = 0.45,
  settleDuration = 350,
  settleBlur = 2,
  collapsible = true,
  collapseOnSettle = true,
  showTimer = true,
  onSettle,
}) {
  const safeSteps = useMemo(
    () =>
      Array.isArray(steps) && steps.length > 0
        ? steps
        : ['Working on your request'],
    [steps]
  )

  const startedAtRef = useRef(null)
  const previousWorkingRef = useRef(Boolean(working))
  const settleReportedRef = useRef(false)

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [settled, setSettled] = useState(!working && collapseOnSettle)
  const [expanded, setExpanded] = useState(!collapseOnSettle)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const wasWorking = previousWorkingRef.current

    if (working) {
      if (!wasWorking || startedAtRef.current === null) {
        startedAtRef.current = performance.now()
        settleReportedRef.current = false
        setElapsedSeconds(0)
        setSettled(false)
        setExpanded(true)
        setStepIndex(0)
      }

      previousWorkingRef.current = true
      return
    }

    if (wasWorking) {
      const startedAt = startedAtRef.current
      const seconds = startedAt
        ? Math.max(0, (performance.now() - startedAt) / 1000)
        : elapsedSeconds

      setElapsedSeconds(seconds)
      setSettled(Boolean(collapseOnSettle))
      setExpanded(!collapseOnSettle)

      if (!settleReportedRef.current) {
        settleReportedRef.current = true
        window.setTimeout(() => {
          onSettle?.(Number(seconds.toFixed(1)))
        }, settleDuration)
      }
    }

    previousWorkingRef.current = false
  }, [
    working,
    collapseOnSettle,
    settleDuration,
    onSettle,
    elapsedSeconds,
  ])

  useEffect(() => {
    if (!working) return undefined

    const timer = window.setInterval(() => {
      if (startedAtRef.current === null) return
      setElapsedSeconds(
        (performance.now() - startedAtRef.current) / 1000
      )
    }, 100)

    return () => window.clearInterval(timer)
  }, [working])

  useEffect(() => {
    if (!working || safeSteps.length < 2) return undefined

    const timer = window.setInterval(() => {
      setStepIndex(index => (index + 1) % safeSteps.length)
    }, STEP_INTERVAL)

    return () => window.clearInterval(timer)
  }, [working, safeSteps.length])

  const handleToggle = () => {
    if (!collapsible) return
    setExpanded(value => !value)
    if (settled) setSettled(false)
  }

  const displayText = working
    ? safeSteps[stepIndex]
    : showTimer
      ? `${doneLabel} ${formatThoughtTime(elapsedSeconds)}`
      : doneLabel

  const contentVisible = working || expanded || !collapsible

  const blurAmount = working ? 0 : Math.min(settleBlur, 2)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5, filter: 'blur(2px)' }}
      animate={{
        opacity: 1,
        y: 0,
        filter: `blur(${blurAmount}px)`,
      }}
      transition={{
        duration: working ? 0.22 : settleDuration / 1000,
        ease: 'easeOut',
      }}
      className="w-fit max-w-full"
      style={{ fontSize }}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={!collapsible}
        aria-expanded={contentVisible}
        className={`group flex max-w-full items-center gap-2 rounded-2xl border border-line/80 bg-paper/65 px-3 py-2 text-left shadow-sm backdrop-blur-sm transition ${
          collapsible
            ? 'cursor-pointer hover:border-clay/30 hover:bg-paper/85'
            : 'cursor-default'
        }`}
      >
        {glyph === 'sparkle' ? (
          <SparkleGlyph settled={!working} breathDepth={breathDepth} />
        ) : (
          <span className="h-2 w-2 shrink-0 rounded-full bg-clay" />
        )}

        <span className="min-w-0">
          <span className="block font-semibold leading-5 text-ink">
            {working ? label : doneLabel}
          </span>

          <AnimatePresence initial={false} mode="wait">
            {contentVisible && (
              <motion.span
                key={displayText}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{
                  duration: Math.min(
                    0.28,
                    breathPeriod * 0.18
                  ),
                }}
                className="block truncate text-xs font-medium text-ink-soft"
              >
                {working ? (
                  <>
                    {displayText}
                    <span className="ml-1 inline-flex gap-0.5 align-middle">
                      {[0, 1, 2].map(i => (
                        <motion.i
                          key={i}
                          className="inline-block h-1 w-1 rounded-full bg-ink-faint"
                          animate={{
                            y: [0, -2, 0],
                            opacity: [0.35, 1, 0.35],
                          }}
                          transition={{
                            duration: breathPeriod,
                            repeat: Infinity,
                            delay: i * 0.16,
                            ease: 'easeInOut',
                          }}
                        />
                      ))}
                    </span>
                  </>
                ) : (
                  displayText
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </span>

        {collapsible && (
          <motion.span
            animate={{ rotate: contentVisible ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-1 text-xs text-ink-faint"
            aria-hidden="true"
          >
            ˅
          </motion.span>
        )}
      </button>
    </motion.div>
  )
}
