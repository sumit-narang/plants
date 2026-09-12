import express from 'express'
import multer from 'multer'
import fetch from 'node-fetch'
import FormData from 'form-data'
import { readFileSync } from 'fs'

// Load .env manually
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  for (const line of env.split('\n')) {
    const [key, ...val] = line.split('=')
    if (key && val.length) process.env[key.trim()] = val.join('=').trim()
  }
} catch {}

const app    = express()
const PORT   = Number(process.env.PORT) || 3002
const HOST   = process.env.HOST || '127.0.0.1'  // only reachable via nginx, never directly
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// ── PlantNet ──────────────────────────────────────────────────────────
async function identifyWithPlantNet(fileBuffer, mimetype, filename) {
  const key = process.env.PLANTNET_KEY
  if (!key || key === 'paste_your_key_here') return null  // skip if not configured

  const form = new FormData()
  form.append('images', fileBuffer, { filename, contentType: mimetype })
  form.append('organs', 'auto')

  const res = await fetch(
    `https://my-api.plantnet.org/v2/identify/all?api-key=${key}&lang=en&nb-results=6`,
    { method: 'POST', headers: form.getHeaders(), body: form }
  )

  if (res.status === 429) {
    console.warn('[PlantNet] Daily limit reached — falling back to iNaturalist')
    return null  // trigger fallback
  }

  if (res.status === 404) {
    console.log('[PlantNet] No plant found in photo')
    return { source: 'plantnet', results: [] }
  }

  if (!res.ok) throw new Error(`PlantNet ${res.status}: ${await res.text()}`)

  const data = await res.json()
  console.log(
    `[PlantNet] ${data.results[0]?.species.scientificNameWithoutAuthor}` +
    ` (${Math.round((data.results[0]?.score ?? 0) * 100)}%)` +
    ` — ${data.remainingIdentificationRequests} requests left today`
  )

  return {
    source: 'plantnet',
    results: data.results.map(r => ({
      combined_score: r.score,
      taxon: {
        name:                  r.species.scientificNameWithoutAuthor,
        preferred_common_name: r.species.commonNames?.[0] || null,
        rank:                  'species',
        family:                r.species.family?.scientificNameWithoutAuthor || null,
        genus:                 r.species.genus?.scientificNameWithoutAuthor  || null,
      },
    })),
  }
}

// ── iNaturalist ───────────────────────────────────────────────────────
async function identifyWithINaturalist(fileBuffer, mimetype, filename) {
  const token = process.env.INAT_TOKEN
  if (!token || token === 'paste_your_token_here') return null  // skip if not configured

  const form = new FormData()
  form.append('image', fileBuffer, { filename, contentType: mimetype })

  const res = await fetch('https://api.inaturalist.org/v1/computervision/score_image', {
    method: 'POST',
    headers: { ...form.getHeaders(), 'Authorization': `Bearer ${token}` },
    body: form,
  })

  if (!res.ok) throw new Error(`iNaturalist ${res.status}: ${await res.text()}`)

  const data = await res.json()
  console.log(
    `[iNaturalist] ${data.results[0]?.taxon.name}` +
    ` (${Math.round((data.results[0]?.combined_score ?? 0) * 100)}%)`
  )

  // Normalize to same shape as PlantNet
  return {
    source: 'inaturalist',
    results: data.results.map(r => {
      const ancestors = r.taxon.ancestors || []
      return {
        combined_score: r.combined_score,
        taxon: {
          name:                  r.taxon.name,
          preferred_common_name: r.taxon.preferred_common_name || null,
          rank:                  r.taxon.rank || 'species',
          family:                ancestors.find(a => a.rank === 'family')?.name || null,
          genus:                 ancestors.find(a => a.rank === 'genus')?.name  || null,
        },
      }
    }),
  }
}

// ── Wikipedia ─────────────────────────────────────────────────────────
async function fetchWikipedia(scientificName) {
  try {
    const title = encodeURIComponent(scientificName.replace(/ /g, '_'))
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, {
      headers: { 'User-Agent': 'PlantID-App/1.0 (educational project)' }
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.type === 'disambiguation') return null
    return {
      extract:   data.extract       || null,
      image:     data.thumbnail?.source || null,
      url:       data.content_urls?.desktop?.page || null,
      pageTitle: data.title         || null,
    }
  } catch {
    return null
  }
}

// ── Routes ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true }))

app.post('/api/identify', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' })

    const { buffer, mimetype, originalname } = req.file
    const filename = originalname || 'photo.jpg'

    // Try PlantNet first, fall back to iNaturalist on rate limit or missing key
    let result = await identifyWithPlantNet(buffer, mimetype, filename)
    if (!result) {
      result = await identifyWithINaturalist(buffer, mimetype, filename)
    }

    if (!result) {
      return res.status(500).json({ error: 'No identification service configured. Add PLANTNET_KEY or INAT_TOKEN to .env' })
    }

    if (!result.results.length) {
      return res.status(422).json({ error: 'No plant found in photo' })
    }

    const topName = result.results[0].taxon.name

    const wiki = await fetchWikipedia(topName)

    res.json({ ...result, wiki })
  } catch (err) {
    console.error('[identify]', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, HOST, () => console.log(`[server] http://${HOST}:${PORT}`))
