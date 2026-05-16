// Avatar Blob stilizzato per Emoji Quiz (occhi + bocca, morph border-radius).
// Styles inline via classi CSS scoped definite in EmojiQuizStyles.

const BlobAvatar = ({ color, mood = 'happy', size = 44 }) => (
  <div className="eq-blob-av" style={{ width: size, height: size, background: color }}>
    <span className="eq-eye" />
    <span className="eq-eye" />
    {mood === 'happy' && <span className="eq-mouth" />}
    {mood === 'sad' && <span className="eq-mouth eq-mouth-sad" />}
  </div>
)

export default BlobAvatar
