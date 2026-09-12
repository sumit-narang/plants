import styles from './PlantCard.module.css'

const ERROR_MAP = [
  { match: /No plant found/i,             friendly: "We couldn't find a plant in this photo. Try a closer shot of the leaves or plants." },
  { match: /No identification service/i, friendly: "Leaffy isn't set up on this server yet." },
  { match: /Failed to fetch|network/i,   friendly: "Couldn't reach the server. Check your connection and try again." },
  { match: /Too many requests/i,         friendly: "You're going a bit fast. Wait a minute and try again." },
  { match: /Server error (502|503|504)/, friendly: "Leaffy is temporarily unavailable. Please try again shortly." },
  { match: /429|daily limit/i,           friendly: "We've hit our daily identification limit. Try again tomorrow." },
  { match: /401|unauthorized/i,          friendly: "Authentication failed with the identification service. Try again later." },
  { match: /No image/i,                  friendly: "Something went wrong uploading your photo. Please try again." },
]

function friendlyError(msg) {
  if (!msg) return msg
  const match = ERROR_MAP.find(e => e.match.test(msg))
  return match ? match.friendly : "Something went wrong. Please try again."
}

export default function PlantCard({ imageUrl, result, identifying, error }) {
  const activeError = friendlyError(error)

  const top = result?.results?.[0]
  const taxon = top?.taxon
  const confidence = top ? Math.round(top.combined_score * 100) : null
  const displayName = taxon?.preferred_common_name || taxon?.name

  return (
    <div className={styles.wrapper}>

      {/* ── Image panel ── */}
      <div className={styles.imagePanel}>
        <div className={styles.imageBox}>

          <img src={imageUrl} className={styles.img} alt="plant" />

          {identifying && (
            <div className={styles.scanOverlay}>
              <div className={styles.scanLine} />
              <div className={styles.scanCorners}>
                <span className={`${styles.corner} ${styles.cornerTL}`} />
                <span className={`${styles.corner} ${styles.cornerTR}`} />
                <span className={`${styles.corner} ${styles.cornerBL}`} />
                <span className={`${styles.corner} ${styles.cornerBR}`} />
              </div>
              <span className={styles.scanLabel}>Identifying plant…</span>
            </div>
          )}
        </div>

      </div>

      {/* ── Info panel ── */}
      <div className={styles.infoPanel}>

        {activeError && (
          <div className={styles.errorBox}>
            <img src={import.meta.env.BASE_URL + 'error.svg'} alt="" width={14} height={14} style={{ marginRight: 4, verticalAlign: 'middle', flexShrink: 0 }} />
            {activeError}
          </div>
        )}

        {!result && !error && (
          <div className={styles.skeleton}>
            <div className={styles.skeletonLine} style={{ width: '55%', height: 32 }} />
            <div className={styles.skeletonLine} style={{ width: '35%', height: 18 }} />
            <div className={styles.skeletonLine} style={{ width: '100%', height: 4, marginTop: 16 }} />
            <div className={styles.skeletonLine} style={{ width: '45%', height: 22 }} />
            <div className={styles.skeletonLine} style={{ width: '100%', height: 72 }} />
            <div className={styles.skeletonLine} style={{ width: '30%', height: 16 }} />
          </div>
        )}

        {taxon && (
          <>
            {/* Name + badge */}
            <div className={styles.nameRow}>
              <div>
                <h1 className={styles.commonName}>{displayName}</h1>
                <p className={styles.scientificName}>{taxon.name}</p>
              </div>
              {confidence !== null && (
                <span className={styles.confidenceBadge}>{confidence}% Match</span>
              )}
            </div>

            <hr className={styles.divider} />

            {/* Wikipedia */}
            {result.wiki && (
              <>
                <div className={styles.wiki}>
                  <h2 className={styles.sectionTitle}>Description</h2>
                  {result.wiki.extract && (
                    <p className={styles.wikiExtract}>{result.wiki.extract}</p>
                  )}
                  {result.wiki.url && (
                    <a href={result.wiki.url} target="_blank" rel="noopener noreferrer" className={styles.wikiLink}>
                      Read more on Wikipedia <span className={styles.wikiArrow}>↗</span>
                    </a>
                  )}
                </div>
                <hr className={styles.divider} />
              </>
            )}

            {/* Alternatives */}
            {result.results?.length > 1 && (
              <div className={styles.alternatives}>
                <h2 className={styles.sectionTitle}>Other possibilities</h2>
                <div className={styles.altList}>
                  {result.results
                    .slice(1)
                    .filter(r => r.taxon.name !== taxon.name)
                    .slice(0, 3)
                    .map((r, i) => (
                      <div key={i} className={styles.altRow}>
                        <div>
                          <p className={styles.altName}>{r.taxon.preferred_common_name || r.taxon.name}</p>
                          <p className={styles.altScientific}>{r.taxon.name}</p>
                        </div>
                        <span className={styles.altScore}>{Math.round(r.combined_score * 100)}%</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
