import { useState, useEffect, useCallback } from 'react'

function NumberPad({ onSubmit, stage = 1, disabled = false, initialValue = '', allowDecimal = false }) {
  const [value, setValue] = useState(initialValue)
  const showNegative = stage >= 5

  const append = useCallback((char) => {
    if (disabled) return
    setValue(v => {
      if (v.length >= 8) return v
      return v + char
    })
  }, [disabled])

  const appendDecimal = useCallback(() => {
    if (disabled || value.includes('.')) return
    setValue(v => v + '.')
  }, [disabled, value])

  const backspace = useCallback(() => {
    if (disabled) return
    setValue(v => v.slice(0, -1))
  }, [disabled])

  const toggleNegative = useCallback(() => {
    if (disabled) return
    setValue(v => v.startsWith('-') ? v.slice(1) : '-' + v)
  }, [disabled])

  const isIncomplete = value === '' || value === '-' || value.endsWith('.')

  const submit = useCallback(() => {
    if (disabled || isIncomplete) return
    onSubmit(value)
    setValue('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, value, onSubmit, isIncomplete])

  useEffect(() => {
    const handle = (e) => {
      if (disabled) return
      if (e.key >= '0' && e.key <= '9') append(e.key)
      else if (e.key === 'Backspace') backspace()
      else if (e.key === 'Enter') submit()
      else if (e.key === '-' && showNegative) toggleNegative()
      else if (e.key === '.' && allowDecimal) appendDecimal()
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [append, backspace, submit, toggleNegative, appendDecimal, disabled, showNegative, allowDecimal])

  return (
    <div className="numpad">
      <div className="numpad-display">{value || <span className="numpad-placeholder">?</span>}</div>
      <div className="numpad-grid">
        {/* Phone-style layout: 1-2-3 on top (familiar for iPad/phone users) */}
        {['1','2','3','4','5','6','7','8','9'].map(d => (
          <button key={d} className="numpad-btn" onClick={() => append(d)} disabled={disabled}>{d}</button>
        ))}
        <button
          className="numpad-btn numpad-btn--secondary"
          onClick={toggleNegative}
          disabled={disabled || !showNegative}
          style={{ visibility: showNegative ? 'visible' : 'hidden' }}
        >±</button>
        <button className="numpad-btn" onClick={() => append('0')} disabled={disabled}>0</button>
        <button className="numpad-btn numpad-btn--secondary" onClick={backspace} disabled={disabled}>⌫</button>
      </div>
      {allowDecimal && (
        <button
          className="numpad-btn numpad-btn--secondary numpad-btn--decimal"
          onClick={appendDecimal}
          disabled={disabled || value.includes('.')}
        >.</button>
      )}
      <button className="numpad-submit" onClick={submit} disabled={disabled || isIncomplete}>
        Submit
      </button>
    </div>
  )
}

export default NumberPad
