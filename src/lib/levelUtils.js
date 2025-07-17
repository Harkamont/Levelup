export const getLevelFromTalent = (talent) => {
  return Math.floor(talent / 1000)
}

export const getLevelRange = (level) => {
  const min = level * 1000
  const max = (level + 1) * 1000 - 1
  return { min, max }
}

export const getLevelColor = (level) => {
  const colors = [
    'from-gray-400 to-gray-600',      // Level 0
    'from-green-400 to-green-600',    // Level 1
    'from-blue-400 to-blue-600',      // Level 2
    'from-purple-400 to-purple-600',  // Level 3
    'from-pink-400 to-pink-600',      // Level 4
    'from-yellow-400 to-yellow-600',  // Level 5
    'from-orange-400 to-orange-600',  // Level 6
    'from-red-400 to-red-600',        // Level 7
    'from-indigo-400 to-indigo-600',  // Level 8
    'from-teal-400 to-teal-600',      // Level 9
    'from-amber-400 to-amber-600',    // Level 10
  ]
  return colors[Math.min(level, 10)] || colors[10]
}

export const getLevelName = (level) => {
  const names = [
    '겨자씨🎍', '누룩🍞', '싹🌱', '들풀🌿', '백합🌸',
    '참새🐦', '보화💎', '포도🍇', '양🐑', '소금🧂', '세상의 빛💡'
  ]
  return names[Math.min(level, 10)] || '세상의 빛💡'
}
