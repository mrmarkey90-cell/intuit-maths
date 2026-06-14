function StaffClassSelect({ school, onSelect }) {
  return (
    <div className="screen">
      <h1>{school.name}</h1>
      <p className="tagline">Select your class</p>

      {(!school.classes || school.classes.length === 0) ? (
        <p className="note">No classes have been set up yet</p>
      ) : (
        <div className="class-list">
          {school.classes.map(c => (
            <button key={c.id} className="class-select-btn" onClick={() => onSelect(c)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default StaffClassSelect
