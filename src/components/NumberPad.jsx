import { useState, useEffect, useCallback } from 'react'

function NumberPad({ onSubmit, stage = 1, disabled = false }) {
  const [value, setValue] = useState('')
  const showNegative = stage >= 5

  const append = useCallback((char) => {
    if (disabled) return
    setValue(v => {
      if (char === '.' && v.includes('.')) return v
      if (v.length >= 8) return v
      return v + char
    })
  }, [disabled])

  const backspace = useCallback(() => {
    if (disabled) return
    setValue(v => v.slice(0, -1))
  }, [disabled])

  const toggleNegative = useCallback(() => {
    if (disabled) return
    setValue(v => v.startsWith('-') ? v.slice(1) : '-' + v)
  }, [disabled])

  const submit = useCallback(() => {
    if (disabled || value === '' || value === '-') return
    onSubmit(value)
    setValue('')
  }, [disabled, value, onSubmit])

  useEffect(() => {
    const handle = (e) => {
      if (disabled) return
      if (e.key >= '0' && e.key <= '9') append(e.key)
      else if (e.key === 'Backspace') backspace()
      else if (e.key === 'Enter') submit()
      else if (e.key === '-' && showNegative) toggleNegative()
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [append, backspace, submit, toggleNegative, disabled, showNegative])

  return (
    <div className="numpad">
      <div className="numpad-display">{value || <span className="numpad-placeholder">?</span>}</div>
      <div className="numpad-grid">
        {['7','8','9','4','5','6','1','2','3'].map(d => (
          <button key={d} className="numpad-btn" onClick={() => append(d)} disabled={disabled}>{d}</button>
        ))}
        <button className="numpad-btn numpad-btn--secondary" onClick={toggleNegative} disabled={disabled || !showNegative} style={{ visibility: showNegative ? 'visible' : 'hidden' }}>±</button>
        <button className="numpad-btn" onClick={() => append('0')} disabled={disabled}>0</button>
        <button className="numpad-btn numpad-btn--secondary" onClick={backspace} disabled={disabled}>⌫</button>
      </div>
      <button className="numpad-submit" onClick={submit} disabled={disabled || value === '' || value === '-'}>
        Submit
      </button>
    </div>
  )
}

export default NumberPad
