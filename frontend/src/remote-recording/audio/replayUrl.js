// A blob: URL, not a data: URI. rr-read-audio-file hands back a base64
// string; atob() is the plain, standard way to turn that into raw bytes in
// the browser, and a Blob is what a media element wants to play — a
// seekable, first-class resource, not a multi-megabyte string glued into a
// src attribute (which is the known-flaky part this replaces). Also used to
// rebuild a take's player when reopening a past session from the Sessions
// page — a blob: URL only lives as long as the page that created it, so a
// take from an earlier session needs this run again, not a cached link.
export function base64ToReplayUrl(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
}
