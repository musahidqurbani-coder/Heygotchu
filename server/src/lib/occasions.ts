// The "Occasion" planning mode — for when someone needs an outfit for an
// event rather than a multi-day trip to a destination. Deliberately broad
// per the user's "as many occasions and events as you can add" request; each
// entry carries a default formality/vibe hint used to seed the generator
// context when the user hasn't picked a vibe explicitly.

export interface OccasionType {
  id: string
  label: string
  category: 'celebration' | 'formal' | 'work' | 'school' | 'travel' | 'casual-social'
  defaultFormality: 'athletic' | 'casual' | 'smart-casual' | 'formal'
}

export const OCCASION_TYPES: OccasionType[] = [
  { id: 'engagement', label: 'Engagement', category: 'celebration', defaultFormality: 'formal' },
  { id: 'wedding', label: 'Wedding', category: 'celebration', defaultFormality: 'formal' },
  { id: 'haldi', label: 'Haldi / Turmeric ceremony', category: 'celebration', defaultFormality: 'casual' },
  { id: 'mehndi', label: 'Mehndi', category: 'celebration', defaultFormality: 'smart-casual' },
  { id: 'sangeet', label: 'Sangeet', category: 'celebration', defaultFormality: 'smart-casual' },
  { id: 'birthday-party', label: 'Birthday party', category: 'celebration', defaultFormality: 'casual' },
  { id: 'anniversary', label: 'Anniversary celebration', category: 'celebration', defaultFormality: 'smart-casual' },
  { id: 'baby-shower', label: 'Baby shower', category: 'celebration', defaultFormality: 'smart-casual' },
  { id: 'gender-reveal', label: 'Gender reveal party', category: 'celebration', defaultFormality: 'casual' },
  { id: 'graduation', label: 'Graduation', category: 'celebration', defaultFormality: 'smart-casual' },
  { id: 'housewarming', label: 'Housewarming', category: 'casual-social', defaultFormality: 'casual' },
  { id: 'religious-festival', label: 'Religious festival / holiday gathering', category: 'celebration', defaultFormality: 'smart-casual' },

  { id: 'formal-party', label: 'Formal party / gala', category: 'formal', defaultFormality: 'formal' },
  { id: 'business-meeting', label: 'Business meeting', category: 'work', defaultFormality: 'formal' },
  { id: 'job-interview', label: 'Job interview', category: 'work', defaultFormality: 'formal' },
  { id: 'work-conference', label: 'Work conference', category: 'work', defaultFormality: 'smart-casual' },
  { id: 'networking-event', label: 'Networking event', category: 'work', defaultFormality: 'smart-casual' },
  { id: 'award-ceremony', label: 'Award ceremony', category: 'formal', defaultFormality: 'formal' },
  { id: 'funeral', label: 'Funeral / memorial', category: 'formal', defaultFormality: 'formal' },
  { id: 'religious-service', label: 'Religious service', category: 'formal', defaultFormality: 'smart-casual' },

  { id: 'school-program', label: 'School program', category: 'school', defaultFormality: 'smart-casual' },
  { id: 'school-welcome-event', label: 'School welcome event', category: 'school', defaultFormality: 'smart-casual' },
  { id: 'annual-function', label: 'Annual function', category: 'school', defaultFormality: 'smart-casual' },
  { id: 'parent-teacher-meeting', label: 'Parent-teacher meeting', category: 'school', defaultFormality: 'smart-casual' },
  { id: 'college-orientation', label: 'College orientation', category: 'school', defaultFormality: 'casual' },

  { id: 'airport', label: 'Airport / flight day', category: 'travel', defaultFormality: 'casual' },
  { id: 'long-journey', label: 'Long bus or train journey', category: 'travel', defaultFormality: 'casual' },
  { id: 'road-trip', label: 'Road trip', category: 'travel', defaultFormality: 'casual' },

  { id: 'pool-party', label: 'Pool party', category: 'casual-social', defaultFormality: 'casual' },
  { id: 'cafe-hopping', label: 'Cafe hopping', category: 'casual-social', defaultFormality: 'casual' },
  { id: 'brunch', label: 'Brunch', category: 'casual-social', defaultFormality: 'casual' },
  { id: 'date-night', label: 'Date night', category: 'casual-social', defaultFormality: 'smart-casual' },
  { id: 'farewell-reunion', label: 'Farewell / reunion', category: 'casual-social', defaultFormality: 'smart-casual' },
  { id: 'movie-night', label: 'Movie night', category: 'casual-social', defaultFormality: 'casual' },
  { id: 'concert', label: 'Concert / live show', category: 'casual-social', defaultFormality: 'casual' },
  { id: 'sports-event', label: 'Sports event', category: 'casual-social', defaultFormality: 'athletic' },
  { id: 'game-night', label: 'Game night', category: 'casual-social', defaultFormality: 'casual' },
  { id: 'picnic', label: 'Picnic', category: 'casual-social', defaultFormality: 'casual' },
  { id: 'theme-party-other', label: 'Other theme party', category: 'celebration', defaultFormality: 'casual' },
  { id: 'other', label: 'Other occasion', category: 'casual-social', defaultFormality: 'smart-casual' },
]

export function findOccasion(id: string): OccasionType | undefined {
  return OCCASION_TYPES.find((o) => o.id === id)
}
