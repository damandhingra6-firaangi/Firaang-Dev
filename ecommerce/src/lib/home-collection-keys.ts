export const HOME_COLLECTION_MATCH_KEYS = {
  mythology: ["mythology", "methology", "devotionalcollection"],
  streetwear: ["streetwear", "genz"],
  anime: ["anime", "animepop", "animekawaii", "kawaiicore"],
  india: ["indiaunfiltered", "madeforindia", "independenceday"],
  mindset: ["mindset", "motivational"],
  "404": ["404series"],
  essentials: ["essentials", "firaangoriginal"],
  bottomwear: ["bottomwear", "pants"],
  "humor-quotes": ["humorquotes", "funny"],
  "limited-edition": ["limitededition", "rockstar"],
  "womens-collection": ["womenscollection", "babytees"],
  "rakhi-special": ["rakhispecial"],
  "animal-love": ["animallove"],
} as const;

export type HomeCollectionVibeId = keyof typeof HOME_COLLECTION_MATCH_KEYS;

const HOME_DISCOVERY_COLLECTION_KEYS = new Set<string>(
  Object.values(HOME_COLLECTION_MATCH_KEYS).flat(),
);

export function normalizeHomeCollectionKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchesHomeCollectionVibe(
  collection: { title: string; handle: string },
  vibeId: HomeCollectionVibeId,
) {
  const keys: readonly string[] = HOME_COLLECTION_MATCH_KEYS[vibeId];
  return [collection.title, collection.handle].some((value) =>
    keys.includes(normalizeHomeCollectionKey(value)),
  );
}

export function isHomeDiscoveryCollection(collection: { title: string; handle: string }) {
  return [collection.title, collection.handle].some((value) =>
    HOME_DISCOVERY_COLLECTION_KEYS.has(normalizeHomeCollectionKey(value)),
  );
}
