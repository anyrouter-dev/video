// The figure gate: every machine's geometry audit in the poses the film moves it through, both
// camera builds, then the line-end check on each check page. Exits non-zero on any fault.
//
//   node tools/figures/check.mjs
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const LINES = path.join(os.homedir(), ".claude/skills/anatomy/scripts/lines.mjs");
const POSES = {
  traverser: ["", "--pose=yc=-45,carX=-54", "--pose=yc=15,carX=100", "--pose=yc=45,carX=-6", "--pose=yc=-45,carX=168.8", "--pose=yc=0,carX=-105"],
  carousel: ["", "--angle=13 --dip=1", "--angle=-75 --dip=0.5", "--angle=37"],
  turret: ["", "--rot=20", "--rot=-150", "--rot=47"],
};

let failed = 0;
const run = (args) => {
  try { return { ok: true, out: execFileSync(process.execPath, args, { cwd: HERE, encoding: "utf8" }) }; }
  catch (e) { return { ok: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}` }; }
};
for (const [fig, poses] of Object.entries(POSES)) {
  for (const view of ["", "--portrait"]) {
    for (const pose of poses) {
      const { ok, out } = run([`${fig}.mjs`, "--audit", ...[view, ...pose.split(" ")].filter(Boolean)]);
      const last = out.trim().split("\n").at(-1);
      console.log(`${ok ? "ok  " : "FAIL"} audit ${fig} ${view || "--landscape"} ${pose || "rest"}: ${last}`);
      if (!ok) failed++;
    }
    const page = run([`${fig}.mjs`, "--page", ...(view ? [view] : [])]);
    const file = /wrote (\S+\.html)/.exec(page.out)?.[1];
    const lines = run([LINES, file]);
    const verdict = /line ends: .*/.exec(lines.out)?.[0] ?? lines.out.trim().split("\n").at(-1);
    const clean = lines.ok && /line ends: 0 of/.test(verdict);
    console.log(`${clean ? "ok  " : "FAIL"} lines ${fig} ${view || "--landscape"}: ${verdict}`);
    if (!clean) failed++;
  }
}
console.log(failed ? `figure check failed: ${failed}` : "figure check passed");
process.exitCode = failed ? 1 : 0;
