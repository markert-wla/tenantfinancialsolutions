'use client'

import { useEffect } from 'react'

export default function ConsoleCapture() {
  useEffect(() => {
    const target = 'https://www.weblaunchacademy.com'

    const send = (type: string, args: unknown[]) => {
      try {
        const message = args.map((a) =>
          typeof a === 'object' ? JSON.stringify(a) : String(a)
        ).join(' ')
        window.parent.postMessage({ type: 'console', level: type, message }, target)
      } catch {
        // ignore serialization errors
      }
    }

    const _log = console.log.bind(console)
    const _warn = console.warn.bind(console)
    const _error = console.error.bind(console)

    console.log = (...args) => { _log(...args); send('log', args) }
    console.warn = (...args) => { _warn(...args); send('warn', args) }
    console.error = (...args) => { _error(...args); send('error', args) }

    const onUnhandled = (e: ErrorEvent) => {
      send('error', [`Unhandled error: ${e.message} (${e.filename}:${e.lineno})`])
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      send('error', [`Unhandled rejection: ${String(e.reason)}`])
    }

    window.addEventListener('error', onUnhandled)
    window.addEventListener('unhandledrejection', onRejection)

    return () => {
      console.log = _log
      console.warn = _warn
      console.error = _error
      window.removeEventListener('error', onUnhandled)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
