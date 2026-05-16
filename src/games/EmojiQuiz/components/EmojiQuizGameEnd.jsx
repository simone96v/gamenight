// Schermata finale.
// Local (1v1 vs bot): podio Tu vs Blobby + recap pallini.
// Online (N players, 2-8): podio top 3 + leaderboard completa.

import BlobAvatar from './BlobAvatar'
import Confetti from './Confetti'

const PODIUM_EMOJIS = ['🥇', '🥈', '🥉']

const EmojiQuizGameEnd = ({
  isOnline = false,
  pScore,
  oScore,
  pName = 'Tu',
  oName = 'Blobby',
  pColor = 'var(--eq-lime)',
  oColor = 'var(--eq-pink)',
  players,
  eqScores,
  roundLog,
  isHost,
  onReplay,
  onChangeGame,
}) => {
  if (isOnline) {
    return (
      <OnlineGameEnd
        players={players}
        eqScores={eqScores}
        localName={pName}
        roundLog={roundLog}
        isHost={isHost}
        onReplay={onReplay}
        onChangeGame={onChangeGame}
      />
    )
  }

  // ── Local 1v1 vs bot ──
  const win = pScore > oScore
  const tie = pScore === oScore

  return (
    <div className="eq-screen eq-gameover">
      {win && <Confetti big />}
      <div className="eq-trophy">{win ? '🏆' : tie ? '🤝' : '😤'}</div>
      <h2 className={`eq-go-head ${win ? 'win' : tie ? 'tie' : 'lose'}`}>
        {win ? 'Hai vinto!' : tie ? 'Pareggio!' : `Vince ${oName}`}
      </h2>

      <div className="eq-final-scores">
        <div className={`eq-fs-col ${win ? 'winner' : ''}`}>
          <BlobAvatar color={pColor} size={46} mood={win ? 'happy' : 'sad'} />
          <div className="eq-fs-name">{pName}</div>
          <div className="eq-fs-num">{pScore}</div>
        </div>
        <div className="eq-fs-dash">—</div>
        <div className={`eq-fs-col ${!win && !tie ? 'winner' : ''}`}>
          <BlobAvatar color={oColor} size={46} mood={!win && !tie ? 'happy' : 'sad'} />
          <div className="eq-fs-name">{oName}</div>
          <div className="eq-fs-num">{oScore}</div>
        </div>
      </div>

      <div className="eq-recap">
        {roundLog.map((r, i) => (
          <span key={i} className={`eq-recap-dot ${r}`} title={`Round ${i + 1}`} />
        ))}
      </div>
      <div className="eq-recap-legend">
        <span><i className="eq-recap-dot win" /> tuoi</span>
        <span><i className="eq-recap-dot lose" /> {oName}</span>
        <span><i className="eq-recap-dot tie" /> nessuno</span>
      </div>

      <div className="eq-end-actions">
        {onChangeGame && (
          <button className="eq-cta-secondary" onClick={onChangeGame}>
            🎮 Cambia gioco
          </button>
        )}
        <button className="eq-cta" onClick={onReplay}>Rivincita</button>
      </div>
    </div>
  )
}

// ─── Online: N players ───────────────────────────────────────────────────

const OnlineGameEnd = ({ players, eqScores, localName, roundLog, isHost, onReplay, onChangeGame }) => {
  const sorted = [...(players || [])]
    .map((p) => ({ ...p, score: eqScores?.[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score)

  const top3 = sorted.slice(0, 3)
  const localIsTop = sorted.length > 0 && sorted[0].name === localName

  return (
    <div className="eq-screen eq-gameover">
      {localIsTop && <Confetti big />}
      <div className="eq-trophy">{localIsTop ? '🏆' : '🎮'}</div>
      <h2 className={`eq-go-head ${localIsTop ? 'win' : 'tie'}`}>
        {localIsTop ? 'Hai vinto!' : `Vince ${sorted[0]?.name ?? '...'}`}
      </h2>

      {/* Podio top 3 */}
      <div className="eq-final-scores" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        {top3.map((p, i) => (
          <div
            key={p.id}
            className={`eq-fs-col ${i === 0 ? 'winner' : ''}`}
            style={{ minWidth: 90 }}
          >
            <div style={{ fontSize: i === 0 ? 30 : 22, lineHeight: 1 }}>{PODIUM_EMOJIS[i]}</div>
            <BlobAvatar color={p.color} size={i === 0 ? 46 : 38} mood={i === 0 ? 'happy' : 'sad'} />
            <div className="eq-fs-name" style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </div>
            <div className="eq-fs-num" style={{ fontSize: i === 0 ? 30 : 24 }}>{p.score}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard completa se >3 */}
      {sorted.length > 3 && (
        <div style={{ width: '100%', marginBottom: 14 }}>
          {sorted.slice(3).map((p, i) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 12px',
                marginBottom: 4,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--eq-ink)',
                fontSize: 14,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--eq-muted)', fontWeight: 700, minWidth: 22 }}>#{i + 4}</span>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.color }} />
                <span style={{ fontWeight: 600 }}>{p.name}</span>
              </span>
              <span style={{ fontWeight: 800 }}>{p.score}</span>
            </div>
          ))}
        </div>
      )}

      {roundLog?.length > 0 && (
        <>
          <div className="eq-recap">
            {roundLog.map((r, i) => (
              <span key={i} className={`eq-recap-dot ${r}`} title={`Round ${i + 1}`} />
            ))}
          </div>
          <div className="eq-recap-legend">
            <span><i className="eq-recap-dot win" /> tuoi</span>
            <span><i className="eq-recap-dot lose" /> altri</span>
            <span><i className="eq-recap-dot tie" /> nessuno</span>
          </div>
        </>
      )}

      <div className="eq-end-actions">
        {onChangeGame && (
          <button className="eq-cta-secondary" onClick={onChangeGame}>
            🎮 Cambia gioco
          </button>
        )}
        {isHost ? (
          <button className="eq-cta" onClick={onReplay}>Rivincita</button>
        ) : (
          <div style={{ flex: 1.2, padding: '14px 0', textAlign: 'center', color: 'var(--eq-muted)', fontSize: 14, fontWeight: 600 }}>
            Aspettando l'host… 👑
          </div>
        )}
      </div>
    </div>
  )
}

export default EmojiQuizGameEnd
