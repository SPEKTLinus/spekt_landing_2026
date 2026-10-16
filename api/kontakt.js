// Kontaktformuläret på /agents. Skickar förfrågan som ett textmejl via Resend.
//
// Miljövariabler i Vercel:
//   RESEND_API_KEY  – nyckel till Resend (helst en egen, bara sändningsrätt)
//   KONTAKT_FRAN    – verifierad avsändare, t.ex. "SPEKT <formular@spekt.se>"
//   KONTAKT_TILL    – mottagare (valfri, standard linus@spekt.se)
//
// Saknas konfigurationen svarar vi 503 och sidan öppnar ett ifyllt mejl i stället.
// Inget sparas: förfrågan finns bara i mejlet som skickas.

const MAX = { namn: 120, foretag: 160, epost: 200, meddelande: 4000 };
const EPOST = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
const URSPRUNG = /^https:\/\/(www\.)?spekt\.se$/;

function enRad(t) {
  return t.replace(/[\r\n]+/g, " ");
}

function esc(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function sida(titel, innehall) {
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${titel} – SPEKT</title>
<meta name="robots" content="noindex"><link rel="stylesheet" href="/stil.css"></head><body>
<main class="yta hero"><h1 class="lang">${titel}</h1>${innehall}</main></body></html>`;
}

// Utan JavaScript får besökaren formuläret tillbaka ifyllt, så att inget skrivet går förlorat.
function felsida(f, text) {
  const v = (k) => esc(f[k] || "");
  return sida("Det gick inte att skicka", `<p class="ingress">${text}</p>
<form class="formular" action="/api/kontakt" method="post">
<div class="falt"><label for="f-namn">Namn</label><input id="f-namn" name="namn" required maxlength="120" value="${v("namn")}"></div>
<div class="falt"><label for="f-foretag">Företag</label><input id="f-foretag" name="foretag" required maxlength="160" value="${v("foretag")}"></div>
<div class="falt hel"><label for="f-epost">E-post</label><input id="f-epost" name="epost" type="email" required maxlength="200" value="${v("epost")}"></div>
<div class="falt hel"><label for="f-meddelande">Uppgiften</label><textarea id="f-meddelande" name="meddelande" required maxlength="4000">${v("meddelande")}</textarea></div>
<button class="knapp" type="submit">Skicka igen</button>
<p class="forminfo">Eller mejla direkt: <a href="mailto:linus@spekt.se">linus@spekt.se</a></p>
</form>`);
}

const FELTEXT = {
  saknas: "Fyll i namn, företag, uppgiften och en hel e-postadress (t.ex. namn@foretag.se).",
  for_langt: "Något fält är för långt – meddelandet får vara högst 4 000 tecken.",
  ursprung: "Formuläret kan bara skickas från spekt.se.",
  ej_konfigurerat: "Formuläret är inte i gång just nu. Mejla oss gärna direkt i stället.",
  utskick: "Något gick fel när meddelandet skulle skickas. Försök igen, eller mejla oss direkt.",
};

module.exports = async function handler(req, res) {
  // utan JavaScript postas formuläret vanligt – då svarar vi med en enkel sida
  const formular = !String(req.headers["content-type"] || "").includes("application/json");
  const kropp = req.body && typeof req.body === "object" ? req.body : {};
  const f = {};
  for (const falt of Object.keys(MAX)) f[falt] = String(kropp[falt] ?? "").trim();

  function svara(status, fel) {
    if (!formular) return res.status(status).json(fel ? { ok: false, fel } : { ok: true });
    res.status(status).setHeader("Content-Type", "text/html; charset=utf-8");
    if (!fel) {
      return res.send(sida("Tack!", `<p class="ingress">Vi hör av oss inom en arbetsdag.</p>
<a class="knapp" href="/agents">Tillbaka till Spekt Agents</a>`));
    }
    return res.send(felsida(f, FELTEXT[fel]));
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  // webbläsare skickar alltid Origin på POST; andra sajter ska inte kunna använda formuläret
  const ursprung = req.headers.origin;
  if (ursprung && !URSPRUNG.test(ursprung)) return svara(403, "ursprung");

  // längden först, så att e-postregeln aldrig får jobba på godtyckligt långa strängar
  if (Object.keys(MAX).some((falt) => f[falt].length > MAX[falt])) return svara(400, "for_langt");

  const giltig = Boolean(f.namn && f.foretag && f.meddelande && EPOST.test(f.epost));

  // honungsfällan: robotar fyller i fältet, människor ser det aldrig. Vi låtsas att det
  // gick bra men loggar (utan personuppgifter) så att falska träffar går att upptäcka.
  if (kropp.kontrollfalt) {
    console.warn("honungsfälla", { langd: String(kropp.kontrollfalt).length, giltig });
    return svara(200);
  }

  if (!giltig) return svara(400, "saknas");

  const nyckel = process.env.RESEND_API_KEY;
  const fran = process.env.KONTAKT_FRAN;
  const till = process.env.KONTAKT_TILL || "linus@spekt.se";
  if (!nyckel || !fran) return svara(503, "ej_konfigurerat");

  try {
    const svar = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${nyckel}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fran,
        to: [till],
        reply_to: f.epost,
        subject: enRad(`Spekt Agents – ${f.foretag} (${f.namn})`),
        text: `${f.meddelande}\n\n—\nNamn: ${f.namn}\nFöretag: ${f.foretag}\nE-post: ${f.epost}\n\nSkickat från spekt.se/agents`,
      }),
    });
    if (!svar.ok) {
      console.error("Resend svarade", svar.status);
      return svara(502, "utskick");
    }
    return svara(200);
  } catch (e) {
    console.error("Resend gick inte att nå", e.message);
    return svara(502, "utskick");
  }
};
