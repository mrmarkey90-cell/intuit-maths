import NumberPad from '../components/NumberPad'

function InsightNumpadOverlay({ question, stage, initialValue, onSubmit, onDismiss, allowDecimal }) {
  return (
    <>
      <div className="insight-numpad-backdrop" onClick={onDismiss} />
      <div className="insight-numpad-overlay">
        <p className="insight-numpad-overlay-question">{question}</p>
        <NumberPad onSubmit={onSubmit} stage={stage} initialValue={initialValue} allowDecimal={allowDecimal} />
        <button
          className="button-secondary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          onClick={onDismiss}
        >
          Cancel
        </button>
      </div>
    </>
  )
}

export default InsightNumpadOverlay
