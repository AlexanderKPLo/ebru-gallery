# Ebru's First Exhibition

A private, one-page gallery site (lobby, three rooms, game, exit) for Cloudflare Pages.
Plain HTML/CSS/JS with no build step, plus one Pages Function for saving titles and notes in KV.

## Folder

```
index.html                 the whole site
img/                       artworks
audio/                     your voice guide recordings (see audio/README.txt)
music/                     your songs, played as background music in the rooms
functions/api/[[route]].js saves titles and notes in Cloudflare KV
_headers                   noindex + no-referrer
robots.txt                 asks search engines to stay out
404.html                   stops Pages from treating every missing file as index.html
VOICE-GUIDE-SCRIPT.md      what to say in each recording
```

## Deploy

1. **Domain.** In the Cloudflare dashboard, go to Domain Registration → Register Domains and buy the name. (Not every ending is sold there, so check yours. You can also buy elsewhere and add the site to Cloudflare.)
2. **Git.** Push this folder to a **private** GitHub repo:
   ```
   git init && git add . && git commit -m "Ebru's First Exhibition"
   git branch -M main && git remote add origin git@github.com:<you>/ebru-gallery.git && git push -u origin main
   ```
3. **Pages project.** Workers & Pages → Create → Pages → Connect to Git → pick the repo.
   Framework preset: None. Build command: empty. Build output directory: `/`.
4. **KV for titles and notes.**
   - Storage & Databases → KV → Create namespace, for example `ebru-gallery`.
   - Pages project → Settings → Bindings → Add → KV namespace. Variable name: **`GALLERY`**, namespace: `ebru-gallery`.
   - Settings → Variables and Secrets → add a **secret** named **`ADMIN_KEY`** with a long random value.
   - Redeploy (Deployments → … → Retry, or push a commit).
5. **Custom domain.** Pages project → Custom domains → Set up a custom domain → your new domain.
6. **Audio.** Record using `VOICE-GUIDE-SCRIPT.md`, drop the files into `audio/`, commit, push. The "Listen to Alex" buttons appear on their own.

Cloudflare renames menu items from time to time; if a label above has moved, search the dashboard for "KV", "Bindings" or "Custom domains".

## Your songs

Background music starts only after she taps "Play the songs Alex made for you" (browsers block music that starts by itself). After that, each room changes the song:

- Lobby: Seni Çok Çok Çok Çok Seviyorum
- Room 1: You're Never My Burden
- Room 2: My Little Kitten
- Room 3, Play and Exit: the current song keeps playing, then the next one follows.

The music pauses while your voice guide talks, then comes back. All three songs are also in the Exit room's music corner, where she can pick one.

To add or move songs, convert to .mp3 (for example `ffmpeg -i song.wav -c:a libmp3lame -b:a 160k music/new-song.mp3`), then edit `SONGS` and `ROOM_MUSIC` near the top of the script in `index.html`.

## Reading what she writes

Open `https://<your-domain>/api/notes?key=<ADMIN_KEY>` in your browser. You will see her notes and every title she gave. Titles also show on the page itself, under "Names you gave" in the Exit room.

## Privacy

- `noindex` headers and `robots.txt` keep it out of search engines. Anyone who has the link can still open it.
- For real protection, use Cloudflare Zero Trust → Access → Applications → Self-hosted, protect the domain, and allow only her email with "One-time PIN". She will type her email and a code once. This adds an English login step, so decide if it is worth it.
- Optional cute door: in `index.html`, set `var GATE_WORD = "...";` to a Turkish word she taught you. She types it once to enter. It is a game, not security.

## Test locally

```
npx wrangler pages dev . --kv GALLERY
```
Without the function (for example opening index.html directly), titles and notes are saved only on that device.
