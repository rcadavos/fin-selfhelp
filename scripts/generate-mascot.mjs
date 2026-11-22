#!/usr/bin/env node
/**
 * Draws Otto, OmniTrak's owl, into public/mascot/ as plain SVGs (shapes and gradients only, no text or pictures).
 * Body poses use a 340-unit square (viewBox -20 -20 340 340) so open wings have room; the face is cut to the head.
 * Some poses also come as "rigs" (eyes left white) for the animated eyes laid over them in
 * src/components/mascot/otto.module.css, and as frame strips: the one-owl landings (12 frames, 400-unit cells),
 * the head turn (13 frames, 0° to 180°) and the curious head tilt (5 frames).
 *
 * Usage: npm run mascot:draw   (re-run after changing a drawing here, then raise OTTO_VERSION in
 * src/lib/constants/mascot.ts so browsers fetch the new files). Never edit the files in public/mascot by hand.
 */
import { mkdirSync, writeFileSync as fsWrite } from 'fs'
import { basename, resolve } from 'path'

const OUT = resolve(import.meta.dirname, '..', 'public', 'mascot')
mkdirSync(OUT, { recursive: true })

/** The drawings the app uses; the script draws more while it works, and keeps only these. */
const KEEP = new Set([
  'otto-face.svg',
  'otto-idle.svg',
  'otto-idle-rig.svg',
  'otto-check-rig.svg',
  'otto-search-rig.svg',
  'otto-empty-rig.svg',
  'otto-empty-wing.svg',
  'otto-remind-rig.svg',
  'otto-land-idle.svg',
  'otto-land-idle-turn.svg',
  'otto-land-remind.svg',
  'otto-land-check.svg',
  'otto-land-search.svg',
  'otto-turn-strip.svg',
  'otto-tilt-strip.svg',
  'otto-qmark.svg',
])
const writeFileSync = (path, data) => {
  if (KEEP.has(basename(path))) fsWrite(path, data)
}

const LINE = '#3d2614'
const C = {
  featherLight: '#e4b07a',
  feather: '#c4854a',
  featherShade: '#93582b',
  tuftBack: '#a5662f',
  coverts: '#d39b62',
  wing: '#b0723f',
  wingShade: '#7f4a22',
  bar: '#f0cf9f',
  cream: '#fff6e6',
  creamShade: '#efdcbc',
  discLine: '#e3c8a0',
  chevron: '#cf9f6c',
  beak: '#f6bd45',
  beakShade: '#d38912',
  claw: '#3a2a20',
  irisLight: '#86e3b8',
  iris: '#2fb37e',
  irisDark: '#0b6e4f',
  pupil: '#132019',
  blush: '#ff9b8a',
  green: '#0b6e4f',
  greenLight: '#57c79a',
  greenDark: '#06402e',
  gold: '#f6c445',
  goldDeep: '#d99a12',
  red: '#d6403d',
  redDark: '#9c1f24',
}

const ol = (w = 3.5) => `stroke="${LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`
const MIRROR = 'translate(300 0) scale(-1 1)'
const BODY_BOX = [-20, -20, 340]
const FACE_BOX = [43, 0, 214]

const BODY = 'M150 50 C 206 50 238 90 238 146 C 238 212 204 262 150 262 C 96 262 62 212 62 146 C 62 90 94 50 150 50 Z'
const HEAD = 'M150 50 C 206 50 238 90 238 140 C 238 182 202 204 150 204 C 98 204 62 182 62 140 C 62 90 94 50 150 50 Z'
const DISC =
  'M150 98 C 136 84 110 82 94 92 C 72 105 68 140 82 160 C 96 180 128 180 150 162 C 172 180 204 180 218 160 C 232 140 228 105 206 92 C 190 82 164 84 150 98 Z'

/* ---- the wing, pointing down (+y) from the shoulder, its outer side at -x (the owl's left side as we look at it; the
   right wing is the same, mirrored). The arm is layered coverts, as on a real owl: small light ones at the shoulder,
   a row of median coverts, and the darker greater coverts whose rounded tips overlap the hand. The hand is three long
   primaries — the "fingers" — each with a pale shaft, a darker inner vane and pale bars across it. ---- */
const ARM =
  'M-3 -8 C -20 -6 -29 12 -28 30 C -27.5 40 -25.5 47 -21.5 53 Q -16 62 -8.5 56 Q -1.5 64 5.5 56 Q 12.5 62 17.5 51 C 21 38 22 22 18 8 C 15 -3 6 -9 -3 -8 Z'
const MEDIAN_EDGE = 'Q 21 39 14.5 32 Q 8.5 41 2 33 Q -4.5 41 -11 33 Q -17.5 41 -24 32 Q -28 37 -32 33'
const LESSER_EDGE = 'Q 20 21 13 14 Q 6 22 -1 14 Q -8 22 -15 14 Q -22 22 -29 13 L -32 13'
const COVERTS = `<g clip-path="url(#armClip)">
<path d="M-32 -12 H 26 V 30 ${MEDIAN_EDGE} Z" fill="${C.coverts}"/>
<path d="M26 30 ${MEDIAN_EDGE}" fill="none" stroke="${C.wingShade}" stroke-opacity="0.85" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M-32 -12 H 26 V 13 ${LESSER_EDGE} Z" fill="#dfaa70"/>
<path d="M26 13 ${LESSER_EDGE}" fill="none" stroke="#a8692f" stroke-opacity="0.7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M-21 8 Q -17 -1 -8 -3.5" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2.5" stroke-linecap="round"/>
</g>`
const WRIST_CAP = 'M-13 1 C -13 -9 13 -9 13 1 Q 10 9 4.5 5 Q 0 11 -4.5 5 Q -10 9 -13 1 Z'
const PRIMARIES = [
  { x: -6, len: 56 },
  { x: 0, len: 61 },
  { x: 6, len: 52 },
]

let clipSeq = 0
/**
 * One primary: broad, tapering to a rounded tip set a little off-centre, the outer vane narrower than the inner. Its
 * colour runs from the lighter outer vane to the darker inner one and darkens to the tip; two soft pale bars cross it
 * as shallow chevrons, the way an owl's flight feathers are barred, over a pale shaft.
 */
function feather(x, angle, len) {
  const id = `pf${++clipSeq}`
  const o = 8
  const n = 11
  const L = len
  const f = (v) => v.toFixed(1)
  const d = `M${-o} -2 C ${-o} ${f(L * 0.45)} ${f(-o * 0.92)} ${f(L * 0.78)} ${f(-o * 0.4)} ${f(L * 0.95)} Q 0.4 ${f(L + 2.6)} ${f(n * 0.58)} ${f(L * 0.93)} C ${f(n * 1.02)} ${f(L * 0.76)} ${n} ${f(L * 0.45)} ${n} -2 Z`
  const bars = [0.4, 0.68]
    .map((t) => {
      const y = L * t
      return `M${-o - 2} ${f(y + 1.5)} L0 ${f(y - 1.5)} L${n + 2} ${f(y + 1.5)} L${n + 2} ${f(y + 5)} L0 ${f(y + 2)} L${-o - 2} ${f(y + 5)} Z`
    })
    .join(' ')
  return `<g transform="translate(${x} 0) rotate(${angle})">
<clipPath id="${id}"><path d="${d}"/></clipPath>
<path d="${d}" fill="url(#vane)"/>
<g clip-path="url(#${id})">
  <path d="${bars}" fill="${C.bar}" opacity="0.4"/>
  <rect x="${-o - 2}" y="-4" width="${o + n + 4}" height="${f(L + 8)}" fill="url(#tipShade)"/>
</g>
<path d="M0 0 Q 1.2 ${f(L * 0.5)} 0.3 ${f(L * 0.9)}" fill="none" stroke="#f3d9b0" stroke-opacity="0.55" stroke-width="1.2" stroke-linecap="round"/>
<path d="${d}" fill="none" ${ol(2.6)}/>
</g>`
}

/**
 * A wing. `at` the shoulder, in the left wing's frame (the right wing passes `mirror`); `arm` turns the arm about the
 * shoulder, `hand` the primaries about the wrist (relative to the arm); `spread` fans the three primaries like
 * fingers; `reach` shortens them; `handOnTop` lays the hand over the arm, for a folded elbow.
 */
function wing({ at: [x, y], arm, hand, spread = 5, reach = 1, mirror = false, handOnTop = false }) {
  const fan = [2, 1, 0].map((i) => feather(PRIMARIES[i].x, spread * (1 - i), PRIMARIES[i].len * reach)).join('')
  const handG = `<g transform="translate(0 50) rotate(${hand})">${fan}${
    handOnTop ? `<path d="${WRIST_CAP}" fill="url(#armfill)" ${ol(2.6)}/>` : ''
  }</g>`
  const armG = `<path d="${ARM}" fill="url(#armfill)"/>${COVERTS}<path d="${ARM}" fill="none" ${ol()}/>`
  const g = `<g transform="translate(${x} ${y}) rotate(${arm})">${handOnTop ? armG + handG : handG + armG}</g>`
  return mirror ? `<g transform="${MIRROR}">${g}</g>` : g
}

const DEFS = `<defs>
<radialGradient id="body" cx="0.38" cy="0.28" r="0.85"><stop offset="0" stop-color="${C.featherLight}"/><stop offset="0.55" stop-color="${C.feather}"/><stop offset="1" stop-color="${C.featherShade}"/></radialGradient>
<radialGradient id="cream" cx="0.45" cy="0.3" r="0.9"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="${C.cream}"/><stop offset="1" stop-color="${C.creamShade}"/></radialGradient>
<linearGradient id="wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.wing}"/><stop offset="1" stop-color="${C.wingShade}"/></linearGradient>
<linearGradient id="vane" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c88a4f"/><stop offset="0.42" stop-color="${C.wing}"/><stop offset="1" stop-color="#8a5228"/></linearGradient>
<linearGradient id="tipShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LINE}" stop-opacity="0"/><stop offset="0.55" stop-color="${LINE}" stop-opacity="0"/><stop offset="1" stop-color="${LINE}" stop-opacity="0.28"/></linearGradient>
<linearGradient id="armfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.coverts}"/><stop offset="1" stop-color="${C.wing}"/></linearGradient>
<radialGradient id="iris" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="${C.irisLight}"/><stop offset="0.5" stop-color="${C.iris}"/><stop offset="1" stop-color="${C.irisDark}"/></radialGradient>
<linearGradient id="beak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.beak}"/><stop offset="1" stop-color="${C.beakShade}"/></linearGradient>
<linearGradient id="visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.greenLight}"/><stop offset="1" stop-color="${C.green}"/></linearGradient>
<linearGradient id="band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.green}"/><stop offset="1" stop-color="${C.greenDark}"/></linearGradient>
<radialGradient id="gold" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff3bf"/><stop offset="0.5" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.goldDeep}"/></radialGradient>
<linearGradient id="red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef5a52"/><stop offset="0.5" stop-color="${C.red}"/><stop offset="1" stop-color="${C.redDark}"/></linearGradient>
<radialGradient id="lens" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffffff" stop-opacity="0.7"/><stop offset="1" stop-color="#cdeede" stop-opacity="0.35"/></radialGradient>
<linearGradient id="ink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3b33"/><stop offset="1" stop-color="#141c18"/></linearGradient>
<clipPath id="bodyClip"><path d="${BODY}"/></clipPath>
<clipPath id="armClip"><path d="${ARM}"/></clipPath>
<clipPath id="partyClip"><path d="M114 84 L150 14 L186 84 Z"/></clipPath>
</defs>`

const SHADOW = `<ellipse cx="150" cy="276" rx="78" ry="7" fill="#132019" opacity="0.1"/>`

const TUFT = `
<path d="M98 84 C 88 68 76 54 62 40 C 82 42 102 52 120 64 Z" fill="${C.tuftBack}" ${ol(3)}/>
<path d="M92 88 C 86 68 80 48 76 26 C 92 38 110 48 128 62 Z" fill="url(#body)" ${ol()}/>
<path d="M95 76 C 91 62 87 50 84 40 C 96 48 106 54 116 62 Z" fill="${C.featherLight}" opacity="0.75"/>`
const TUFTS = `${TUFT}<g transform="${MIRROR}">${TUFT}</g>`

const CHEVRONS = [
  [132, 206], [150, 201], [168, 206], [141, 223], [159, 223], [132, 240], [150, 238], [168, 240],
]
  .map(([x, y]) => `<path d="M${x - 6} ${y - 3} Q${x} ${y + 4} ${x + 6} ${y - 3}" fill="none" stroke="${C.chevron}" stroke-width="3" stroke-linecap="round"/>`)
  .join('')
const BELLY = `<g clip-path="url(#bodyClip)"><ellipse cx="150" cy="224" rx="56" ry="46" fill="url(#cream)"/>${CHEVRONS}</g>`

/** The facial disc's feathers, fanning out round each eye. */
function discFeathers() {
  const ray = (cx, cy, deg) => {
    const a = (deg * Math.PI) / 180
    const p = (r) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`
    return `M${p(31)} L${p(39)}`
  }
  const left = [150, 168, 186, 204, 222].map((d) => ray(117, 130, d))
  const right = [30, 12, -6, -24, -42].map((d) => ray(183, 130, d))
  return `<path d="${[...left, ...right].join(' ')}" fill="none" stroke="${C.discLine}" stroke-width="2.2" stroke-linecap="round"/>`
}

/** An eye: the white and its outline, and (unless `rig`) the iris looking `[dx, dy]`. `k` scales it (the lens). */
function eye(cx, cy, [dx, dy], { r = 25, rig = false, id: idOpt } = {}) {
  const k = r / 25
  if (rig) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" ${ol(3)}/>`
  const id = idOpt ?? `e${cx}${cy}`.replace(/\./g, '')
  const ix = cx + dx * k
  const iy = cy + dy * k
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/>
<g clip-path="url(#${id})">
  <circle cx="${ix}" cy="${iy}" r="${16.5 * k}" fill="url(#iris)"/>
  <circle cx="${ix}" cy="${iy}" r="${9 * k}" fill="${C.pupil}"/>
  <circle cx="${ix - 5 * k}" cy="${iy - 6 * k}" r="${5 * k}" fill="#ffffff"/>
  <circle cx="${ix + 5.5 * k}" cy="${iy + 5 * k}" r="${2.2 * k}" fill="#ffffff"/>
  <ellipse cx="${cx}" cy="${cy - 24 * k}" rx="${28 * k}" ry="${10 * k}" fill="#132019" opacity="0.08"/>
</g>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" ${ol(3)}/>`
}

const BEAK = `
<path d="M140 146 Q150 139 160 146 L152.5 166 Q150 171 147.5 166 Z" fill="url(#beak)" ${ol(3)}/>
<path d="M144.5 147.5 Q150 144.5 155.5 147.5" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="2" stroke-linecap="round"/>`
const BLUSH = `<ellipse cx="96" cy="162" rx="10" ry="5.5" fill="${C.blush}" opacity="0.5"/><ellipse cx="204" cy="162" rx="10" ry="5.5" fill="${C.blush}" opacity="0.5"/>`

/** Talons: three yellow toes a foot, each with a dark claw. */
function toe(x, y, a) {
  return `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M-4.6 -2 L-4.6 9 Q0 15.5 4.6 9 L4.6 -2 Z" fill="url(#beak)" ${ol(2.5)}/><path d="M-2.4 12.4 Q-0.5 20 3.2 12.8 Z" fill="${C.claw}" stroke="${LINE}" stroke-width="1.6" stroke-linejoin="round"/></g>`
}
const FEET = [
  [119, 257, 22], [137, 257, -22], [128, 259, 0],
  [163, 257, 22], [181, 257, -22], [172, 259, 0],
]
  .map(([x, y, a]) => toe(x, y, a))
  .join('')

/* ---- hats ---- */
const HATS = {
  visor: `
<path d="M88 78 C 106 62 194 62 212 78 L 210 87 C 192 72 108 72 90 87 Z" fill="url(#band)" ${ol(3)}/>
<path d="M80 84 C 104 70 196 70 220 84 C 214 98 196 104 150 104 C 104 104 86 98 80 84 Z" fill="url(#visor)" fill-opacity="0.93" ${ol(3)}/>
<path d="M100 86 C 124 79 176 79 200 86" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2.5" stroke-linecap="round"/>`,
  santa: `
<g transform="rotate(-8 150 84)">
<path d="M98 84 C 104 46 138 22 178 24 C 206 26 226 40 232 64 C 220 58 206 60 198 66 C 202 72 204 78 204 84 Z" fill="url(#red)" ${ol(3)}/>
<path d="M120 50 C 140 34 168 30 190 36" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="3" stroke-linecap="round"/>
<path d="M84 88 C 84 74 216 74 216 88 C 216 102 84 102 84 88 Z" fill="#ffffff" ${ol(3)}/>
<circle cx="232" cy="68" r="13" fill="#ffffff" ${ol(3)}/>
</g>`,
  party: `
<g transform="rotate(-12 150 84)">
<path d="M114 84 L150 14 L186 84 Z" fill="url(#gold)" ${ol(3)}/>
<g clip-path="url(#partyClip)">
  <path d="M120 70 L170 50 L176 62 L126 82 Z" fill="${C.green}"/>
  <path d="M134 44 L160 34 L164 44 L138 54 Z" fill="${C.green}"/>
</g>
<path d="M114 84 L150 14 L186 84 Z" fill="none" ${ol(3)}/>
<circle cx="150" cy="13" r="8" fill="${C.greenLight}" ${ol(3)}/>
<path d="M108 86 C 130 94 170 94 192 86" fill="none" stroke="${C.greenDark}" stroke-width="5" stroke-linecap="round"/>
</g>`,
  grad: `
<path d="M106 66 L106 86 C 128 96 172 96 194 86 L194 66 Z" fill="url(#ink)" ${ol(3)}/>
<path d="M150 40 L228 60 L150 80 L72 60 Z" fill="url(#ink)" ${ol(3)}/>
<path d="M150 46 L212 60" fill="none" stroke="#ffffff" stroke-opacity="0.2" stroke-width="3" stroke-linecap="round"/>
<path d="M150 60 L214 66 L216 96" fill="none" stroke="${C.goldDeep}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M210 94 L222 94 L224 112 L208 112 Z" fill="url(#gold)" ${ol(2.5)}/>
<circle cx="150" cy="60" r="5" fill="${C.gold}" ${ol(2.5)}/>`,
}

/* ---- props ---- */
const SPARKLE = (x, y, s = 1, fill = C.gold) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10 C 1.2 -2.6 2.6 -1.2 10 0 C 2.6 1.2 1.2 2.6 0 10 C -1.2 2.6 -2.6 1.2 -10 0 C -2.6 -1.2 -1.2 -2.6 0 -10 Z" fill="${fill}" ${ol(2)}/>`

const RECEIPT = `
<g transform="rotate(-6 136 212)">
<path d="M102 172 H168 V250 L159.75 244 L151.5 250 L143.25 244 L135 250 L126.75 244 L118.5 250 L110.25 244 L102 250 Z" fill="#ffffff" ${ol(3)}/>
<path d="M114 188 H158 M114 200 H146 M114 212 H154" fill="none" stroke="#b9c4bd" stroke-width="3.5" stroke-linecap="round"/>
<path d="M132 230 H158" fill="none" stroke="${C.green}" stroke-width="5" stroke-linecap="round"/>
</g>`
const handle = (x1, y1, x2, y2) =>
  `<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${LINE}" stroke-width="13" stroke-linecap="round"/><path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="#6b4a2e" stroke-width="7" stroke-linecap="round"/>`
const rim = (cx, cy, r) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${LINE}" stroke-width="10"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.green}" stroke-width="5"/>`
const MAGNIFIER = `${handle(188, 216, 210, 240)}<circle cx="172" cy="200" r="22" fill="url(#lens)"/>${rim(172, 200, 22)}
<path d="M159 191 Q163 183 171 181" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>`

/** The search lens, held up to his right eye (our left... no: the eye on our right), magnifying it 1.2 times. */
const LENS = { cx: 190, cy: 124, r: 36, eyeR: 30 }

const QUESTION = `
<circle cx="244" cy="96" r="5.5" fill="#ffffff" ${ol(2.5)}/>
<circle cx="236" cy="108" r="3.2" fill="#ffffff" ${ol(2)}/>
<circle cx="266" cy="58" r="27" fill="#ffffff" ${ol(3)}/>
<path d="M256 51 Q256 39 266 39 Q276 39 276 48.5 Q276 55.5 268 59 Q266 60.5 266 66.5" fill="none" stroke="${C.green}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="266" cy="76" r="4" fill="${C.green}"/>`

const QMARK = `<g transform="translate(-24 -26)">
<path d="M256 51 Q256 39 266 39 Q276 39 276 48.5 Q276 55.5 268 59 Q266 60.5 266 66.5" fill="none" stroke="${LINE}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M256 51 Q256 39 266 39 Q276 39 276 48.5 Q276 55.5 268 59 Q266 60.5 266 66.5" fill="none" stroke="${C.green}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="266" cy="78" r="6" fill="${LINE}"/><circle cx="266" cy="78" r="3.8" fill="${C.green}"/>
</g>`

const BELL = `
<path d="M256 4 Q251 16 256 28 M312 4 Q317 16 312 28" fill="none" stroke="${LINE}" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round"/>
<circle cx="284" cy="-3" r="4.5" fill="url(#gold)" ${ol(2.5)}/>
<path d="M284 1 C 274 1 269 9 269 19 L 268 26 Q 266 30 262 32 L 306 32 Q 302 30 300 26 L 299 19 C 299 9 294 1 284 1 Z" fill="url(#gold)" ${ol(3)}/>
<path d="M276 12 Q278 6 284 5" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="284" cy="37" r="4.5" fill="${C.goldDeep}" ${ol(2.5)}/>`

const WAVE_LINES = `<path d="M302 50 Q311 60 309 74 M300 30 Q313 37 317 52" fill="none" stroke="${LINE}" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round"/>`

/* ---- wings per pose ---- */
const REST = { at: [86, 158], arm: 14, hand: -30, spread: 2, reach: 0.88 }
const CURIOUS_TILT = -16
const SHRUG = { at: [84, 162], arm: 72, hand: 62, spread: 8, reach: 0.9 }
const W = {
  restL: wing(REST),
  restR: wing({ ...REST, mirror: true }),
  // Raised high and out, primaries spread like fingers.
  waveR: wing({ at: [72, 156], arm: 140, hand: 12, spread: 8, mirror: true }),
  // Held out to the side, open, "this way".
  presentR: wing({ at: [78, 158], arm: 55, hand: 32, spread: 7, reach: 0.82, mirror: true }),
  // Under the chin, thinking; the other wing rests.
  thinkL: wing({ at: [92, 178], arm: -30, hand: -117, spread: 5, reach: 1 }),
  thinkR: wing({ at: [88, 168], arm: -40, hand: -44, spread: 2, reach: 0.8, mirror: true }),
  // Checking: one wing pinches the receipt's corner, the other grips the magnifier.
  checkL: wing({ at: [86, 156], arm: 12, hand: -40, spread: 4, reach: 0.9 }),
  checkR: wing({ at: [86, 156], arm: 0, hand: -6, spread: 4, reach: 0.9, mirror: true }),
  // Searching: raised beside the head, the primaries curled over the lens's handle.
  searchR: wing({ at: [76, 150], arm: 150, hand: -118, spread: 5, reach: 0.62, mirror: true, handOnTop: true }),
  // The shrug: both wings out to the sides, primaries turned up.
  shrugL: wing(SHRUG),
  shrugR: wing({ ...SHRUG, mirror: true }),
  // Flying in to land: both wings open and up, flapped by the canvas about each shoulder (82, 180).
  flyL: wing({ at: [82, 180], arm: 115, hand: 20, spread: 9 }),
  flyR: wing({ at: [82, 180], arm: 115, hand: 20, spread: 9, mirror: true }),
}

/* ---- poses ---- */
const LOOK = {
  face: [0, 0],
  hello: [0, 1],
  check: [2, 7],
  empty: [5, -6],
  search: [-5, -2],
  present: [6, 0],
  remind: [5, -6],
  fly: [0, 5],
  idle: [0, 1],
  shrug: [3, -6],
  curious: [2, -2],
}

function draw(pose, { hat = 'visor', rig = false, layer = 'all', shadow = true, inner = false } = {}) {
  const face = pose === 'face'
  const look = LOOK[pose]
  const [bx, by, bs] = face ? FACE_BOX : BODY_BOX
  const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bx} ${by} ${bs} ${bs}">${DEFS}${inner}</svg>\n`
  if (layer === 'wing') return svg(pose === 'empty' ? W.thinkL : W.waveR)
  // Curious: wings at his sides, his head tipped like a curious owl's.
  if (pose === 'curious') {
    const c = foldInner(LOOK.curious, W.restL + W.restR, 'cu', CURIOUS_TILT, shadow)
    return inner ? c : svg(c)
  }
  if (layer === 'wingL') return svg(W.flyL)
  if (layer === 'wingR') return svg(W.flyR)

  const parts = []
  if (!face && pose !== 'fly' && shadow) parts.push(SHADOW)
  parts.push(TUFTS, `<path d="${face ? HEAD : BODY}" fill="url(#body)" ${ol()}/>`)
  if (!face) parts.push(BELLY)
  parts.push(`<path d="${DISC}" fill="url(#cream)" ${ol(3)}/>`, discFeathers())
  parts.push(eye(117, 130, look, { rig }))
  if (pose !== 'search') parts.push(eye(183, 130, look, { rig }))
  parts.push(BEAK, BLUSH, HATS[hat])
  if (!face) parts.push(FEET)

  switch (pose) {
    case 'hello':
      parts.push(W.restL)
      if (layer !== 'body') parts.push(W.waveR, WAVE_LINES)
      break
    case 'check':
      parts.push(RECEIPT, W.checkL, MAGNIFIER, W.checkR)
      break
    case 'empty':
      parts.push(W.restR, QUESTION)
      if (layer !== 'body') parts.push(W.thinkL)
      break
    case 'search': {
      const { cx, cy, r, eyeR } = LENS
      parts.push(W.restL, handle(cx + r + 4, cy, cx + r + 40, cy + 2), W.searchR)
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#lens)"/>`, eye(cx, cy, look, { r: eyeR, rig }), rim(cx, cy, r))
      parts.push(`<path d="M${cx - 27} ${cy - 18} A 32 32 0 0 1 ${cx - 12} ${cy - 30}" fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="3" stroke-linecap="round"/>`)
      break
    }
    case 'present':
      parts.push(W.restL, W.presentR, SPARKLE(312, 160, 0.8), SPARKLE(298, 144, 0.55))
      break
    case 'remind':
      parts.push(W.restL, W.waveR, BELL)
      break
    case 'fly':
      if (layer !== 'body') parts.push(W.flyL, W.flyR)
      break
    case 'idle':
      parts.push(W.restL, W.restR)
      break
    case 'shrug':
      parts.push(W.shrugL, W.shrugR, QMARK)
      break
  }
  return inner ? parts.join('') : svg(parts.join(''))
}

const files = []
for (const pose of Object.keys(LOOK).filter((p) => p !== 'fly')) {
  files.push([`otto-${pose}.svg`, draw(pose)])
  const split = pose === 'hello' || pose === 'empty'
  files.push([`otto-${pose}-rig.svg`, draw(pose, { rig: true, layer: split ? 'body' : 'all' })])
  if (split) files.push([`otto-${pose}-wing.svg`, draw(pose, { layer: 'wing' })])
}
// Perched on a card: no ground shadow under his feet.
files.push(['otto-hello-rig-perch.svg', draw('hello', { rig: true, layer: 'body', shadow: false })])
files.push(['otto-search-rig-perch.svg', draw('search', { rig: true, shadow: false })])
for (const pose of ['hello', 'present', 'remind', 'check', 'idle', 'shrug']) files.push([`otto-${pose}-perch.svg`, draw(pose, { shadow: false })])
files.push(['otto-idle-rig-perch.svg', draw('idle', { rig: true, shadow: false })])
files.push(['otto-fly-body.svg', draw('fly', { layer: 'body' })])
files.push(['otto-fly-wing-l.svg', draw('fly', { layer: 'wingL' })])
files.push(['otto-fly-wing-r.svg', draw('fly', { layer: 'wingR' })])
files.push(['otto-fly.svg', draw('fly')])
for (const hat of ['santa', 'party', 'grad']) files.push([`otto-face-${hat}.svg`, draw('face', { hat })])
/** The back of his head, for the owl head-turn: feathers in rows, the visor's strap and its adjuster, no face. */
function drawBack() {
  const [bx, by, bs] = FACE_BOX
  const rows = []
  for (let r = 0; r < 5; r++) {
    const y = 104 + r * 18
    const off = r % 2 ? 8 : 0
    for (let x = 70 + off; x <= 232; x += 16) rows.push(`M${x - 8} ${y} Q${x} ${y + 8} ${x + 8} ${y}`)
  }
  const defs = DEFS.replace('</defs>', `<clipPath id="headClip"><path d="${HEAD}"/></clipPath></defs>`)
  const inner = [
    TUFTS,
    `<path d="${HEAD}" fill="url(#body)" ${ol()}/>`,
    `<g clip-path="url(#headClip)">`,
    `<path d="${rows.join(' ')}" fill="none" stroke="${C.featherShade}" stroke-opacity="0.5" stroke-width="2.2" stroke-linecap="round"/>`,
    `<path d="M70 112 Q 60 146 80 184 M230 112 Q 240 146 220 184" fill="none" stroke="#f3e2c4" stroke-opacity="0.85" stroke-width="5" stroke-linecap="round"/>`,
    `<ellipse cx="128" cy="66" rx="34" ry="12" fill="#ffffff" opacity="0.14"/>`,
    `</g>`,
    `<path d="M74 84 C 104 68 196 68 226 84 L 228 94 C 196 78 104 78 72 94 Z" fill="url(#band)" ${ol(3)}/>`,
    `<rect x="138" y="70" width="24" height="12" rx="3" fill="${C.greenDark}" ${ol(2.5)}/>`,
    `<path d="M144 76 H156" stroke="${C.greenLight}" stroke-width="2.5" stroke-linecap="round"/>`,
  ]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bx} ${by} ${bs} ${bs}">${defs}${inner.join('')}</svg>
`
}
files.push(['otto-back.svg', drawBack()])
for (const [name, svg] of files) writeFileSync(resolve(OUT, name), svg)

// Where the canvas lays its animated eyes over the rig drawings: each eye's inner white (inside the 3-unit outline),
// as percentages of the picture.
const pct = (v) => `${((v * 100) / 1).toFixed(3)}%`
function hole([bx, by, bs], cx, cy, r) {
  const ri = r - 1.5
  return { left: pct((cx - ri - bx) / bs), top: pct((cy - ri - by) / bs), size: pct((2 * ri) / bs) }
}
void (
  JSON.stringify(
    {
      body: { l: hole(BODY_BOX, 117, 130, 25), r: hole(BODY_BOX, 183, 130, 25) },
      face: { l: hole(FACE_BOX, 117, 130, 25), r: hole(FACE_BOX, 183, 130, 25) },
      lens: hole(BODY_BOX, LENS.cx, LENS.cy, LENS.eyeR),
      thinkShoulder: { x: pct((92 - BODY_BOX[0]) / BODY_BOX[2]), y: pct((178 - BODY_BOX[1]) / BODY_BOX[2]) },
      waveShoulder: { x: pct((300 - 72 - BODY_BOX[0]) / BODY_BOX[2]), y: pct((156 - BODY_BOX[1]) / BODY_BOX[2]) },
    },
    null,
    1
  )
)

/* ---- the owl head turn: his body stays put and his head swivels round, 0° to 180° in 15° steps. Every feature sits
   on a round head and is carried round it, foreshortened as it nears the edge; the beak and visor brim stand out from
   the head, so they show in profile. The frames sit side by side in one strip, `otto-turn-strip.svg`. ---- */
const D2R = Math.PI / 180
const bez = (a, b, c, d, t) => {
  const u = 1 - t
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d
}
const HALF = []
for (let i = 0; i <= 240; i++) {
  const t = i / 240
  HALF.push([bez(50, 50, 90, 146, t), 150 - bez(150, 94, 62, 62, t)])
}
for (let i = 1; i <= 240; i++) {
  const t = i / 240
  HALF.push([bez(146, 212, 262, 262, t), 150 - bez(62, 62, 96, 150, t)])
}
/** The head's half-width at height y. */
function rAt(y) {
  for (let i = 1; i < HALF.length; i++) {
    const [y0, h0] = HALF[i - 1]
    const [y1, h1] = HALF[i]
    if ((y >= y0 && y <= y1) || (y <= y0 && y >= y1)) return y1 === y0 ? h0 : h0 + ((y - y0) / (y1 - y0)) * (h1 - h0)
  }
  return 0
}
/** Carry a point of the front (or, with `back`, the back) view round the head by `th`. */
function proj(x, y, th, { dr = 0, r: rFix, back = false, clamp = true } = {}) {
  const r = (rFix ?? rAt(y)) + dr
  if (r < 2) return { x, y, c: 1 }
  const sn = Math.max(-1, Math.min(1, (x - 150) / r))
  let psi = Math.asin(sn) - (back ? Math.PI : 0) + th
  const c = Math.cos(psi)
  if (clamp) psi = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, psi))
  return { x: 150 + r * Math.sin(psi), y, c }
}
function mapPath(d, fn) {
  const out = []
  let nums = []
  for (const t of d.match(/[MLCQZ]|-?\d*\.?\d+/g)) {
    if (/[MLCQZ]/.test(t)) out.push(t)
    else {
      nums.push(+t)
      if (nums.length === 2) {
        const [a, b] = fn(nums[0], nums[1])
        out.push(`${a.toFixed(1)} ${b.toFixed(1)}`)
        nums = []
      }
    }
  }
  return out.join(' ')
}
const mirrorD = (d) => mapPath(d, (x, y) => [300 - x, y])
const TUFT_DS = [
  ['M98 84 C 88 68 76 54 62 40 C 82 42 102 52 120 64 Z', `fill="${C.tuftBack}" ${ol(3)}`],
  ['M92 88 C 86 68 80 48 76 26 C 92 38 110 48 128 62 Z', `fill="url(#body)" ${ol()}`],
  ['M95 76 C 91 62 87 50 84 40 C 96 48 106 54 116 62 Z', `fill="${C.featherLight}" opacity="0.75"`],
]
function turnTufts(th) {
  const one = (d) =>
    mapPath(d, (x, y) => {
      const q = proj(x, y, th, { r: 90, clamp: false })
      return [q.x, q.y]
    })
  const left = TUFT_DS.map(([d, a]) => `<path d="${one(d)}" ${a}/>`).join('')
  const right = TUFT_DS.map(([d, a]) => `<path d="${one(mirrorD(d))}" ${a}/>`).join('')
  // The farther tuft first, so the nearer one lies over it.
  const tilt = Math.asin(55 / 90)
  return Math.cos(-tilt + th) >= Math.cos(tilt + th) ? right + left : left + right
}
const bandTop = (a) => 66 + 14 * Math.abs(Math.sin(a)) + 10 * ((1 - Math.cos(a)) / 2) * (1 - Math.abs(Math.sin(a)))
function turnBand(th) {
  const top = []
  const bot = []
  for (let deg = -90; deg <= 90; deg += 3) {
    const psi = deg * D2R
    const a = psi - th
    const y1 = bandTop(a)
    const y2 = y1 + 9
    top.push([150 + (rAt(y1) + 2) * Math.sin(psi), y1])
    bot.push([150 + (rAt(y2) + 2) * Math.sin(psi), y2])
  }
  const pts = [...top, ...bot.reverse()].map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
  let out = `<path d="M${pts.join(' L')} Z" fill="url(#band)" ${ol(3)}/>`
  // The strap's adjuster, at the back.
  const pa = Math.PI + th
  const ca = Math.cos(pa)
  if (ca > 0.2) {
    const xc = 150 + (rAt(76) + 3) * Math.sin(pa)
    const w = 24 * ca
    out += `<rect x="${(xc - w / 2).toFixed(1)}" y="70" width="${w.toFixed(1)}" height="12" rx="3" fill="${C.greenDark}" ${ol(2.5)}/>`
    out += `<path d="M${(xc - 6 * ca).toFixed(1)} 76 H${(xc + 6 * ca).toFixed(1)}" stroke="${C.greenLight}" stroke-width="2.5" stroke-linecap="round"/>`
  }
  return out
}
function turnBrim(th) {
  if (th > 118 * D2R) return ''
  const top = []
  const bot = []
  for (let deg = -78; deg <= 78; deg += 3) {
    const a = deg * D2R
    const psi = a + th
    if (Math.cos(psi) < -0.4) continue
    const ca = Math.max(0, Math.cos(a))
    const y1 = bandTop(a) + 9
    const y2 = y1 + 22 * Math.pow(ca, 1.2)
    top.push([150 + (rAt(y1) + 2) * Math.sin(psi), y1])
    bot.push([150 + (rAt(y2) + 2 + 18 * Math.pow(ca, 0.9)) * Math.sin(psi), y2])
  }
  if (top.length < 2) return ''
  const pts = [...top, ...bot.reverse()].map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
  return `<path d="M${pts.join(' L')} Z" fill="url(#visor)" fill-opacity="0.93" ${ol(3)}/>`
}
/** A round feature (an eye, a blush) carried round the head: moved, and narrowed as it turns away. */
function turnRound(ex, ey, th, inner) {
  const r0 = rAt(ey)
  const phi = Math.asin((ex - 150) / r0)
  const psi = phi + th
  const c = Math.cos(psi)
  if (c < 0.12) return ''
  const xc = 150 + r0 * Math.sin(psi)
  return `<g transform="translate(${xc.toFixed(1)} ${ey}) scale(${(c / Math.cos(phi)).toFixed(3)} 1) translate(${-ex} ${-ey})">${inner}</g>`
}
const RAYS = []
for (const [cx, degs] of [
  [117, [150, 168, 186, 204, 222]],
  [183, [30, 12, -6, -24, -42]],
]) {
  for (const d of degs) {
    const a = d * D2R
    RAYS.push([cx + 31 * Math.cos(a), 130 + 31 * Math.sin(a), cx + 39 * Math.cos(a), 130 + 39 * Math.sin(a)])
  }
}
const BACK_ROWS = []
for (let r = 0; r < 5; r++) {
  const y = 104 + r * 18
  for (let x = 70 + (r % 2 ? 8 : 0); x <= 232; x += 16) BACK_ROWS.push([x, y])
}
function turnFrame(k, th, wings) {
  const parts = [turnTufts(th), `<path d="${BODY}" fill="url(#body)" ${ol()}/>`, BELLY]
  // The back of his head: rows of feathers and the pale edge of his facial disc.
  const bp = (x, y) => proj(x, y, th, { back: true })
  const rows = BACK_ROWS.filter(([x, y]) => bp(x, y + 4).c > 0.15).map(([x, y]) => {
    const a = bp(x - 8, y)
    const b = bp(x, y + 8)
    const c = bp(x + 8, y)
    return `M${a.x.toFixed(1)} ${a.y} Q${b.x.toFixed(1)} ${b.y} ${c.x.toFixed(1)} ${c.y}`
  })
  const ruff = (th >= 165 * D2R ? ['M70 112 Q 60 146 80 184', 'M230 112 Q 240 146 220 184'] : [])
    .filter((d) => {
      const m = d.match(/-?\d+/g).map(Number)
      return bp(m[2], m[3]).c > 0.1
    })
    .map((d) =>
      mapPath(d, (x, y) => {
        const q = bp(x, y)
        return [q.x, q.y]
      })
    )
  parts.push(
    `<g clip-path="url(#bodyClip)"><g clip-path="url(#headZone)">${
      rows.length ? `<path d="${rows.join(' ')}" fill="none" stroke="${C.featherShade}" stroke-opacity="0.5" stroke-width="2.2" stroke-linecap="round"/>` : ''
    }${ruff.length ? `<path d="${ruff.join(' ')}" fill="none" stroke="#f3e2c4" stroke-opacity="0.85" stroke-width="5" stroke-linecap="round"/>` : ''}</g></g>`
  )
  // His face.
  if (th <= 160 * D2R) {
    const disc = mapPath(DISC, (x, y) => {
      const q = proj(x, y, th, { dr: 0.5 })
      return [q.x, q.y]
    })
    const rays = RAYS.map(([x1, y1, x2, y2]) => [proj(x1, y1, th), proj(x2, y2, th)])
      .filter(([a, b]) => a.c > 0.15 && b.c > 0.15)
      .map(([a, b]) => `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`)
    parts.push(
      `<g clip-path="url(#bodyClip)"><path d="${disc}" fill="url(#cream)" ${ol(3)}/>${
        rays.length ? `<path d="${rays.join(' ')}" fill="none" stroke="${C.discLine}" stroke-width="2.2" stroke-linecap="round"/>` : ''
      }</g>`
    )
  }
  parts.push(turnRound(117, 130, th, eye(117, 130, [0, 2], { id: `f${k}l` })))
  parts.push(turnRound(183, 130, th, eye(183, 130, [0, 2], { id: `f${k}r` })))
  parts.push(turnRound(96, 162, th, `<ellipse cx="96" cy="162" rx="10" ry="5.5" fill="${C.blush}" opacity="0.5"/>`))
  parts.push(turnRound(204, 162, th, `<ellipse cx="204" cy="162" rx="10" ry="5.5" fill="${C.blush}" opacity="0.5"/>`))
  parts.push(turnBand(th), turnBrim(th), FEET, wings ?? W.restL + W.restR)
  // The beak, a small cone on his face: its base on the face, its tip standing out, so in profile it hooks out and
  // down. Drawn as the outline round its corners as they turn.
  if (Math.cos(th) > -0.25) {
    const xc = 150 + rAt(152) * Math.sin(th)
    const corners = [[-10, 146, 0], [0, 139, 0], [10, 146, 0], [0, 159, 0], [0, 171, 16], [-3, 167, 9], [3, 167, 9]]
      .map(([fx, y, dz]) => [xc + fx * Math.cos(th) + dz * Math.sin(th), y])
    const hull = (pts) => {
      const ps = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
      const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
      const lower = []
      for (const q of ps) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q) }
      const upper = []
      for (const q of ps.slice().reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q) }
      return lower.slice(0, -1).concat(upper.slice(0, -1))
    }
    const h = hull(corners).map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
    parts.push(`<path d="M${h.join(' L')} Z" fill="url(#beak)" ${ol(3)}/>`)
  }
  return parts.join('')
}
const TURN_FRAMES = 13
{
  const defs = DEFS.replace('</defs>', '<clipPath id="headZone"><rect x="-20" y="-20" width="340" height="202"/></clipPath></defs>')
  const cells = []
  for (let k = 0; k < TURN_FRAMES; k++) cells.push(`<g transform="translate(${k * 340 + 20} 20)">${turnFrame(k, k * 15 * D2R)}</g>`)
  writeFileSync(resolve(OUT, 'otto-turn-strip.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TURN_FRAMES * 340} 340">${defs}${cells.join('')}</svg>\n`)
}

/* ---- landing: once his feet touch the card, his wings fold from flight into the pose over FOLD_N frames, drawn
   between the two (a strip per pose, `otto-fold-<pose>.svg`); its last frame is the perched drawing itself. ---- */
const FOLD_N = 10
const FLY_CFG = { at: [82, 180], arm: 115, hand: 20, spread: 9, reach: 1 }
const lerp = (a, b, t) => a + (b - a) * t
function lerpWing(A, B, t) {
  return {
    at: [lerp(A.at[0], B.at[0], t), lerp(A.at[1], B.at[1], t)],
    arm: lerp(A.arm, B.arm, t),
    hand: lerp(A.hand, B.hand, t),
    spread: lerp(A.spread ?? 5, B.spread ?? 5, t),
    reach: lerp(A.reach ?? 1, B.reach ?? 1, t),
  }
}
const FOLD_TARGETS = {
  idle: { L: REST, R: REST, look: [0, 1] },
  shrug: { L: SHRUG, R: SHRUG, look: [3, -6] },
  remind: { L: REST, R: { at: [72, 156], arm: 140, hand: 12, spread: 8 }, look: [5, -6] },
  curious: { L: REST, R: REST, look: [2, -2], tilt: CURIOUS_TILT },
  check: { L: { at: [86, 156], arm: 12, hand: -40, spread: 4, reach: 0.9 }, R: { at: [86, 156], arm: 0, hand: -6, spread: 4, reach: 0.9 }, look: [2, 7] },
  search: { L: REST, R: { at: [76, 150], arm: 150, hand: -118, spread: 5, reach: 0.62 }, look: [-5, -2] },
}
function foldInner(look, wings, id, tilt = 0, shadow = false) {
  const rot = (x) => (tilt ? `<g transform="rotate(${tilt.toFixed(2)} 150 150)">${x}</g>` : x)
  return [
    shadow ? SHADOW : '',
    rot(TUFTS),
    `<path d="${BODY}" fill="url(#body)" ${ol()}/>`,
    BELLY,
    `<g clip-path="url(#bodyClip)">${rot(`<path d="${DISC}" fill="url(#cream)" ${ol(3)}/>${discFeathers()}`)}</g>`,
    rot(eye(117, 130, look, { id: `${id}l` }) + eye(183, 130, look, { id: `${id}r` }) + BEAK + BLUSH + HATS.visor),
    FEET,
    wings,
  ].join('')
}
function foldStrip(pose, { head = 'std' } = {}) {
  const T = FOLD_TARGETS[pose]
  const cells = []
  for (let k = 0; k < FOLD_N; k++) {
    const t = k / (FOLD_N - 1)
    const e = t * t * (3 - 2 * t)
    let inner
    if (k === FOLD_N - 1) inner = head === 'turn' ? turnFrame(`h${k}`, 0) : draw(pose, { shadow: false, inner: true })
    else {
      const wings = wing(lerpWing(FLY_CFG, T.L, e)) + wing({ ...lerpWing(FLY_CFG, T.R, e), mirror: true })
      inner =
        head === 'turn'
          ? turnFrame(`h${k}`, 0, wings)
          : foldInner([lerp(0, T.look[0], e), lerp(5, T.look[1], e)], wings, `g${k}`)
    }
    cells.push(`<g transform="translate(${k * 340 + 20} 20)">${inner}</g>`)
  }
  const defs = DEFS.replace('</defs>', '<clipPath id="headZone"><rect x="-20" y="-20" width="340" height="202"/></clipPath></defs>')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FOLD_N * 340} 340">${defs}${cells.join('')}</svg>\n`
}
writeFileSync(resolve(OUT, 'otto-fold-idle.svg'), foldStrip('idle'))
writeFileSync(resolve(OUT, 'otto-fold-idle-turn.svg'), foldStrip('idle', { head: 'turn' }))
for (const pose of ['shrug', 'remind', 'check', 'search']) writeFileSync(resolve(OUT, `otto-fold-${pose}.svg`), foldStrip(pose))

/* ---- the landing, as one owl: a single strip holds every frame of it, so nothing is swapped for another drawing.
   Frames 0-2 flap (wings level, up, down) on the way down, 3-11 fold the wings from flight to his sides; frame 11 is
   the standing pose. `otto-land-idle.svg`. ---- */
{
  const flapUp = { ...FLY_CFG, arm: 138, hand: 30 }
  const flapDown = { ...FLY_CFG, arm: 88, hand: 6 }
  const flyFrame = (cfg, id) => foldInner([0, 5], wing(cfg) + wing({ ...cfg, mirror: true }), id)
  const cells = [flyFrame(FLY_CFG, 'a0'), flyFrame(flapUp, 'a1'), flyFrame(flapDown, 'a2')]
  const T = FOLD_TARGETS.idle
  for (let k = 1; k < FOLD_N; k++) {
    const t = k / (FOLD_N - 1)
    const e = t * t * (3 - 2 * t)
    cells.push(
      k === FOLD_N - 1
        ? draw('idle', { shadow: false, inner: true })
        : foldInner([lerp(0, T.look[0], e), lerp(5, T.look[1], e)], wing(lerpWing(FLY_CFG, T.L, e)) + wing({ ...lerpWing(FLY_CFG, T.R, e), mirror: true }), `b${k}`)
    )
  }
  // Each frame in a cell 400 wide (30 more each side than his 340 box, for open wings), clipped to it.
  const svgCells = cells.map((inner, k) => `<g transform="translate(${k * 400 + 50} 20)"><g clip-path="url(#cell)">${inner}</g></g>`)
  const cellDefs = DEFS.replace('</defs>', '<clipPath id="cell"><rect x="-50" y="-20" width="400" height="340"/></clipPath></defs>')
  writeFileSync(resolve(OUT, 'otto-land-idle.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cells.length * 400} 340">${cellDefs}${svgCells.join('')}</svg>\n`)
  // The strip's timing, as CSS keyframes: flap every 0.1 s for 1.9 s, then fold over 0.9 s.
  const n = cells.length
  const seq = []
  for (let i = 0; i < 19; i++) seq.push([i * 0.1, [0, 1, 0, 2][i % 4]])
  seq.push([1.9, 0])
  for (let k = 3; k < n; k++) seq.push([2.0 + (k - 3) * 0.1, k])
  const total = 2.9
  const kf = seq.map(([t, f]) => `${+((t / total) * 100).toFixed(3)}%{transform:translateX(${+(-(f * 100) / n).toFixed(4)}%)}`)
  kf.push(`100%{transform:translateX(${+(-((n - 1) * 100) / n).toFixed(4)}%)}`)
  writeFileSync(resolve(OUT, 'land-keyframes.css'), `@keyframes ot-land-frames{${kf.join('')}}\n/* frames: ${n}, last: ${+(-((n - 1) * 100) / n).toFixed(4)}% */\n`)
}

/* ---- the same one-owl landing for every perched pose: 3 flap frames, 9 frames folding into the pose (the last is
   the pose itself), each in a 400-wide cell. `otto-land-<pose>.svg`; `head: 'turn'` uses the head-turn head, so the
   head turn can take over after he lands without a visible change. ---- */
function landStrip(pose, { head = 'std' } = {}) {
  const flapUp = { ...FLY_CFG, arm: 138, hand: 30 }
  const flapDown = { ...FLY_CFG, arm: 88, hand: 6 }
  const T = FOLD_TARGETS[pose]
  const frame = (look, wings, id, tilt = 0) => (head === 'turn' ? turnFrame(id, 0, wings) : foldInner(look, wings, id, tilt))
  const pair = (cfgL, cfgR) => wing(cfgL) + wing({ ...cfgR, mirror: true })
  const cells = [
    frame([0, 5], pair(FLY_CFG, FLY_CFG), `${pose}a0`),
    frame([0, 5], pair(flapUp, flapUp), `${pose}a1`),
    frame([0, 5], pair(flapDown, flapDown), `${pose}a2`),
  ]
  for (let k = 1; k < FOLD_N; k++) {
    const t = k / (FOLD_N - 1)
    const e = t * t * (3 - 2 * t)
    if (k === FOLD_N - 1) cells.push(head === 'turn' ? turnFrame(`${pose}z`, 0) : draw(pose, { shadow: false, inner: true }))
    else cells.push(frame([lerp(0, T.look[0], e), lerp(5, T.look[1], e)], pair(lerpWing(FLY_CFG, T.L, e), lerpWing(FLY_CFG, T.R, e)), `${pose}b${k}`, lerp(0, T.tilt ?? 0, e)))
  }
  const defs = DEFS.replace(
    '</defs>',
    '<clipPath id="cell"><rect x="-50" y="-20" width="400" height="340"/></clipPath><clipPath id="headZone"><rect x="-20" y="-20" width="340" height="202"/></clipPath></defs>'
  )
  const svgCells = cells.map((inner, k) => `<g transform="translate(${k * 400 + 50} 20)"><g clip-path="url(#cell)">${inner}</g></g>`)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cells.length * 400} 340">${defs}${svgCells.join('')}</svg>\n`
}
writeFileSync(resolve(OUT, 'otto-land-idle-turn.svg'), landStrip('idle', { head: 'turn' }))
for (const pose of ['shrug', 'curious', 'remind', 'check', 'search']) writeFileSync(resolve(OUT, `otto-land-${pose}.svg`), landStrip(pose))

/* ---- Ask Otto's curious tilt, every few seconds: 5 frames from a straight head (the standing pose, as he lands) to
   his head tipped CURIOUS_TILT, and the "?" on its own layer so it can pop up while he tilts. ---- */
{
  const N = 5
  const cells = []
  for (let k = 0; k < N; k++) {
    const t = k / (N - 1)
    const inner = foldInner([lerp(0, 2, t), lerp(1, -2, t)], W.restL + W.restR, `t${k}`, CURIOUS_TILT * t)
    cells.push(`<g transform="translate(${k * 340 + 20} 20)">${inner}</g>`)
  }
  writeFileSync(resolve(OUT, 'otto-tilt-strip.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N * 340} 340">${DEFS}${cells.join('')}</svg>\n`)
  writeFileSync(resolve(OUT, 'otto-qmark.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 340 340">${QMARK}</svg>\n`)
}
