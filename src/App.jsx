import { useState, useRef } from 'react'
import LandingPage from './pages/LandingPage'
import PlantCard from './components/PlantCard'
import { convertHeicToJpeg } from './utils/heic'
import styles from './App.module.css'

export default function App() {
  const [page, setPage] = useState('landing')   // 'landing' | 'identify'
  const fileInputRef = useRef(null)
  const abortRef = useRef(null)
  const [image, setImage] = useState(null)       // { url: objectURL, file: File }
  const [result, setResult] = useState(null)
  const [identifying, setIdentifying] = useState(false)
  const [error, setError] = useState('')

  async function handleImage(file) {
    try {
      file = await convertHeicToJpeg(file)
    } catch (err) {
      console.error('HEIC conversion failed', err)
    }
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const url = URL.createObjectURL(file)
    setImage({ url, file })
    setResult(null)
    setError('')
    setIdentifying(true)
    setPage('identify')
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await fetch('/plants-api/identify', { method: 'POST', body: form, signal: controller.signal })
      const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }))
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message)
    } finally {
      setIdentifying(false)
    }
  }

  function handleReset() {
    setImage(null)
    setResult(null)
    setError('')
    setPage('landing')
  }

  if (page === 'landing') {
    return <LandingPage onImage={handleImage} />
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button className={styles.logoBtn} onClick={handleReset}>
            <img src={import.meta.env.BASE_URL + 'logoFull.svg'} alt="Leaffy" height={28} />
          </button>
          <button className={styles.tryAnotherBtn} onClick={() => fileInputRef.current.click()}>New photo</button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleImage(e.target.files[0]); e.target.value = '' }} />
        </div>
      </header>

      <main className={styles.main}>
        {image && (
          <PlantCard
            imageUrl={image.url}
            result={result}
            identifying={identifying}
            error={error}
          />
        )}
      </main>
    </div>
  )
}
