// Cloudflare Pages Function: stores the titles Ebru gives her works, and her notes to you.
// Needs a KV namespace bound as GALLERY, and a secret ADMIN_KEY so only you can read the notes.
//
//   GET  /api/state               -> { titles: { [workId]: { title, at } } }
//   POST /api/title  {id, title}  -> saves or clears a title
//   POST /api/note   {text}       -> saves a note
//   GET  /api/notes?key=ADMIN_KEY -> all notes and titles (for Alex)

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const WORK_ID = /^[a-z0-9-]{1,40}$/;

async function readTitles(kv) {
  const titles = {};
  let cursor;
  do {
    const page = await kv.list({ prefix: "title:", cursor });
    for (const k of page.keys) {
      if (k.metadata && k.metadata.title) titles[k.name.slice(6)] = k.metadata;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return titles;
}

export async function onRequest({ request, env, params }) {
  const kv = env.GALLERY;
  if (!kv) return json({ error: "KV namespace GALLERY is not bound" }, 500);

  const route = (params.route || []).join("/");
  const method = request.method;

  if (route === "state" && method === "GET") {
    return json({ titles: await readTitles(kv) });
  }

  if (route === "title" && method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Bad JSON" }, 400); }
    const id = String(body.id || "");
    const title = String(body.title || "").trim().slice(0, 80);
    if (!WORK_ID.test(id)) return json({ error: "Bad work id" }, 400);
    if (!title) { await kv.delete("title:" + id); return json({ ok: true, cleared: true }); }
    const meta = { title, at: Date.now() };
    await kv.put("title:" + id, title, { metadata: meta });
    return json({ ok: true });
  }

  if (route === "note" && method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Bad JSON" }, 400); }
    const text = String(body.text || "").trim().slice(0, 2000);
    if (!text) return json({ error: "Empty note" }, 400);
    const at = Date.now();
    await kv.put(`note:${at}:${crypto.randomUUID().slice(0, 8)}`, text, { metadata: { at } });
    return json({ ok: true });
  }

  if (route === "notes" && method === "GET") {
    const key = new URL(request.url).searchParams.get("key");
    if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return json({ error: "Not allowed" }, 403);
    const notes = [];
    let cursor;
    do {
      const page = await kv.list({ prefix: "note:", cursor });
      for (const k of page.keys) notes.push({ at: new Date(k.metadata?.at || 0).toISOString(), text: await kv.get(k.name) });
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    notes.sort((a, b) => (a.at < b.at ? 1 : -1));
    return json({ notes, titles: await readTitles(kv) });
  }

  return json({ error: "Not found" }, 404);
}
