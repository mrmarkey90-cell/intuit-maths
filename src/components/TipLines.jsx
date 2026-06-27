export default function TipLines({ text }) {
  return (
    <div className="tip-lines">
      {text.split('|').map((line, i) => (
        <div key={i} className="tip-line" style={{ animationDelay: `${i * 0.65}s` }}>
          {line}
        </div>
      ))}
    </div>
  )
}
