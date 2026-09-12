import { useRef, useState } from 'react'
import { isHeic, convertHeicToJpeg } from '../utils/heic'
import styles from './LandingPage.module.css'

const BASE = import.meta.env.BASE_URL
const leafSrcs = [
  `${BASE}Leaves01.png`, `${BASE}Leaves02.png`, `${BASE}Leaves03.png`,
  `${BASE}Leaves04.png`, `${BASE}Leaves05.png`, `${BASE}Leaves06.png`,
]

export default function LandingPage({ onImage }) {
  const uploadInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [converting, setConverting] = useState(false)
  const [fileDragging, setFileDragging] = useState(false)

  async function handleFiles(files) {
    let file = files[0]
    if (!file) return
    if (isHeic(file)) {
      setConverting(true)
      try {
        file = await convertHeicToJpeg(file)
      } catch (err) {
        console.error('HEIC conversion failed', err)
        return
      } finally {
        setConverting(false)
      }
    }
    if (file.type.startsWith('image/')) onImage(file)
  }

  return (
    <div
      className={`${styles.hero} ${fileDragging ? styles.dragging : ''}`}
      onDragOver={e => { e.preventDefault(); setFileDragging(true) }}
      onDragLeave={() => setFileDragging(false)}
      onDrop={e => { e.preventDefault(); setFileDragging(false); handleFiles(e.dataTransfer.files) }}
    >
      {/* Background real plant photos */}
      <div className={styles.bgDecor}>
        {leafSrcs.map((src, i) => (
          <img
            key={i}
            className={`${styles.leaf} ${styles[`leaf${i + 1}`]}`}
            src={src}
            alt=""
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Noise texture overlay */}
      <div className={styles.noise} />

      {/* Content */}
      <div className={styles.content}>
        <h1 className={styles.heading}>
          <span className={styles.headingLine1}>Know your </span><span className={styles.headingLine2}>plants.</span>
        </h1>

        <p className={styles.subheading}>
          Take a photo of any plant.<br />Know exactly what it is.
        </p>

        <div className={styles.actions}>
          <div className={styles.buttons}>
            <button
              className={`${styles.btn} ${styles.uploadBtn}`}
              onClick={() => uploadInputRef.current.click()}
              disabled={converting}
            >
              {converting ? (
                <><span className={styles.btnSpinner} style={{ marginRight: 4 }} />Converting…</>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload a photo
                </>
              )}
            </button>

            {/* Camera button: touch devices only (the capture attribute does nothing on desktop) */}
            <button
              className={`${styles.btn} ${styles.cameraBtn}`}
              onClick={() => cameraInputRef.current.click()}
              disabled={converting}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Take a photo
            </button>
          </div>

          <p className={styles.dropHint}>or drop a photo anywhere</p>
        </div>
      </div>

      {/* Library / file picker */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        style={{ display: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />

      {/* Opens the rear camera directly on phones */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />

      {fileDragging && (
        <div className={styles.dropOverlay}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c0 0-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v10" />
          </svg>
          <p>Drop your plant photo here</p>
        </div>
      )}
    </div>
  )
}
