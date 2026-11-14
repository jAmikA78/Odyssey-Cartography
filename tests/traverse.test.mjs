import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

// Use the project's existing TypeScript compiler; no test dependency is needed.
const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), "odyssey-regression-"));
after(async () => {
  if (path.dirname(temporary) === path.resolve(tmpdir()) && path.basename(temporary).startsWith("odyssey-regression-")) {
    await rm(temporary, { recursive: true, force: true });
  }
});
for (const name of ["assets", "gale", "geo", "route", "safety", "traverse", "walkback"]) {
  const source = (await readFile(path.join(root, "src/lib", `${name}.ts`), "utf8"))
    .replaceAll("import.meta.env.BASE_URL", '"./"');
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
    .replace(/from "\.\/([^".]+)"/g, 'from "./$1.mjs"');
  await writeFile(path.join(temporary, `${name}.mjs`), output);
}
const moduleAt = name => import(pathToFileURL(path.join(temporary, `${name}.mjs`)).href);
const { planRoute } = await moduleAt("route");
const { sampleTraverse } = await moduleAt("traverse");
const { computeWalkBackEnvelope } = await moduleAt("walkback");
const { evaluateSafety } = await moduleAt("safety");
const { buildNoGo } = await moduleAt("gale");
const patch = JSON.parse(await readFile(path.join(root, "public/data/gale/data/metadata.json"), "utf8"));
const config = JSON.parse(await readFile(path.join(root, "public/data/safety.json"), "utf8"));
async function raster(name) {
  const bytes = await readFile(path.join(root, "public/data/gale/data", name));
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
const elevation = await raster("elevation.f32");
const slope = await raster("slope.f32");
const terrain = { patch, meta: { width: patch.width, height: patch.height, metersPerCell: patch.cell_size_m[0] }, elevation, slope,
  noGo: buildNoGo(slope, 20), minElevation: Math.min(...elevation), maxElevation: Math.max(...elevation) };
const start = { row: 90, col: 90 }, goal = { row: 170, col: 170 };
const route = planRoute(terrain, start, goal, { safetyConfig: config });

test("all route modes stay in the traversable cell corridor, without diagonal corner cuts", () => {
  for (const mode of ["balanced", "shortest", "safest"]) {
    const result = planRoute(terrain, start, goal, { mode, safetyConfig: config });
    assert.equal(result.ok, true);
    for (let i = 0; i < result.path.length; i++) {
      const p = result.path[i];
      assert.ok(slope[p.y * patch.width + p.x] <= 20);
      if (!i) continue;
      const prev = result.path[i - 1];
      assert.ok(Math.abs(p.x - prev.x) <= 1 && Math.abs(p.y - prev.y) <= 1);
      if (p.x !== prev.x && p.y !== prev.y) {
        assert.ok(slope[p.y * patch.width + prev.x] <= 20);
        assert.ok(slope[prev.y * patch.width + p.x] <= 20);
      }
    }
  }
});
test("profile distance matches the computed route and samples actual DEM cells", () => {
  const samples = sampleTraverse(terrain, route);
  assert.equal(samples.length, route.path.length);
  assert.equal(samples[0].distanceM, 0);
  assert.ok(Math.abs(samples.at(-1).distanceM - route.distanceKm * 1000) < 1e-6);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    assert.equal(s.elevation, elevation[s.y * patch.width + s.x]);
    if (i) assert.ok(s.distanceM > samples[i - 1].distanceM);
  }
  assert.ok(route.distanceKm > 3.30 && route.distanceKm < 3.32);
});
test("blocked and cleared routes cannot produce a playable profile", () => {
  const blocked = planRoute(terrain, { row: 65, col: 65 }, goal);
  assert.equal(blocked.ok, false);
  assert.deepEqual(sampleTraverse(terrain, blocked), []);
  assert.deepEqual(sampleTraverse(terrain, null), []);
  assert.equal(evaluateSafety(blocked, config).status, "blocked");
});
test("same-cell and out-of-bounds routes are handled without invalid distances", () => {
  const same = planRoute(terrain, start, start);
  assert.equal(same.distanceKm, 0);
  assert.equal(sampleTraverse(terrain, same).length, 1);
  assert.equal(planRoute(terrain, { row: -1, col: 0 }, goal).ok, false);
});
test("walk-back envelope honors the configured suit reserve", () => {
  const standard = computeWalkBackEnvelope(terrain, route, config);
  const reserved = computeWalkBackEnvelope(terrain, route, { ...config, suitReserve: 0.4 });
  assert.equal(standard.usableHours, config.maxEvaHours * (1 - config.suitReserve));
  assert.equal(reserved.usableHours, config.maxEvaHours * 0.6);
  assert.ok(reserved.goalMarginHours < standard.goalMarginHours);
  assert.equal(reserved.overallStatus, "beyond-ponr");
  assert.ok(Math.abs(standard.steps.at(-1).outboundKm - route.distanceKm) < 1e-6);
});
test("default safety calculation retains documented demo assumptions", () => {
  const safety = evaluateSafety(route, config);
  assert.equal(safety.status, "normal");
  assert.equal(safety.requiredSuitHours, route.durationH * (1 + config.suitReserve));
  assert.ok(Math.abs(safety.doseMsV - 0.074) < 0.001);
});
