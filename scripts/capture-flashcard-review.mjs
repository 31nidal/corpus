// Recreate review screenshots against an isolated local preview and account DB.
// Output is ignored by git; no production endpoint or existing account is used.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";

const port = Number(process.env.REVIEW_CAPTURE_PORT || 5174);
const base = `http://127.0.0.1:${port}`;
const output = process.env.REVIEW_CAPTURE_OUTPUT || "tests/artifacts/design/flashcard-review";
mkdirSync(output, { recursive: true });
const directory = mkdtempSync(path.join(tmpdir(), "corpus-review-captures-"));
const server = spawn(
  "npm",
  ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  {
    env: { ...process.env, ACCOUNT_DATA_DIR: directory, APP_ORIGIN: base },
    stdio: "ignore",
    detached: true,
  },
);
let browser;
const headers = { "x-mycorpus-request": "1" };
function sourcePdf() {
  const pages = [
    [
      "Chapitre 1 : Bases anatomiques.",
      "Le rein filtre le plasma sanguin.",
      "Le diaphragme permet la respiration.",
    ],
    [
      "II. Systeme cardiovasculaire",
      "Le nerf median innerve le muscle pronateur rond.",
      "La pression systolique de reference est de 120 mmHg.",
      "Le coeur est situe dans le mediastin thoracique.",
      "Ce document est un exemple local pour relire les notions avant leur validation.",
    ],
  ];
  const objects = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>";
  objects[7] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  for (let i = 0; i < 2; i++) {
    const pageId = 3 + i * 2,
      contentId = pageId + 1;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents ${contentId} 0 R >>`;
    const stream = deflateSync(
      Buffer.from(
        "BT /F1 13 Tf 24 TL 60 712 Td " +
          pages[i].map((line) => `(${line}) Tj T*`).join(" ") +
          " ET",
      ),
    );
    objects[contentId] = Buffer.concat([
      Buffer.from(`<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n`),
      stream,
      Buffer.from("\nendstream"),
    ]);
  }
  const parts = [Buffer.from("%PDF-1.4\n")],
    offsets = [0];
  let length = parts[0].length;
  for (let id = 1; id <= 7; id++) {
    offsets[id] = length;
    const body = Buffer.isBuffer(objects[id]) ? objects[id] : Buffer.from(objects[id]);
    const part = Buffer.concat([Buffer.from(`${id} 0 obj\n`), body, Buffer.from("\nendobj\n")]);
    parts.push(part);
    length += part.length;
  }
  parts.push(
    Buffer.from(
      `xref\n0 8\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
        .join("")}trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${length}\n%%EOF`,
    ),
  );
  return Buffer.concat(parts);
}
try {
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    if (i === 149) throw new Error("Le serveur de capture ne démarre pas.");
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  });
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 } });
    const api = async (route, method = "GET", data) => {
      const response = await page.request.fetch(base + route, { method, headers, data });
      if (!response.ok())
        throw new Error(`${route}: ${response.status()} ${await response.text()}`);
      return response.json();
    };
    await api("/api/account/register", "POST", {
      name: "Camille",
      email: `captures-${crypto.randomUUID()}@example.test`,
      password: "Captures-locales-solides-2026",
    });
    await api("/api/flashcards/decks", "POST", { name: "Anatomie — révision" });
    const imported = await page.request.post(base + "/api/study/documents/upload", {
      headers: {
        ...headers,
        "content-type": "application/pdf",
        "x-document-filename": "anatomie.pdf",
        "x-document-title": "Anatomie et physiologie",
      },
      data: sourcePdf(),
    });
    if (!imported.ok()) throw new Error(await imported.text());
    const document = (await imported.json()).document;
    const route = `/api/flashcards/documents/${document.id}/drafts`;
    await api(route + "/generate", "POST", { count: 60, level: "complete" });
    const drafts = (await api(route + "?limit=500")).drafts;
    const cloze = drafts.find((d) => d.sourceExcerpt.includes("pronateur"));
    const typed = drafts.find((d) => d.sourceExcerpt.includes("120"));
    if (!cloze || !typed || cloze.page !== 2)
      throw new Error(
        "Les preuves de la page 2 sont absentes : " +
          JSON.stringify({
            sections: document.sections,
            drafts: drafts.map((d) => ({ page: d.page, excerpt: d.sourceExcerpt })),
          }),
      );
    await api(`/api/flashcards/drafts/${cloze.id}`, "PATCH", {
      noteType: "cloze",
      fields: {
        text: cloze.sourceExcerpt.replace(
          "le muscle pronateur rond",
          "{{c1::le muscle pronateur rond}}",
        ),
        extra: "",
      },
    });
    await api(`/api/flashcards/drafts/${typed.id}`, "PATCH", {
      noteType: "typed",
      fields: {
        front: "Quelle est la pression systolique de référence ?",
        answer: "120 mmHg",
        acceptedAnswers: [],
        extra: "",
      },
    });
    await page.goto(base + "/#tab=mes-cours");
    await page.getByRole("heading", { name: "Anatomie et physiologie", exact: true }).waitFor();
    // The library initially shows the document tile. Open the existing document.
    const open = page.getByRole("button", { name: /Ouvrir ce cours/ });
    if (await open.count()) await open.first().click();
    const reviewButton = page.getByRole("button", { name: "Réviser les brouillons", exact: true });
    if (!(await reviewButton.count()))
      await page.getByRole("heading", { name: "Anatomie et physiologie", exact: true }).click();
    await reviewButton.click();
    const review = page.getByRole("region", { name: "Révision des brouillons", exact: true });
    await review.locator(".draft-review-card").first().waitFor();
    await review.getByLabel("Filtrer les brouillons").selectOption("");
    await review.locator(`[data-draft-id="${cloze.id}"]`).waitFor({ state: "attached" });
    const shot = async (name, locator = review) => {
      // Expand only scroll clipping while capturing a whole component; restore
      // every inline style afterward. The review's responsive width is kept.
      const previous = await locator.evaluate((node) => {
        const elements = [];
        for (let parent = node.parentElement; parent; parent = parent.parentElement)
          elements.push(parent);
        for (const header of document.querySelectorAll("header, nav, footer"))
          if (!node.contains(header)) elements.push(header);
        const saved = elements.map((element) => ({
          element,
          style: element.getAttribute("style"),
        }));
        for (const { element } of saved) {
          if (["HEADER", "NAV", "FOOTER"].includes(element.tagName)) element.style.visibility = "hidden";
          else {
            element.style.overflow = "visible";
            element.style.height = "auto";
            element.style.maxHeight = "none";
          }
        }
        globalThis.__reviewCaptureStyles = saved;
        return true;
      });
      try {
        await locator.screenshot({
          path: path.join(output, `${name}-${width}.png`),
          animations: "disabled",
        });
      } finally {
        if (previous)
          await page.evaluate(() => {
            for (const { element, style } of globalThis.__reviewCaptureStyles) {
              if (style === null) element.removeAttribute("style");
              else element.setAttribute("style", style);
            }
            delete globalThis.__reviewCaptureStyles;
          });
      }
    };
    await shot("liste");
    const clozeCard = review.locator(`[data-draft-id="${cloze.id}"]`);
    await clozeCard.getByRole("button", { name: "Modifier", exact: true }).click();
    await clozeCard.getByLabel("Texte à trous", { exact: true }).waitFor();
    await shot("edition-cloze", clozeCard);
    await clozeCard.getByRole("button", { name: "Annuler la modification" }).click();
    await clozeCard.getByRole("button", { name: /Voir dans le cours/ }).click();
    const viewer = page.getByRole("dialog", { name: "Consultation du cours" });
    await viewer.locator("canvas").waitFor();
    await viewer.getByText("Page 2 / 2", { exact: true }).waitFor();
    await page.waitForFunction(() => {
      const canvas = document.querySelector("[role=dialog] canvas");
      if (!canvas || !canvas.width) return false;
      const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i + 3] > 0 && pixels[i] < 180) return true;
      return false;
    });
    await page.screenshot({
      path: path.join(output, `preuve-pdf-${width}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await review.getByLabel("Filtrer les brouillons").selectOption("pending");
    await review
      .locator(".draft-review-card")
      .first()
      .getByRole("button", { name: "Rejeter", exact: true })
      .click();
    await review.locator(".draft-review-undo").waitFor();
    await shot("annulation");
    await review.getByRole("button", { name: "Fermer la révision" }).click();
    await reviewButton.click();
    await review.locator(".draft-review-card").first().waitFor();
    await review.getByLabel("Filtrer les brouillons").selectOption("accepted");
    await review.getByText("Aucun brouillon dans ce filtre.", { exact: true }).waitFor();
    await shot("etat-vide");
    await page.close();
  }
  writeFileSync(
    path.join(output, "README.md"),
    "# Captures de révision\n\n10 PNG : liste basic/cloze/typed, édition cloze, PDF page 2, annulation, état vide ; largeurs 1440 et 390 px.\n\nDonnées de démonstration locales, vrai backend, PDF de deux pages.\n",
  );
  const labels = {
    liste: "Liste basic / cloze / typed",
    "edition-cloze": "Édition d’un cloze",
    "preuve-pdf": "PDF — page de preuve 2",
    annulation: "Rejeté — Annuler",
    "etat-vide": "État vide",
  };
  const gallery = Object.entries(labels)
    .map(
      ([name, label]) =>
        `<section><h2>${label}</h2><div class="pair">${[1440, 390].map((width) => `<figure><figcaption>${width === 390 ? "Mobile — 390 px" : "Desktop — 1440 px"}</figcaption><a href="${name}-${width}.png"><img loading="lazy" src="${name}-${width}.png" alt="${label}, largeur ${width} px"></a></figure>`).join("")}</div></section>`,
    )
    .join("");
  writeFileSync(
    path.join(output, "index.html"),
    `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MyCorpus — Captures de révision</title><style>body{font:16px system-ui;max-width:1300px;margin:40px auto;padding:20px;background:#f4f7f8;color:#19323c}.pair{display:grid;grid-template-columns:2fr 1fr;gap:24px}figure{margin:0}img{width:100%;max-height:650px;object-fit:contain;object-position:top;background:white;border:1px solid #cadbe0}figcaption{margin:12px 0}section{margin-bottom:40px}@media(max-width:700px){.pair{grid-template-columns:1fr}}</style><h1>Révision des flashcards</h1><p>Données locales de démonstration, vrai backend et PDF de deux pages. Cliquez une image pour sa taille complète.</p>${gallery}</html>`,
  );
  console.log(`10 captures : ${path.resolve(output)}`);
} finally {
  await browser?.close();
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {}
  rmSync(directory, { recursive: true, force: true });
}
