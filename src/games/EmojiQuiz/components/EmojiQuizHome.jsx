// Schermata home single-player: titolo, chip riepilogo, CTA "Inizia".
// In modalità online questa schermata NON viene usata — il flow parte dalla lobby.

import BlobAvatar from './BlobAvatar'
import { TOTAL_ROUNDS } from '../config'

const EmojiQuizHome = ({ onStart }) => (
  <div className="eq-screen eq-home">
    <div className="eq-eyebrow">BLOBPARTY · MINIGIOCO</div>
    <h1 className="eq-title">
      Emoji<br />
      <span className="eq-title-accent">Quiz</span>
    </h1>
    <div className="eq-hero-emoji">
      <span>🎬</span>
      <span>🎵</span>
      <span>❓</span>
    </div>
    <p className="eq-lede">
      Dietro gli emoji si nasconde un film o una canzone.
      Il <b>primo</b> che lo indovina si prende i punti.
    </p>
    <div className="eq-chips">
      <span className="eq-chip">⚡ {TOTAL_ROUNDS} round</span>
      <span className="eq-chip">🏆 Sfida 1v1</span>
      <span className="eq-chip">⏱️ 25s a round</span>
    </div>
    <button className="eq-cta" onClick={onStart}>Inizia la sfida</button>
    <div className="eq-vs-line">
      <BlobAvatar color="var(--eq-lime)" size={28} />
      <span>Tu &nbsp;vs&nbsp; Blobby</span>
      <BlobAvatar color="var(--eq-pink)" size={28} />
    </div>
    <div className="eq-footnote">demo single-player · l'avversario è un bot</div>
  </div>
)

export default EmojiQuizHome
