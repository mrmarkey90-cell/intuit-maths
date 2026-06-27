const LINE_DELAY = 1.3

export default function RoundingTip({ lines, example, highlightIndex }) {
  return (
    <div className="rounding-tip">
      <div className="rounding-tip-number">
        {example.split('').map((ch, i) => (
          <span
            key={i}
            className={i === highlightIndex ? 'rounding-tip-digit--key' : undefined}
            style={i === highlightIndex ? { animationDelay: `${LINE_DELAY}s` } : undefined}
          >{ch}</span>
        ))}
      </div>
      {lines.map((line, i) => (
        <div key={i} className="tip-line" style={{ animationDelay: `${(i + 1) * LINE_DELAY}s` }}>
          {line}
        </div>
      ))}
    </div>
  )
}
