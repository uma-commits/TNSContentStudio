export const EDGE_VOICES = [
  "en-AU-WilliamNeural",
  "en-AU-NatashaNeural",
  "en-US-GuyNeural",
  "en-US-JennyNeural",
  "en-GB-RyanNeural",
  "en-GB-SoniaNeural",
] as const;

export const VOICE_GENDER: Record<(typeof EDGE_VOICES)[number], "male" | "female"> = {
  "en-AU-WilliamNeural": "male",
  "en-AU-NatashaNeural": "female",
  "en-US-GuyNeural": "male",
  "en-US-JennyNeural": "female",
  "en-GB-RyanNeural": "male",
  "en-GB-SoniaNeural": "female",
};

// Cheap heuristic gendered-pronoun count over free-text persona description —
// used as a server-side safety net so an LLM-picked voice can never
// contradict the physical description it just wrote, regardless of whether
// the model followed the prompt's instruction to match them itself.
export function inferGender(text: string): "male" | "female" | "unknown" {
  const male = (text.match(/\b(he|him|his|man|male|guy|gentleman)\b/gi) || []).length;
  const female = (text.match(/\b(she|her|hers|woman|female|lady|gal)\b/gi) || []).length;
  if (male === 0 && female === 0) return "unknown";
  return male >= female ? "male" : "female";
}

export function pickVoiceForGender(gender: "male" | "female" | "unknown", preferred?: string): string {
  const isValid = (v?: string): v is (typeof EDGE_VOICES)[number] =>
    !!v && (EDGE_VOICES as readonly string[]).includes(v);

  if (gender === "unknown") return isValid(preferred) ? preferred : EDGE_VOICES[0];
  if (isValid(preferred) && VOICE_GENDER[preferred] === gender) return preferred;

  const match = EDGE_VOICES.find((v) => VOICE_GENDER[v] === gender);
  return match || EDGE_VOICES[0];
}
