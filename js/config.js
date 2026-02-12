// Loads hotspot config from config.json
export async function loadConfig() {
  try {
    const res = await fetch('config.json');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
