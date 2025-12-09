export function guessContentType(filename) {
  if (filename.endsWith(".mp3")) return "audio/mpeg";
  if (filename.endsWith(".wav")) return "audio/wav";
  if (filename.endsWith(".ogg")) return "audio/ogg";
  return "application/octet-stream";
}
