export default function TipLines({ text }) {
  return (
    <div className="tip-lines">
      {text.split('|').map((line, i) => (
        <div key={i} className="tip-line" style={{ animationDelay: `${i * 1.3}s` }}>
          {line}
        </div>
      ))}
    </div>
  )
}
