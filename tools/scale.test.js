// node tools/scale.test.js  -- unit cases + full-data sweep for the <script id="scale"> block of .work/shell.html
const fs = require("fs"), path = require("path"), vm = require("vm");
const W = path.join(__dirname, "..", ".work");
const shell = fs.readFileSync(path.join(W, "shell.html"), "utf8");
const m = /<script id="scale">([\s\S]*?)<\/script>/.exec(shell);
if (!m) { console.error("scale block not found"); process.exit(1); }
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(m[1], ctx);
const { baseOf, scaleAmount } = ctx.window.Scale;

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) pass++; else { fail++; console.log(`FAIL ${name}\n  got  ${a}\n  want ${b}`); }
};
const S = [
  ["300g", 1.5, "450g"], ["½컵 (110g)", 2, "1컵 (220g)"], ["2~3스푼", 2, "4~6스푼"], ["1/2작은술", 3, "1½작은술"],
  ["1 1/2컵", 2, "3컵"], ["3개", 0.5, "1½개"], ["0.5g", 1.5, "0.75g"], ["2 slices(2장)", 1.5, "3 slices(3장)"],
  ["약간", 2, "약간"], ["", 2, ""], ["2개(지름 25cm)", 2, "4개(지름 25cm)"],
  ["9장(개당 사이즈, 38.5 X 30cm)", 2, "18장(개당 사이즈, 38.5 X 30cm)"],
  ["500g(강력분, 단백질 14%)", 2, "1000g(강력분, 단백질 14%)"],
  ["120g (35℃)", 0.5, "60g (35℃)"],
  ["1컵 (약 100°F(38°C)/240ml)", 2, "2컵 (약 100°F(38°C)/480ml)"],
  // extras
  ["300g", 1, "300g"], ["2~3cm", 2, "2~3cm"], ["1 1/2 cups(1과 1/2컵)", 2, "3 cups(3컵)"], ["1,800mL", 2, "3,600mL"],
  ["9컵 (1,080g)", 0.5, "4½컵 (540g)"], ["2-3개", 2, "4-6개"], ["180도", 2, "180도"], ["15분", 2, "15분"],
  ["1⅓컵 (180g)", 1.5, "2컵 (270g)"],
];
for (const [a, f, w] of S) eq(`scale ${JSON.stringify(a)} x${f}`, scaleAmount(a, f).text, w);
eq("changed true", scaleAmount("300g", 2).changed, true);
eq("changed false (no digits)", scaleAmount("약간", 2).changed, false);
eq("changed false (cm)", scaleAmount("3cm", 2).changed, false);

const B = (note, want) => eq(`baseOf ${JSON.stringify(note)}`, (() => { const b = baseOf({ note, dish: "", video_title: "" }); return b && { n: b.n, hi: b.hi, unit: b.unit, label: b.label }; })(), want);
B("12인분", { n: 12, unit: "인분" });
B("8~10인분", { n: 8, hi: 10, unit: "인분" });
B("쿠키 24개 분량", { n: 24, unit: "개", label: "쿠키" });
B("15cm 틀 1개 분량", { n: 1, unit: "개", label: "틀" });
B("틀 사이즈 15cm", null);
B("약 6개 분량", { n: 6, unit: "개" });
B("지름 3.5cm 꼬끄 40개~48개 분량(1배합)", { n: 40, hi: 48, unit: "개", label: "꼬끄" });
B("성인 4인분(설명란 기준, 제작자 기준 6인분)", { n: 4, unit: "인분", label: "성인" });
eq("baseOf title", (b => b && [b.n, b.from])(baseOf({ note: "", dish: "닭볶음탕 4인분", video_title: "" })), [4, "title"]);
eq("baseOf none", baseOf({ dish: "x", video_title: "y" }), null);

// full-data sweep
const D = JSON.parse(fs.readFileSync(path.join(W, "data.json"), "utf8"));
let amounts = 0, bad = 0;
for (const r of D.recipes) for (const i of r.ingredients) {
  for (const f of [0.5, 1.5, 2]) {
    amounts++;
    try {
      const o = scaleAmount(i.amount, f);
      if (typeof o.text !== "string" || /NaN|Infinity|undefined/.test(o.text) || (i.amount && !o.text)) { bad++; if (bad < 10) console.log("BAD", JSON.stringify(i.amount), f, JSON.stringify(o)); }
    } catch (e) { bad++; if (bad < 10) console.log("THROW", JSON.stringify(i.amount), f, e.message); }
  }
}
const tabs = {};
for (const r of D.recipes) {
  const t = (tabs[r.tab || "cooking"] ||= { count: 0, mult: 0 });
  try { baseOf(r) ? t.count++ : t.mult++; } catch (e) { bad++; console.log("baseOf THROW", r.id, e.message); }
}
console.log(`sweep: ${amounts} scalings, ${bad} bad`);
for (const [t, c] of Object.entries(tabs)) console.log(`  ${t}: 개수/인분 모드 ${c.count} / 배수 모드 ${c.mult}`);
if (bad) fail += bad;

// sample file
let seed = 12345;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pool = [];
for (const r of D.recipes) for (const i of r.ingredients) if (/\d/.test(i.amount || "")) pool.push(i.amount);
const uniq = [...new Set(pool)];
const lines = [];
for (let k = 0; k < 300; k++) {
  const a = uniq[Math.floor(rnd() * uniq.length)], f = [0.5, 1.5, 2, 3][k % 4];
  lines.push(`x${f}\t${a}\t->\t${scaleAmount(a, f).text}`);
}
fs.writeFileSync(path.join(W, "scale_sample.txt"), lines.join("\n") + "\n");
console.log(`unit cases: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
