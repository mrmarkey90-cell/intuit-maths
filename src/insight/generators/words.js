// Shared maths-vocabulary word bank for Insight question generators.
// English is authoritative; Welsh terms are standard classroom usage
// but have NOT been checked against Y Termiadur Addysg
// (https://www.termiaduraddysg.cymru) — flag for a Welsh-speaking
// reviewer before go-live, same caveat as the rest of this pass.
//
// Every level's generator file (level1.js, level2.js, ...) imports
// w(lang) rather than redefining its own copies, so new levels get
// the same vocabulary for free and only need to add genuinely new terms.

// Shared noun list for word problems that need a countable item --
// generators pick an index once with randomItemIndex() and pass it
// through so the same noun is used consistently within one question.
const ITEM_NOUNS = [
  { en: 'sweets', cy: 'losin' },
  { en: 'marbles', cy: 'marblis' },
  { en: 'stickers', cy: 'sticeri' },
  { en: 'pencils', cy: 'pensiliau' },
]

export function randomItemIndex() {
  return Math.floor(Math.random() * ITEM_NOUNS.length)
}

const WORDS = {
  en: {
    find: 'Find',
    whichIsBigger: 'Which is bigger?',
    chooseTwoAddTo10: 'Choose two numbers that add up to 10',
    whichIsDouble: n => `Which is double ${n}?`,
    halfOfQ: n => `Half of ${n}?`,
    halfOfEq: n => `Half of ${n} =`,
    halfOfFraction: n => `½ of ${n} =`,
    quarterOfFraction: n => `¼ of ${n} =`,
    doubleEq: n => `Double ${n} =`,
    dragSmallestToLargest: 'Drag smallest to largest',
    isQuestion: n => `${n} is...`,
    even: 'Even',
    odd: 'Odd',
    roundToNearest10: n => `Round ${n} to the nearest 10`,
    roundToNearest100: n => `Round ${n} to the nearest 100`,
    howManyXInY: (x, y) => `How many ${x}s in ${y}?`,
    whatComesAfter: n => `What comes after ${n}?`,
    findEvenNumbers: 'Find the even numbers',
    whichAreInTimesTable: n => `Which are in the ${n} times table?`,
    wordProblemItems: (start, giveAway, getMore, itemIndex) => {
      const item = ITEM_NOUNS[itemIndex].en
      return `You have ${start} ${item}.\nYou give ${giveAway} away.\nYou get ${getMore} back.\nHow many ${item} do you have?`
    },
  },
  cy: {
    find: 'Canfod',
    whichIsBigger: "Pa un sy'n fwy?",
    chooseTwoAddTo10: "Dewiswch ddau rif sy'n adio i 10",
    whichIsDouble: n => `Pa un yw dwbl ${n}?`,
    halfOfQ: n => `Hanner o ${n}?`,
    halfOfEq: n => `Hanner o ${n} =`,
    halfOfFraction: n => `½ o ${n} =`,
    quarterOfFraction: n => `¼ o ${n} =`,
    doubleEq: n => `Dyblu ${n} =`,
    dragSmallestToLargest: "Llusgwch o'r lleiaf i'r mwyaf",
    isQuestion: n => `Mae ${n} yn...`,
    even: 'Eilrif',
    odd: 'Odrif',
    roundToNearest10: n => `Crynhowch ${n} i'r 10 nesaf`,
    roundToNearest100: n => `Crynhowch ${n} i'r 100 nesaf`,
    howManyXInY: (x, y) => `Sawl ${x} sydd yn ${y}?`,
    whatComesAfter: n => `Beth sy'n dod ar ôl ${n}?`,
    findEvenNumbers: 'Canfod y rhifau eilrif',
    whichAreInTimesTable: n => `Pa rifau sydd yn nhabl ${n}?`,
    wordProblemItems: (start, giveAway, getMore, itemIndex) => {
      const item = ITEM_NOUNS[itemIndex].cy
      return `Mae gennych chi ${start} ${item}.\nRydych chi'n rhoi ${giveAway} i ffwrdd.\nRydych chi'n cael ${getMore} yn ôl.\nFaint o ${item} sydd gennych chi?`
    },
  },
}

export function w(lang) {
  return WORDS[lang] ?? WORDS.en
}
