// Collects the numbers and ids the film shows from the live API into facts.json, and fails if
// a model id the film shows would need the viewer's own provider key.
//
//   node tools/facts.mjs [--from=truth]     (--from reads the saved responses instead)
import fs from "node:fs";
import path from "node:path";

const FILM = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const from = process.argv.find((a) => a.startsWith("--from="))?.slice(7);
const get = async (url, file) => (from ? JSON.parse(fs.readFileSync(path.join(FILM, from, file), "utf8")) : (await fetch(url)).json());

// the ids the film names; every one must run on AnyRouter credits
export const ROUTE_MODELS = ["deepseek/deepseek-v4-flash", "minimax/minimax-m3.1-flash"];

const stats = await get("https://anyrouter.dev/api/v1/stats", "stats.json");
const models = await get("https://anyrouter.dev/api/v1/models?all=1", "models-all.json");
for (const id of ROUTE_MODELS) {
  const m = models.data.find((x) => x.id === id);
  if (!m) throw new Error(`${id} is not in /api/v1/models?all=1`);
  if (m.pricing?.billing === "byok") throw new Error(`${id} needs the viewer's own key (billing byok)`);
}
const facts = { fetchedAt: new Date().toISOString().slice(0, 10), models: stats.models, providers: stats.providers, routeModels: ROUTE_MODELS };
fs.writeFileSync(path.join(FILM, "facts.json"), JSON.stringify(facts, null, 2) + "\n");
console.log(facts);
