function TimerBar({ timeLeft, duration }) {
  const pct = (timeLeft / duration) * 100
  const color = timeLeft <= 15 ? '#e53e3e' : timeLeft <= 30 ? '#f59e0b' : '#4f46e5'
  return (
    <div className="timer-bar-track">
      <div className="timer-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export default TimerBar
