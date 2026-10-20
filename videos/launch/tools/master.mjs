// Levels a rendered film's sound to -14 LUFS integrated with a true peak at or under -1 dBTP
// (two-pass loudnorm, linear when it can be), copying the picture untouched, then measures it.
//
//   node tools/master.mjs <in.mp4> <out.mp4>
import { execFileSync, spawnSync } from "node:child_process";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("usage: master.mjs <in.mp4> <out.mp4>");
const TARGET = "I=-14:TP=-1.5:LRA=11";

const first = spawnSync("ffmpeg", ["-hide_banner", "-i", input, "-af", `loudnorm=${TARGET}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" }).stderr;
const m = JSON.parse(first.slice(first.lastIndexOf("{"), first.lastIndexOf("}") + 1));
const second = `loudnorm=${TARGET}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", input, "-c:v", "copy", "-af", `${second},aresample=48000`, "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", output]);

export function measure(file) {
  const err = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const summary = err.slice(err.lastIndexOf("Summary:"));
  return { lufs: Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1]), truePeak: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1]), lra: Number(/LRA:\s+(-?[\d.]+) LU/.exec(summary)?.[1]) };
}
const before = measure(input), after = measure(output);
console.log(`${input}: ${before.lufs} LUFS, true peak ${before.truePeak} dBTP`);
console.log(`${output}: ${after.lufs} LUFS, true peak ${after.truePeak} dBTP, LRA ${after.lra} LU`);
if (Math.abs(after.lufs + 14) > 0.5 || after.truePeak > -1) { console.error("master is off target"); process.exitCode = 1; }
