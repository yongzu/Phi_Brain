// Phi Brain 앱의 실제 CSS(design/style-kit/theme.css + design/prototypes/phi-brain.css)를
// 영상 안 그림자 DOM(src/app/AppScreen.tsx)에서 그대로 쓸 수 있게 옮겨 data/app.json에 저장한다.
//   :root → :host, html·body → .phi-app, 100vw·100vh → 앱 화면 크기(--app-vw/--app-vh), 이미지 url → data URI,
//   전환·애니메이션은 끔(영상 프레임마다 결과가 같아야 한다 — 움직임은 영상 코드가 직접 만든다).
// 실행: node tools/sync-app.mjs (npm run pull이 함께 실행)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DESIGN = resolve(here, '../../../design');
const OUT = resolve(here, '../data/app.json');

const dataUri = (file) => {
  const ext = extname(file).slice(1);
  const type = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
  return `data:${type};base64,${readFileSync(file).toString('base64')}`;
};

function rewriteSelectors(css) {
  // 선택자(블록 머리)만 바꾼다 — 속성 값의 --c-body 같은 이름은 그대로
  let out = '', i = 0, head = '';
  // 쉼표로 나눈 선택자 하나하나 — 괄호(:is/:has) 안의 쉼표는 나누지 않는다
  const splitTop = (sel) => {
    const parts = [];
    let depth = 0, cur = '';
    for (const ch of sel) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
    }
    return [...parts, cur];
  };
  // :hover 규칙은 [data-hover] 짝을 하나 더 — 영상의 커서가 올라간 요소에 data-hover를 달아 같은 호버 모양을 낸다
  const fix = (sel) => splitTop(sel
    .replace(/:root\b/g, ':host')
    .replace(/(^|[\s,>+~(])(html|body)(?=[\s,.:[#>+~)]|$)/g, '$1.phi-app'))
    .flatMap((one) => (one.includes(':hover') ? [one, one.replace(/:hover/g, '[data-hover]')] : [one]))
    .join(',');
  while (i < css.length) {
    const c = css[i];
    if (c === '{') { out += (head.trim().startsWith('@') ? head : fix(head)) + '{'; head = ''; }
    else if (c === '}' || c === ';') { out += head + c; head = ''; }
    else head += c;
    i++;
  }
  return out + head;
}

let css = [readFileSync(resolve(DESIGN, 'style-kit/theme.css'), 'utf8'), readFileSync(resolve(DESIGN, 'prototypes/phi-brain.css'), 'utf8')]
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');
css = rewriteSelectors(css)
  .replace(/url\((['"]?)(?:assets\/)?([\w-]+\.svg)(?:\?[^'")]*)?\1\)/g, (m, q, name) => {
    const file = name.startsWith('cursor') ? resolve(DESIGN, 'prototypes', name) : resolve(DESIGN, 'prototypes/assets', name);
    return `url("${dataUri(file)}")`;
  })
  .replace(/(\d+(?:\.\d+)?)vw\b/g, (m, n) => (n === '100' ? 'var(--app-vw)' : `calc(var(--app-vw) * ${n} / 100)`))
  .replace(/(\d+(?:\.\d+)?)vh\b/g, (m, n) => (n === '100' ? 'var(--app-vh)' : `calc(var(--app-vh) * ${n} / 100)`));
css += '\n*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent}\n';

const app = {
  css,
  logo: dataUri(resolve(DESIGN, 'prototypes/assets/logo.png')),
  wordmark: dataUri(resolve(DESIGN, 'prototypes/assets/wordmark.png')),
  cursors: Object.fromEntries(['arrow', 'pointer', 'text'].map((k) => [k, dataUri(resolve(DESIGN, `prototypes/cursor-${k}.svg`))])),
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(app));
console.log(`saved ${OUT}: css ${(css.length / 1024).toFixed(0)}KB`);
