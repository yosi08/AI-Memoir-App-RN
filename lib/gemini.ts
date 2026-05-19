// Pollinations.ai — completely free, no API key required
// Returns a URL directly (no fetch). React Native Image component loads it without CORS issues.

export async function generateCaricature(
  _base64Image: string,
  _mimeType: string = "image/jpeg"
): Promise<string | null> {
  const prompt =
    "warm friendly caricature cartoon portrait illustration, " +
    "person, slightly exaggerated facial features, big expressive eyes, " +
    "colorful fun cartoon art style, clean bright white background, " +
    "high quality digital art, cute and charming";

  const url =
    "https://image.pollinations.ai/prompt/" +
    encodeURIComponent(prompt) +
    `?width=512&height=512&nologo=true&seed=${Date.now()}`;

  console.log("[Pollinations] URL:", url);
  return url;
}
