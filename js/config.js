// Loads full config from config.json
// Returns { hotspots, intro, victory }
export async function loadConfig() {
  try {
    const res = await fetch('config.json');
    if (!res.ok) return { hotspots: [], intro: {}, victory: {} };
    const data = await res.json();

    // Support both old format (plain array) and new format (object with hotspots/intro/victory)
    if (Array.isArray(data)) {
      return { hotspots: data, intro: {}, victory: {} };
    }
    return {
      hotspots: data.hotspots || [],
      intro: data.intro || {},
      victory: data.victory || {},
    };
  } catch {
    return { hotspots: [], intro: {}, victory: {} };
  }
}
