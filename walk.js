/* Ebru's First Exhibition: 3D walk.
   Lobby (reception, security bear, ticket check) → Room 1 Art Textiles → Room 2 Drawings → Room 3 Colour Studies → Exit.
   Needs three.js r149 (global THREE) and window.EFE from index.html.
   Tap the floor to walk, drag to look, tap a work or a person. */
(function () {
  "use strict";
  var E = window.EFE;
  if (!window.THREE || !E) return;
  var T = THREE;
  if (T.ColorManagement) T.ColorManagement.legacyMode = false;

  /* ---------- Settings ---------- */
  // Ticket passcode check. The passcode itself is not written here, only a fingerprint of it.
  // To change it, open the browser console on the site and run: EFEWalk.fingerprint("123456")
  var TICKET = "1r15q7z";
  var EYE = 1.6, PAD = 0.55, DOOR_W = 2.2, DOOR_H = 3.0, WT_ = 0.1;

  /* ---------- Rooms (metres). Lobby is south, then Room 1, then Rooms 2 and 3 to the east. ---------- */
  var ROOMS = {
    lobby: { x0: -5, x1: 5, z0: 5.2, z1: 12.2, h: 4.2, wall: "lilac", music: "lobby", label: "Lobby" },
    r1: { x0: -7, x1: 7, z0: -5, z1: 5, h: 4.2, wall: "lilac", music: "room-1", label: "1" },
    r2: { x0: 7.2, x1: 15.2, z0: -4, z1: 4, h: 3.8, wall: "graphite", music: "room-2", label: "2" },
    r3: { x0: 15.4, x1: 27.4, z0: -5, z1: 5, h: 4.2, wall: "paper", music: "room-3", label: "3" }
  };
  var ORDER = ["lobby", "r1", "r2", "r3"];
  var DOORS = [
    { a: "lobby", b: "r1", x: 0, z: 5.1, nx: 0, nz: -1, sideA: "N", sideB: "S" },
    { a: "r1", b: "r2", x: 7.1, z: 0, nx: 1, nz: 0, sideA: "E", sideB: "W" },
    { a: "r2", b: "r3", x: 15.3, z: 0, nx: 1, nz: 0, sideA: "E", sideB: "W" }
  ];
  var EXIT_DOOR = { room: "r3", side: "E", at: 0 };
  var OBST = {
    lobby: [{ x0: -3.95, x1: -3.05, z0: 7.35, z1: 10.25 }, { x0: -4.7, x1: -3.9, z0: 11.1, z1: 11.9 }, { x0: 3.9, x1: 4.7, z0: 11.1, z1: 11.9 }],
    r1: [{ x0: -1.3, x1: 1.3, z0: 0.15, z1: 0.75 }],
    r2: [{ x0: 10.0, x1: 12.4, z0: 0.65, z1: 1.6 }, { x0: 12.55, x1: 14.25, z0: 2.85, z1: 3.65 }],
    r3: [{ x0: 25.95, x1: 27.4, z0: -4.1, z1: -1.9 }]
  };
  var LAYOUT = [
    { id: "red", room: "r1", wall: "N", at: 0, w: 2.0 },
    { id: "violet-threads", room: "r1", wall: "N", at: -4.3, w: 1.5 },
    { id: "fashion-study", room: "r1", wall: "N", at: 4.3, h: 1.85 },
    { id: "blue-gold", room: "r1", wall: "W", at: -1.9, w: 1.5 },
    { id: "turquoise-orange", room: "r1", wall: "W", at: 2.1, w: 1.5 },
    { id: "rose-squares", room: "r1", wall: "E", at: -2.75, w: 1.45 },
    { id: "turquoise-storm", room: "r1", wall: "E", at: 2.75, w: 1.45 },
    { id: "portrait", room: "r2", wall: "N", at: 8.9, h: 1.3 },
    { id: "leopard", room: "r2", wall: "N", at: 11.2, h: 1.4 },
    { id: "glass-bottle", room: "r2", wall: "N", at: 13.5, h: 1.3 },
    { id: "red-squares", room: "r3", wall: "N", at: 18.4, w: 1.4, panel: ["#dcaeb1", "#5a2a30"] },
    { id: "yellow-mosaic", room: "r3", wall: "N", at: 21.4, w: 1.4, panel: ["#ecdfa6", "#5b4f22"] },
    { id: "blue-circle", room: "r3", wall: "N", at: 24.4, w: 1.3, panel: ["#aec6da", "#22394e"] },
    { id: "shell", room: "r3", wall: "S", at: 19.4, w: 1.4, panel: ["#b9d0c9", "#1f3c38"] },
    { id: "violet-spiral", room: "r3", wall: "S", at: 23.4, w: 1.4, panel: ["#c8badf", "#33264d"] },
    { id: "red", room: "lobby", wall: "E", at: 7.6, w: 1.45, poster: true }
  ];
  var CRITTERS = [
    { id: "h1", kind: "kitten", x: -3.25, y: 1.2, z: 7.7, s: 0.3 },     // asleep on the reception desk
    { id: "h2", kind: "bear", x: 6.55, y: 0.2, z: -4.55, s: 0.34 },     // Room 1, far corner
    { id: "h3", kind: "kitten", x: 10.55, y: 0.15, z: 0.5, s: 0.28 },   // Room 2, under the sofa
    { id: "h4", kind: "bear", x: 26.95, y: 0.2, z: -1.75, s: 0.32 }     // Room 3, behind the coffee booth
  ];
  var START = { x: 0, z: 11.0, yaw: 0 };

  /* ---------- Words used only in the 3D walk ---------- */
  var WT = {
    en: {
      hint: "Tap the floor to walk · Drag to look around · Tap a work or a person",
      quests: "Quests", qTicket: "Show your ticket at the door", qLook: "Look closely at 3 works ({n}/3)", qName: "Give one work a name",
      qCoffee: "Have a coffee with Alex", qHunt: "Find the bears and kittens ({n}/6)", qDone: "All quests done. Alex has a surprise for you.",
      sLobby: "Lobby", sR1: "Room 1 · Art Textiles", sR2: "Room 2 · Drawings", sR3: "Room 3 · Colour Studies", sExit: "Exit · Before you go",
      coffeeSub: "Turkish coffee", lobbyMap: "LOBBY",
      guardName: "Security Bear", guardHi: "Good evening! Ticket, please.", guardLabel: "6-digit passcode · Hint: 7XX5XX, our birthdays", guardBtn: "Show ticket",
      guardOk: "Welcome, Ebru! Enjoy the exhibition.", guardNo: "Hmm, that is not the code. Try again.", guardBack: "Welcome back, Ebru! Enjoy the exhibition.", goIn: "Go in",
      recName: "Reception", recHi: "Hoş geldin! Welcome to Ebru's First Exhibition. The artist is allergic to the sun, so we only open after sunset. Please show your ticket to our security bear.", thanks: "Thank you",
      alexName: "Alex · barista", alex1: "One Turkish coffee for my artist?", yes: "Yes, please", alex2: "While it cooks: what did the coffee say to the sugar?", what: "What?", alex3: "“You make my life sweet.”",
      close: "Close", fileNote: "Paintings stay black when this page is opened as a file. Open the live site, or run python3 -m http.server in the folder and open http://localhost:8000/#walk."
    },
    tr: {
      hint: "Yürümek için zemine dokun · Etrafa bakmak için sürükle · Bir esere ya da kişiye dokun",
      quests: "Görevler", qTicket: "Kapıda biletini göster", qLook: "3 esere yakından bak ({n}/3)", qName: "Bir esere isim ver",
      qCoffee: "Alex'le bir kahve iç", qHunt: "Ayıları ve kedileri bul ({n}/6)", qDone: "Tüm görevler tamam. Alex'in sana bir sürprizi var.",
      sLobby: "Lobi", sR1: "1. Salon · Sanat Tekstilleri", sR2: "2. Salon · Çizimler", sR3: "3. Salon · Renk Çalışmaları", sExit: "Çıkış · Gitmeden önce",
      coffeeSub: "Taze pişmiş", lobbyMap: "LOBİ",
      guardName: "Güvenlik Ayısı", guardHi: "İyi akşamlar! Biletiniz lütfen.", guardLabel: "6 haneli şifre · İpucu: 7XX5XX, doğum günlerimiz", guardBtn: "Bileti göster",
      guardOk: "Hoş geldin Ebru! Sergide keyifli vakit geçir.", guardNo: "Hmm, bu şifre değil. Tekrar dene.", guardBack: "Tekrar hoş geldin Ebru! Sergide keyifli vakit geçir.", goIn: "İçeri gir",
      recName: "Resepsiyon", recHi: "Hoş geldin! Ebru'nun İlk Sergisi'ne hoş geldin. Sanatçının güneşe alerjisi var, bu yüzden sadece gün batımından sonra açığız. Lütfen biletini güvenlik ayımıza göster.", thanks: "Teşekkürler",
      alexName: "Alex · barista", alex1: "Sanatçım için bir Türk kahvesi?", yes: "Evet, lütfen", alex2: "Kahve pişerken: kahve şekere ne demiş?", what: "Ne demiş?", alex3: "“Hayatımı tatlandırıyorsun.”",
      close: "Kapat", fileNote: "Sayfa dosya olarak açılınca resimler siyah görünür. Canlı siteyi aç ya da klasörde python3 -m http.server çalıştırıp http://localhost:8000/#walk adresini aç."
    }
  };
  function wt(k) { var l = E.lang(); return (WT[l] && WT[l][k] != null) ? WT[l][k] : WT.en[k]; }

  /* ---------- Helpers ---------- */
  var stage, renderer, scene, camera, raycaster = new T.Raycaster(), ndc = new T.Vector2();
  var running = false, inited = false, last = 0, yaw = START.yaw, pitch = 0.02, glide = null, hintShown = true, curRoom = "lobby";
  var mats = {}, arts = [], labels = [], pools = [], rings = [], targets = [], texts = [], npcs = [], critters = [], panels = [];
  var floorMesh, cursorRing, tapRing, tapT = -1, rope, mapCanvas, mapCtx, qBtn, qPanel, hintEl, card, hop = {};

  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function isDark() { var c = new T.Color(); try { c.set(css("--wall") || "#e7e4ea"); } catch (e) { } return (c.r + c.g + c.b) / 3 < 0.25; }
  function parseRGBA(s) { var m = /rgba?\(([^)]+)\)/.exec(s || ""); if (!m) return [255, 244, 238, 0.8]; var p = m[1].split(",").map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  function fingerprint(s) { var x = 5381; s = "ebru:" + String(s).replace(/\D/g, ""); for (var i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36); }
  function hasTicket() { return !!lsGet("efe-ticket", false); }
  function angDiff(a, b) { var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function stripTags(s) { return String(s).replace(/<[^>]+>/g, ""); }

  /* ---------- Walls: where things hang and which way they face ---------- */
  var SIDES = { N: { rot: 0, n: [0, 1] }, S: { rot: Math.PI, n: [0, -1] }, W: { rot: Math.PI / 2, n: [1, 0] }, E: { rot: -Math.PI / 2, n: [-1, 0] } };
  function wallPoint(rk, side, at, y, off) {
    var R = ROOMS[rk];
    if (side === "N") return new T.Vector3(at, y, R.z0 + off);
    if (side === "S") return new T.Vector3(at, y, R.z1 - off);
    if (side === "W") return new T.Vector3(R.x0 + off, y, at);
    return new T.Vector3(R.x1 - off, y, at);
  }
  function hang(obj, rk, side, at, y, off, right) {
    var p = wallPoint(rk, side, at, y, off), r = SIDES[side].rot;
    if (right) p.add(new T.Vector3(Math.cos(r), 0, -Math.sin(r)).multiplyScalar(right));
    obj.position.copy(p); obj.rotation.y = r; scene.add(obj); return obj;
  }

  /* ---------- Textures ---------- */
  function canvasTex(w, h, draw) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
    tex.userData = { canvas: c, draw: draw }; redraw(tex); return tex;
  }
  function redraw(tex) { if (!tex || !tex.userData || !tex.userData.draw) return; var c = tex.userData.canvas, g = c.getContext("2d"); g.clearRect(0, 0, c.width, c.height); tex.userData.draw(g, c.width, c.height); tex.needsUpdate = true; }
  function wrap(g, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = "";
    words.forEach(function (w) { var t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line); return lines;
  }
  // Soft pool of light, built pixel by pixel (Safari dithers canvas gradients into coloured specks).
  function poolTexture(strength) {
    var sp = parseRGBA(css("--spot")), dark = isDark();
    var a = (dark ? Math.min(1, sp[3] * 3.2) : Math.min(1, sp[3] * 1.25)) * (strength || 1);
    var N = 128, d = new Uint8Array(N * N * 4);
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var dx = (x + 0.5) / N * 2 - 1, dy = (y + 0.5) / N * 2 - 1, r2 = dx * dx + dy * dy, f = r2 >= 1 ? 0 : Math.pow(1 - r2, 2.2), i = (y * N + x) * 4;
      d[i] = sp[0]; d[i + 1] = sp[1]; d[i + 2] = sp[2]; d[i + 3] = Math.round(255 * a * f);
    }
    var tex = new T.DataTexture(d, N, N, T.RGBAFormat);
    tex.encoding = T.sRGBEncoding; tex.magFilter = tex.minFilter = T.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
    return tex;
  }
  // Terrazzo floor: pale stone with small chips, a few in her colours.
  function floorTexture() {
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var tex = canvasTex(1024, 1024, function (g, w, h) {
      g.fillStyle = "#cfcacc"; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 1600; i++) { var x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 90; g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.025)" : "rgba(70,60,70,0.025)"; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
      var chips = [["#b21f2a", 0.05], ["#2a9d9a", 0.04], ["#c9a24a", 0.04], ["#5b3f8c", 0.04], ["#f4f1f2", 0.43], ["#9a9196", 0.25], ["#4a4146", 0.15]];
      for (var k = 0; k < 3400; k++) {
        var u = rnd(), acc = 0, col = chips[0][0];
        for (var c = 0; c < chips.length; c++) { acc += chips[c][1]; if (u <= acc) { col = chips[c][0]; break; } }
        var cx = rnd() * w, cy = rnd() * h, rr = 0.9 + Math.pow(rnd(), 4) * 5, n = 5 + Math.floor(rnd() * 3), rot = rnd() * 6.283;
        g.fillStyle = col; g.globalAlpha = 0.45 + rnd() * 0.35; g.beginPath();
        for (var j = 0; j < n; j++) { var an = rot + j / n * 6.283, rad = rr * (0.6 + rnd() * 0.5); g[j ? "lineTo" : "moveTo"](cx + Math.cos(an) * rad, cy + Math.sin(an) * rad); }
        g.closePath(); g.fill(); g.globalAlpha = 1;
      }
      g.fillStyle = "rgba(60,50,58,0.22)"; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(0, h / 2, w, 1.5); g.fillRect(w / 2, 0, 1.5, h);
    });
    tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(6.6, 3.3); return tex;
  }

  /* ---------- Text on walls ---------- */
  function labelDraw(id) {
    return function (g, w, h) {
      var wk = E.by[id], ink = css("--ink"), muted = css("--muted"), red = css("--red"), hand = css("--hand") || ink;
      if (curDark && wallOf(id) === "graphite") { ink = "#eee8f0"; muted = "#b9b2c0"; hand = "#c9bcff"; }
      if (!curDark && wallOf(id) === "graphite") { ink = "#f3eff4"; muted = "#c7c2cc"; hand = "#d9d0ff"; }
      g.textBaseline = "top"; var y = 6;
      g.fillStyle = muted; g.font = "500 22px 'Instrument Sans', Arial, sans-serif"; g.fillText(wk.num, 0, y + 10);
      g.fillStyle = ink; g.font = "40px Gloock, Georgia, serif";
      var tl = wrap(g, E.title(wk), w - 90).slice(0, 2);
      tl.forEach(function (ln, i) { g.fillText(ln, 52, y + i * 46); });
      var lw = g.measureText(tl[tl.length - 1] || "").width;
      g.fillStyle = red; g.beginPath(); g.arc(52 + lw + 18, y + (tl.length - 1) * 46 + 22, 7, 0, Math.PI * 2); g.fill();
      y += tl.length * 46 + 6;
      if (E.titled(id)) { g.fillStyle = red; g.font = "600 28px Caveat, cursive"; g.fillText(E.t("namedBy"), 52, y); y += 32; }
      g.fillStyle = muted; g.font = "22px 'Instrument Sans', Arial, sans-serif"; g.fillText(wk.medium[E.lang()], 52, y); y += 36;
      g.fillStyle = hand; g.font = "500 32px Caveat, cursive";
      wrap(g, wk.note[E.lang()], w - 60).slice(0, 4).forEach(function (ln, i) { g.fillText(ln, 52, y + i * 34); });
    };
  }
  function wallOf(id) { for (var i = 0; i < LAYOUT.length; i++) if (LAYOUT[i].id === id && !LAYOUT[i].poster) return ROOMS[LAYOUT[i].room].wall; return "lilac"; }
  function roomTextDraw(nKey, hKey, trKey, introKey, light) {
    return function (g, w, h) {
      var ink = light ? "#f3eff4" : css("--ink"), muted = light ? "#c7c2cc" : css("--muted");
      g.textBaseline = "top";
      g.fillStyle = muted; g.font = "500 30px 'Instrument Sans', Arial, sans-serif"; g.fillText(E.t(nKey).toUpperCase(), 0, 0);
      g.fillStyle = ink; g.font = "104px Gloock, Georgia, serif"; g.fillText(E.t(hKey), 0, 46);
      g.fillStyle = muted; g.font = "500 52px Caveat, cursive"; g.fillText(E.t(trKey), 4, 168);
      g.fillStyle = ink; g.font = "34px 'Instrument Sans', Arial, sans-serif";
      wrap(g, E.t(introKey), w - 20).slice(0, 6).forEach(function (ln, i) { g.fillText(ln, 0, 248 + i * 48); });
    };
  }
  function redDotDraw(g, w, h) {
    g.fillStyle = css("--red"); g.beginPath(); g.arc(22, 28, 20, 0, Math.PI * 2); g.fill();
    g.fillStyle = css("--ink"); g.textBaseline = "top"; g.font = "34px 'Instrument Sans', Arial, sans-serif";
    wrap(g, E.t("reddot"), w - 80).slice(0, 6).forEach(function (ln, i) { g.fillText(ln, 70, i * 48); });
  }
  function signDraw(key, light) {
    return function (g, w, h) {
      g.fillStyle = light ? "#f3eff4" : css("--ink"); g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "56px Gloock, Georgia, serif"; g.fillText(wt(key), w / 2, h / 2);
    };
  }
  function titleDraw(g, w, h) {
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = css("--muted"); g.font = "500 40px 'Instrument Sans', Arial, sans-serif"; g.fillText(stripTags(E.t("eyebrow")).toUpperCase(), w / 2, 40);
    g.fillStyle = css("--ink"); g.font = "150px Gloock, Georgia, serif"; g.fillText(E.t("brand"), w / 2, 170);
  }
  function plaqueDraw(g, w, h) {
    g.textBaseline = "top"; g.fillStyle = css("--ink"); g.fillRect(0, 0, w, 3);
    var y = 26;
    ["hours", "entry", "guests"].forEach(function (k) {
      var html = E.t(k), m = /<b>(.*?)<\/b>\s*(.*)/.exec(html) || [0, "", stripTags(html)];
      g.font = "600 34px 'Instrument Sans', Arial, sans-serif"; g.fillStyle = css("--ink");
      var lw = g.measureText(m[1] + " ").width; g.fillText(m[1], 0, y);
      g.font = "34px 'Instrument Sans', Arial, sans-serif";
      var lines = wrap(g, m[2], w - lw - 10); g.fillText(lines[0] || "", lw, y); y += 46;
      lines.slice(1).forEach(function (ln) { g.fillText(ln, 0, y); y += 46; }); y += 10;
    });
  }
  function coffeeSignDraw(g, w, h) {
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#f6efe4"; g.font = "88px Gloock, Georgia, serif"; g.fillText("Türk Kahvesi", w / 2, h * 0.42);
    g.fillStyle = "#e7c98f"; g.font = "600 44px Caveat, cursive"; g.fillText(wt("coffeeSub"), w / 2, h * 0.8);
  }

  /* ---------- Characters: flat cut-outs, drawn here (original designs) ---------- */
  var SVG_ALEX = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 420">' +
    '<rect x="72" y="300" width="24" height="104" rx="9" fill="#1f2230"/><rect x="104" y="300" width="24" height="104" rx="9" fill="#1f2230"/>' +
    '<ellipse cx="82" cy="407" rx="18" ry="8" fill="#141414"/><ellipse cx="118" cy="407" rx="18" ry="8" fill="#141414"/>' +
    '<rect x="40" y="168" width="24" height="118" rx="12" fill="#f4f1ec"/><rect x="136" y="168" width="24" height="118" rx="12" fill="#f4f1ec"/>' +
    '<circle cx="52" cy="290" r="12" fill="#eec5a2"/><circle cx="148" cy="290" r="12" fill="#eec5a2"/>' +
    '<path d="M58 176 Q60 154 86 150 L114 150 Q140 154 142 176 L138 312 L62 312 Z" fill="#f4f1ec"/>' +
    '<path d="M70 200 L130 200 L137 320 L63 320 Z" fill="#2b3346"/><path d="M75 201 L88 153 M125 201 L112 153" stroke="#2b3346" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M100 238 c-6 -10 -20 -4 -14 6 l14 12 l14 -12 c6 -10 -8 -16 -14 -6z" fill="#b21f2a"/>' +
    '<path d="M86 150 L100 167 L114 150" fill="none" stroke="#d9d4cc" stroke-width="3"/>' +
    '<rect x="90" y="126" width="20" height="28" rx="7" fill="#e7bc98"/>' +
    '<ellipse cx="64" cy="97" rx="7" ry="10" fill="#e7bc98"/><ellipse cx="136" cy="97" rx="7" ry="10" fill="#e7bc98"/>' +
    '<ellipse cx="100" cy="93" rx="36" ry="42" fill="#f1caa7"/>' +
    /* hair: comb-over with a side part */
    '<path d="M64 98 Q60 80 62 67 Q66 50 84 44 Q80 54 80 64 Q71 63 67 73 Q64 84 64 98 Z" fill="#1b1a1f"/><path d="M80 64 Q77 45 98 37 Q121 29 139 42 Q147 53 143 72 Q142 79 138 83 Q134 73 127 70 Q113 63 97 65 Q87 66 80 64 Z" fill="#1b1a1f"/><path d="M131 72 Q136 78 137 86 L136 94 Q133 84 130 77 Z" fill="#2b2830" opacity=".55"/><path d="M66 74 Q63 84 64 96 L66 96 Q65 85 68 76 Z" fill="#2b2830" opacity=".5"/><path d="M81 63 Q79 52 84 45" stroke="#5a5563" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M88 52 Q110 38 135 48" stroke="#45414e" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M90 59 Q113 47 139 59" stroke="#3a3743" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M95 44 Q114 35 130 40" stroke="#5a5563" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M77 82 Q86 77 95 81" stroke="#1b1a1f" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M105 81 Q114 77 123 82" stroke="#1b1a1f" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="85" cy="96" rx="3.2" ry="3.8" fill="#1b1a1f"/><ellipse cx="115" cy="96" rx="3.2" ry="3.8" fill="#1b1a1f"/>' +
    '<rect x="72" y="86" width="25" height="19" rx="5" fill="rgba(255,255,255,0.12)" stroke="#111" stroke-width="3.6"/><rect x="103" y="86" width="25" height="19" rx="5" fill="rgba(255,255,255,0.12)" stroke="#111" stroke-width="3.6"/>' +
    '<path d="M97 93 L103 93 M72 92 L63 89 M128 92 L137 89" stroke="#111" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M100 102 Q97 110 101 112" stroke="#cf9d7b" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="78" cy="113" rx="6" ry="3.5" fill="#f2a6a0" opacity=".45"/><ellipse cx="122" cy="113" rx="6" ry="3.5" fill="#f2a6a0" opacity=".45"/>' +
    '<path d="M88 118 Q100 129 112 118" stroke="#8f4335" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
    '</svg>';
  var SVG_RECEPTION = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 420">' +
    '<rect x="70" y="300" width="60" height="100" rx="10" fill="#2b3346"/><ellipse cx="84" cy="406" rx="14" ry="7" fill="#3a2a2a"/><ellipse cx="116" cy="406" rx="14" ry="7" fill="#3a2a2a"/>' +
    '<rect x="42" y="168" width="22" height="116" rx="11" fill="#9c86b8"/><rect x="136" y="168" width="22" height="116" rx="11" fill="#9c86b8"/>' +
    '<circle cx="53" cy="288" r="11" fill="#d9a77f"/><circle cx="147" cy="288" r="11" fill="#d9a77f"/>' +
    '<path d="M60 178 Q62 156 86 150 L114 150 Q138 156 140 178 L136 306 L64 306 Z" fill="#9c86b8"/>' +
    '<path d="M88 150 L100 210 L112 150 Z" fill="#f6f2ee"/><rect x="112" y="186" width="18" height="10" rx="2" fill="#c9a24a"/>' +
    '<rect x="91" y="126" width="18" height="28" rx="7" fill="#cf9b72"/>' +
    '<circle cx="100" cy="40" r="20" fill="#3a2a24"/>' +
    '<ellipse cx="100" cy="94" rx="34" ry="40" fill="#d9a77f"/>' +
    '<path d="M66 98 Q60 54 100 52 Q140 54 134 98 Q130 72 112 68 Q96 78 72 74 Q68 84 66 98 Z" fill="#3a2a24"/>' +
    '<ellipse cx="87" cy="96" rx="3" ry="3.6" fill="#1b1a1f"/><ellipse cx="113" cy="96" rx="3" ry="3.6" fill="#1b1a1f"/>' +
    '<path d="M80 86 Q87 82 94 86 M106 86 Q113 82 120 86" stroke="#3a2a24" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="80" cy="110" rx="6" ry="3.5" fill="#e58f8a" opacity=".5"/><ellipse cx="120" cy="110" rx="6" ry="3.5" fill="#e58f8a" opacity=".5"/>' +
    '<path d="M89 115 Q100 125 111 115" stroke="#8f3b3b" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="66" cy="110" r="4" fill="#c9a24a"/><circle cx="134" cy="110" r="4" fill="#c9a24a"/>' +
    '</svg>';
  var SVG_GUARD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 420">' +
    '<rect x="78" y="300" width="36" height="100" rx="12" fill="#1f2a44"/><rect x="126" y="300" width="36" height="100" rx="12" fill="#1f2a44"/>' +
    '<ellipse cx="96" cy="404" rx="24" ry="10" fill="#6b4630"/><ellipse cx="144" cy="404" rx="24" ry="10" fill="#6b4630"/>' +
    '<rect x="34" y="172" width="34" height="118" rx="17" fill="#1f2a44"/><rect x="172" y="172" width="34" height="118" rx="17" fill="#1f2a44"/>' +
    '<circle cx="51" cy="292" r="17" fill="#8a5a3b"/><circle cx="189" cy="292" r="17" fill="#8a5a3b"/>' +
    '<path d="M60 186 Q62 158 96 152 L144 152 Q178 158 180 186 L176 312 L64 312 Z" fill="#1f2a44"/>' +
    '<rect x="64" y="282" width="112" height="12" fill="#14192a"/><rect x="112" y="280" width="16" height="16" rx="3" fill="#c9a24a"/>' +
    '<circle cx="120" cy="200" r="4" fill="#c9a24a"/><circle cx="120" cy="226" r="4" fill="#c9a24a"/><circle cx="120" cy="252" r="4" fill="#c9a24a"/>' +
    '<path d="M138 186 l8 -8 l8 8 l-8 8 z" fill="#c9a24a"/>' +
    '<rect x="168" y="232" width="44" height="58" rx="4" fill="#f4efe6" stroke="#6b4630" stroke-width="3"/><rect x="182" y="226" width="16" height="10" rx="2" fill="#9a9196"/>' +
    '<path d="M176 250 h28 M176 262 h28 M176 274 h20" stroke="#9a9196" stroke-width="3"/>' +
    '<circle cx="80" cy="72" r="20" fill="#8a5a3b"/><circle cx="160" cy="72" r="20" fill="#8a5a3b"/><circle cx="80" cy="72" r="10" fill="#c99a72"/><circle cx="160" cy="72" r="10" fill="#c99a72"/>' +
    '<circle cx="120" cy="104" r="50" fill="#8a5a3b"/>' +
    '<ellipse cx="120" cy="122" rx="24" ry="18" fill="#e2c2a2"/><ellipse cx="120" cy="114" rx="9" ry="6.5" fill="#2a1a12"/>' +
    '<path d="M112 128 Q120 136 128 128" stroke="#2a1a12" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="102" cy="100" r="5" fill="#2a1a12"/><circle cx="138" cy="100" r="5" fill="#2a1a12"/>' +
    '<path d="M72 74 Q120 34 168 74 L168 82 L72 82 Z" fill="#1f2a44"/><rect x="66" y="80" width="108" height="10" rx="5" fill="#14192a"/>' +
    '<path d="M120 52 l5 9 l10 1 l-7 7 l2 10 l-10 -5 l-10 5 l2 -10 l-7 -7 l10 -1 z" fill="#c9a24a"/>' +
    '</svg>';
  function svgTexture(svg, w, h, cb) {
    var img = new Image();
    img.onload = function () {
      var c = document.createElement("canvas"); c.width = w; c.height = h;
      var g = c.getContext("2d"), o = document.createElement("canvas"); o.width = w; o.height = h;
      var og = o.getContext("2d"); og.drawImage(img, 0, 0, w, h); og.globalCompositeOperation = "source-in"; og.fillStyle = "#ffffff"; og.fillRect(0, 0, w, h);
      for (var a = 0; a < 16; a++) { var ang = a / 16 * Math.PI * 2; g.drawImage(o, Math.cos(ang) * 7, Math.sin(ang) * 7); }   // white paper edge
      g.drawImage(img, 0, 0, w, h);
      var tx = new T.CanvasTexture(c); tx.encoding = T.sRGBEncoding; tx.anisotropy = 4; cb(tx);
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function critterSVG(kind) {
    var sym = document.getElementById(kind); if (!sym) return null;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' + sym.innerHTML + "</svg>";
  }

  /* ---------- Building blocks ---------- */
  function box(x0, x1, y0, y1, z0, z1, mat) {
    var m = new T.Mesh(new T.BoxGeometry(Math.max(0.001, x1 - x0), Math.max(0.001, y1 - y0), Math.max(0.001, z1 - z0)), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); scene.add(m); return m;
  }
  function plane(w, h, mat) { return new T.Mesh(new T.PlaneGeometry(w, h), mat); }
  function basic(map, extra) { var o = { map: map, transparent: true, depthWrite: false, toneMapped: false }; for (var k in extra) o[k] = extra[k]; return new T.MeshBasicMaterial(o); }
  function cyl(r0, r1, h, x, y, z, mat, seg) { var m = new T.Mesh(new T.CylinderGeometry(r0, r1, h, seg || 16), mat); m.position.set(x, y, z); scene.add(m); return m; }

  function doorsOn(rk, side) {
    var out = [];
    DOORS.forEach(function (d) {
      if (d.a === rk && d.sideA === side) out.push(side === "N" || side === "S" ? d.x : d.z);
      if (d.b === rk && d.sideB === side) out.push(side === "N" || side === "S" ? d.x : d.z);
    });
    if (EXIT_DOOR.room === rk && EXIT_DOOR.side === side) out.push(EXIT_DOOR.at);
    return out;
  }
  function buildRoom(rk) {
    var R = ROOMS[rk], m = mats["wall_" + R.wall], t = WT_;
    ["N", "S", "W", "E"].forEach(function (side) {
      var along = side === "N" || side === "S", a0 = along ? R.x0 - t : R.z0, a1 = along ? R.x1 + t : R.z1;
      var gaps = doorsOn(rk, side).map(function (c) { return [c - DOOR_W / 2, c + DOOR_W / 2]; }).sort(function (p, q) { return p[0] - q[0]; });
      var segs = [], cur = a0;
      gaps.forEach(function (g) { segs.push([cur, g[0], 0, R.h]); segs.push([g[0], g[1], DOOR_H, R.h]); cur = g[1]; });
      segs.push([cur, a1, 0, R.h]);
      segs.forEach(function (s) {
        if (s[1] - s[0] < 0.01) return;
        if (side === "N") box(s[0], s[1], s[2], s[3], R.z0 - t, R.z0, m);
        if (side === "S") box(s[0], s[1], s[2], s[3], R.z1, R.z1 + t, m);
        if (side === "W") box(R.x0 - t, R.x0, s[2], s[3], s[0], s[1], m);
        if (side === "E") box(R.x1, R.x1 + t, s[2], s[3], s[0], s[1], m);
        if (s[2] === 0) {   // skirting board
          var b0 = Math.max(s[0], along ? R.x0 : R.z0), b1 = Math.min(s[1], along ? R.x1 : R.z1);
          if (side === "N") box(b0, b1, 0, 0.09, R.z0, R.z0 + 0.02, mats.skirt);
          if (side === "S") box(b0, b1, 0, 0.09, R.z1 - 0.02, R.z1, mats.skirt);
          if (side === "W") box(R.x0, R.x0 + 0.02, 0, 0.09, b0, b1, mats.skirt);
          if (side === "E") box(R.x1 - 0.02, R.x1, 0, 0.09, b0, b1, mats.skirt);
        }
      });
    });
    var c = plane(R.x1 - R.x0 + 0.2, R.z1 - R.z0 + 0.2, mats["ceil_" + R.wall]); c.rotation.x = Math.PI / 2;
    c.position.set((R.x0 + R.x1) / 2, R.h, (R.z0 + R.z1) / 2); scene.add(c);
    var tr = 1.2, ty = R.h - 0.12;   // ceiling light track
    box(R.x0 + tr, R.x1 - tr, ty, ty + 0.04, R.z0 + tr, R.z0 + tr + 0.04, mats.dark);
    box(R.x0 + tr, R.x1 - tr, ty, ty + 0.04, R.z1 - tr - 0.04, R.z1 - tr, mats.dark);
    box(R.x0 + tr, R.x0 + tr + 0.04, ty, ty + 0.04, R.z0 + tr, R.z1 - tr, mats.dark);
    box(R.x1 - tr - 0.04, R.x1 - tr, ty, ty + 0.04, R.z0 + tr, R.z1 - tr, mats.dark);
  }

  function addText(w, h, cw, ch, draw, rk, side, at, y) {
    var m = plane(w, h, basic(canvasTex(cw, ch, draw))); hang(m, rk, side, at, y, 0.012, 0); texts.push(m); return m;
  }
  function addSign(key, rk, side, at, light) { return addText(2.4, 0.42, 1000, 175, signDraw(key, light), rk, side, at, 3.45); }

  /* ---------- Build the whole gallery ---------- */
  function build() {
    scene = new T.Scene();
    ["lilac", "graphite", "paper"].forEach(function (k) { mats["wall_" + k] = new T.MeshLambertMaterial(); mats["ceil_" + k] = new T.MeshLambertMaterial({ side: T.DoubleSide }); });
    mats.floor = new T.MeshLambertMaterial({ map: floorTexture() });
    mats.mat = new T.MeshLambertMaterial(); mats.skirt = new T.MeshLambertMaterial();
    mats.dark = new T.MeshLambertMaterial({ color: "#2a2228" });
    mats.wood = new T.MeshLambertMaterial({ color: "#8a6a4f" });
    mats.velvet = new T.MeshLambertMaterial({ color: "#8e1b25" });
    mats.brass = new T.MeshLambertMaterial({ color: "#b8954a" });
    mats.copper = new T.MeshLambertMaterial({ color: "#b0663a" });
    mats.cup = new T.MeshLambertMaterial({ color: "#f6f2ee" });
    mats.desk = new T.MeshLambertMaterial({ color: "#f2eef3" });
    mats.plant = new T.MeshLambertMaterial({ color: "#4e6b4a", flatShading: true });
    mats.pot = new T.MeshLambertMaterial({ color: "#d9d4cc" });
    mats.glass = new T.MeshLambertMaterial({ color: "#2f3945" });
    mats.ring = new T.MeshBasicMaterial({ transparent: true, depthWrite: false });
    mats.hidden = new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    mats.npc = [];

    scene.add(mats.hemi = new T.HemisphereLight(0xffffff, 0xd9cfc6, 0.7));
    var dir = mats.dirLight = new T.DirectionalLight(0xffffff, 0.15); dir.position.set(3, 7, 5); scene.add(dir);

    floorMesh = plane(37, 18.2, mats.floor); floorMesh.rotation.x = -Math.PI / 2; floorMesh.position.set(10.9, 0, 3.6);
    floorMesh.userData = { type: "floor" }; scene.add(floorMesh); targets.push(floorMesh);

    ORDER.forEach(buildRoom);

    // Door tap targets.
    DOORS.forEach(function (d) {
      var p = plane(DOOR_W, DOOR_H, mats.hidden); p.position.set(d.x, DOOR_H / 2, d.z); p.rotation.y = d.nx ? Math.PI / 2 : 0;
      var mat2 = mats.hidden; p.material = mat2; p.material.side = T.DoubleSide;
      p.userData = { type: "door", door: d }; scene.add(p); targets.push(p);
    });
    // Exit passage beyond Room 3.
    var R3 = ROOMS.r3, ex = R3.x1 + WT_;
    box(ex, ex + 1.4, 0, R3.h, -DOOR_W / 2 - 0.1, -DOOR_W / 2, mats.wall_paper);
    box(ex, ex + 1.4, 0, R3.h, DOOR_W / 2, DOOR_W / 2 + 0.1, mats.wall_paper);
    box(ex, ex + 1.4, R3.h - 0.01, R3.h, -DOOR_W / 2, DOOR_W / 2, mats.ceil_paper);
    var exEnd = plane(DOOR_W, R3.h, mats.wall_paper); exEnd.position.set(ex + 1.4, R3.h / 2, 0); exEnd.rotation.y = -Math.PI / 2; scene.add(exEnd);
    var exSign = plane(2.1, 0.37, basic(canvasTex(1000, 175, signDraw("sExit")))); exSign.position.set(ex + 1.39, 1.9, 0); exSign.rotation.y = -Math.PI / 2; scene.add(exSign); texts.push(exSign);
    exEnd.userData = exSign.userData = { type: "exit" }; targets.push(exEnd, exSign);
    var exHit = plane(DOOR_W, DOOR_H, mats.hidden); exHit.position.set(R3.x1 + 0.05, DOOR_H / 2, 0); exHit.rotation.y = -Math.PI / 2; exHit.userData = { type: "exit" }; scene.add(exHit); targets.push(exHit);

    // Signs above doors (inside each room).
    addSign("sLobby", "r1", "S", 0); addSign("sR2", "r1", "E", 0);
    addSign("sR1", "r2", "W", 0, true); addSign("sR3", "r2", "E", 0, true);
    addSign("sR2", "r3", "W", 0); addSign("sExit", "r3", "E", 0);

    buildLobby(); buildRoom1Extras(); buildRoom2Extras(); buildRoom3Extras();
    buildArt();
    buildRings();
    CRITTERS.forEach(function (c) {
      var s = new T.Sprite(new T.SpriteMaterial({ transparent: true }));
      s.scale.set(c.s, c.s, 1); s.position.set(c.x, c.y, c.z); s.userData = { type: "critter", c: c }; scene.add(s); targets.push(s); critters.push(s);
      var svg = critterSVG(c.kind); if (svg) svgTexture(svg, 256, 256, function (tx) { s.material.map = tx; s.material.needsUpdate = true; });
    });
    applyTheme();
  }

  function buildLobby() {
    var L = ROOMS.lobby;
    addText(8.4, 1.0, 2000, 238, titleDraw, "lobby", "N", 0, 3.6);
    addText(2.0, 1.45, 820, 595, plaqueDraw, "lobby", "E", 10.2, 1.6);
    // Reception desk with the receptionist behind it.
    box(-3.9, -3.1, 0, 1.05, 7.4, 10.2, mats.desk);
    box(-3.95, -3.05, 1.05, 1.1, 7.35, 10.25, mats.wood);
    addNPC("reception", SVG_RECEPTION, -4.4, 8.8, 0.8, 1.68);
    // Rope gate in front of Room 1 and the security bear.
    [-1.3, 1.3].forEach(function (x) { cyl(0.16, 0.16, 0.03, x, 0.015, 5.75, mats.brass); cyl(0.028, 0.028, 0.95, x, 0.49, 5.75, mats.brass); var top = new T.Mesh(new T.SphereGeometry(0.05, 12, 8), mats.brass); top.position.set(x, 0.98, 5.75); scene.add(top); });
    var curve = new T.QuadraticBezierCurve3(new T.Vector3(-1.3, 0.92, 5.75), new T.Vector3(0, 0.58, 5.75), new T.Vector3(1.3, 0.92, 5.75));
    rope = new T.Mesh(new T.TubeGeometry(curve, 24, 0.028, 8, false), mats.velvet); scene.add(rope);
    addNPC("guard", SVG_GUARD, 1.95, 6.35, 1.0, 1.75);
    // Glass entrance doors on the south wall, and two plants.
    var gx = plane(2.4, 2.7, mats.glass); hang(gx, "lobby", "S", 0, 1.35, 0.012, 0);
    box(-1.28, 1.28, 2.7, 2.78, L.z1 - 0.03, L.z1, mats.dark); box(-1.28, -1.2, 0, 2.7, L.z1 - 0.03, L.z1, mats.dark);
    box(1.2, 1.28, 0, 2.7, L.z1 - 0.03, L.z1, mats.dark); box(-0.03, 0.03, 0, 2.7, L.z1 - 0.03, L.z1, mats.dark);
    [[-4.3, 11.5], [4.3, 11.5]].forEach(function (p) {
      cyl(0.26, 0.2, 0.5, p[0], 0.25, p[1], mats.pot);
      var f = new T.Mesh(new T.IcosahedronGeometry(0.42, 1), mats.plant); f.position.set(p[0], 0.95, p[1]); f.scale.set(1, 1.25, 1); scene.add(f);
    });
  }
  function buildRoom1Extras() {
    addText(3.4, 2.3, 1200, 812, roomTextDraw("navR1", "r1", "r1tr", "r1intro"), "r1", "S", -4.1, 2.05);
    addText(3.0, 1.05, 1100, 385, redDotDraw, "r1", "S", 4.1, 1.75);
    var B = OBST.r1[0];
    box(B.x0, B.x1, 0.4, 0.46, B.z0, B.z1, mats.wood);
    box(B.x0 + 0.1, B.x0 + 0.18, 0, 0.4, B.z0 + 0.06, B.z1 - 0.06, mats.dark); box(B.x1 - 0.18, B.x1 - 0.1, 0, 0.4, B.z0 + 0.06, B.z1 - 0.06, mats.dark);
  }
  function buildRoom2Extras() {
    addText(2.8, 1.9, 1200, 812, roomTextDraw("navR2", "r2", "r2tr", "r2intro", true), "r2", "S", 9.4, 1.9);
    // Red velvet sofa facing the leopard.
    box(10.2, 12.2, 0.2, 0.46, 0.7, 1.5, mats.velvet); box(10.2, 12.2, 0.46, 0.98, 1.28, 1.55, mats.velvet);
    box(10.02, 10.24, 0.2, 0.72, 0.7, 1.55, mats.velvet); box(12.16, 12.38, 0.2, 0.72, 0.7, 1.55, mats.velvet);
    [[10.12, 0.78], [12.28, 0.78], [10.12, 1.47], [12.28, 1.47]].forEach(function (p) { box(p[0] - 0.04, p[0] + 0.04, 0, 0.2, p[1] - 0.04, p[1] + 0.04, mats.dark); });
    // Drawing table with paper and pencils.
    box(12.6, 14.2, 0.72, 0.77, 2.9, 3.6, mats.wood);
    [[12.66, 2.96], [14.14, 2.96], [12.66, 3.54], [14.14, 3.54]].forEach(function (p) { box(p[0] - 0.025, p[0] + 0.025, 0, 0.72, p[1] - 0.025, p[1] + 0.025, mats.dark); });
    [[13.0, 3.2, 0.12], [13.45, 3.25, -0.2], [13.85, 3.15, 0.3]].forEach(function (p) { var s = plane(0.3, 0.42, mats.cup); s.rotation.x = -Math.PI / 2; s.rotation.z = p[2]; s.position.set(p[0], 0.775, p[1]); scene.add(s); });
    ["#2a2a2a", "#b21f2a", "#5b3f8c"].forEach(function (c, i) { var pc = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.18, 6), new T.MeshLambertMaterial({ color: c })); pc.rotation.z = Math.PI / 2; pc.rotation.y = 0.3 + i * 0.25; pc.position.set(13.6 + i * 0.05, 0.785, 3.42); scene.add(pc); });
  }
  function buildRoom3Extras() {
    addText(2.6, 1.75, 1200, 812, roomTextDraw("navR3", "r3", "r3tr", "r3intro"), "r3", "W", -3.0, 1.9);
    // Coffee booth against the east wall, with Alex behind the counter.
    box(26.1, 26.9, 0, 1.0, -3.9, -2.1, mats.copper);
    box(26.05, 26.95, 1.0, 1.06, -3.95, -2.05, mats.wood);
    box(26.9, 27.4, 2.45, 2.55, -4.0, -2.0, mats.velvet);
    var sign = plane(1.9, 0.62, basic(canvasTex(1000, 326, coffeeSignDraw))); hang(sign, "r3", "E", -3.0, 3.05, 0.012, 0); texts.push(sign);
    var signBg = plane(2.0, 0.72, mats.dark); hang(signBg, "r3", "E", -3.0, 3.05, 0.008, 0);
    cyl(0.055, 0.065, 0.11, 26.35, 1.115, -3.45, mats.copper); box(26.35, 26.5, 1.12, 1.135, -3.46, -3.44, mats.copper);
    [-2.8, -2.55].forEach(function (z) { cyl(0.06, 0.06, 0.008, 26.32, 1.064, z, mats.cup); cyl(0.034, 0.03, 0.06, 26.32, 1.098, z, mats.cup); });
    addNPC("alex", SVG_ALEX, 27.1, -3.0, 0.82, 1.78);
  }

  function addNPC(who, svg, x, z, w, h) {
    var mat = new T.MeshBasicMaterial({ transparent: true, alphaTest: 0.4, toneMapped: false });
    var m = plane(w, h, mat); m.position.set(x, h / 2, z); m.userData = { type: "npc", who: who };
    scene.add(m); targets.push(m); npcs.push(m); mats.npc.push(mat);
    svgTexture(svg, Math.round(w / h * 840), 840, function (tx) { mat.map = tx; mat.needsUpdate = true; });
  }

  function buildArt() {
    var loader = new T.TextureLoader(), cache = {};
    LAYOUT.forEach(function (L) {
      var wk = E.by[L.id], ar = wk.w / wk.h, w = L.w || L.h * ar, h = L.h || L.w / ar, y = 1.65, rk = L.room;
      if (L.panel) { var pnl = plane(2.9, ROOMS[rk].h, new T.MeshLambertMaterial()); hang(pnl, rk, L.wall, L.at, ROOMS[rk].h / 2, 0.004, 0); pnl.userData.cols = L.panel; panels.push(pnl); }
      var pool = plane(w + 2.4, h + 2.6, basic(poolTexture())); hang(pool, rk, L.wall, L.at, y + 0.35, 0.006, 0); pools.push(pool);
      var spill = plane(w + 1.6, 1.6, basic(poolTexture(0.55))); spill.userData.strength = 0.55;
      spill.rotation.x = -Math.PI / 2; spill.rotation.z = -SIDES[L.wall].rot; spill.position.copy(wallPoint(rk, L.wall, L.at, 0.006, 0.55)); scene.add(spill); pools.push(spill);
      var frame = new T.Mesh(new T.BoxGeometry(w + 0.2, h + 0.2, 0.05), mats.mat); hang(frame, rk, L.wall, L.at, y, 0.03, 0);
      var tex = cache[wk.img] || (cache[wk.img] = loader.load(wk.img)); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
      var pic = plane(w, h, new T.MeshBasicMaterial({ map: tex, toneMapped: false })); hang(pic, rk, L.wall, L.at, y, 0.057, 0);
      var parts = [frame, pic];
      if (!L.poster) {
        var lbl = plane(0.92, 0.624, basic(canvasTex(640, 434, labelDraw(L.id)))); hang(lbl, rk, L.wall, L.at, 1.12, 0.008, w / 2 + 0.66);
        labels.push(lbl); parts.push(lbl);
      }
      var can = cyl(0.06, 0.08, 0.24, 0, 0, 0, mats.dark, 12); can.position.copy(wallPoint(rk, L.wall, L.at, ROOMS[rk].h - 0.28, 1.22));
      can.lookAt(wallPoint(rk, L.wall, L.at, y, 0)); can.rotateX(Math.PI / 2);
      var n = SIDES[L.wall].n, center = wallPoint(rk, L.wall, L.at, y, 0);
      var spot = new T.Vector3(center.x + n[0] * 2.4, 0, center.z + n[1] * 2.4);
      var item = { id: L.id, room: rk, spot: clampIn(rk, spot), yaw: Math.atan2(n[0], n[1]) };
      parts.forEach(function (m) { m.userData = { type: "art", item: item }; targets.push(m); });
      arts.push(item);
    });
  }
  function buildRings() {
    var spots = arts.map(function (a) { return a.spot; }).concat([
      new T.Vector3(0, 0, 9.6), new T.Vector3(1.0, 0, 7.4), new T.Vector3(-2.2, 0, 8.8),
      new T.Vector3(0, 0, 2.6), new T.Vector3(11.2, 0, 2.4), new T.Vector3(24.4, 0, -3.0), new T.Vector3(21.4, 0, 0.5)
    ]);
    spots = spots.filter(function (p, i) { return spots.slice(0, i).every(function (q) { return q.distanceTo(p) > 1.2; }); });
    var rg = new T.RingGeometry(0.24, 0.32, 40);
    spots.forEach(function (p, i) { var r = new T.Mesh(rg, mats.ring); r.rotation.x = -Math.PI / 2; r.position.set(p.x, 0.012, p.z); r.userData.phase = i * 0.7; scene.add(r); rings.push(r); });
    cursorRing = new T.Mesh(new T.RingGeometry(0.16, 0.22, 32), mats.ring.clone()); cursorRing.rotation.x = -Math.PI / 2; cursorRing.visible = false; scene.add(cursorRing);
    tapRing = new T.Mesh(new T.RingGeometry(0.3, 0.36, 40), mats.ring.clone()); tapRing.rotation.x = -Math.PI / 2; tapRing.visible = false; scene.add(tapRing);
  }

  /* ---------- Light and dark mode ---------- */
  var curDark = false;
  function applyTheme() {
    var dark = curDark = isDark(), lil = new T.Color(css("--wall") || "#e7e4ea"), w2 = new T.Color(css("--wall-2") || "#dbd7e0");
    if (dark) lil.offsetHSL(0, 0, 0.03); else lil.multiplyScalar(0.9);
    mats.wall_lilac.color.copy(lil); mats.ceil_lilac.color.copy(w2).multiplyScalar(dark ? 0.55 : 0.78);
    mats.wall_graphite.color.set(dark ? "#24272d" : "#4b525c"); mats.ceil_graphite.color.set(dark ? "#16181c" : "#3a4048");
    mats.wall_paper.color.set(dark ? "#2a2530" : "#e9e5e1"); mats.ceil_paper.color.set(dark ? "#1b171f" : "#cfcac8");
    mats.floor.color.set(dark ? "#6f6670" : "#ffffff");
    mats.mat.color.set(dark ? "#e9e4ec" : (css("--mat") || "#faf9fb")); mats.skirt.color.copy(mats.mat.color);
    mats.desk.color.set(dark ? "#3a3340" : "#f2eef3");
    mats.ring.color.set(css("--ink") || "#231a29"); mats.ring.opacity = dark ? 0.38 : 0.24;
    cursorRing.material.color.copy(mats.ring.color); cursorRing.material.opacity = dark ? 0.7 : 0.45;
    tapRing.material.color.set(css("--red") || "#b21f2a");
    mats.hemi.intensity = dark ? 0.5 : 0.7; mats.dirLight.intensity = dark ? 0.06 : 0.15;
    panels.forEach(function (p) { p.material.color.set(p.userData.cols[dark ? 1 : 0]); });
    mats.npc.forEach(function (m) { m.color.set(dark ? "#cfc7d4" : "#ffffff"); });
    pools.forEach(function (p) { if (p.material.map) p.material.map.dispose(); p.material.map = poolTexture(p.userData.strength); p.material.blending = dark ? T.AdditiveBlending : T.NormalBlending; p.material.needsUpdate = true; });
    redrawText();
    if (stage) stage.style.background = css("--wall");
  }
  function redrawText() { labels.concat(texts).forEach(function (m) { redraw(m.material.map); }); updateQuests(); renderGuide(); }

  /* ---------- Where am I, and how do I get there ---------- */
  function inRoom(rk, p, m) { var R = ROOMS[rk]; m = m || 0; return p.x >= R.x0 - m && p.x <= R.x1 + m && p.z >= R.z0 - m && p.z <= R.z1 + m; }
  function roomAt(p) {
    for (var i = 0; i < ORDER.length; i++) if (inRoom(ORDER[i], p, 0.06)) return ORDER[i];
    var best = "r1", bd = 1e9;
    ORDER.forEach(function (rk) { var R = ROOMS[rk], dx = Math.max(R.x0 - p.x, 0, p.x - R.x1), dz = Math.max(R.z0 - p.z, 0, p.z - R.z1), d = dx * dx + dz * dz; if (d < bd) { bd = d; best = rk; } });
    return best;
  }
  function clampIn(rk, p) {
    var R = ROOMS[rk];
    p.x = Math.max(R.x0 + PAD, Math.min(R.x1 - PAD, p.x)); p.z = Math.max(R.z0 + PAD, Math.min(R.z1 - PAD, p.z));
    (OBST[rk] || []).forEach(function (B) {
      var m = 0.35;
      if (p.x > B.x0 - m && p.x < B.x1 + m && p.z > B.z0 - m && p.z < B.z1 + m) {
        var d = [p.x - (B.x0 - m), (B.x1 + m) - p.x, p.z - (B.z0 - m), (B.z1 + m) - p.z], k = d.indexOf(Math.min.apply(null, d));
        if (k === 0) p.x = B.x0 - m; else if (k === 1) p.x = B.x1 + m; else if (k === 2) p.z = B.z0 - m; else p.z = B.z1 + m;
      }
    });
    p.x = Math.max(R.x0 + PAD, Math.min(R.x1 - PAD, p.x)); p.z = Math.max(R.z0 + PAD, Math.min(R.z1 - PAD, p.z));
    return p;
  }
  function doorBetween(a, b) { for (var i = 0; i < DOORS.length; i++) { var d = DOORS[i]; if ((d.a === a && d.b === b) || (d.a === b && d.b === a)) return d; } return null; }
  function waypoints(from, to) {
    var i = ORDER.indexOf(from), j = ORDER.indexOf(to), pts = [], step = j > i ? 1 : -1;
    for (var k = i; k !== j; k += step) {
      var a = ORDER[k], b = ORDER[k + step], d = doorBetween(a, b), s = d.a === a ? 1 : -1;
      pts.push(new T.Vector3(d.x - d.nx * 0.9 * s, 0, d.z - d.nz * 0.9 * s), new T.Vector3(d.x, 0, d.z), new T.Vector3(d.x + d.nx * 0.9 * s, 0, d.z + d.nz * 0.9 * s));
    }
    return pts;
  }
  // Walk to a point, through doors if needed. The security bear stops her until she shows her ticket.
  function route(target, toRoom, faceYaw, then) {
    var from = roomAt(camera.position);
    if (!hasTicket() && ORDER.indexOf(toRoom) > 0 && from === "lobby") { walkToGuard(); return; }
    var pts = waypoints(from, toRoom); pts.push(target);
    goPath(pts, faceYaw, then);
  }
  function goPath(pts, faceYaw, then) {
    var all = [camera.position.clone()].concat(pts.map(function (p) { return new T.Vector3(p.x, EYE, p.z); }));
    var lens = [], total = 0; for (var i = 1; i < all.length; i++) { var l = all[i].distanceTo(all[i - 1]); lens.push(l); total += l; }
    glide = { pts: all, lens: lens, total: total, t0: performance.now(), dur: Math.max(0.45, Math.min(9, total / 2.4)) * 1000, yaw0: yaw, face: faceYaw, follow: all.length > 2, then: then };
    hideHint();
  }
  function walkToGuard() {
    var g = npcByWho("guard"), p = new T.Vector3(1.1, 0, 7.5);
    goPath(waypoints(roomAt(camera.position), "lobby").concat([p]), Math.atan2(-(g.position.x - p.x), -(g.position.z - p.z)), function () { openCard("guard"); });
  }
  function npcByWho(w) { for (var i = 0; i < npcs.length; i++) if (npcs[i].userData.who === w) return npcs[i]; return null; }

  /* ---------- Tapping ---------- */
  function pick(x, y) {
    var r = renderer.domElement.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(targets, false);
    for (var i = 0; i < hits.length; i++) { var u = hits[i].object.userData; if (u.type === "critter" && E.isFound(u.c.id) && hits.length > i + 1) continue; return hits[i]; }
    return null;
  }
  function tap(x, y) {
    var hit = pick(x, y); if (!hit) return;
    var u = hit.object.userData;
    if (card && !card.hidden) closeCard();
    if (u.type === "art") {
      var it = u.item;
      route(it.spot, it.room, it.yaw, function () { E.openWork(it.id); look(it.id); });
    } else if (u.type === "door") {
      var d = u.door, cur = roomAt(camera.position), other = cur === d.a ? d.b : d.a, s = other === d.b ? 1 : -1;
      route(new T.Vector3(d.x + d.nx * 1.8 * s, 0, d.z + d.nz * 1.8 * s), other, Math.atan2(-d.nx * s, -d.nz * s), null);
    } else if (u.type === "exit") {
      route(new T.Vector3(ROOMS.r3.x1 - 0.6, 0, 0), "r3", -Math.PI / 2, function () { location.hash = "#exit"; });
    } else if (u.type === "npc") {
      var n = hit.object, rk = roomAt(n.position), front = npcFront(u.who);
      route(front, rk, Math.atan2(-(n.position.x - front.x), -(n.position.z - front.z)), function () { openCard(u.who); });
    } else if (u.type === "critter") {
      E.find(u.c.id); hop[u.c.id] = performance.now(); updateQuests();
    } else if (u.type === "floor") {
      var rk2 = roomAt(hit.point), q = clampIn(rk2, hit.point.clone());
      showTap(q); route(q, rk2, null, null);
    }
  }
  function npcFront(who) {
    if (who === "guard") return new T.Vector3(1.1, 0, 7.5);
    if (who === "reception") return new T.Vector3(-2.3, 0, 8.8);
    return new T.Vector3(24.4, 0, -3.0);
  }
  function showTap(p) { tapRing.position.set(p.x, 0.014, p.z); tapRing.visible = true; tapT = performance.now(); }
  function look(id) { var l = lsGet("efe-walk-looked", []); if (l.indexOf(id) < 0) { l.push(id); lsSet("efe-walk-looked", l); } updateQuests(); }

  /* ---------- Conversation cards ---------- */
  function openCard(who) {
    if (!card) return;
    card.hidden = false; card.dataset.who = who; if (guideEl) guideEl.hidden = true;
    var h = "<button class='wk-x' type='button' aria-label='" + esc(wt("close")) + "'>×</button>";
    if (who === "guard") {
      h += "<p class='wk-who'>" + esc(wt("guardName")) + "</p>";
      if (hasTicket()) h += "<p class='wk-say'>" + esc(wt("guardBack")) + "</p><button class='wk-btn' type='button' data-act='goin'>" + esc(wt("goIn")) + "</button>";
      else h += "<p class='wk-say'>" + esc(wt("guardHi")) + "</p><form class='wk-form'><label for='wk-pass'>" + esc(wt("guardLabel")) + "</label><div class='wk-row'><input id='wk-pass' inputmode='numeric' pattern='[0-9]*' autocomplete='off' maxlength='6' placeholder='7 _ _ 5 _ _'><button class='wk-btn' type='submit'>" + esc(wt("guardBtn")) + "</button></div></form><p class='wk-msg' aria-live='polite'></p>";
    } else if (who === "reception") {
      h += "<p class='wk-who'>" + esc(wt("recName")) + "</p><p class='wk-say'>" + esc(wt("recHi")) + "</p><button class='wk-btn' type='button' data-act='close'>" + esc(wt("thanks")) + "</button>";
    } else {
      h += "<p class='wk-who'>" + esc(wt("alexName")) + "</p><p class='wk-say wk-hand' data-step='1'>" + esc(wt("alex1")) + "</p><button class='wk-btn' type='button' data-act='coffee1'>" + esc(wt("yes")) + "</button>";
    }
    card.innerHTML = h;
    var f = card.querySelector(".wk-form");
    if (f) f.onsubmit = function (e) {
      e.preventDefault();
      var v = card.querySelector("#wk-pass").value, msg = card.querySelector(".wk-msg");
      if (fingerprint(v) === TICKET) {
        lsSet("efe-ticket", true); msg.textContent = wt("guardOk"); msg.className = "wk-msg ok"; openGate(); updateQuests();
        setTimeout(function () { closeCard(); route(new T.Vector3(0, 0, 3.4), "r1", 0, null); }, 1600);
      } else { msg.textContent = wt("guardNo"); msg.className = "wk-msg"; }
    };
    if (f && matchMedia("(hover: hover)").matches) setTimeout(function () { var i = card.querySelector("#wk-pass"); if (i) i.focus(); }, 50);
  }
  function closeCard() { if (card) { card.hidden = true; card.innerHTML = ""; } renderGuide(); }
  function cardClick(e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.classList.contains("wk-x") || b.dataset.act === "close") { closeCard(); return; }
    if (b.dataset.act === "goin") { closeCard(); route(new T.Vector3(0, 0, 3.4), "r1", 0, null); return; }
    if (b.dataset.act === "coffee1") {
      card.querySelector(".wk-say").textContent = wt("alex2"); b.textContent = wt("what"); b.dataset.act = "coffee2"; return;
    }
    if (b.dataset.act === "coffee2") {
      var s = card.querySelector(".wk-say"); s.textContent = wt("alex3"); s.classList.add("wk-big");
      b.textContent = wt("close"); b.dataset.act = "close"; lsSet("efe-coffee", true); updateQuests();
    }
  }
  function openGate() { if (rope) rope.visible = false; }

  /* ---------- Pointer: drag to look, tap to act ---------- */
  var ptr = null;
  function onDown(e) { if (ptr) return; ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), drag: false, type: e.pointerType }; try { renderer.domElement.setPointerCapture(e.pointerId); } catch (er) { } }
  function onMove(e) {
    if (!ptr) { if (e.pointerType === "mouse") hover(e.clientX, e.clientY); return; }
    if (e.pointerId !== ptr.id) return;
    var dx = e.clientX - ptr.lx, dy = e.clientY - ptr.ly; ptr.lx = e.clientX; ptr.ly = e.clientY;
    if (!ptr.drag && Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y) > 7) ptr.drag = true;
    if (ptr.drag) {
      var k = ptr.type === "touch" ? 0.0062 : 0.0045;
      yaw += dx * k; pitch = Math.max(-0.45, Math.min(0.35, pitch + dy * k * 0.8));
      if (glide) { glide.face = null; glide.follow = false; }
      hideHint(); cursorRing.visible = false;
    }
  }
  function onUp(e) { if (!ptr || e.pointerId !== ptr.id) return; var wasTap = !ptr.drag && performance.now() - ptr.t < 600; ptr = null; if (wasTap) tap(e.clientX, e.clientY); }
  function hover(x, y) {
    var hit = pick(x, y), u = hit && hit.object.userData;
    renderer.domElement.style.cursor = u && u.type !== "floor" ? "pointer" : "grab";
    if (u && u.type === "floor") { var q = clampIn(roomAt(hit.point), hit.point.clone()); cursorRing.position.set(q.x, 0.013, q.z); cursorRing.visible = true; } else cursorRing.visible = false;
  }
  function onKey(e) {
    if (!running || document.querySelector("#lb[open]") || /input|textarea|select/i.test((e.target && e.target.tagName) || "")) return;
    var f = new T.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), p = camera.position.clone(), cur = roomAt(p);
    function step(dist) { var q = p.clone().add(f.clone().multiplyScalar(dist)), rk = inRoomAny(q) || cur; route(clampIn(rk, q), rk, null, null); }
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { step(1.3); e.preventDefault(); }
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { step(-1.3); e.preventDefault(); }
    else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { goPath([p], yaw + 0.45); e.preventDefault(); }
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { goPath([p], yaw - 0.45); e.preventDefault(); }
  }
  function inRoomAny(p) { for (var i = 0; i < ORDER.length; i++) if (inRoom(ORDER[i], p, 0)) return ORDER[i]; return null; }

  /* ---------- Small map ---------- */
  var MAPB = { x0: -7.4, x1: 29.2, z0: -5.4, z1: 12.6 };
  function drawMap() {
    if (!mapCtx) return;
    var c = mapCanvas, g = mapCtx, W = c.clientWidth, H = c.clientHeight, dpr = c.width / (W || 1);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var pad = 10, top = 20, s = Math.min((W - pad * 2) / (MAPB.x1 - MAPB.x0), (H - pad - top) / (MAPB.z1 - MAPB.z0));
    var ox = pad + ((W - pad * 2) - (MAPB.x1 - MAPB.x0) * s) / 2, oy = top;
    function X(x) { return ox + (x - MAPB.x0) * s; } function Y(z) { return oy + (z - MAPB.z0) * s; }
    var ink = css("--ink"), muted = css("--muted"), red = css("--red");
    g.fillStyle = muted; g.font = "600 10px 'Instrument Sans', Arial, sans-serif"; g.textBaseline = "top";
    var nm = curRoom === "lobby" ? wt("lobbyMap") : E.t({ r1: "navR1", r2: "navR2", r3: "navR3" }[curRoom]).toUpperCase(); g.fillText(nm, pad, 6);
    ORDER.forEach(function (rk) {
      var R = ROOMS[rk];
      if (rk === curRoom) { g.fillStyle = ink; g.globalAlpha = 0.08; g.fillRect(X(R.x0), Y(R.z0), (R.x1 - R.x0) * s, (R.z1 - R.z0) * s); g.globalAlpha = 1; }
      g.strokeStyle = ink; g.lineWidth = 1.5; g.strokeRect(X(R.x0), Y(R.z0), (R.x1 - R.x0) * s, (R.z1 - R.z0) * s);
      g.fillStyle = muted; g.textBaseline = "middle"; g.textAlign = "center"; g.font = "600 9px 'Instrument Sans', Arial, sans-serif";
      g.fillText(rk === "lobby" ? "" : R.label, X((R.x0 + R.x1) / 2), Y((R.z0 + R.z1) / 2)); g.textAlign = "left";
    });
    g.fillStyle = css("--wall");   // door gaps
    DOORS.forEach(function (d) { if (d.nx) g.fillRect(X(d.x) - 2, Y(d.z - DOOR_W / 2), 4, DOOR_W * s); else g.fillRect(X(d.x - DOOR_W / 2), Y(d.z) - 2, DOOR_W * s, 4); });
    g.fillRect(X(ROOMS.r3.x1) - 2, Y(-DOOR_W / 2), 4, DOOR_W * s);
    if (!hasTicket()) { g.strokeStyle = red; g.lineWidth = 2; g.beginPath(); g.moveTo(X(-1.1), Y(5.1)); g.lineTo(X(1.1), Y(5.1)); g.stroke(); }
    g.fillStyle = red; LAYOUT.forEach(function (L) { var p = wallPoint(L.room, L.wall, L.at, 0, 0.25); g.fillRect(X(p.x) - 1.5, Y(p.z) - 1.5, 3, 3); });
    var px = X(camera.position.x), py = Y(camera.position.z), ang = Math.atan2(-Math.cos(yaw), -Math.sin(yaw));
    g.fillStyle = ink; g.globalAlpha = 0.2; g.beginPath(); g.moveTo(px, py); g.arc(px, py, 16, ang - 0.55, ang + 0.55); g.closePath(); g.fill(); g.globalAlpha = 1;
    g.fillStyle = red; g.beginPath(); g.arc(px, py, 3.8, 0, Math.PI * 2); g.fill(); g.strokeStyle = css("--wall"); g.lineWidth = 1.2; g.stroke();
    mapCanvas._m = { ox: ox, oy: oy, s: s };
  }
  function mapTap(e) {
    var r = mapCanvas.getBoundingClientRect(), m = mapCanvas._m; if (!m) return;
    var p = new T.Vector3(MAPB.x0 + (e.clientX - r.left - m.ox) / m.s, 0, MAPB.z0 + (e.clientY - r.top - m.oy) / m.s);
    if (p.x > ROOMS.r3.x1 + 0.2 && Math.abs(p.z) < 1.5) { route(new T.Vector3(ROOMS.r3.x1 - 0.6, 0, 0), "r3", -Math.PI / 2, function () { location.hash = "#exit"; }); return; }
    var rk = roomAt(p), q = clampIn(rk, p); showTap(q); route(q, rk, null, null);
  }

  /* ---------- Quests ---------- */
  function quests() {
    var looked = lsGet("efe-walk-looked", []).length, hunt = E.foundCount();
    return [
      { text: wt("qTicket"), done: hasTicket() },
      { text: fmt(wt("qLook"), { n: Math.min(3, looked) }), done: looked >= 3 },
      { text: wt("qName"), done: E.hasTitles() },
      { text: wt("qCoffee"), done: !!lsGet("efe-coffee", false) },
      { text: fmt(wt("qHunt"), { n: hunt }), done: hunt >= 6 }
    ];
  }
  function updateQuests() {
    if (!qBtn) return;
    var q = quests(), d = q.filter(function (x) { return x.done; }).length;
    qBtn.textContent = wt("quests") + " " + d + "/" + q.length;
    qPanel.innerHTML = "<p class='wk-qh'>" + esc(wt("quests")) + "</p><ul>" + q.map(function (x) {
      return "<li class='" + (x.done ? "done" : "") + "'><span class='wk-check' aria-hidden='true'>" + (x.done ? "✓" : "") + "</span><span>" + esc(x.text) + "</span></li>";
    }).join("") + "</ul>" + (d === q.length ? "<p class='wk-qdone'>" + esc(wt("qDone")) + "</p>" : "");
    if (hintEl) hintEl.textContent = wt("hint");
    if (fileEl) fileEl.textContent = wt("fileNote");
  }
  var fileEl = null;
  function hideHint() { if (hintShown && hintEl) { hintShown = false; hintEl.style.opacity = "0"; } }

  /* ---------- Alex's voice guide, with read-along text ---------- */
  var GKEY = { lobby: "lobby", r1: "room-1", r2: "room-2", r3: "room-3" };
  var GNAME = { lobby: "navLobby", r1: "navR1", r2: "navR2", r3: "navR3" };
  var guideEl = null, guideText = false;
  function guideKeyShown() { var g = E.guide, st = g.state(); return st.playing && st.key ? st.key : GKEY[curRoom]; }
  function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }
  function renderGuide() {
    if (!guideEl || !E.guide) return;
    if (card && !card.hidden) { guideEl.hidden = true; return; }   // keep out of the way while someone is talking to her
    var g = E.guide, key = guideKeyShown(), st = g.state(), has = g.has(key), txt = g.text(key);
    if (!has && !txt) { guideEl.hidden = true; return; }
    guideEl.hidden = false;
    var playing = st.playing && st.key === key, roomKey = Object.keys(GKEY).filter(function (k) { return GKEY[k] === key; })[0] || curRoom;
    var h = "<span class='wk-geye'>" + esc(E.t(has ? "guideLabel" : "fromAlex")) + " · " + esc(E.t(GNAME[roomKey])) + "</span>";
    h += "<div class='wk-gbar'>";
    if (has) h += "<button class='wk-gplay' type='button' data-g='play'><span class='ic' aria-hidden='true'>" + (playing ? "❚❚" : "▶") + "</span>" + esc(playing ? E.t("pause") : E.t("listen")) + "</button><span class='wk-gtime'></span>";
    h += "<button class='wk-gread' type='button' data-g='read'>" + esc(guideText ? E.t("hideText") : E.t("readAlong")) + "</button></div>";
    if (guideText) h += "<p class='wk-cap'>" + esc(txt) + "</p>";
    guideEl.innerHTML = h; guideTime();
  }
  function guideTime() {
    if (!guideEl) return; var t = guideEl.querySelector(".wk-gtime"); if (!t) return;
    var st = E.guide.state(); t.textContent = st.key === guideKeyShown() && st.d ? fmtTime(st.d - st.t) : "";
  }
  function guideClick(e) {
    var b = e.target.closest("[data-g]"); if (!b) return;
    if (b.dataset.g === "read") { guideText = !guideText; renderGuide(); return; }
    var st = E.guide.state();
    if (st.playing) E.guide.pause(); else E.guide.play(GKEY[curRoom]);
  }

  /* ---------- Loop ---------- */
  function resize() {
    if (!renderer || !stage) return;
    var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 72 : 60; camera.updateProjectionMatrix();
    var dpr = Math.min(2, window.devicePixelRatio || 1); mapCanvas.width = mapCanvas.clientWidth * dpr; mapCanvas.height = mapCanvas.clientHeight * dpr;
  }
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (glide) {
      var G = glide, k = Math.min(1, (now - G.t0) / G.dur), e = ease(k), d = e * G.total, i = 0;
      while (i < G.lens.length - 1 && d > G.lens[i]) { d -= G.lens[i]; i++; }
      var a = G.pts[i], b = G.pts[i + 1] || a, f = G.lens[i] ? Math.min(1, d / G.lens[i]) : 1;
      camera.position.lerpVectors(a, b, f);
      if (G.follow && k < 0.85) { var dx = b.x - a.x, dz = b.z - a.z; if (dx * dx + dz * dz > 0.01) yaw += angDiff(yaw, Math.atan2(-dx, -dz)) * Math.min(1, dt * 4); }
      if (G.face != null) { if (!G.follow) yaw = G.yaw0 + angDiff(G.yaw0, G.face) * e; else if (k > 0.7) yaw += angDiff(yaw, G.face) * Math.min(1, dt * 6); pitch += (0 - pitch) * Math.min(1, dt * 4); }
      if (k >= 1) { if (G.face != null) yaw = G.face; glide = null; if (G.then) G.then(); }
    }
    camera.rotation.set(pitch, yaw, 0, "YXZ");
    var rk = roomAt(camera.position);
    if (rk !== curRoom) { curRoom = rk; E.playRoom(ROOMS[rk].music); renderGuide(); }
    var s = now / 1000;
    rings.forEach(function (r) { var p = 1 + 0.08 * Math.sin(s * 2 + r.userData.phase); r.scale.set(p, p, p); });
    if (tapRing.visible) { var tk = (now - tapT) / 650; if (tk >= 1) tapRing.visible = false; else { var sc = 0.6 + tk * 0.8; tapRing.scale.set(sc, sc, sc); tapRing.material.opacity = 0.9 * (1 - tk); } }
    npcs.forEach(function (n) { n.rotation.y = Math.atan2(camera.position.x - n.position.x, camera.position.z - n.position.z); });
    critters.forEach(function (c) { var h0 = hop[c.userData.c.id], hp = h0 ? Math.max(0, 1 - (now - h0) / 700) : 0; c.position.y = c.userData.c.y + Math.sin(hp * Math.PI) * 0.25; });
    if (rope) rope.visible = !hasTicket();
    renderer.render(scene, camera);
    drawMap();
  }

  /* ---------- Public ---------- */
  function init(el) {
    if (inited) { resume(); return; }
    inited = true; stage = el; stage.innerHTML = "";
    renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.outputEncoding = T.sRGBEncoding; renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.domElement.className = "wk-canvas"; renderer.domElement.setAttribute("aria-label", "3D gallery");
    stage.appendChild(renderer.domElement);
    camera = new T.PerspectiveCamera(60, 1, 0.05, 80); camera.position.set(START.x, EYE, START.z);
    if (hasTicket()) { var back = lsGet("efe-walk-pos", null); if (back && typeof back.x === "number") { camera.position.set(back.x, EYE, back.z); yaw = back.yaw || 0; } }

    var ui = document.createElement("div"); ui.className = "wk-ui";
    ui.innerHTML = "<canvas class='wk-map' aria-label='Map'></canvas><div class='wk-quests'><button class='wk-qbtn' type='button' aria-expanded='false'></button><div class='wk-qpanel' hidden></div></div><p class='wk-hint'></p><div class='wk-card' role='dialog' aria-live='polite' hidden></div><div class='wk-guide' hidden></div>";
    stage.appendChild(ui);
    mapCanvas = ui.querySelector(".wk-map"); mapCtx = mapCanvas.getContext("2d");
    qBtn = ui.querySelector(".wk-qbtn"); qPanel = ui.querySelector(".wk-qpanel"); hintEl = ui.querySelector(".wk-hint"); card = ui.querySelector(".wk-card");
    qBtn.onclick = function () { var open = qPanel.hidden; qPanel.hidden = !open; qBtn.setAttribute("aria-expanded", String(open)); };
    mapCanvas.addEventListener("click", mapTap); card.addEventListener("click", cardClick);
    guideEl = ui.querySelector(".wk-guide"); guideEl.addEventListener("click", guideClick);
    if (E.guide) E.guide.on(function (ev) { if (ev && ev.type === "timeupdate") guideTime(); else renderGuide(); });
    if (location.protocol === "file:") { fileEl = document.createElement("p"); fileEl.className = "wk-filenote"; ui.appendChild(fileEl); }

    build();
    if (hasTicket()) openGate();
    curRoom = roomAt(camera.position);
    var cv = renderer.domElement;
    cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointermove", onMove); cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", function () { ptr = null; }); cv.addEventListener("pointerleave", function () { cursorRing.visible = false; });
    window.addEventListener("keydown", onKey); window.addEventListener("resize", resize);
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
    var mq = matchMedia("(prefers-color-scheme: dark)"); if (mq.addEventListener) mq.addEventListener("change", applyTheme);
    new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    E.on(redrawText);
    if (document.fonts && document.fonts.load) Promise.all(["40px Gloock", "500 32px Caveat", "22px 'Instrument Sans'"].map(function (f) { return document.fonts.load(f).catch(function () { }); })).then(redrawText);
    setInterval(function () { if (running && camera) lsSet("efe-walk-pos", { x: +camera.position.x.toFixed(2), z: +camera.position.z.toFixed(2), yaw: +yaw.toFixed(2) }); }, 3000);
    updateQuests(); resume();
  }
  // When she taps "Walk through this room in 3D" on a room page, start in that room (the bear still checks the ticket first).
  var ENTRY = { lobby: [0, 11.0, 0], r1: [0, 3.4, 0], r2: [11.2, 2.4, 0], r3: [21.4, 1.8, 0] };
  function applyGoto() {
    var to = lsGet("efe-walk-goto", null); if (!to || !ENTRY[to]) return;
    try { localStorage.removeItem("efe-walk-goto"); } catch (e) { }
    glide = null; closeCard();
    if (to !== "lobby" && !hasTicket()) {
      camera.position.set(1.1, EYE, 7.5); var g = npcByWho("guard"); yaw = Math.atan2(-(g.position.x - 1.1), -(g.position.z - 7.5)); pitch = 0;
      setTimeout(function () { openCard("guard"); }, 400); return;
    }
    var e = ENTRY[to]; camera.position.set(e[0], EYE, e[1]); yaw = e[2]; pitch = 0.02;
  }
  function resume() { if (!inited || running) return; running = true; applyGoto(); resize(); last = performance.now(); requestAnimationFrame(frame); E.playRoom(ROOMS[curRoom].music); }
  function pause() { running = false; glide = null; ptr = null; }
  function state() { return camera ? { x: +camera.position.x.toFixed(2), z: +camera.position.z.toFixed(2), yaw: +yaw.toFixed(2), room: curRoom, moving: !!glide } : null; }
  function project(x, y, z) { var v = new T.Vector3(x, y, z).project(camera), r = renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, front: v.z < 1 }; }

  window.EFEWalk = { init: init, resume: resume, pause: pause, state: state, project: project, fingerprint: fingerprint };
})();