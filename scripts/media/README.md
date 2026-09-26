# Exercise media pipeline

Produces short muted MP4 clips from the trainer's reference videos (at the
timecode each programme link points to), re-encodes the owner's own form
recordings, and uploads everything to the private `exercise-media` bucket.

Prerequisites: `brew install yt-dlp ffmpeg`.

```bash
npm run media:clip                      # YouTube clips + own recordings → media-out/
npm run media:clip -- --own             # own recordings only
SEED_USER_EMAIL=you@example.com npm run media:upload
```

- Clips are 45 s from the link's start time, 480p H.264, no audio, ~1–2 MB.
- Own recordings (mapped in `own-recordings.ts`) are 720p with audio.
- `media-out/` and `media-cache/` are gitignored. Re-runs skip existing files.
- Uploads land at `<user_id>/<exercise_id>/<file>` and are recorded in
  `exercises.media`; the app serves them through signed URLs only.
- Private or removed YouTube videos are reported as SKIP; the link stays on
  the exercise so the full video is still one tap away.

These clips are the trainer's material, kept for the owner's private use.
