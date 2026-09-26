/** Start offset in seconds from a YouTube URL's t= parameter, or null. */
export function youtubeStart(url: string): number | null {
  const m = url.match(/[?&#]t=(\d+)s?(?:&|$)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Video id from youtube.com/watch?v= or youtu.be/ URLs, or null. */
export function youtubeId(url: string): string | null {
  const m =
    url.match(/[?&]v=([A-Za-z0-9_-]{6,})/) ??
    url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

export function isYoutube(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}
