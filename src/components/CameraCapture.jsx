import { useEffect, useRef, useState } from 'react'
import styles from './CameraCapture.module.css'

// Desktop "Take a photo": live webcam preview → JPEG File.
// Phones use the native camera via <input capture> instead (see LandingPage).
export default function CameraCapture({ onCapture, onClose, onFallback }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const captureBtnRef = useRef(null)
  const [status, setStatus] = useState('starting') // 'starting' | 'live' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setStatus('live')
      } catch (err) {
        if (cancelled) return
        setErrorMsg(
          err.name === 'NotAllowedError' ? 'Camera access was blocked. Allow it in your browser settings, or choose a photo instead.'
          : err.name === 'NotFoundError' ? "We couldn't find a camera on this device."
          : "We couldn't start your camera."
        )
        setStatus('error')
      }
    }

    start()
    return () => { cancelled = true; stopStream() }
  }, [])

  useEffect(() => {
    if (status === 'live') captureBtnRef.current?.focus()
  }, [status])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleClose() {
    stopStream()
    onClose()
  }

  function handleCapture() {
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      stopStream()
      onCapture(new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Take a photo">
        <div className={styles.viewfinder}>
          <video ref={videoRef} className={styles.video} playsInline muted />
          {status === 'starting' && <p className={styles.overlayText}>Starting camera…</p>}
          {status === 'error' && <p className={styles.overlayText}>{errorMsg}</p>}
        </div>

        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.secondary}`} onClick={handleClose}>Cancel</button>
          {status === 'error' ? (
            <button className={`${styles.btn} ${styles.primary}`} onClick={() => { handleClose(); onFallback() }}>
              Choose a photo
            </button>
          ) : (
            <button
              ref={captureBtnRef}
              className={`${styles.btn} ${styles.primary}`}
              onClick={handleCapture}
              disabled={status !== 'live'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Capture
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
