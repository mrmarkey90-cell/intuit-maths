import { useEffect, useState } from 'react'

// English and Welsh are independent lists here, not translations of
// each other -- just two separately fun sets of hype, originally for the
// few seconds between the teacher clicking Begin and the first question,
// now reused anywhere a pupil-facing screen needs a beat of energy (e.g.
// the marking wait before results).
const EN_HYPE_PHRASES = ['Lock in!', 'Creating quiz...', 'This is your moment', 'Brain: activate', "Maths o'clock", 'Get set...', 'Here we go!']
const CY_HYPE_PHRASES = ['Dewch ymlaen!', 'Barod?', 'Nawn ni hyn!', 'Pob lwc!', 'Dyma ni!']

function HypePhrase({ language }) {
  const phrases = language === 'cy' ? CY_HYPE_PHRASES : EN_HYPE_PHRASES
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setIndex(i => (i + 1) % phrases.length), 900)
    return () => clearInterval(interval)
  }, [phrases])
  return <p key={index} className="hype-phrase">{phrases[index]}</p>
}

export default HypePhrase
