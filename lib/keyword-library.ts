// Category-specific local SEO keyword library.
// Keys are lowercase fragments matched against business.category.

const KEYWORD_MAP: Record<string, string[]> = {
  salon: ['hair salon', 'haircut near me', 'balayage', 'highlights', 'blowout', 'best salon'],
  hair: ['haircut', 'hair color', 'hair styling', 'best hair salon', 'hair treatment'],
  barbershop: ['barber near me', 'mens haircut', 'fresh cut', 'beard trim', 'best barber'],
  spa: ['day spa', 'relaxation', 'massage near me', 'facial', 'spa treatment', 'self care'],
  massage: ['massage therapy', 'deep tissue massage', 'relaxing massage', 'massage near me'],
  nail: ['nail salon', 'manicure', 'pedicure', 'nail art', 'gel nails', 'nail care'],
  dentist: ['dentist near me', 'dental care', 'teeth cleaning', 'smile makeover', 'family dentist'],
  dental: ['dental clinic', 'oral health', 'teeth whitening', 'dentist appointment'],
  doctor: ['doctor near me', 'medical care', 'family doctor', 'health clinic', 'primary care'],
  clinic: ['medical clinic', 'healthcare', 'walk-in clinic', 'same day appointment'],
  gym: ['gym near me', 'fitness center', 'workout', 'personal training', 'fitness classes'],
  fitness: ['fitness studio', 'workout classes', 'personal trainer', 'get fit', 'exercise'],
  yoga: ['yoga studio', 'yoga classes', 'meditation', 'mindfulness', 'yoga near me'],
  restaurant: ['restaurant near me', 'best food', 'dine in', 'takeout', 'local restaurant'],
  cafe: ['coffee shop', 'best coffee', 'cafe near me', 'espresso', 'pastries'],
  coffee: ['coffee near me', 'specialty coffee', 'cafe', 'latte', 'best coffee shop'],
  pizza: ['pizza near me', 'best pizza', 'pizza delivery', 'fresh pizza', 'pizza restaurant'],
  bakery: ['fresh baked', 'bakery near me', 'custom cakes', 'pastries', 'artisan bread'],
  plumber: ['plumber near me', 'emergency plumbing', 'pipe repair', 'plumbing services'],
  plumbing: ['plumbing repair', 'water heater', 'drain cleaning', 'licensed plumber'],
  electrician: ['electrician near me', 'electrical repair', 'licensed electrician', 'wiring'],
  hvac: ['HVAC repair', 'air conditioning', 'heating service', 'AC repair near me'],
  cleaning: ['cleaning service', 'house cleaning', 'professional cleaning', 'deep clean'],
  landscaping: ['landscaping near me', 'lawn care', 'garden design', 'lawn maintenance'],
  mechanic: ['auto repair near me', 'car mechanic', 'oil change', 'brake repair', 'auto shop'],
  auto: ['auto service', 'car repair', 'auto repair', 'vehicle maintenance'],
  real_estate: ['real estate agent', 'homes for sale', 'property', 'realtor near me'],
  law: ['law firm', 'attorney near me', 'legal help', 'lawyer consultation'],
  accounting: ['accountant near me', 'tax preparation', 'bookkeeping', 'CPA'],
  photography: ['photographer near me', 'photo studio', 'professional photos', 'portrait photography'],
  florist: ['flower shop', 'fresh flowers', 'floral arrangements', 'flowers near me'],
  pharmacy: ['pharmacy near me', 'prescription', 'medication', 'drugstore'],
  optician: ['eye exam', 'glasses near me', 'optometrist', 'contact lenses', 'eyecare'],
  vet: ['veterinarian near me', 'pet care', 'animal clinic', 'vet appointment'],
  pet: ['pet grooming', 'pet store', 'pet services', 'dog grooming near me'],
  tutor: ['tutoring near me', 'academic help', 'private tutor', 'homework help'],
  school: ['classes near me', 'learning center', 'education', 'courses'],
  hotel: ['hotel near me', 'accommodation', 'rooms', 'stay', 'book now'],
  travel: ['travel agency', 'vacation packages', 'trip planning', 'travel deals'],
};

const DEFAULT_KEYWORDS = ['near me', 'local', 'best', 'professional service', 'top rated'];

/**
 * Returns 2–3 relevant local SEO keywords for the given business category.
 * Falls back to generic local keywords if category is unknown.
 */
export function getKeywordsForCategory(category: string | null | undefined, count = 3): string[] {
  if (!category) return DEFAULT_KEYWORDS.slice(0, count);

  const lower = category.toLowerCase();
  const match = Object.entries(KEYWORD_MAP).find(([key]) => lower.includes(key));

  if (match) {
    const pool = match[1];
    // Pick `count` keywords, slightly randomised so posts don't repeat
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  return DEFAULT_KEYWORDS.slice(0, count);
}
