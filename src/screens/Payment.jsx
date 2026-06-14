function Payment({ onFree, onPaid }) {
  return (
    <div className="screen">
      <h1>Choose your plan</h1>
      <p className="tagline">Start free, upgrade whenever you're ready</p>

      <div className="plan-grid">
        <div className="plan-card">
          <h2>Free</h2>
          <p className="plan-price">£0</p>
          <ul className="plan-features">
            <li>1 class</li>
            <li>Up to 40 pupils</li>
            <li>Full challenge functionality</li>
            <li>Per-pupil reporting</li>
          </ul>
          <button onClick={onFree}>Start free</button>
        </div>

        <div className="plan-card plan-card--featured">
          <h2>School</h2>
          <p className="plan-price">£125<span>/year</span></p>
          <ul className="plan-features">
            <li>Unlimited classes</li>
            <li>Unlimited pupils</li>
            <li>Full challenge functionality</li>
            <li>Per-pupil and whole-school reporting</li>
          </ul>
          <button disabled>Coming soon</button>
        </div>
      </div>

      <p className="privacy">No card required to start. Upgrade any time from your dashboard.</p>
    </div>
  )
}

export default Payment