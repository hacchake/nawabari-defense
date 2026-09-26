
// ================= ヘッドレス検証 =================
let fails = 0;
function assert(name, cond, info) {
  if (cond) console.log('OK  ' + name + (info !== undefined ? '  [' + info + ']' : ''));
  else { console.log('NG  ' + name + '  [' + info + ']'); fails++; }
}
const DNAME = { '0,-1':'up', '1,0':'right', '0,1':'down', '-1,0':'left' };
function steps(dx, dy, n) { const d = DNAME[dx + ',' + dy]; let c = 0; for (let i = 0; i < n; i++) { if (!playerMove(d)) break; c++; } return c; }
const openAt = q => grid[surf.qixCell(q)] === OPEN;
const pxy = () => (player.c % GW) + ',' + ((player.c / GW) | 0);
const nbs = c => Array.from(surf.nb.slice(c * 4, c * 4 + 4));
function countCells(v) { let n = 0; for (let i = 0; i < surf.N; i++) if (grid[i] === v) n++; return n; }

settings.mode = 'PLANE'; initLevel(1);

// ---- 1) 初期状態 ----
assert('初期位置が境界上', isBoundary(player.c), pxy());
assert('初期占領率0%', percent() === 0);

// ---- 2) 壁沿い移動 ----
let m = steps(-1, 0, 10);
assert('壁沿いに10歩移動', m === 10, m);

// ---- 3) 描画→ミス ----
held.fast = false;
m = steps(0, -1, 1);
assert('方向キーだけで空き地へ進むと遅い線(×2)を引き始める', m === 1 && player.drawing && !player.usedFast);
held.fast = true;
m = steps(0, -1, 29);
assert('Zを押すと速い線(×1)になる', m === 29 && trail.length === 30 && player.usedFast, m + '/' + trail.length);
for (let i = 0; i < 120; i++) update(1/60);
assert('止まっていても導火線はない(ミスにならない)', deathTimer <= 0 && player.drawing);
death('テスト');
assert('ミス発生', deathTimer > 0, deathTimer.toFixed(2));
applyDeath();
assert('軌跡が消えている', countCells(TRAIL) === 0 && !player.drawing);
assert('残機が減少', lives === settings.lives - 1, lives);
assert('描画開始地点に復帰', player.c === trailStart, pxy());

// ---- 4) 囲んで占領 ----
player.invuln = 0; held.fast = true;
const beforeClaimed = claimed;
steps(0, -1, 20); steps(-1, 0, 15);
m = steps(0, 1, 25);
assert('軌跡が閉じた', !player.drawing, 'down歩数=' + m);
assert('占領が発生', claimed > beforeClaimed, 'claimed=' + claimed + ' (' + percent().toFixed(2) + '%)');
assert('TRAILセル残存なし', countCells(TRAIL) === 0);
assert('占領数の整合', claimed === initOpen - countCells(OPEN), claimed + ' vs ' + (initOpen - countCells(OPEN)));
assert('QIXは空き地に居る', qixes.every(openAt));
assert('占領後も境界上', isBoundary(player.c), pxy());

// ---- 5) SPARX巡回 ----
for (let i = 0; i < 300; i++) sparxes.forEach(stepSparx);
assert('SPARXが境界上を巡回', sparxes.every(s => isBoundary(s.c)), sparxes.map(s => s.c).join(' / '));

// ---- 6) QIX移動(壁抜けなし) ----
for (let i = 0; i < 600; i++) updateQixes(1/60);
assert('QIXが空き地に留まる', qixes.every(openAt),
       qixes.map(q => q.x.toFixed(1) + ',' + q.y.toFixed(1)).join(' / '));

// ---- 7) 75%クリア ----
claimed = Math.ceil(initOpen * 0.76);
startClear(false);
assert('75%でクリア遷移', state === 'clear' && !wasSplit, 'bonus=' + lastBonus);

// ---- 8) 設定保存フォールバック ----
store.set('t.x', 5);
assert('storeフォールバック', store.get('t.x', 0) === 5);

// ---- 9) 音名→周波数 ----
assert('hz(A4)=440', Math.abs(hz('A4') - 440) < 0.01, hz('A4').toFixed(2));
assert('hz(C4)≈261.63', Math.abs(hz('C4') - 261.63) < 0.05, hz('C4').toFixed(2));
assert('hz(G#3)≈207.65', Math.abs(hz('G#3') - 207.65) < 0.05, hz('G#3').toFixed(2));
const badNotes = [];
for (const k in BGMDATA) for (const tr of BGMDATA[k].tracks) if (tr.s)
  for (const nm of tr.s) if (nm && !/^([A-G])(#?)(-?\d)$/.test(nm)) badNotes.push(k + ':' + nm);
assert('BGM譜面の音名がすべて正しい', badNotes.length === 0, badNotes.join(','));
assert('orbitの各トラック長=len', BGMDATA.orbit.tracks.every(t => !t.s || t.s.length === BGMDATA.orbit.len));

// ---- 10) テーマ切替 ----
let wallsBefore = countCells(WALL);
settings.theme = 2; applyTheme();
let wallsAfter = countCells(WALL);
assert('テーマ切替でグリッド不変', wallsBefore === wallsAfter && themePal.length === 8,
       wallsBefore + '/' + themePal.length);
assert('立体用の色表が揃う', col3D.length === NCOL * LV && col3D.every(c => /^rgb\(\d+,\d+,\d+\)$/.test(c)), col3D.length);
settings.theme = 0; applyTheme();

// ---- 11) OPTIONS操作 ----
optSel = OPT_ITEMS.findIndex(o => o.k === 'diff');
settings.diff = 'NORMAL';
adjustOpt(1);
assert('難易度がHARDへ巡回', settings.diff === 'HARD', settings.diff);
settings.diff = 'NORMAL';
optSel = OPT_ITEMS.findIndex(o => o.k === 'bgm'); settings.bgm = 6; adjustOpt(1);
assert('BGM音量+1', settings.bgm === 7, settings.bgm);

// ---- 12) BGM(AudioContext無しでも安全) ----
Bgm.play('play');
assert('BGMはAC無しなら予約のみ', Bgm.want === 'play' && !Bgm.playing);

// ---- 13) READYフロー ----
startGame();
assert('startGameでready状態', state === 'ready' && level === 1 && surf.key === 'PLANE');
stTimer = 2; tickMeta(0.016);
assert('READY経過でplayへ', state === 'play');

// ---- 14) AREA3: QIX2体・同一領域なら通常占領 ----
initLevel(3);
assert('AREA3でQIX2体', qixes.length === 2);
setState('play');
qixes[0].x = 40; qixes[0].y = 30; qixes[1].x = 88; qixes[1].y = 30;
player.c = idx(GW >> 1, GH - 1); player.drawing = false; player.invuln = 0; trail = [];
held.fast = true;
steps(0, -1, 10); steps(1, 0, 8); steps(0, 1, 12);
assert('2QIX同領域→通常閉鎖', !player.drawing && !wasSplit && state === 'play',
       'pct=' + percent().toFixed(2));
assert('両QIXとも空き地', qixes.every(openAt));

// ---- 15) QIX分断 → 即クリア ----
initLevel(3); setState('play');
qixes[0].x = 20; qixes[0].y = 80; qixes[1].x = 108; qixes[1].y = 80;
player.c = idx(GW >> 1, GH - 1); player.invuln = 0;
held.fast = true;
m = steps(0, -1, 200);
assert('縦断ラインで閉鎖', m === GH - 1, m);
assert('分断で即クリア', state === 'clear' && wasSplit, 'pct=' + percent().toFixed(1));
assert('圧殺されたQIXが除去', qixes.length === 1);
assert('SPLITボーナス加算', lastBonus >= CONFIG.SPLIT_BONUS, lastBonus);

// ---- 16) TOURモードの盤面の巡回 ----
settings.mode = 'TOUR';
assert('TOUR: 平面→立方体→球…→一巡して平面', ['PLANE','CUBE','SPHERE'].every((k, i) => surfaceFor(i + 1) === k)
       && surfaceFor(CONFIG.TOUR.length + 1) === 'PLANE', CONFIG.TOUR.length);
assert('TOURは全盤面を含む', Object.keys(CONFIG.SURF).every(k => CONFIG.TOUR.includes(k)));
settings.mode = 'CUBE';
assert('単独モードは常に同じ盤面', surfaceFor(1) === 'CUBE' && surfaceFor(5) === 'CUBE');

// ---- 17) 立方体・球のつながり(グラフ)が正しい ----
for (const key of ['CUBE', 'SPHERE']) {
  const S = getSurface(key), n = S.n;
  const nbOf = c => Array.from(S.nb.slice(c * 4, c * 4 + 4));
  let bad = 0, asym = 0;
  for (let c = 0; c < S.N; c++) {
    const ns = nbOf(c);
    if (new Set(ns).size !== 4 || ns.some(b => b < 0 || b === c)) bad++;
    for (const b of ns) if (!nbOf(b).includes(c)) asym++;
  }
  assert(key + ': 全セルに異なる4近傍', bad === 0, 'N=' + S.N + ' bad=' + bad);
  assert(key + ': 隣り合いが対称', asym === 0, asym);
  // 直進を 4n 歩続けるとぐるっと一周して元に戻る(面の継ぎ目で向きが崩れないこと)
  let loops = 0;
  for (const start of [0, 5 * n * n + 3 * n + 7, 3 * n * n - 1]) for (let k0 = 0; k0 < 4; k0++) {
    let prev = start, c = S.nb[start * 4 + k0];
    for (let s = 1; s < 4 * n; s++) {
      const kp = nbOf(c).indexOf(prev);
      prev = c; c = S.nb[c * 4 + ((kp + 2) & 3)];
    }
    if (c === start) loops++;
  }
  assert(key + ': 直進4n歩で一周して戻る', loops === 12, loops + '/12');
  let d8 = 0;
  for (let c = 0; c < S.N; c++) { let k = 0; for (let j = 0; j < 8; j++) if (S.nb8[c * 8 + j] >= 0) k++; if (k < 7 || k > 8) d8++; }
  assert(key + ': 斜め込み近傍は7〜8個', d8 === 0, d8);
  let back = 0;
  for (let c = 0; c < S.N; c++) if (S.cellAt(S.dir[c * 3], S.dir[c * 3 + 1], S.dir[c * 3 + 2]) !== c) back++;
  assert(key + ': 方向→セルの逆引きが一致', back === 0, back);
}

// ---- 18) 球: 初期陣地・QIX・SPARX ----
settings.mode = 'SPHERE'; startGame(); stTimer = 2; tickMeta(0.016);
assert('球でplay開始', state === 'play' && surf.key === 'SPHERE' && surf.is3D);
assert('球: 初期位置がHOMEの縁', isBoundary(player.c) && grid[player.c] === WALL);
assert('球: 初期占領率0% / 空きセル整合', percent() === 0 && initOpen === countCells(OPEN), initOpen + '/' + surf.N);
assert('球: QIXは空き地から', qixes.every(openAt));
for (let i = 0; i < 900; i++) updateQixes(1/60);
assert('球: QIXが空き地に留まる', qixes.every(openAt));
for (let i = 0; i < 300; i++) sparxes.forEach(stepSparx);
assert('球: SPARXがHOMEの縁を巡回', sparxes.every(s => isBoundary(s.c)));

// ---- 18b) 立体面のSPARXは出現待ちの間は動かず当たらない ----
{
  startGame(); stTimer = 2; tickMeta(0.016);
  const s0 = sparxes[0], c0 = s0.c;
  assert('球: 開始時SPARXは1体・出現待ちあり', sparxes.length === 1 && s0.wait > 0, s0.wait);
  player.c = c0; player.invuln = 0;
  updateSparxes(0.5);
  assert('球: 出現待ち中は動かず当たらない', s0.c === c0 && deathTimer <= 0);
  for (let i = 0; i < 400; i++) updateSparxes(1/60);
  assert('球: 待ち時間後は動き出す', s0.wait <= 0 && (s0.c !== c0 || deathTimer > 0));
  deathTimer = 0; lives = settings.lives;
  startGame(); stTimer = 2; tickMeta(0.016);
}

// ---- 19) 球: カメラが自機を正面に捉え、画面の向きで移動を選ぶ ----
{
  const p = surf.screenOf(player.c);
  assert('球: 自機が画面中央付近', Math.abs(p.x - cam.cx) < 20 && Math.abs(p.y - cam.cy) < 60,
         p.x.toFixed(0) + ',' + p.y.toFixed(0));
  held.fast = false;
  const r = chooseMove('right'), l = chooseMove('left');
  const pr = surf.screenOf(r), pl = surf.screenOf(l);
  assert('球: →で右隣、←で左隣の線へ', r >= 0 && l >= 0 && pr.x > p.x && pl.x < p.x,
         pr.x.toFixed(0) + ' / ' + pl.x.toFixed(0));
  const dn = chooseMove('down');
  assert('球: 方向キーだけで空き地へ出られる', dn >= 0 && grid[dn] === OPEN, dn);
}

// ---- 20) 球: 線を引いて囲む(HOMEの下に四角く張り出す) ----
{
  player.invuln = 0; held.fast = true;
  const c0 = claimed;
  const a = steps(0, 1, 5);          // 下(HOME から離れる向き)
  const b = steps(1, 0, 3);          // 右
  for (let i = 0; i < 20 && player.drawing; i++) playerMove('up');
  assert('球: 画面の向きで描画できる', a === 5 && b === 3, a + '/' + b);
  assert('球: 囲んで閉じた', !player.drawing && countCells(TRAIL) === 0);
  assert('球: 占領が発生', claimed > c0, 'claimed=' + claimed + ' (' + percent().toFixed(2) + '%)');
  assert('球: 占領数の整合', claimed === initOpen - countCells(OPEN));
  assert('球: 占領後も境界上', isBoundary(player.c));
  assert('球: QIXは空き地に居る', qixes.every(openAt));
}

// ---- 21) 立方体: 面の継ぎ目をまたいで線を引ける ----
settings.mode = 'CUBE'; startGame(); stTimer = 2; tickMeta(0.016);
{
  held.fast = true; player.invuln = 0;
  const n = surf.n, face = c => (c / (n * n)) | 0;
  let crossed = false, moved = 0;
  for (let i = 0; i < 3 * n; i++) {
    if (!playerMove('down')) break;
    moved++;
    for (let j = 0; j < 3; j++) tickMeta(1/30);   // カメラが追いかける
    if (face(player.c) !== 0) { crossed = true; break; }
  }
  assert('立方体: 下へ描き進めると隣の面へ', crossed && player.drawing, 'moved=' + moved + ' face=' + face(player.c));
  const f1 = face(player.c);
  for (let i = 0; i < 5; i++) { playerMove('down'); tickMeta(1/30); }
  assert('立方体: 継ぎ目の先でも同じ面を直進', face(player.c) === f1 && player.drawing, face(player.c));
  // ミス → 軌跡は消える
  death('テスト'); applyDeath();
  assert('立方体: ミスで軌跡が消え陣地に戻る', countCells(TRAIL) === 0 && isBoundary(player.c) && face(player.c) === 0);
}

// ---- 22) 立方体: QIX2体の分断 → 即クリア ----
initLevel(3); setState('play');
{
  assert('立方体AREA3でQIX2体', qixes.length === 2);
  const n = surf.n;
  qixes[0].p = vnorm([-1, 0.1, -0.3]); qixes[1].p = vnorm([1, 0.1, -0.3]);
  // x≈0 の大円に沿った1マス幅の輪を壁にする(HOMEの真上の1マスだけ残し、そこを自機が描いて閉じる)
  const ring = [];
  for (let c = 0; c < surf.N; c++) {
    const x = surf.dir[c * 3];
    if (x >= 0 && x < 1 / n && grid[c] === OPEN) ring.push(c);
  }
  const gap = ring.find(c => nbs(c).some(b => isBoundary(b)));
  for (const c of ring) if (c !== gap) { grid[c] = WALL; colA[c] = 0; claimed++; }
  const onOpen = qixes.every(openAt);
  const from = nbs(gap).find(b => isBoundary(b));
  player.c = from; player.drawing = false; player.invuln = 0; held.fast = true;
  playerStep(gap);
  const to = nbs(gap).find(b => b !== from && grid[b] === WALL);
  if (player.drawing) playerStep(to);
  assert('立方体: QIXが輪の両側の空き地に居る', onOpen, 'ring=' + ring.length);
  assert('立方体: 分断で即クリア', state === 'clear' && wasSplit, 'state=' + state + ' pct=' + percent().toFixed(1));
  assert('立方体: 圧殺されたQIXが除去', qixes.length === 1);
}

// ---- 23) タイトル ----
setState('title');
assert('モードは VS だけ', MODES.length === 1 && MODES[0] === 'VS');
for (let i = 0; i < 60; i++) tickMeta(1/60);
assert('タイトル中も動作(カメラ回転で例外なし)', state === 'title');

// ---- 24) モード別ハイスコア ----
settings.mode = 'CUBE'; hiScore = hiOf('CUBE'); score = hiScore + 1234; saveHi();
assert('ハイスコアはモード別に保存', hiOf('CUBE') === score && store.get('qlaim.hi3', {}).CUBE === score);

// ---- 25) 描画(3D/2D)が例外なく走る ----
let renderErr = null;
try {
  for (const md of ['SPHERE', 'CUBE', 'PLANE']) { settings.mode = md; startGame(); stTimer = 2; tickMeta(0.016); render(); }
} catch (e) { renderErr = e.stack; }
assert('3D/2D描画が例外なし', !renderErr, renderErr);


// ---- 26) すべての立体の形: 形・つながり・遊べること ----
function stepK(k) { return playerStep(surf.nb[player.c * 4 + k]); }
for (const key of Object.keys(CONFIG.SURF)) {
  if (key === 'PLANE') continue;
  const S = getSurface(key), nbOf = c => Array.from(S.nb.slice(c * 4, c * 4 + 4));
  let bad = 0, asym = 0, rbad = 0;
  for (let c = 0; c < S.N; c++) {
    const ns = nbOf(c);
    const ok = ns.filter(b => b >= 0);
    if (new Set(ok).size !== ok.length || ok.includes(c) || (!S.border && ok.length !== 4)) bad++;
    for (const b of ok) if (!nbOf(b).includes(c)) asym++;
    const r = Math.hypot(S.pos[c * 3], S.pos[c * 3 + 1], S.pos[c * 3 + 2]);
    const nl = Math.hypot(S.nor[c * 3], S.nor[c * 3 + 1], S.nor[c * 3 + 2]);
    if (!(r < 1.001) || Math.abs(nl - 1) > 1e-3) rbad++;
  }
  assert(key + ': 4近傍が正しく対称', bad === 0 && asym === 0, 'N=' + S.N + ' bad=' + bad + ' asym=' + asym);
  assert(key + ': 表面の点が半径1以内・法線が単位長', rbad === 0, rbad);
  settings.mode = key; startGame(); stTimer = 2; tickMeta(0.016);
  const ok0 = state === 'play' && isBoundary(player.c) && qixes.every(openAt) && initOpen === countCells(OPEN);
  for (let i = 0; i < 300; i++) updateQixes(1/60);
  for (let i = 0; i < 100; i++) sparxes.forEach(stepSparx);
  const spOk = sparxes.every(s => isBoundary(s.c));
  // HOMEから外へ4マス → 横へ3マス → 戻って HOME にぶつかるまで
  player.invuln = 99; held.fast = false;
  const c0 = claimed;
  let a = 0; for (let i = 0; i < 4; i++) if (stepK(0)) a++;
  let b = 0; for (let i = 0; i < 3; i++) if (stepK(1)) b++;
  for (let i = 0; i < 20 && player.drawing; i++) stepK(2);
  assert(key + ': 開始・QIX/SPARXが正常・囲んで占領できる',
    ok0 && spOk && qixes.every(openAt) && a === 4 && b === 3
    && !player.drawing && claimed > c0 && claimed === initOpen - countCells(OPEN) && isBoundary(player.c),
    'ok0=' + ok0 + ' a/b=' + a + '/' + b + ' claimed=' + (claimed - c0));
  let err = null;
  try { for (let i = 0; i < 3; i++) { tickMeta(1/60); render(); } } catch (e) { err = e.stack; }
  assert(key + ': 描画が例外なし', !err, err);
}

// ---- 27) ドーナツ・クラインの壺の貼り合わせ ----
for (const [key, loopU] of [['TORUS', 1], ['KLEIN', 2], ['MOBIUS', 2], ['KNOT', 1]]) {
  const S = getSurface(key), nbOf = c => Array.from(S.nb.slice(c * 4, c * 4 + 4));
  const walk = (start, k0, len) => {
    let prev = start, c = S.nb[start * 4 + k0];
    for (let s = 1; s < len; s++) { const kp = nbOf(c).indexOf(prev); prev = c; c = S.nb[c * 4 + ((kp + 2) & 3)]; }
    return c;
  };
  const st = 5 * S.NU + 7;
  assert(key + ': u方向に直進すると' + (loopU === 2 ? '2周で(裏返って)' : '1周で') + '戻る',
    walk(st, 1, loopU * S.NU) === st && (loopU === 1 || walk(st, 1, S.NU) !== st));
  if (!S.border) assert(key + ': v方向に直進すると1周で戻る', walk(st, 2, S.NV) === st);
  else assert(key + ': 縁の外は -1(行き止まり)', S.nb[st % S.NU * 4] === -1 || S.nb[(st % S.NU) * 4] === -1);
}
{
  const S = getSurface('KLEIN');
  const c = S.cellIdx(S.NU - 1, 3), n = S.nb[c * 4 + 1];
  assert('KLEIN: 右端の先は左端の上下反転の位置', n === S.cellIdx(0, S.NV / 2 - 1 - 3), n);
}

// ---- 28) 塗りの波 ----
settings.mode = 'SPHERE'; startGame(); stTimer = 2; tickMeta(0.016);
player.invuln = 99;
for (let i = 0; i < 4; i++) stepK(0); for (let i = 0; i < 3; i++) stepK(1); for (let i = 0; i < 20 && player.drawing; i++) stepK(2);
{
  let later = 0, set = 0;
  for (let c = 0; c < surf.N; c++) if (claimAt[c] > -1e8) { set++; if (claimAt[c] > blinkT) later++; }
  assert('塗りの波: 囲んだセルに到達時刻が付き、遠くは後から光る', set > 0 && later > 0 && waveUntil > blinkT, set + '/' + later);
  assert('光の輪が出る', rings.length > 0);
}

// ---- 29) BGM: 全曲の譜面と選び方 ----
{
  let bad = [];
  for (const k in BGMDATA) for (const tr of BGMDATA[k].tracks) {
    if (tr.s && tr.s.length !== BGMDATA[k].len) bad.push(k + ' len');
    if (tr.p && tr.p.some(x => x >= BGMDATA[k].len)) bad.push(k + ' step');
  }
  assert('全曲: トラック長とステップがlen内', bad.length === 0, bad.join(','));
  assert('全盤面のAUTO曲が存在', Object.values(CONFIG.SURF).every(d => BGMDATA[d.music]));
  assert('BGM選択肢の曲が存在', Object.values(MUSIC_SONG).every(k => BGMDATA[k]));
  settings.music = 'IDM'; assert('BGM=IDM を選ぶとidm', bgmName() === 'idm');
  settings.music = 'AUTO'; settings.mode = 'KLEIN'; initLevel(1);
  assert('AUTOは盤面ごとの曲(クラインの壺=drone)', bgmName() === 'drone');
  optSel = OPT_ITEMS.findIndex(o => o.k === 'music'); adjustOpt(1);
  assert('OPTIONSでBGMを切替', settings.music === MUSIC_KEYS[1], settings.music);
  settings.music = 'AUTO';
}

// ---- 30) 動くテーマ ----
{
  settings.theme = THEMES.findIndex(t => t.name === 'PRISM'); applyTheme();
  const before = themePal.join();
  for (let i = 0; i < 30; i++) tickTheme(1/30);
  assert('PRISMテーマは色が移ろう', themePal.join() !== before && col3D.every(c => /^rgb\(/.test(c)));
  settings.theme = 0; applyTheme();
}

// ---- 31) Clawd ----
{
  let err = null;
  try { drawClawd(100, 100, 2, { moving: true, walkF: 1, drawing: true, look: -1 }); drawClawd(0, 0, 1, { dead: true }); }
  catch (e) { err = e.stack; }
  assert('Clawdが描ける', !err, err);
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016);
  held.fast = false; steps(-1, 0, 1);
  assert('歩くと向きと歩き時刻が変わる', player.look === -1 && player.moveT === blinkT);
}


// ---- 32) アイテム: 囲むと手に入る ----
function claimBox() { // HOMEから外へ4 → 横へ3 → 戻る(立体・平面どちらも格子の向きで)
  for (let i = 0; i < 4; i++) stepK(0); for (let i = 0; i < 3; i++) stepK(1);
  for (let i = 0; i < 20 && player.drawing; i++) stepK(2);
}
settings.mode = 'SPHERE'; startGame(); stTimer = 2; tickMeta(0.016); player.invuln = 99;
{
  // 囲まれる予定の場所(HOMEのすぐ外側の内側セル)にアイテムを置く
  const c0 = player.c, a1 = surf.nb[c0 * 4], a2 = surf.nb[a1 * 4], inside = surf.nb[a2 * 4 + 1];
  items = [{ c: inside, k: 'slow', t: 0 }, { c: surf.nb[surf.nb[inside * 4] * 4], k: 'star', t: 0 }];
  const livesB = lives;
  claimBox();
  assert('囲んだアイテムを取得(SLOW発動)', slowT > 0 && !items.some(it => it.k === 'slow'), 'slowT=' + slowT.toFixed(1));
  assert('SLOW中は敵の速さが下がる', enemySlow() < 1);
  items = [{ c: 0, k: 'life', t: 0 }]; grid[0] = WALL; collectItems();
  assert('1UPで残機+1', lives === livesB + 1);
  items = [{ c: 0, k: 'shield', t: 0 }]; collectItems();
  assert('SHIELDを持つ', player.shield === true);
  player.invuln = 0; const l0 = lives; death();
  assert('SHIELDでミスを防ぐ(GUARD)', guarded && deathTimer > 0);
  for (let i = 0; i < 60 && deathTimer > 0; i++) update(1/30);
  assert('SHIELD使用後も残機は減らない・SHIELDは消える', lives === l0 && !player.shield && !guarded, lives + '/' + l0);
}
{
  items = []; itemTimer = 0; updateItems(0.01);
  assert('時間でアイテムが出現(空き地に)', items.length === 1 && grid[items[0].c] === OPEN);
  items[0].t = CONFIG.ITEM_LIFE; updateItems(0.01);
  assert('時間切れでアイテムが消える', items.length === 0);
}

// ---- 33) コンボとSTAR ----
settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016); player.invuln = 99; held.fast = false;
{
  const s0 = score; steps(0, -1, 3); steps(-1, 0, 3); steps(0, 1, 5);
  const p1 = score - s0;
  assert('1回目はコンボなし', combo === 0 && comboT > 0);
  const s1 = score; steps(-1, 0, 4); steps(0, -1, 3); steps(-1, 0, 3); steps(0, 1, 5);
  assert('続けて囲むとコンボ', combo === 1, 'combo=' + combo + ' +' + (score - s1));
  comboT = 0; starT = 5; const s2 = score;
  steps(-1, 0, 4); steps(0, -1, 3); steps(-1, 0, 3); steps(0, 1, 5);
  assert('STAR中は得点2倍(同じ大きさの囲みで2倍)', score - s2 === p1 * 2, (score - s2) + ' vs ' + p1 * 2);
}

// ---- 34) 記録・ポーズメニュー・なぞり操作・裏側ビュー ----
{
  settings.mode = 'CUBE'; startGame(); stTimer = 2; tickMeta(0.016);
  claimed = Math.ceil(initOpen * 0.8); startClear(false);
  assert('クリアで盤面の最高占領率を記録', bestPct.CUBE >= 80 && store.get('qlaim.best', {}).CUBE >= 80, bestPct.CUBE);
  startGame(); stTimer = 2; tickMeta(0.016);
  togglePause();
  assert('ポーズでメニュー', state === 'pause' && pauseSel === 0);
  pauseChoose(1);
  assert('「はじめから」でAREA1から', state === 'ready' && level === 1);
  stTimer = 2; tickMeta(0.016); togglePause(); pauseChoose(4);
  assert('「タイトルへ」', state === 'title');
  assert('なぞりの向き', dirFromDrag(30, 5) === 'right' && dirFromDrag(-3, -40) === 'up' && dirFromDrag(-50, 10) === 'left' && dirFromDrag(2, 9) === 'down');
  let err = null;
  try { for (const md of ['CUBE', 'KLEIN', 'TORUS']) { settings.mode = md; startGame(); stTimer = 2; tickMeta(0.016); items = [{ c: 5, k: 'star', t: 0 }]; render(); } }
  catch (e) { err = e.stack; }
  assert('裏側ビュー・アイテム・状態表示の描画が例外なし', !err, err);
}

// ---- 35) 曲の構成(セクションが巡る) ----
{
  let bad = [];
  for (const k in BGMDATA) {
    const sg = BGMDATA[k];
    if (!sg.form || sg.form.length < 3) bad.push(k + ':formなし');
    else for (const sec of sg.form) {
      if (!(sec.n >= 1)) bad.push(k + ':n');
      if (sec.mute && sec.mute.some(i => i < 0 || i >= sg.tracks.length)) bad.push(k + ':mute');
    }
    for (const tr of sg.tracks) {
      if (tr.s2 && tr.s2.length !== sg.len) bad.push(k + ':s2長');
      if (tr.s2) for (const nm of tr.s2) if (nm && !/^([A-G])(#?)(-?\d)$/.test(nm)) bad.push(k + ':' + nm);
      if (tr.p2 && tr.p2.some(x => x >= sg.len)) bad.push(k + ':p2');
    }
    if (!sg.form || !sg.form.some(x => x.alt || x.t || x.drums === false || x.mute)) bad.push(k + ':変化なし');
  }
  assert('全曲に構成があり、別メロ・転調・ブレイクなどの変化を含む', bad.length === 0, bad.join(','));
  Bgm._load('play');
  const seen = [];
  for (let i = 0; i < 20; i++) { seen.push(Bgm.section); Bgm._advance(); }
  assert('曲を進めるとセクションが順に巡って頭に戻る', seen.join('') === '00112334400112334400', seen.join(''));
  Bgm.stop();
}


// ---- 36) ゲームパッド・発光・画面揺れ ----
{
  const gp = { buttons: [{ pressed: true }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, { pressed: true }, {}], axes: [0, 0.9] };
  const ks = padKeys(gp);
  assert('ゲームパッド: A=z, 十字左, スティック下', ks.has('z') && ks.has('ArrowLeft') && ks.has('ArrowDown'), [...ks].join(','));
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016);
  onKeyDown({ key: 'ArrowUp', repeat: false, preventDefault() {} });
  assert('キー処理の関数化(onKeyDown→方向)', currentDir() === 'up');
  onKeyUp({ key: 'ArrowUp', preventDefault() {} });
  assert('onKeyUpで離す', currentDir() === null);
  assert('OPTIONSに発光と画面揺れ', OPT_ITEMS.some(o => o.k === 'glow') && OPT_ITEMS.some(o => o.k === 'shake'));
  let err = null; settings.glow = true;
  try { render(); } catch (e) { err = e.stack; }
  assert('発光つき描画が例外なし', !err, err);
}


// ---- 39) スクリーンショット ----
assert('スクリーンショットはtoBlobが無い環境では何もしない', saveShot() === false);


// ---- 41) 音の反応(AudioContext無しでも安全) ----
{
  let err = null;
  try { Snd.react(900, 0.5); Snd.sweep(); setState('pause'); tickMeta(0.016); setState('play'); tickMeta(0.016); } catch (e) { err = e.stack; }
  assert('BGMのこもり・効果音の左右がAC無しでも安全', !err, err);
}





// ---- 43) 実績 ----
{
  for (const k in achvGot) delete achvGot[k];
  settings.mode = 'VS'; settings.vsCpu = '7'; settings.stageSel = 'PLANE'; startGame(); setState('play');
  const m0 = stats.matches, w0 = stats.wins;
  { let a = 0; for (let i = 0; i < surf.N && a < initOpen * 0.55; i++) if (grid[i] === OPEN) { grid[i] = WALL; ownA[i] = 1; colA[i] = teamNo(0); a++; } claimed += a; recountAreas(); }
  vsEnd();
  assert('勝つと実績(はじめての勝利・無傷・50%・7人抜き)',
    state === 'vsres' && vsWin && ['first', 'nomiss', 'pct50', 'crowd'].every(id => achvGot[id]) && !achvGot.stock && !achvGot.devil, Object.keys(achvGot).join(','));
  assert('記録: 試合と勝ちが増える', stats.matches === m0 + 1 && stats.wins === w0 + 1);
  settings.vsCpu = 'AUTO'; settings.stageSel = 'TOUR';
  assert('実績のお知らせが出る', achvToasts.length >= 1);
  for (let i = 0; i < 3000 && achvToasts.length; i++) updateFloats(1/30);
  assert('お知らせは時間で消える', achvToasts.length === 0);
  assert('同じ実績は二度出ない', unlock('first') === false);
  for (const k of Object.keys(ITEMS)) itemsGot[k] = 1;   // (ZAP 追加後も全種)
  startGame(); stTimer = 2; tickMeta(0.016); items = [{ c: 0, k: 'star', t: 0 }]; grid[0] = WALL; collectItems();
  assert('アイテム全種で「コレクター」', !!achvGot.items);
  // たおす・ラウンド
  startGame(); setState('play'); vsStat.kills = 4; rivalFail(rivals[0], 'cut');
  assert('線を切ってたおすと「スキあり!」、5人で「大暴れ」', !!achvGot.cut && !!achvGot.kill5);
  level = 4; nextLevel(); assert('ラウンド5で「勝ち上がり」', !!achvGot.round5 && !achvGot.round10);
  // 和柄あつめ
  for (const k of BIG_PATS) wagaraGot[k] = 1; delete wagaraGot.hamon;
  noteWagara('asanoha'); assert('コンボの柄は和柄に数えない', !achvGot.wagara && !wagaraGot.asanoha);
  noteWagara('hamon'); assert('和柄6種で「和柄あつめ」', !!achvGot.wagara);
  for (const k of ['TETRA', 'CUBE', 'OCTA', 'DODECA', 'ICOSA']) bestPct[k] = 80;
  startGame(); setState('play'); checkClearAchv(false);
  assert('正多面体5種で「プラトンの立体」', !!achvGot.platonic && !achvGot.all);
  setState('options'); optSel = OPT_ITEMS.findIndex(o => o.k === '_achv'); adjustOpt(1);
  assert('OPTIONSから実績一覧へ', state === 'achv');
  let err = null; try { render(); } catch (e) { err = e.stack; }
  assert('実績一覧の描画が例外なし', !err, err);
  onKeyDown({ key: 'z', repeat: false, preventDefault() {} });
  assert('Zで戻る', state === 'options');
}


// ---- 44) 年輪模様とズーム ----
{
  settings.mode = 'CUBE'; startGame(); stTimer = 2; tickMeta(0.016); player.invuln = 99;
  for (let i = 0; i < 8; i++) stepK(0); for (let i = 0; i < 4; i++) stepK(1);
  cam.D = 3.4; const D0 = cam.D; for (let i = 0; i < 60; i++) tickMeta(1/60);
  assert('線を引いている間はカメラが引く', cam.D > D0 + 0.2, D0.toFixed(2) + '→' + cam.D.toFixed(2));
  for (let i = 0; i < 30 && player.drawing; i++) stepK(2);
  let r0 = 0, r1 = 0;
  for (let c = 0; c < surf.N; c++) if (claimAt[c] > -1e8 && colA[c] > 0 && colA[c] !== HOME_COL) { if (ringA[c]) r1++; else r0++; }
  assert('囲んだ陣地に年輪の縞(両方の色がある)', r0 > 0 && r1 > 0, r0 + '/' + r1);
  for (let i = 0; i < 120; i++) tickMeta(1/60);
  assert('描き終わるとカメラが戻る', Math.abs(cam.D - 3.4) < 0.05, cam.D.toFixed(2));
}


// ---- 45) タイトルのデモ ----
{
  settings.mode = 'VS'; settings.stageSel = 'TOUR'; backToTitle(); demoT = 0; demoLv = 1; initLevel(1);
  const k0 = surf.key;
  for (let i = 0; i < 9 * 60; i++) tickMeta(1/60);
  assert('タイトルで背景の盤面が巡る', surf.key !== k0 && state === 'title', k0 + '→' + surf.key);
  settings.stageSel = 'CUBE'; backToTitle(); demoT = 0;
  for (let i = 0; i < 9 * 60; i++) tickMeta(1/60);
  assert('ステージを1つに決めているときは巡らない', surf.key === 'CUBE');
  settings.stageSel = 'TOUR';
}


// ---- 46) 自動軽量化 ----
{
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016); settings.glow = true; perf.lite = false; perf.avg = 1 / 60;
  for (let i = 0; i < 200; i++) watchPerf(1 / 60);
  assert('軽いときは発光のまま', settings.glow === true);
  for (let i = 0; i < 200; i++) watchPerf(0.05);
  assert('重い状態が続くと発光を自動でOFF(設定は変えない)', settings.glow === true && perf.lite);
  perf.lite = false;
  settings.glow = true;
}


// ---- 47) 追加曲(シンセウェイブ・ローファイ) ----
{
  assert('SYNTH/LOFI が選べて盤面にも割り当て', BGMDATA.synth && BGMDATA.lofi && MUSIC_KEYS.includes('LOFI')
    && CONFIG.SURF.MOBIUS.music === 'lofi' && BGMDATA.lofi.swing > 0);
}


// ---- 48) 音に合わせた脈動 ----
assert('脈動はAC無しなら0', Bgm.pulse() === 0);





// ---- 50) OPTIONS ----
{
  for (const k in achvGot) delete achvGot[k];
  setState('options');
  let err = null; try { render(); } catch (e) { err = e.stack; }
  assert('OPTIONS描画が例外なし', !err, err);
}


// ---- 51) 全体を見る(X) ----
{
  settings.mode = 'DODECA'; startGame(); stTimer = 2; tickMeta(0.016);
  held.slow = true; for (let i = 0; i < 120; i++) tickMeta(1/60);
  assert('Xを押す間はカメラが大きく引く', cam.D > 5, cam.D.toFixed(2));
  held.slow = false; for (let i = 0; i < 180; i++) tickMeta(1/60);
  assert('離すと戻る', Math.abs(cam.D - 3.4) < 0.05, cam.D.toFixed(2));
}





// ---- 53) あそんだ記録 ----
{
  const g0 = stats.games, c0 = stats.claims;
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016); player.invuln = 99; held.fast = false;
  steps(0, -1, 3); steps(-1, 0, 3); steps(0, 1, 5);
  for (let i = 0; i < 60; i++) update(1/60);
  assert('記録: ゲーム回数・囲んだ回数・時間が増える', stats.games === g0 + 1 && stats.claims === c0 + 1 && stats.time > 0.9);
  assert('記録: よく遊ぶ盤面', favSurface() != null);
  setState('options'); optSel = OPT_ITEMS.findIndex(o => o.k === '_stats'); adjustOpt(1);
  let err = null; try { render(); } catch (e) { err = e.stack; }
  assert('記録画面へ・描画が例外なし', state === 'stats' && !err, err);
  onKeyDown({ key: 'x', repeat: false, preventDefault() {} });
  assert('記録画面から戻る', state === 'options');
}


// ---- 54) ポーズからOPTIONS ----
{
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016);
  togglePause(); pauseChoose(2);
  assert('ポーズからOPTIONSを開ける', state === 'options');
  optSel = OPT_ITEMS.findIndex(o => o.k === '_back'); closeOptions();
  assert('閉じるとポーズへ戻る', state === 'pause');
  pauseChoose(0);
  assert('そのまま再開できる', state === 'play');
  backToTitle(); openOptions(); closeOptions();
  assert('タイトルから開いたらタイトルへ戻る', state === 'title');
}





// ---- 56) ワープの入場 ----
{
  settings.mode = 'ICOSA'; backToTitle(); startGame();
  assert('タイトルからの開始でもカメラが遠くから', cam.D > 8, cam.D);
  for (let i = 0; i < 90; i++) tickMeta(1/60);
  assert('READYの間に寄ってくる', cam.D < 4, cam.D.toFixed(2));
  let err = null; try { cam.D = 7; render(); } catch (e) { err = e.stack; }
  assert('ワープの星の流れの描画が例外なし', !err, err);
  backToTitle();
  assert('タイトルのデモは普通の距離', cam.D < 9);
}


// ---- 57) 花火・ハモる効果音 ----
{
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016);
  claimed = Math.ceil(initOpen * 0.8); startClear(false);
  const n0 = particles.length;
  for (let i = 0; i < 30; i++) updateParticles(1/30);
  assert('クリア中は花火が上がる', particles.length > n0 + 20);
  assert('BGMが無いときの基準音は0(従来の音程)', Bgm.root() === 0);
}


// ---- 58) テーマ AUTO ----
{
  settings.theme = THEMES.length; settings.mode = 'PLANE'; startGame();
  const a = theme().name;
  settings.mode = 'GSD'; startGame();
  const b = theme().name;
  assert('AUTOは盤面で配色が変わる(平面=INK、星型=VAPOR)', a === 'INK' && b === 'VAPOR' && col3D.length === NCOL * LV, a + '/' + b);
  assert('全盤面にAUTOの配色がある', Object.keys(CONFIG.SURF).every(k => THEMES.some(t => t.name === AUTO_THEME[k])));
  settings.theme = 0; applyTheme();
}





// ---- 60) QIXの突進 ----
{
  for (const md of ['PLANE', 'SPHERE', 'TORUS']) {
    settings.mode = md; startGame(); level = 6; initLevel(6); setState('play'); player.invuln = 999;
    const q = qixes[0];
    q.dashCD = 0.5; updateQix(q, 0.1);
    const warned = q.warn;
    q.dashCD = 0.01; updateQix(q, 0.02);
    assert(md + ': AREA6から予告して突進', warned && q.dash > 0, 'dash=' + q.dash);
    for (let i = 0; i < 120; i++) updateQixes(1/60);
    assert(md + ': 突進後もQIXは空き地', qixes.every(openAt));
  }
}


// ---- 61) Clawd のひとこと・クリア音 ----
{
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016);
  speech.t = 0; speech.cool = 0;
  player.invuln = 0; death();
  assert('ミスでひとこと', (CLAWD_LINES.miss.includes(speech.txt) || RARE_LINES.includes(speech.txt)) && speech.t > 0, speech.txt);
  for (let i = 0; i < 60; i++) updateParticles(1/30);
  assert('吹き出しは時間で消える', speech.t <= 0);
  assert('連発しない(クールダウン中は無視)', say('A') === true && say('B') === false && speech.txt === 'A');
  let err = null; try { speech.t = 1; render(); Snd.clear_(0); Snd.clear_(110); } catch (e) { err = e.stack; }
  assert('吹き出しの描画・クリア音が例外なし', !err, err);
}


// ---- 62) SPARXの見た目(尾) ----
{
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016);
  for (let i = 0; i < 20; i++) sparxes.forEach(stepSparx);
  assert('SPARXは通った跡を5つまで覚える', sparxes.every(s => s.hist && s.hist.length === 5));
  let err = null; try { render(); settings.mode = 'SPHERE'; startGame(); stTimer = 2; tickMeta(0.016); sparxes.forEach(s => s.wait = 0); for (let i = 0; i < 10; i++) sparxes.forEach(stepSparx); render(); } catch (e) { err = e.stack; }
  assert('SPARXの描画が例外なし', !err, err);
}


// ---- 63) 危険の知らせ ----
{
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016); player.invuln = 0;
  sparxes[0].wait = 0; sparxes[0].c = surf.nb[surf.nb[player.c * 4 + 3] * 4 + 3];
  assert('SPARXが近いと危険度が上がる', calcDanger() > 0.5, danger.toFixed(2));
  sparxes.forEach(sp => sp.c = idx(GW >> 1, 0));
  assert('遠ければ0', calcDanger() === 0);
  let err = null; try { sparxes[0].c = surf.nb[player.c * 4 + 3]; render(); } catch (e) { err = e.stack; }
  assert('危険表示の描画が例外なし', !err, err);
}


// ---- 64) 最高ラウンド ----
{
  settings.mode = 'VS'; startGame(); stTimer = 2; tickMeta(0.016);
  for (let i = 0; i < 3; i++) nextLevel();
  assert('最高ラウンドを記録', stats.maxRound >= 4, stats.maxRound);
  setState('stats'); let err = null; try { render(); backToTitle(); render(); } catch (e) { err = e.stack; }
  assert('あそんだ記録・タイトル表示が例外なし', !err, err);
}


// ---- 65) 最後の1機で鼓動 ----
{
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016); lives = 0; heartT = 0;
  let err = null; try { update(1/60); } catch (e) { err = e.stack; }
  assert('残機0で鼓動のタイマーが動く(AC無しでも安全)', !err && heartT > 0.8, err || heartT);
}


// ---- 66) クリア中の俯瞰 ----
{
  settings.mode = 'DODECA'; startGame(); stTimer = 2; tickMeta(0.016); cam.D = 3.4;
  claimed = Math.ceil(initOpen * 0.8); startClear(false);
  for (let i = 0; i < 120; i++) tickMeta(1/60);
  assert('クリア中はカメラが引く', cam.D > 4.3, cam.D.toFixed(2));
}


// ---- 67) ZAP ----
{
  settings.mode = 'PLANE'; startGame(); level = 4; initLevel(4); setState('play');
  assert('準備: SPARXがいる', sparxes.length > 0);
  items = [{ c: 0, k: 'zap', t: 0 }]; grid[0] = WALL; collectItems();
  assert('ZAPでSPARX一掃', sparxes.length === 0);
  for (let i = 0; i < 60 * 20; i++) updateSparxes(1/60);
  assert('SPARXはしばらくするとまた出る', sparxes.length > 0);
}


// ---- 70) 盤面の豆知識 ----
assert('全盤面に豆知識がある', Object.keys(CONFIG.SURF).every(k => SURF_INFO[k]));


// ---- 71) あそびかた ----
{
  settings.mode = 'PLANE'; backToTitle();
  onKeyDown({ key: 'h', repeat: false, preventDefault() {} });
  assert('タイトルでHを押すとあそびかた', state === 'help');
  let err = null; try { render(); } catch (e) { err = e.stack; }
  assert('あそびかたの描画が例外なし', !err, err);
  onKeyDown({ key: 'z', repeat: false, preventDefault() {} });
  assert('Zでタイトルへ戻る', state === 'title');
  startGame(); stTimer = 2; tickMeta(0.016); togglePause(); pauseChoose(3);
  assert('ポーズからあそびかた', state === 'help');
  closeHelp();
  assert('閉じるとポーズへ', state === 'pause');
}





// ---- 73) 振動 ----
{
  settings.shake = false;
  assert('画面揺れOFFなら振動しない', buzz(100) === false);
  settings.shake = true;
}


// ---- 74) ニアミス ----
{
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016); player.invuln = 0; held.fast = true;
  steps(0, -1, 30);
  const tc = trail[15], x = tc % GW, y = (tc / GW) | 0;
  // 体は線に触れない距離、触手だけ線の隣をかすめる
  const q = qixes[0]; q.x = x + 4.5; q.y = y + 0.5; q.segs = [{ x1: x + 1.5, y1: y - 4, x2: x + 1.5, y2: y + 4, h: 0 }]; q.segT = 1; q.spd = 0;
  const sc = score; nearMissT = 0;
  updateQix(q, 0.001);
  assert('線の隣をかすめるとニアミスボーナス', deathTimer <= 0 && score > sc && nearMissT > 0, score - sc);
  const sc2 = score; updateQix(q, 0.001);
  assert('連続では入らない', score === sc2);
}


// ---- 75) 追加の実績 ----
{
  delete achvGot.nearmiss;
  settings.mode = 'PLANE'; startGame();
  for (let i = 0; i < 5; i++) { nearMissT = 0; nearMiss(); }
  assert('ニアミス5回で「ギリギリの達人」', !!achvGot.nearmiss);
  setState('achv'); let err = null; try { render(); } catch (e) { err = e.stack; }
  assert('実績一覧の描画', !err && ACHV.length >= 10, err || ACHV.length);
}


// ---- 76) 曲名 ----
assert('全曲に表示名がある', Object.keys(BGMDATA).every(k => SONG_LABEL[k]));


// ---- 77) あそびかたから P でも戻れる ----
{
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016); togglePause(); pauseChoose(3);
  onKeyDown({ key: 'p', repeat: false, preventDefault() {} });
  assert('あそびかたからPでポーズへ戻る', state === 'pause');
}





// ---- 79) 音楽の強化 ----
{
  assert('平面の曲はスプラッシュ(ファンク)', CONFIG.SURF.PLANE.music === 'splash' && BGMDATA.splash.form.length >= 5);
  let err = null;
  try { Snd.note(440, 0, 0.2, 'square', 0.1, 0.01, 0.05, 6, { flt: [2000, 300, 5], vib: [5, 10], pn: 0.3, rv: 0.3 }); Snd.ohat(0, 0.1); Snd.clap(0, 0.1); Snd.tom(0, 0.1, 150); Snd.crash(0, 0.1); }
  catch (e) { err = e.stack; }
  assert('新しい音色・打楽器はAC無しでも安全', !err, err);
  Bgm._load('splash'); assert('曲の読み込み', Bgm.section === 0); Bgm.stop();
}


// ---- 81) ヌメリンの体が線に当たるとミス ----
{
  for (const md of ['PLANE', 'SPHERE']) {
    settings.mode = md; startGame(); stTimer = 2; tickMeta(0.016); player.invuln = 0; held.fast = true;
    if (md === 'PLANE') steps(0, -1, 30); else { for (let i = 0; i < 8; i++) stepK(0); }
    const tc = trail[trail.length - 3], q = qixes[0];
    if (md === 'PLANE') { q.x = (tc % GW) + 1.5; q.y = ((tc / GW) | 0) + 0.5; q.segs = [{ x1: q.x + 3, y1: q.y - 0.2, x2: q.x + 5, y2: q.y + 0.2, h: 0 }]; }
    else { const nb1 = surf.nb[tc * 4 + 1]; q.p = [surf.dir[nb1 * 3], surf.dir[nb1 * 3 + 1], surf.dir[nb1 * 3 + 2]]; q.segs = [{ pts: [q.p] }]; }
    q.segT = 1; q.spd = 0; deathTimer = 0;
    updateQix(q, 0.001);
    assert(md + ': ヌメリンの体が線に触れるとミス', deathTimer > 0);
  }
  // 平面: 触手が斜めに細い線をまたいでも見逃さない
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016); player.invuln = 0; held.fast = true; steps(0, -1, 40);
  let missed = 0;
  for (let a = 0; a < 40; a++) {
    const tc = trail[20], x = (tc % GW) + 0.5, y = ((tc / GW) | 0) + 0.5, ang = a / 40 * Math.PI;
    if (Math.abs(Math.cos(ang)) < 0.2) continue;        // 線とほぼ平行な向きは除く
    const sg = { x1: x - Math.cos(ang) * 11 + 0.37, y1: y - Math.sin(ang) * 11, x2: x + Math.cos(ang) * 11 + 0.37, y2: y + Math.sin(ang) * 11 };
    let hit = false; surf.segEach(sg, c => { if (grid[c] === TRAIL) hit = true; return hit; });
    if (!hit) missed++;
  }
  assert('触手が細い線をすり抜けない', missed === 0, missed);
}


// ---- 82) セリフとキャラクター設定 ----
{
  // 場面のセリフ・レア・時事ネタ
  assert('場面のセリフ', CLAWD_LINES.claimB.includes(pickLine('claimB', null, 0.9).txt));
  const rr = pickLine('claimB', null, 0.01);
  assert('レアなセリフ(約4%)', rr.rare && RARE_LINES.includes(rr.txt));
  assert('時事ネタ: クリスマス・正月・金曜の夕方・深夜',
    dateLines(new Date(2026, 11, 25, 20)).some(x => x.includes('クリスマス')) && dateLines(new Date(2027, 0, 2, 10)).some(x => x.includes('あけまして'))
    && dateLines(new Date(2026, 8, 25, 18)).some(x => x.includes('金曜')) && dateLines(new Date(2026, 8, 24, 2)).some(x => x.includes('寝なくて')));
  assert('{name}の差し込み', pickLine('meet', { name: 'ガーコ' }, 0.9).txt.includes('ガーコ'));
}





// ---- 85) いろいろな色のインク・虹・アイテム ----
{
  settings.mode = 'PLANE'; settings.ink = 'MIX'; settings.theme = THEMES.length; startGame(); setState('play');
  qixes = []; sparxList = []; items = [];
  assert('平面は INK テーマ', inkMode());
  const seen = new Set();
  for (let i = 0; i < 40; i++) { nextInk(); seen.add(ink.i); }
  assert('MIX: いろいろな色になる', seen.size >= 8, seen.size);
  const a = ink.i; nextInk(); assert('続けて同じ色にならない', ink.i !== a);
  let ok = true;
  for (let i = 0; i < 200; i++) { const pr = ink.recent.slice(); const p0 = ink.i; nextInk(); if (pr.includes(ink.i) || hueGap(INK_COLORS[ink.i], INK_COLORS[p0]) < 45) ok = false; }
  assert('直前3色は使わず、色相も離れる', ok);
  // ローラー・描きかけの線・塗った陣地は同じ色(速い線でも)
  held.fast = false;
  let m = steps(0, -1, 3); player.usedFast = true;
  assert('ローラー=線=塗る色(速い線も)', trailHex(true) === inkHex() && trailHex(false) === inkHex() && palHex(inkNo(1)) === inkHex());
  const want = INK_BASE + ink.i;
  // 本当に線を閉じて、塗られた色がローラーの色と同じか
  settings.mode = 'PLANE'; startGame(); setState('play'); qixes = qixes.slice(0, 1); items = [];
  qixes[0].x = GW / 2; qixes[0].y = GH / 2; sparxes = [];
  const rollerCol = inkHex();
  held.fast = false; steps(0, -1, 6); steps(1, 0, 6); steps(0, 1, 6);
  const got = new Set(); for (let c = 0; c < surf.N; c++) if (grid[c] === WALL && colA[c] >= INK_BASE) got.add(palHex(colA[c]));
  assert('囲んだ陣地はローラーと同じ色', got.size === 1 && got.has(rollerCol), [...got].join() + ' / ' + rollerCol);
  assert('次の線は別の色になる', inkHex() !== rollerCol);
  assert('塗る色番号 = いまのインク', inkNo(1) === INK_BASE + ink.i && palHex(inkNo(1)) === INK_COLORS[ink.i]);
  assert('ローラーの色 = いまのインク', inkHex() === INK_COLORS[ink.i]);
  starT = 5; assert('STAR中は金のインク', palHex(inkNo(1)) === '#ffcc33'); starT = 0;
  // 虹: セルごとに帯の色
  ink.rainbowT = 5;
  assert('虹のときは -1(セルごと)', inkNo(1) === -1);
  const bins = new Set(); for (let c = 0; c < surf.N; c += 13) bins.add(colFor(c, -1));
  assert('虹: いくつもの色の帯になる', bins.size >= 6 && [...bins].every(v => v >= RB_BASE && v < RB_BASE + RB_N), bins.size);
  ink.rainbowT = 0;
  // 固定色(ネット対戦用の「自分の色」)
  settings.ink = 'CYAN'; for (let i = 0; i < 5; i++) nextInk();
  assert('固定色: いつも同じ色', ink.i === INK_FIXED.CYAN);
  settings.ink = 'RAINBOW'; assert('RAINBOW設定: いつも虹', inkNo(1) === -1);
  settings.ink = 'MIX';
  // 描画(平面・立体)が例外なし
  let err = null;
  try {
    for (let c = 0; c < 400; c++) if (grid[c] === OPEN) { grid[c] = WALL; colA[c] = c % 2 ? INK_BASE + 3 : RB_BASE + (c % RB_N); }
    redrawField(); render();
    settings.mode = 'CUBE'; startGame(); setState('play');
    for (let c = 0; c < surf.N; c += 3) if (grid[c] === OPEN) { grid[c] = WALL; colA[c] = c % 2 ? INK_BASE + 5 : RB_BASE + (c % RB_N); }
    ink.rainbowT = 3; buildColors(); render(); ink.rainbowT = 0;
  } catch (e) { err = e.stack; }
  assert('インク・虹の描画(平面・立体)が例外なし', !err, err);
  assert('インクの色を変えるアイテムは出ない', !ITEMS.rainbow && !ITEMS.splash && !ITEMS.paint);
}


// ---- 86) ミスの原因が出る ----
{
  settings.mode = 'PLANE'; startGame(); setState('play'); player.invuln = 0; deathTimer = 0;
  floats.length = 0; death('テスト');
  assert('ミスの原因を表示', lastDeath === 'テスト' && floats.some(f => f.txt === 'ミス: テスト'));
}


// ---- 87) 塗りの模様(時間・面積・アイテム・コンボ) ----
{
  const run = (setup) => {
    settings.mode = 'PLANE'; settings.ink = 'MIX'; startGame(); setState('play');
    qixes = qixes.slice(0, 1); qixes[0].x = GW * 0.8; qixes[0].y = GH * 0.8; sparxes = []; items = [];
    setup();
    held.fast = false; steps(0, -1, 14); steps(1, 0, 14); steps(0, 1, 14);
    const ms = new Set(); let n = 0;
    for (let c = 0; c < surf.N; c++) if (grid[c] === WALL && colA[c] >= INK_BASE) { n++; ms.add(mixA[c]); }
    return { n, ms };
  };
  assert('pickPattern: STAR=水玉 / COMBO=ストライプ / SLOW=波 / じっくり=うずまき / 大きい=波紋',
    (() => { starT = 1; const a = pickPattern({ drawTime: 0, pct: 1 }); starT = 0; combo = 1; const b = pickPattern({ drawTime: 0, pct: 1 }); combo = 3; const b2 = pickPattern({ drawTime: 0, pct: 1 }); combo = 0;
             slowT = 1; const c = pickPattern({ drawTime: 0, pct: 1 }); slowT = 0;
             return a === 'dots' && b === 'stripe' && b2 === 'check' && c === 'wave' && pickPattern({ drawTime: 6, pct: 1 }) === 'swirl'
               && pickPattern({ drawTime: 0, pct: 30 }) === 'ripple' && pickPattern({ drawTime: 0, pct: 1 }) === 'grad'; })());
  const g = run(() => {});
  assert('ふつうに塗るとグラデーション(混ぜ具合が何段階もある)', g.n > 50 && g.ms.size >= 4, g.n + ' / ' + [...g.ms]);
  const st = run(() => { starT = 10; });
  let gold = 0; for (let c = 0; c < surf.N; c++) if (mixA[c] && palHex(col2A[c]) === '#ffcc33') gold++;
  assert('STAR中は金の水玉', gold > 3, gold); starT = 0;
  const sp = run(() => { combo = 2; comboT = 5; });
  assert('コンボ中はストライプ(2段: 地と縞)', sp.ms.size === 2, [...sp.ms]); combo = 0;
  // 描画(平面・立体)
  let err = null;
  try {
    redrawField(); render();
    settings.mode = 'CUBE'; startGame(); setState('play');
    const cells = []; for (let c = 0; c < surf.N; c += 2) if (grid[c] === OPEN) { grid[c] = WALL; colA[c] = INK_BASE + 2; cells.push(c); }
    waveFrom = cells[0]; applyPattern(cells, 'check'); applyPattern(cells.slice(0, 200), 'dots'); render();
  } catch (e) { err = e.stack; }
  assert('模様の描画(平面・立体)が例外なし', !err, err);
  assert('立体の混ぜ色の枠が作られる', mixSlotKeys.length > 0 && mixSlotKeys.length <= MIX_SLOTS);
}


// ---- 88) 線の色 / 曲 ----
{
  // 線: となりの陣地の色がにじむ
  settings.mode = 'PLANE'; startGame(); setState('play');
  const x0 = 20, y0 = 20;
  for (let y = y0; y < y0 + 10; y++) for (let x = x0; x < x0 + 21; x++) { const c = idx(x, y); grid[c] = WALL; colA[c] = x < x0 + 10 ? INK_BASE + 0 : x > x0 + 10 ? INK_BASE + 2 : 0; }
  const mid = idx(x0 + 10, y0 + 5);
  assert('陣地のあいだの線は、となりの2色', lineNeighbors(mid).length === 2 && lineHex(mid, x0 + 10, y0 + 5) !== null);
  err = null; try { redrawField(); } catch (e) { err = e.stack; }
  assert('線の色つきの焼き込みが例外なし', !err, err);
  // 曲
  assert('アースの曲がある', BGMDATA.earth && BGMDATA.earth.tracks.every(tr => tr.t !== 'n' || tr.s.length === 64) && CONFIG.SURF.SPHERE.music === 'earth');
}


// ---- 89) 塗る音のいろいろ ----
{
  assert('塗る音は6種類', Snd.claimVoices.join() === 'classic,arp,shepard,harp,bell,stab');
  settings.claimSnd = 'HARP'; assert('固定: HARP', Snd.pickClaimSnd() === 'harp');
  settings.claimSnd = 'MIX'; combo = 2; assert('MIX: コンボ中は無限音階', Snd.pickClaimSnd() === 'shepard'); combo = 0;
  const seen = new Set(); for (let i = 0; i < 60; i++) seen.add(Snd.pickClaimSnd());
  assert('MIX: いろいろ鳴る', seen.size >= 5, [...seen]);
  let err = null; try { for (const k of CLAIM_SND_OPTS) { settings.claimSnd = k; Snd.claim(800, true, 'dots'); } } catch (e) { err = e.stack; }
  assert('どの塗る音でも例外なし(音声なし環境)', !err, err);
  settings.claimSnd = 'MIX';
  assert('OPTIONSに「塗る音」', OPT_ITEMS.some(it => it.k === 'claimSnd'));
}


// ---- 90) 立体でもヌメリンの腕が線をすり抜けない ----
for (const mode of ['SPHERE', 'CUBE', 'TORUS', 'KLEIN']) {
  settings.mode = mode; startGame(); setState('play');
  const q = qixes[0], sg = surf.qixArm(q, 0.7, surf.def.arm);
  // 腕の上を細かくたどったマスが、どれも segEach で調べられている
  const P = sg.pts, cells = new Set();
  for (let i = 0; i + 1 < P.length; i++) for (let s2 = 0; s2 < 2; s2++) {
    const t2 = s2 / 2, a = P[i], b = P[i + 1];
    const pt = a.map((v, j) => v + (b[j] - v) * t2);
    if (Math.abs(b[0] - a[0]) > 1 || Math.abs(b[1] - a[1]) > 1) continue;   // 貼り合わせの継ぎ目はとばす
    cells.add(surf.ptCell(pt.length === 3 ? vnorm(pt) : pt));   // 球の上の点は球面へ戻す(直線で結ぶと内側にずれる)
  }
  const seen = new Set(); surf.segEach(sg, c => { seen.add(c); return false; });
  const miss = [...cells].filter(c => !seen.has(c));
  assert(mode + ': 腕の上のマスは判定される(角の先をかすめる2マスまでは許す)', miss.length <= 2, miss.length + '/' + cells.size);
  // 腕の途中に1マスだけ線を置く → ミス
  const mid = [...cells].filter(c => seen.has(c))[Math.floor(cells.size * 0.3)];
  if (grid[mid] === OPEN) {
    player.invuln = 0; deathTimer = 0; q.segs = [sg]; grid[mid] = TRAIL; trail = [mid]; player.drawing = true;
    let hit = false; surf.segEach(sg, c => { if (grid[c] === TRAIL) hit = true; return hit; });
    assert(mode + ': 腕の途中の線に当たる', hit);
    grid[mid] = OPEN; trail = []; player.drawing = false;
  }
}


// ---- 91) アナログスティック ----
{
  const R = 88;
  assert('スティック: 真ん中は止まる', stickDir(5, -8, null, R) === null);
  assert('スティック: 上下左右', stickDir(0, -50, null, R) === 'up' && stickDir(0, 50, null, R) === 'down' && stickDir(-50, 5, null, R) === 'left' && stickDir(50, -5, null, R) === 'right');
  assert('スティック: 斜めの境目ではいまの向きを保つ', stickDir(40, -44, 'right', R) === 'right' && stickDir(44, -40, 'up', R) === 'up');
  settings.mode = 'PLANE'; startGame(); setState('play');
  stickSet('left'); assert('スティックで方向キーが押される', currentDir() === 'left');
  stickSet('up'); assert('向きを変えると前の向きは離される', currentDir() === 'up' && !held.left);
  stickSet(null); assert('指を離すと止まる', currentDir() === null);
  setState('options'); optSel = 0; stickSet('down'); stickSet(null);
  assert('メニューではスティックで選べる', optSel === 1);
  setState('title');
}


// ---- 92) ギャラリー・クリアの見せ場 ----
{
  // ギャラリー(シムでは画像が作れないので、入っている体で表示と操作を確かめる)
  gallery = [{ img: 'data:image/jpeg;base64,AA', s: 'PLANE', p: 72.5, d: '2026-09-25', sc: 1234 }, { img: 'data:image/jpeg;base64,BB', s: 'SPHERE', p: 80, d: '2026-09-25', sc: 99 }];
  backToTitle();
  onKeyDown({ key: 'g', preventDefault() {} });
  assert('タイトルでGを押すとギャラリー', state === 'gallery');
  onKeyDown({ key: 'ArrowRight', preventDefault() {} }); onKeyDown({ key: 'z', preventDefault() {} });
  err = null; try { render(); } catch (e) { err = e.stack; }
  assert('ギャラリーを選んで大きく表示', !err && gallerySel === 1 && galleryBig, err);
  onKeyDown({ key: 'x', preventDefault() {} }); onKeyDown({ key: 'x', preventDefault() {} });
  assert('Xで閉じてタイトルへ', state === 'title');
  assert('captureArt は画像が作れない環境でも落ちない', captureArt() === false);
  gallery = [];
  // クリアの見せ場: はじめは結果の板を出さない
  settings.mode = 'PLANE'; startGame(); setState('play'); startClear(false);
  err = null; try { stTimer = 0.3; render(); stTimer = 1.5; render(); } catch (e) { err = e.stack; }
  assert('クリアの見せ場の描画が例外なし', !err, err);
}


// ---- 93) 自由移動(平面) ----
{
  settings.mode = 'PLANE'; startGame(); setState('play'); sparxes = []; items = [];
  qixes = qixes.slice(0, 1); qixes[0].x = GW * 0.8; qixes[0].y = GH * 0.3;
  for (const k of ['up', 'down', 'left', 'right']) releaseDir(k);
  assert('斜めの入力は正規化される', (() => { pressDir('up'); pressDir('right'); const v = inputVec(); releaseDir('up'); releaseDir('right'); return Math.abs(Math.hypot(v[0], v[1]) - 1) < 1e-9 && v[0] > 0 && v[1] < 0; })());
  const x0 = player.fx, y0 = player.fy;
  pressDir('up'); pressDir('right');
  for (let i = 0; i < 40; i++) update(1 / 60);
  assert('斜めにすすんで線を引く', player.drawing && player.fx > x0 + 1 && player.fy < y0 - 1, player.fx.toFixed(1) + ',' + player.fy.toFixed(1));
  let conn = true;
  for (let i = 1; i < trail.length; i++) if (nbIndex(trail[i - 1], trail[i]) < 0) conn = false;
  assert('斜めでも線は上下左右につながっている', conn && trail.length > 5);
  releaseDir('right'); pressDir('left');                // 左上へ
  for (let i = 0; i < 40; i++) update(1 / 60);
  releaseDir('up'); pressDir('down');                    // 左下へ → 下の壁に戻って閉じる
  for (let i = 0; i < 200 && player.drawing; i++) update(1 / 60);
  for (const k of ['up', 'down', 'left', 'right']) releaseDir(k);
  assert('斜めの線で囲んで陣地が取れる', !player.drawing && claimed > 20, claimed);
  assert('線の上に戻っている', isBoundary(player.c));
  stickVec = [0.6, -0.8];
  assert('スティックのアナログの向きがそのまま使われる', inputVec()[0] === 0.6);
  stickVec = null;
}
// ---- 94) ナワバリバトル(CPU) ----
{
  settings.mode = 'VS'; startGame(); setState('play'); sparxes = []; items = [];
  assert('VS: CPUは3人・全員別の色・制限時間', rivals.length === 3 && new Set(rivals.map(r => r.team).concat([0])).size === 4 && vsT === CONFIG.VS_TIME && qixes.length === 1);
  const r = rivals[0];
  assert('CPUは線の上から始まる', isBoundary(r.c));
  // CPU が陣地を取る
  let t0 = rivalAreaSum();
  for (let i = 0; i < 60 * 25 && state === 'play'; i++) { blinkT += 1 / 60; update(1 / 60); if (deathTimer > 0) while (deathTimer > 0) update(1 / 60); }
  assert('CPUが自分で陣地を取る', rivalAreaSum() > t0, rivalAreaSum());
  assert('自機とCPUと中立の陣地の合計 = 全体', playerArea() + rivalAreaSum() + neutralArea() === claimed, playerArea() + '+' + rivalAreaSum() + '+' + neutralArea() + ' vs ' + claimed);
  // CPU が自機の線を切る
  startGame(); setState('play'); player.invuln = 0; deathTimer = 0;
  const rr = rivals[0];
  player.drawing = true; const tc = idx(40, 60); grid[tc] = TRAIL; trail = [tc];
  rr.drawing = true; rivalStep(rr, tc);
  assert('CPUが自機の線に触れると自機のミス', deathTimer > 0 && lastDeath.includes('線を切られた'), lastDeath);
  deathTimer = 0; grid[tc] = OPEN; trail = []; player.drawing = false; rr.drawing = false; rr.trail = [];
  // 自機が CPU の線を切る
  rr.c = idx(50, 70); rr.drawing = true; const rc = idx(51, 70); grid[rc] = RTRAIL; rr.trail = [rc]; rr.pts = [[50.5, 70.5]];
  player.drawing = true; player.c = idx(52, 70); trail = [player.c]; grid[player.c] = TRAIL;
  playerStep(rc);
  assert('自機がCPUの線に触れるとCPUがダウン', rr.dead > 0 && grid[rc] !== RTRAIL);
  // 勝ち負け
  const fakeArea = (me, cpu, cpu2) => { cpu2 = cpu2 || 0; let a = 0, b2 = 0, b3 = 0; for (let i = 0; i < surf.N; i++) { if (grid[i] !== OPEN) continue; if (a < me) { grid[i] = WALL; ownA[i] = 1; a++; } else if (b2 < cpu) { grid[i] = WALL; ownA[i] = 2; b2++; } else if (b3 < cpu2) { grid[i] = WALL; ownA[i] = 3; b3++; } } claimed = me + cpu + cpu2; recountAreas(); };
  startGame(); setState('play'); fakeArea(40, 10);
  vsEnd(); assert('いちばん広ければ勝ち(自機40 > CPU10)', state === 'vsres' && vsWin);
  startGame(); setState('play'); fakeArea(40, 30, 30);
  vsEnd(); assert('CPUの合計より小さくても、1位なら勝ち(40 > 30, 30)', state === 'vsres' && vsWin);
  startGame(); setState('play'); fakeArea(10, 60); const lv0 = lives;
  vsEnd(); assert('せまいと負け', state === 'vsres' && !vsWin);
  let err = null; try { render(); } catch (e) { err = e.stack; } assert('負け画面の描画', !err, err);
  stTimer = 2; onAction(); assert('負けたら(時間制は残機を使わずに)やり直し', lives === lv0 && state === 'ready');
  err = null; try { setState('play'); render(); } catch (e) { err = e.stack; } assert('VSの描画(CPU・バー)', !err, err);
  assert('VSの自機は赤チーム(赤系で揺らぐ)', inkHex() === TEAM_SHADES[0][0] && TEAM_SHADES[0].includes(palHex(inkNo(1))));
  assert('VSのCPUは2ラウンドごとに増えて7人まで', vsCpuCount(1) === 3 && vsCpuCount(3) === 4 && vsCpuCount(20) === 7);
  { const pairs = new Set(); for (let a = 0; a < NT; a++) for (let b = a + 1; b < NT; b++) pairs.add(pairIndex(a, b)); assert('中立の色は28組すべて別', pairs.size === 28 && Math.max(...pairs) === 27); }
}


// ---- 96) チームの色の揺らぎ・上塗り・中立・ハーモニー ----
{
  const shades = new Set(); for (let i = 0; i < 40; i++) shades.add(palHex(teamNo(2)));
  assert('チームの色は系統の中で揺らぐ(青系4色)', shades.size === 4 && [...shades].every(c => TEAM_SHADES[2].includes(c)));
  assert('中立の色: 赤+青=紫系', NEUTRAL_MIX['02'].includes(palHex(neutralNo(2, 0))));
  settings.mode = 'VS'; settings.vsCpu = '3'; startGame(); setState('play'); sparxes = []; items = [];
  // 黄(CPU)の陣地を作る
  const R = rivals[0], B = rivals[1];
  const cells = []; for (let y = 60; y < 70; y++) for (let x = 40; x < 60; x++) { const c = idx(x, y); if (grid[c] !== OPEN) continue; grid[c] = WALL; ownA[c] = 2 + R.id; colA[c] = teamNo(R.team); cells.push(c); }
  claimed += cells.length; recountAreas();
  const r0 = R.area;
  // 青が上塗りで赤の陣地を走る → 中立
  B.overT = 5; B.c = idx(50, 65); B.fx = 50.5; B.fy = 65.5; B.drawing = false;
  const n1 = overPaint(50.5, 65.5, 2 + B.id, B.team);
  assert('相手の陣地を上塗りすると中立になる', n1 > 0 && neutralArea() === n1 && R.area === r0 - n1);
  assert('中立は2色が混ざった色(黄+青=緑系)', NEUTRAL_MIX['12'].includes(palHex(colA[idx(50, 65)])));
  assert('中立になったばかりは、すぐには自分の色にならない', overPaint(50.5, 65.5, 2 + B.id, B.team) === 0);
  blinkT += 1.5;
  const n2 = overPaint(50.5, 65.5, 2 + B.id, B.team);
  assert('中立をもう一度塗ると自分の陣地', n2 === n1 && neutralArea() === 0 && B.area >= n1 && TEAM_SHADES[2].includes(palHex(colA[idx(50, 65)])));
  assert('全体 = 各チーム + 中立', rivals.reduce((a, r) => a + r.area, 0) + neutralArea() + ownCount[1] + ownCount[0] === claimed);
  // 上塗り中は陣地の上を歩ける
  assert('上塗り中は陣地の上を歩ける', rivalStep(B, idx(51, 65)) && B.c === idx(51, 65));
  B.overT = 0;
  // アイテム: 上塗りは対戦だけ
  settings.mode = 'TOUR'; let none = true; for (let i = 0; i < 200; i++) if (pickItemKind() === 'over') none = false;
  assert('ひとりのモードに上塗りは出ない', none);
  // 音(音声なし環境でも落ちない)
  settings.mode = 'VS'; startGame(); setState('play');
  let err = null; try { rivals[0].drawing = true; updateVoices(); rivals[0].drawing = false; updateVoices(); Snd.voiceStopAll(); } catch (e) { err = e.stack; }
  assert('描く音のハーモニー(音声なし環境で例外なし)', !err, err);
  err = null; try { rivals[1].overT = 3; render(); } catch (e) { err = e.stack; } assert('上塗り中の描画', !err, err);
  settings.mode = 'VS'; settings.vsCpu = 'AUTO';
}


// ---- 97) 上塗りアイテムの出やすさ・生き返りの表示 ----
{
  settings.mode = 'VS'; startGame(); setState('play'); items = [];
  let err = null;
  try { const r = rivals[1]; rivalFail(r, 'qix'); render(); r.dead = 0.001; updateRivals(0.01); render(); } catch (e) { err = e.stack; }
  assert('やられている間の輪・復活の輪の描画', !err && rivals[1].dead === 0 && rivals[1].inv > 0, err);
  settings.mode = 'VS';
}


// ---- 98) 魂の演出・チームの人数 ----
{
  settings.mode = 'VS'; settings.vsCpu = '7'; startGame(); setState('play');
  // 魂: 昇って、戻ってくる
  const r = rivals[4]; rivalFail(r, 'qix');
  r.dead = CONFIG.RIVAL_RESPAWN * 0.8; const up = soulPos(r);
  r.dead = CONFIG.RIVAL_RESPAWN * 0.3; const back = soulPos(r);
  r.dead = 0.0001; const last = soulPos(r);
  const home = { x: ((r.home % GW) + 0.5) * CS, y: FIELD_Y + (((r.home / GW) | 0) + 0.5) * CS };
  assert('魂はまず上へ昇る', up.up && up.y < r.soul.y);
  assert('復活の前に戻る場所へ着く', !back.up && Math.hypot(last.x - home.x, last.y - home.y) < 3);
  let err = null; try { render(); death('テスト'); render(); } catch (e) { err = e.stack; } assert('魂の描画(ファイター・自機)', !err, err);
  // 8人でも重すぎない(20秒ぶんの更新)
  const t0 = Date.now(); let f = 0;
  for (; f < 60 * 20 && state === 'play'; f++) { blinkT += 1 / 60; update(1 / 60); if (deathTimer > 0) while (deathTimer > 0) update(1 / 60); }
  assert('8人でも1フレーム2ms未満(更新)', (Date.now() - t0) / Math.max(1, f) < 2, ((Date.now() - t0) / f).toFixed(2));
  settings.vsCpu = 'AUTO';
}


// ---- 99) 立体の対戦 ----
{
  settings.mode = 'VS'; startGame(); level = 2; initLevel(2); setState('play');
  assert('ラウンド2は立体(立方体)', surf.is3D && surf.key === CONFIG.TOUR[1]);
  assert('立体でも全員が線の上から', rivals.length === vsCpuCount(2) && rivals.every(r => isBoundary(r.c)));
  for (let i = 0; i < 60 * 25 && state === 'play'; i++) { blinkT += 1 / 60; update(1 / 60); if (deathTimer > 0) while (deathTimer > 0) update(1 / 60); }
  assert('立体でもCPUが陣地を取る', rivalAreaSum() > 0);
  let err = null;
  // 球
  startGame(); level = 3; initLevel(3); setState('play');
  assert('VSも立体(球)でCPUが出る(全員別の基地)', surf.is3D && rivals.length === vsCpuCount(3) && rivals.every(r => isBoundary(r.c)) && new Set(rivals.map(r => r.home)).size === rivals.length);
  err = null; try { for (let i = 0; i < 60 * 10 && state === 'play'; i++) { blinkT += 1 / 60; update(1 / 60); if (deathTimer > 0) while (deathTimer > 0) update(1 / 60); } render(); } catch (e) { err = e.stack; }
  assert('VSの立体が例外なく進む', !err, err);
}


// ---- 100) 結果画面・音・対戦の設定・キーコンフィグ・掛け合い・柄 ----
{
  // 結果画面
  settings.mode = 'VS'; settings.vsCpu = 'AUTO'; startGame(); setState('play');
  vsStat.kills = 2; rivals[0].kills = 1; rivals[0].downs = 3;
  vsEnd();
  let err = null; try { stTimer = 0.3; render(); stTimer = 2; render(); } catch (e) { err = e.stack; }
  assert('VSの結果画面(しゅうりょう → 表)', !err && state === 'vsres' && vsResult.rank.some(e => e.me && e.kills === 2), err);
  // 設定: CPUの数・時間・ステージ
  settings.vsCpu = '6'; settings.matchTime = 120; settings.stageSel = 'TORUS';
  startGame(); setState('play');
  assert('設定: CPU6人・120秒・ドーナツ', rivals.length === 6 && vsT === 120 && surf.key === 'TORUS');
  settings.stageSel = 'RANDOM'; startGame();
  assert('設定: ランダムは毎回の並びから', CONFIG.SURF[surf.key] && stageOrder.length === Object.keys(CONFIG.SURF).length);
  settings.vsCpu = 'AUTO'; settings.matchTime = 90; settings.stageSel = 'TOUR';
  backToTitle(); openMatchOpts('options');
  err = null; try { render(); matchSel = MATCH_ITEMS.findIndex(it => it.k === 'matchTime'); matchAdjust(1); render(); } catch (e) { err = e.stack; }
  assert('対戦の設定の画面', !err && state === 'matchopts' && settings.matchTime === 120, err);
  settings.matchTime = 90;
  // キーコンフィグ: 「↑」を KeyT に
  matchSel = MATCH_ITEMS.findIndex(it => it.k === '_keys'); matchAdjust(1); assert('キーコンフィグの画面へ', state === 'keycfg');
  keySel = [0, 0]; keyCfgKey({ key: 'z' }); keyCfgKey({ key: 't', code: 'KeyT' });
  assert('キーを変えられる', PLAY_KEYS.u[0] === 'KeyT' && store.get('qlaim.keys', {}).u[0] === 'KeyT');
  err = null; try { render(); } catch (e) { err = e.stack; } assert('キーコンフィグの描画', !err, err);
  // 変えたキーで動ける
  settings.mode = 'VS'; startGame(); setState('play');
  codesDown.add('KeyT'); const v = inputVec(); codesDown.clear();
  assert('変えたキーで動ける', v && v[1] < 0);
  keyCfgKey({ key: 'r' }); assert('R で元に戻す', PLAY_KEYS.u[0] === 'KeyW');
  // 掛け合い
  settings.mode = 'VS'; startGame(); setState('play');
  banterT = 0; updateBanter(0.01);
  const said = rivals.some(r => r.sayT > 0) || speech.t > 0;
  updateBanter(1.0);
  assert('掛け合い: ひとりが言って、だれかが返す', said && banterQ.length === 0);
  // コンボの柄
  const cells = []; for (let y = 40; y < 70; y++) for (let x = 20; x < 60; x++) { const c = idx(x, y); grid[c] = WALL; colA[c] = teamNo(2); cells.push(c); }
  for (const pt of ['ichimatsu', 'asanoha', 'flower']) {
    applyTeamPattern(cells, pt, cells[0]);
    const on = cells.filter(c => mixA[c] > 0).length;
    assert('柄: ' + pt + ' がつく(一部だけ白っぽく)', on > 20 && on < cells.length * 0.8, on + '/' + cells.length);
  }
  for (const pt of BIG_PATS) {
    applyTeamPattern(cells, pt, cells[0]);
    const on = cells.filter(c => mixA[c] > 0).length;
    assert('大きく囲んだときの柄: ' + pt, on > 20 && on < cells.length * 0.8, on + '/' + cells.length);
  }
  assert('大きく囲むと和柄(コンボなし)', BIG_PATS.includes(claimPattern(cells, 0, cells[0])) && isBigClaim(cells.length) && !isBigClaim(40));
  assert('コンボのときはコンボの柄', claimPattern(cells, 2, cells[0]) === 'asanoha');
  { const a = pickBigPat(), b = pickBigPat(); assert('和柄は続けて同じにならない', a !== b); }
  assert('コンボ1=市松 2=麻の葉 3=フラワーオブライフ', teamPat(1) === 'ichimatsu' && teamPat(2) === 'asanoha' && teamPat(5) === 'flower' && teamPat(0) === null);
  err = null; try { redrawField(); } catch (e) { err = e.stack; } assert('柄の焼き込み', !err, err);
  // 描く音: 試合の外では止まる
  err = null; try { setState('title'); tickMeta(0.016); } catch (e) { err = e.stack; } assert('試合の外では描く音を止める', !err && Snd.voiceCount === 0, err);
}


// ---- 101) CPUの強さ5段階・上のバーの色ごとの割合 ----
{
  settings.mode = 'VS';
  const sk = CPU_LV.map(l => { settings.cpuLv = l; level = 1; return rivalSkill(); });
  assert('強さは5段階(悪魔がいちばん)', CPU_LV.length === 5 && CPU_LV[4] === '悪魔' && sk.every((v, i) => i === 0 || v > sk[i - 1]) && sk[4] > 1.4);
  assert('悪魔は迷わない(考える時間がとても短い)', (() => { settings.cpuLv = '悪魔'; let m = 0; for (let i = 0; i < 50; i++) m = Math.max(m, thinkTime()); return m < 0.05; })());
  settings.cpuLv = '悪魔'; startGame(); setState('play');
  let err = null; try { for (let i = 0; i < 60 * 15 && state === 'play'; i++) { blinkT += 1 / 60; update(1 / 60); if (deathTimer > 0) while (deathTimer > 0) update(1 / 60); } render(); } catch (e) { err = e.stack; }
  assert('悪魔のCPUで試合が進む・バーの描画', !err, err);
  settings.cpuLv = 'AUTO';
}


// ---- 102) ナワバリバトルの準備画面・残機制 ----
{
  settings.mode = 'VS'; settings.vsRule = 'TIME'; backToTitle();
  onAction(); assert('VSを選んで決定すると準備画面', state === 'vssetup');
  stTimer = 1;
  vsSel = 0; vsSetKey('ArrowRight'); assert('準備画面: ステージを変える', settings.stageSel === 'RANDOM');
  vsSetKey('ArrowLeft');
  const vi = k2 => VSSET_ITEMS.findIndex(it => it.k === k2);
  vsSel = vi('vsRule'); vsSetKey('ArrowRight'); assert('準備画面: ルールを残機制に', settings.vsRule === 'STOCK');
  vsSel = vi('_amount'); vsSetKey('ArrowRight'); assert('残機制なら残機の数を変える', settings.vsStock === 4);
  vsSel = vi('vsCpu'); vsSetKey('ArrowRight'); assert('CPUの数', settings.vsCpu === '1');
  vsSel = vi('vsCpu'); for (let i = 0; i < 3; i++) vsSetKey('ArrowRight');   // 1 → 4人
  let err = null; try { render(); } catch (e) { err = e.stack; } assert('準備画面の描画', !err, err);
  vsSel = VSSET_ITEMS.length - 1; vsSetKey('z');
  assert('スタートで残機制の試合(時間なし・CPU4人・みんな残機4)', state === 'ready' && isStock() && rivals.length === 4 && rivals.every(r => r.stock === 4) && lives === 3);
  setState('play'); sparxes = [];
  // CPUを全員脱落させると勝ち
  for (const r of rivals) { for (let i = 0; i < 4; i++) { r.dead = 0; rivalFail(r, 'cut'); } }
  assert('残機がなくなると脱落', rivals.every(r => r.out));
  update(1 / 60);
  assert('全員脱落させたら勝ち', state === 'vsres' && vsResult.win);
  // 自機が脱落すると負け(ゲームオーバーにはならない)
  startGame(); setState('play'); lives = 0; player.invuln = 0; death('テスト'); while (deathTimer > 0) update(1 / 60);
  assert('残機制で自機が脱落すると、その試合の負け', state === 'vsres' && !vsResult.win);
  stTimer = 2; onAction(); assert('負けても同じラウンドをもう一度(ゲームオーバーなし)', state === 'ready' && lives === vsStock() - 1);
  err = null; try { setState('play'); render(); } catch (e) { err = e.stack; } assert('残機制の上のバー', !err, err);
  // 時間制では時間が進む・残機制では進まない
  const t0 = vsT; update(1 / 60); assert('残機制は時間で終わらない', vsT === t0);
  settings.vsRule = 'TIME'; settings.vsStock = 3; settings.vsCpu = 'AUTO'; settings.stageSel = 'TOUR';
}


// ---- 103) ステージの広さ ----
{
  settings.mode = 'VS'; settings.vsRule = 'TIME'; settings.stageSel = 'PLANE';
  const Wbefore = W;
  for (const [sz, gw] of [['S', 100], ['M', 128], ['L', 160], ['XL', 200]]) {
    settings.stageSize = sz; startGame();
    assert('広さ ' + sz + ': 平面は ' + gw + ' マス幅・画面の大きさは同じ', GW === gw && Math.abs(GW * CS - Wbefore) < 0.5 && surf.N === GW * GH && fieldC.width === Math.round(GW * CS));
  }
  settings.stageSize = 'XL'; settings.vsCpu = '7'; startGame(); setState('play');
  let err = null; try { for (let i = 0; i < 60 * 15 && state === 'play'; i++) { blinkT += 1 / 60; update(1 / 60); if (deathTimer > 0) while (deathTimer > 0) update(1 / 60); } render(); redrawField(); } catch (e) { err = e.stack; }
  assert('特大の平面でCPU7人の試合が進む', !err && rivals.length === 7 && rivals.every(r => r.home >= 0 && r.home < surf.N), err);
  // 立体も広くなる
  settings.stageSel = 'CUBE'; settings.stageSize = 'M'; startGame(); const n1 = surf.N;
  settings.stageSize = 'XL'; startGame(); const n2 = surf.N;
  assert('立体も広さでマスが増える(立方体)', n2 > n1 * 1.8, n1 + '→' + n2);
  settings.stageSel = 'KLEIN'; startGame(); setState('play');
  err = null; try { for (let i = 0; i < 60 * 8 && state === 'play'; i++) { blinkT += 1 / 60; update(1 / 60); if (deathTimer > 0) while (deathTimer > 0) update(1 / 60); } render(); } catch (e) { err = e.stack; }
  assert('特大のクラインの壺(裏返りのつなぎも広さに合わせる)', !err, err);
  // AUTO は人数で
  settings.stageSize = 'AUTO'; settings.vsCpu = '3'; assert('AUTO: 4人なら中', stageSizeFor(1) === 'M');
  settings.vsCpu = '6'; assert('AUTO: 7人なら大', stageSizeFor(1) === 'L');
  settings.vsCpu = '7'; assert('AUTO: 8人なら特大', stageSizeFor(1) === 'XL');
  settings.mode = 'TOUR'; assert('ひとりのモードはいつも中', stageSizeFor(1) === 'M');
  settings.mode = 'VS'; settings.vsCpu = 'AUTO'; settings.stageSel = 'TOUR'; settings.stageSize = 'AUTO';
  startGame();
}


// ---- 104) リザルトで立体を観察 ----
{
  settings.mode = 'VS'; settings.stageSel = 'CUBE'; startGame(); setState('play');
  vsEnd();
  assert('リザルトに入る(観察はオフ)', state === 'vsres' && !resHide && resZoom === 4.7);
  stTimer = 2;
  // 矢印で回る
  const R0 = cam.R.slice(); pressDir('left'); for (let i = 0; i < 10; i++) updateCamera(1 / 60); releaseDir('left');
  assert('矢印キーで立体が回る', cam.R.some((v, i) => Math.abs(v - R0[i]) > 1e-3));
  // V で表を隠す
  onKeyDown({ key: 'v', preventDefault() {} }); assert('V で結果の表を隠す', resHide);
  let err = null; try { render(); onKeyDown({ key: 'v', preventDefault() {} }); render(); } catch (e) { err = e.stack; }
  assert('観察中・結果の描画', !err && !resHide, err);
  // 拡大縮小(カメラの距離が近づく)
  resZoom = 3; for (let i = 0; i < 120; i++) updateCamera(1 / 60);
  assert('拡大縮小でカメラが寄る', Math.abs(cam.D - 3) < 0.2, cam.D.toFixed(2));
  // さわっていなければ、ゆっくり自動で回る
  resIdle = 9; const R1 = cam.R.slice(); for (let i = 0; i < 30; i++) updateCamera(1 / 60);
  assert('さわらないと自動で回る', cam.R.some((v, i) => Math.abs(v - R1[i]) > 1e-3));
  settings.stageSel = 'TOUR';
}

// ---- 105) じゃま役(ヌメリン・バチッコ)の ON / OFF ----
{
  settings.mode = 'VS'; backToTitle(); onAction(); stTimer = 1;
  vsSel = VSSET_ITEMS.findIndex(it => it.k === '_enemy');
  vsSetKey('ArrowRight'); assert('準備画面: じゃま役 → ヌメリンだけ', settings.numerin === 'ON' && settings.bachikko === 'OFF');
  vsSetKey('ArrowRight'); vsSetKey('ArrowRight'); assert('準備画面: じゃま役 → なし', settings.numerin === 'OFF' && settings.bachikko === 'OFF');
  let err = null; try { render(); } catch (e) { err = e.stack; } assert('準備画面の描画', !err, err);
  for (const sk of ['PLANE', 'CUBE']) {
    settings.stageSel = sk; startGame(); setState('play');
    assert(sk + ': じゃま役なしならヌメリンもバチッコも出ない', qixes.length === 0 && sparxes.length === 0);
    const open0 = countCells(OPEN);
    err = null;
    try { for (let i = 0; i < 60 * 20 && state === 'play'; i++) { blinkT += 1 / 60; update(1 / 60); if (deathTimer > 0) while (deathTimer > 0) update(1 / 60); } render(); } catch (e) { err = e.stack; }
    assert(sk + ': じゃま役なしでも試合が進む・陣地が取れる', !err && countCells(OPEN) < open0 && sparxes.length === 0, err);
  }
  // 狭いほうを塗る
  settings.stageSel = 'PLANE'; startGame(); setState('play');
  const k = keepCell(); let n = 0; const v = visitedFrom(k); for (let i = 0; i < surf.N; i++) if (v[i]) n++;
  assert('ヌメリンがいないときは広い空き地を残す', n === countCells(OPEN));
  settings.numerin = 'ON'; settings.bachikko = 'ON'; settings.stageSel = 'TOUR';
  startGame(); assert('ONに戻すとヌメリンが出る', qixes.length === 1);
}

// ---- 106) 時間制は残機なし ----
{
  settings.mode = 'VS'; settings.vsRule = 'TIME'; startGame(); setState('play');
  const l0 = lives; player.invuln = 0;
  for (let k = 0; k < 8; k++) { death('テスト'); while (deathTimer > 0) update(1 / 60); player.invuln = 0; }
  assert('時間制: 何度やられてもゲームオーバーにならない', state === 'play' && lives === l0);
  { let b = 0; for (let i = 0; i < surf.N && b < 200; i++) if (grid[i] === OPEN) { grid[i] = WALL; ownA[i] = 2; b++; } claimed += b; recountAreas(); } vsEnd(); stTimer = 2; onAction();
  assert('時間制: 負けても同じラウンドをやり直し', state === 'ready' && lives === l0 && level === 1);
  let only = true; for (let i = 0; i < 300; i++) if (pickItemKind() === 'life') only = false;
  assert('時間制: 1UP は出ない', only);
  let err = null; try { setState('play'); render(); } catch (e) { err = e.stack; } assert('時間制のHUD', !err, err);
}

// ---- 107) 決着前の10秒で BGM が盛り上がる ----
{
  settings.mode = 'VS'; settings.vsRule = 'TIME'; startGame(); setState('play'); player.invuln = 99;
  Bgm.climax = false; vsT = 12;
  for (let i = 0; i < 60 * 1.5 && state === 'play'; i++) update(1 / 60);
  assert('残り12秒ではまだ', !Bgm.climax);
  for (let i = 0; i < 60 * 1.5 && state === 'play'; i++) update(1 / 60);
  assert('残り10秒で盛り上げ・「ラスト10秒!」', Bgm.climax && floats.some(f => f.txt === 'ラスト10秒!'));
  for (let i = 0; i < 60 * 12 && state === 'play'; i++) update(1 / 60);
  assert('時間切れで盛り上げを止める', state === 'vsres' && !Bgm.climax);
  settings.vsRule = 'STOCK'; startGame(); setState('play'); player.invuln = 99; Bgm.climax = false;
  for (let i = 0; i < 60; i++) update(1 / 60);
  assert('残機制は時間がないので盛り上げない', !Bgm.climax);
  settings.vsRule = 'TIME';
}


// ---- 108) 逆転の知らせ・バーがすべって動く ----
{
  settings.mode = 'VS'; settings.vsCpu = '3'; settings.stageSel = 'PLANE'; startGame(); setState('play'); player.invuln = 99;
  const give = (own, n) => { let b = 0; for (let i = 0; i < surf.N && b < n; i++) if (grid[i] === OPEN) { grid[i] = WALL; ownA[i] = own; b++; } claimed += b; recountAreas(); };
  give(2 + rivals[0].id, 300); checkLeader(0.1);
  assert('最初の1位は知らせない', vsLeader === rivals[0].name && !floats.some(f => /逆転/.test(f.txt)));
  give(1, 600); leadCD = 0; checkLeader(0.1);
  assert('自分が1位になると「逆転!」', vsLeader === 'me' && floats.some(f => f.txt === '逆転! トップに立った!'));
  give(2 + rivals[1].id, 1200); checkLeader(0.1);
  assert('すぐ次の入れ替わりは知らせない(2.5秒あける)', vsLeader === rivals[1].name && !floats.some(f => f.txt === rivals[1].name + 'が逆転!'));
  leadCD = 0; give(2 + rivals[2].id, 2400); checkLeader(0.1);
  assert('CPUが1位になると「○○が逆転!」', floats.some(f => f.txt === rivals[2].name + 'が逆転!'));
  // バーの区切りは少しずつ動く
  hudAnim = {}; hudAnimT = blinkT; render();
  const x0 = hudAnim.me.x; give(1, 5000); blinkT += 0.05; render();
  const x1 = hudAnim.me.x; blinkT += 2; render(); const x2 = hudAnim.me.x;
  assert('順位が変わるとバーの区切りはゆっくりすべる', x1 !== x0 && Math.abs(x1 - x0) < Math.abs(x2 - x0), x0.toFixed(1) + ' → ' + x1.toFixed(1) + ' → ' + x2.toFixed(1));
  settings.vsCpu = 'AUTO'; settings.stageSel = 'TOUR';
}


// ---- 109) タイムラプス ----
{
  for (const sk of ['PLANE', 'CUBE']) {
    settings.mode = 'VS'; settings.stageSel = sk; startGame(); setState('play'); player.invuln = 99;
    for (let i = 0; i < 60 * 20 && state === 'play'; i++) { blinkT += 1 / 60; update(1 / 60); if (deathTimer > 0) while (deathTimer > 0) update(1 / 60); }
    vsEnd();
    const fin = { g: grid.slice(), a: colA.slice() }, finAreas = rivalAreaSum() + playerArea();
    assert(sk + ': 試合中の盤面の変化を記録', lapse.frames.length >= 5, lapse.frames.length);
    stTimer = 2;
    onKeyDown({ key: 't', preventDefault() {} });
    assert(sk + ': T でタイムラプスを再生(はじめの盤面から)', !!lapsePlay && countCells(WALL) < fin.g.filter(v => v === WALL).length);
    const lastF = lapse.frames[lapse.frames.length - 1];
    assert(sk + ': 記録に試合の時間と全員の割合', lastF.t > 5 && lastF.sh.length === rivals.length + 1);
    assert(sk + ': 再生のはじめは順位バーの広さも、はじめの盤面', playerArea() + rivalAreaSum() < finAreas);
    let err = null;
    try { for (let i = 0; i < 60 * 3; i++) { blinkT += 1 / 60; tickMeta(1 / 60); if (i % 20 === 0) render(); } } catch (e) { err = e.stack; }
    assert(sk + ': 再生中の描画(順位バー・推移グラフ)', !err && !!lapsePlay && lapsePlay.T > 0, err);
    for (let i = 0; i < 60 * 9 && lapsePlay; i++) tickMeta(1 / 60);
    assert(sk + ': 最後まで見ると試合の終わりの盤面にもどる', !lapsePlay && grid.every((v, i) => v === fin.g[i]) && colA.every((v, i) => v === fin.a[i]) && state === 'vsres' && rivalAreaSum() + playerArea() === finAreas);
    startLapse(); onKeyDown({ key: 'z', preventDefault() {} });
    assert(sk + ': キーでとめても盤面はもどる(次へは進まない)', !lapsePlay && state === 'vsres' && grid.every((v, i) => v === fin.g[i]));
  }
  // ギャラリー: 勝った試合の作品にタイムラプスがつく(シムでは画像が作れないので、撮れた体で)
  gallery = [{ img: 'data:image/jpeg;base64,AA', s: 'PLANE', p: 50, d: '20260925', sc: 1, mid: lapse.id }];
  startLapse(); lapsePlay.caps = ['data:image/jpeg;base64,A1', 'data:image/jpeg;base64,A2', 'data:image/jpeg;base64,A3'];
  for (let i = 0; i < 60 * 8 && lapsePlay; i++) tickMeta(1 / 60);
  assert('勝った試合の作品にタイムラプスがつく', Array.isArray(gallery[0].lapse) && gallery[0].lapse.length >= 3);
  let err = null; try { openGallery('title'); galleryBig = true; render(); galleryBig = false; render(); } catch (e) { err = e.stack; }
  assert('ギャラリーでタイムラプスつきの作品を描く', !err, err);
  settings.stageSel = 'TOUR'; gallery = []; setState('title');
}

// ---- 110) タイムラプス中も回せる ----
{
  settings.mode = 'VS'; settings.stageSel = 'CUBE'; startGame(); setState('play'); player.invuln = 99;
  for (let i = 0; i < 60 * 15 && state === 'play'; i++) { blinkT += 1 / 60; update(1 / 60); if (deathTimer > 0) while (deathTimer > 0) update(1 / 60); }
  if (state === 'play') vsEnd();
  stTimer = 2; startLapse();
  const R0 = cam.R.slice();
  onKeyDown({ key: 'ArrowLeft', preventDefault() {} }); for (let i = 0; i < 20; i++) { blinkT += 1 / 60; tickMeta(1 / 60); } releaseDir('left');
  assert('タイムラプス中: 矢印で回る(再生は止まらない)', !!lapsePlay && cam.R.some((v, i) => Math.abs(v - R0[i]) > 1e-3));
  resDrag = { x: 100, y: 300, moved: true }; endResDrag();
  assert('タイムラプス中: ドラッグして離しても止まらない', !!lapsePlay && state === 'vsres');
  resDrag = { x: 100, y: 300, moved: false }; endResDrag();
  assert('タイムラプス中: 動かさずにタップすると止まる(次へは進まない)', !lapsePlay && state === 'vsres');
  settings.stageSel = 'TOUR';
}


// ---- 111) 陣地が確定したときの演出(広さで段階) ----
{
  assert('段階: 1%=0 / 2%=1 / 6%=2 / 15%=3', claimTier(1) === 0 && claimTier(2) === 1 && claimTier(6) === 2 && claimTier(15) === 3);
  settings.mode = 'VS'; settings.stageSel = 'PLANE'; startGame(); setState('play');
  const cells = n => { const out = []; for (let i = 0; i < surf.N && out.length < n; i++) if (grid[i] === OPEN) out.push(i); return out; };
  rings = []; particles = []; floats = [];
  assert('小さく囲んだときは演出なし', claimFx(cells(Math.floor(initOpen * 0.01)), teamHex(0), true) === 0 && rings.length === 0);
  const t3 = claimFx(cells(Math.ceil(initOpen * 0.13)), teamHex(0), true);
  assert('13%: 「超ナワバリ!」輪6重・しぶき・インクの雨・揺れ・帯・スロー・花火', t3 === 3 && rings.length === 6 && particles.filter(q => q.ink).length > 120 && fxBanner && fxBanner.txt === '超ナワバリ!' && slowMoT > 0 && fwQueue.length === 5 && (shakeT > 0 || !settings.shake));
  { let err2 = null; try { for (let i = 0; i < 75; i++) { updateFx(1 / 30); if (i % 5 === 0) render(); } } catch (e) { err2 = e.stack; } assert('帯・花火・ズームの描画', !err2 && !fxBanner && fwQueue.length === 0, err2); }
  zoomPunch = null; slowMoT = 0;
  rings = []; floats = [];
  const tc = claimFx(cells(Math.ceil(initOpen * 0.06)), teamHex(1), false, rivals[0].name);
  assert('CPU は1段低い(6% で段階1)', tc === 1 && rings.length === 2 && floats.some(f => f.txt.includes(rivals[0].name)));
  let err = null; try { for (let i = 0; i < 30; i++) { updateParticles(1 / 30); updateFloats(1 / 30); } render(); } catch (e) { err = e.stack; }
  assert('演出の描画(遅れて出る輪・大きな文字)', !err, err);
  // 立体でも
  settings.stageSel = 'SPHERE'; startGame(); setState('play'); render();
  err = null; try { claimFx(cells(Math.ceil(initOpen * 0.13)), teamHex(0), true); render(); } catch (e) { err = e.stack; }
  assert('立体でも演出が出る', !err && rings.length > 0, err);
  settings.stageSel = 'TOUR'; shakeT = 0;
}

// ---- 112) ナワバリバトルは、一度に塗れるのは狭いほうだけ ----
{
  for (const sk of ['PLANE', 'CUBE', 'TORUS']) {
    settings.mode = 'VS'; settings.numerin = 'ON'; settings.stageSel = sk; startGame(); setState('play');
    const q = qixes[0], qc = surf.qixCell(q), d = bfsDist([qc]);
    // ヌメリンのまわりに小さな囲いを作る(半径4の輪を線に)
    for (let i = 0; i < surf.N; i++) if (d[i] === 4 && grid[i] === OPEN) { grid[i] = WALL; colA[i] = 0; }
    const kv = visitedFrom(keepCell());
    assert(sk + ': 残すのは広い空き地(ヌメリンのいる小さな囲いではない)', !kv[qc] && kv.reduce((a, v) => a + v, 0) > 100);
    // 狭いほう(ヌメリンのいる囲い)を塗る
    let n = 0; for (let i = 0; i < surf.N; i++) if (grid[i] === OPEN && !kv[i]) { grid[i] = WALL; colA[i] = teamNo(0); ownA[i] = 1; n++; }
    rescueQixes();
    const nc = surf.qixCell(q);
    assert(sk + ': 閉じこめられたヌメリンは広い空き地へ移る', n > 0 && nc >= 0 && grid[nc] === OPEN && visitedFrom(keepCell())[nc] === 1, 'n=' + n + ' c=' + nc);
    let err = null; try { for (let i = 0; i < 60; i++) updateQixes(1 / 60); render(); } catch (e) { err = e.stack; }
    assert(sk + ': 移ったあともヌメリンは空き地を動く', !err && grid[surf.qixCell(q)] === OPEN, err);
  }
  settings.stageSel = 'TOUR';
}

// ---- 113) 塗れる側の切りかえ(ヌメリンがいるときだけ) ----
{
  settings.mode = 'VS'; settings.numerin = 'ON'; settings.bachikko = 'ON'; settings.fillRule = 'SMALL';
  backToTitle(); onAction(); stTimer = 1;
  vsSel = VSSET_ITEMS.findIndex(it => it.k === 'fillRule');
  vsSetKey('ArrowRight'); assert('準備画面: 塗れる側 → ヌメリンのいない側', settings.fillRule === 'QIX');
  let err = null; try { render(); } catch (e) { err = e.stack; } assert('準備画面の描画(塗れる側)', !err, err);
  settings.stageSel = 'PLANE'; startGame(); setState('play');
  const q = qixes[0], qc = surf.qixCell(q), d = bfsDist([qc]);
  for (let i = 0; i < surf.N; i++) if (d[i] === 4 && grid[i] === OPEN) { grid[i] = WALL; colA[i] = 0; }
  assert('ヌメリンのいない側: ヌメリンのいる小さな囲いを残す(広いほうが塗れる)', visitedFrom(keepCell())[qc] === 1);
  settings.fillRule = 'SMALL';
  assert('狭いほう: 広い空き地を残す', visitedFrom(keepCell())[qc] === 0);
  settings.fillRule = 'QIX'; settings.numerin = 'OFF';
  assert('ヌメリンなしなら設定に関係なく狭いほう', !fillByQix());
  backToTitle(); onAction(); stTimer = 1; vsSel = VSSET_ITEMS.findIndex(it => it.k === 'fillRule');
  vsSetKey('ArrowRight'); assert('ヌメリンなしのときは切りかえられない', settings.fillRule === 'QIX');
  openMatchOpts('options'); matchSel = MATCH_ITEMS.findIndex(it => it.k === 'fillRule'); matchAdjust(1);
  err = null; try { render(); } catch (e) { err = e.stack; }
  assert('対戦の設定でも切りかえられる', settings.fillRule === 'SMALL' && !err, err);
  settings.numerin = 'ON'; settings.fillRule = 'SMALL'; settings.stageSel = 'TOUR';
}

// ---- 114) 日本語 / English ----
{
  const lang0 = settings.lang;
  settings.lang = 'JA';
  assert('日本語のときは訳さない', tr('ナワバリバトル') === 'ナワバリバトル');
  setState('options'); optSel = OPT_ITEMS.findIndex(o => o.k === 'lang'); adjustOpt(1);
  assert('OPTIONS で English に', settings.lang === 'EN');
  assert('言葉をそのまま訳す', tr('ナワバリバトル') === 'Turf Battle' && tr('そもさん!') === 'Riddle me this!');
  assert('つなげた文字も部分ごとに訳す', tr('アオ ダウン! +800') === 'Blue down! +800' && tr('ミドリが逆転!') === 'Green takes the lead!');
  assert('数字の形: 順位・秒・ラスト', tr('3位/5人') === '#3 / 5' && tr('ラスト10秒!') === 'Last 10 seconds!' && tr('90秒') === '90s', tr('3位/5人') + ' | ' + tr('ラスト10秒!'));
  assert('実績の名前と説明も英語', ACHV.every(a => !JA_RE.test(tr(a.name)) && !JA_RE.test(tr(a.txt))));
  assert('ステージの名前も英語', Object.keys(CONFIG.SURF).every(k => !JA_RE.test(tr(CONFIG.SURF[k].label))));
  assert('セリフも英語', Object.values(RIVAL_LINES).flat().concat(BANTER.flat()).every(t => !JA_RE.test(tr(t))));
  let err = null; try { for (const st of ['title', 'options', 'help', 'vssetup', 'matchopts', 'achv', 'stats']) { setState(st); render(); } } catch (e) { err = e.stack; }
  assert('英語で各画面を描ける', !err, err);
  settings.lang = 'JA';
}

// ---- 115) 曲の調・描く音を曲に合わせる・新しい曲 ----
{
  const PCN = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const keyName = n => { const k = Bgm._songKey(BGMDATA[n]); return PCN[k.pc] + (k.minor ? 'm' : ''); };
  const want = { play: 'Am', orbit: 'Dm', chip: 'Em', synth: 'Am', splash: 'Em', idm: 'F#m', battle: 'Dm', neon: 'F', matsuri: 'Dm', title: 'Am' };
  const bad = Object.keys(want).filter(n => keyName(n) !== want[n]).map(n => n + '=' + keyName(n));
  assert('曲の調の判定(長調・短調)', bad.length === 0, bad.join(' '));
  assert('新しい曲: バトル・ネオン・まつり', ['battle', 'neon', 'matsuri'].every(n => BGMDATA[n] && BGMDATA[n].tracks.every(tr => tr.t !== 'n' || tr.s.length === BGMDATA[n].len) && MUSIC_SONG[n.toUpperCase()] === n && SONG_LABEL[n]));
  assert('盤面に新しい曲', CONFIG.SURF.TETRA.music === 'battle' && CONFIG.SURF.OCTA.music === 'neon' && CONFIG.SURF.DODECA.music === 'matsuri');
  // 描く音の和音: バトル(D マイナー)の主音の上 = D・F・A
  Bgm._load('battle');
  const pcs = [0, 1, 2].map(r => PCN[Snd._pcOfHz(Snd._voiceHz(r, 0))]).join(',');
  assert('描く音の和音は調の中(D マイナーなら D・F・A)', pcs === 'D,F,A', pcs);
  // 伸びても調の外の音は出ない(どの曲でも)
  let out = [];
  for (const n of Object.keys(BGMDATA)) {
    Bgm._load(n); const K = Bgm.key();
    for (let r = 0; r < 3; r++) for (let len = 0; len < 60; len += 4) { const pc = Snd._pcOfHz(Snd._voiceHz(r, len)); if (!K.scale.includes((pc - K.pc + 12) % 12)) out.push(n + ':' + PCN[pc]); }
  }
  assert('どの曲でも描く音は調の音だけ', out.length === 0, out.slice(0, 5).join(' '));
  Bgm.stop();
}

// ---- 116) 描いている線とローラーの色がそろう(どのテーマでも) ----
{
  settings.mode = 'VS'; const th0 = settings.theme, bad = [];
  for (let th = 0; th <= THEMES.length; th++) {
    settings.theme = th;
    for (const sk of ['PLANE', 'CUBE']) {
      settings.stageSel = sk; startGame(); setState('play');
      for (const fast of [false, true]) { player.usedFast = fast; if (trailHex(fast) !== teamHex(0) || inkHex() !== teamHex(0)) bad.push(th + ':' + sk + ':' + fast + ':' + trailHex(fast)); }
      let err = null; try { player.drawing = true; render(); player.drawing = false; render(); } catch (e) { err = e.stack; } if (err) bad.push(err);
    }
  }
  assert('線・ローラー・しずくはいつもチームの色(全テーマ)', bad.length === 0, bad.slice(0, 4).join(' '));
  settings.theme = th0; settings.stageSel = 'TOUR'; player.usedFast = false;
}

// ---- 117) タワー(ナワバリディフェンス) ----
{
  assert('広さで7段階', TOWERS.length === 7 && towerTier(0.3) === -1 && towerTier(0.6) === 0 && towerTier(4) === 2 && towerTier(9) === 4 && towerTier(30) === 6);
  settings.mode = 'VS'; settings.stageSel = 'PLANE'; settings.vsCpu = '3'; settings.towerTarget = 'FIGHTERS'; startGame(); setState('play');
  sparxes = []; player.invuln = 99;
  // 自機の陣地を作ってタワーを建てる(盤面の6%)
  const cells = []; for (let y = 60; y < GH - 30 && cells.length < initOpen * 0.06; y++) for (let x = 20; x < 60; x++) { const c = idx(x, y); if (grid[c] === OPEN) { grid[c] = WALL; ownA[c] = 1; colA[c] = teamNo(0); cells.push(c); } }
  claimed += cells.length; recountAreas();
  const T = buildTowerFor(cells, 1, 0);
  assert('陣地を取るとタワー(6% → 迫撃砲)', T && T.lv === 3 && towers.length === 1 && cells.includes(T.c));
  { const inR = new Set(cells), d = bfsDist([...Array(surf.N).keys()].filter(i => !inR.has(i))); assert('タワーは陣地の奥に建つ(ふちから3マス以上)', d[T.c] >= 3, d[T.c]); }
  for (let i = 0; i < 60; i++) updateTowers(1 / 60);
  assert('建設中は撃たない', T.build < BUILD_T && shots.length === 0);
  for (let i = 0; i < 90; i++) updateTowers(1 / 60);
  assert('建設が終わる', T.build >= BUILD_T);
  // 射程の中に CPU を置くと撃つ → 体力が減る → 0 でやられる(持ち主の手柄)
  const r = rivals[0]; r.inv = 0; r.c = T.c + 4; if (!surf.is3D) { r.fx = (r.c % GW) + 0.5; r.fy = ((r.c / GW) | 0) + 0.5; }
  const k0 = vsStat.kills, d0 = r.downs;
  T.lv = 0; T.cd = 0;                                 // 機銃にして確かめる
  for (let i = 0; i < 60 * 6 && r.dead <= 0; i++) { updateTowers(1 / 60); r.c = T.c + 4; }
  assert('射程に入った相手を撃って、体力が0でやられる', r.downs === d0 + 1 && r.dead > 0 && vsStat.kills === k0 + 1, r.hp + ' downs=' + r.downs);
  assert('やられたあと体力はもどる', r.hp === FIGHTER_HP);
  // 自分のチームは撃たない
  assert('自分(同じチーム)はねらわない', !towerEnemies(T).some(tg => tg.type === 'p'));
  // 体力の回復
  const r2 = rivals[1]; r2.hp = 2; r2.hurtT = 0;
  for (let i = 0; i < 60 * 6; i++) updateTowers(1 / 60);
  assert('しばらく撃たれなければ体力が回復する', r2.hp > 4, r2.hp.toFixed(2));
  // 陣地を上塗りされるとこわれる
  ownA[T.c] = 2 + rivals[1].id; towerChkT = 0; updateTowers(1 / 60);
  assert('タワーの下の陣地が相手のものになるとこわれる', towers.length === 0);
  // ヌメリン・バチッコ
  settings.towerTarget = 'ALL';
  const T2 = buildTowerFor(cells, 1, 0); T2.build = BUILD_T; ownA[T2.c] = 1;
  assert('設定「ファイター+じゃま役」ならヌメリンもねらう', towerEnemies(T2).some(tg => tg.type === 'q'));
  hurtTarget({ type: 'q', ref: qixes[0] }, 1, T2);
  assert('撃たれたヌメリンはしびれて止まる', qixes[0].stun > 0);
  settings.towerTarget = 'FIGHTERS';
  assert('設定「ファイターだけ」ならヌメリンはねらわない', !towerEnemies(T2).some(tg => tg.type === 'q'));
  // 1人10基まで
  towers = [];
  for (let i = 0; i < TOWER_MAX + 3; i++) buildTowerFor(cells, 1, 0);
  assert('1人10基まで(古いものから撤去)', towers.filter(q => q.own === 1).length === TOWER_MAX);
  // 自機が撃たれる
  towers = []; player.invuln = 0; deathTimer = 0;
  const rc = []; for (let i = 0; i < surf.N && rc.length < initOpen * 0.02; i++) if (grid[i] === OPEN) { grid[i] = WALL; ownA[i] = 2 + rivals[0].id; colA[i] = teamNo(rivals[0].team); rc.push(i); }
  const T3 = buildTowerFor(rc, 2 + rivals[0].id, rivals[0].team); T3.build = BUILD_T; T3.lv = 4; T3.cd = 0;
  player.c = T3.c; player.hp = 1;
  for (let i = 0; i < 60 && deathTimer <= 0; i++) updateTowers(1 / 60);
  assert('相手のタワーに撃たれて自機がやられる', deathTimer > 0 && /撃たれた/.test(lastDeath), lastDeath);
  while (deathTimer > 0) update(1 / 60);
  // 描画(建設中・完成・弾)
  let err = null;
  try { towers = []; const a1 = buildTowerFor(cells, 1, 0); a1.build = BUILD_T * 0.5; for (let lv = 0; lv < 7; lv++) { const b = buildTowerFor(cells, 1, 0); b.lv = lv; b.build = BUILD_T; } render(); } catch (e) { err = e.stack; }
  assert('タワー7種と建設中の描画', !err, err);
  // 立体でも試合が進む(タワーつき)
  settings.stageSel = 'CUBE'; startGame(); setState('play');
  err = null; try { for (let i = 0; i < 60 * 30 && state === 'play'; i++) { blinkT += 1 / 60; update(1 / 60); if (deathTimer > 0) while (deathTimer > 0) update(1 / 60); if (i % 60 === 0) render(); } } catch (e) { err = e.stack; }
  assert('立体でもタワーが建って試合が進む', !err && (towers.length > 0 || state !== 'play'), err || towers.length);
  settings.stageSel = 'TOUR'; settings.vsCpu = 'AUTO';
}

// ---- 118) タワーが自動で塗る・上塗りで乗っ取り ----
{
  const openN = () => { let n = 0; for (let i = 0; i < surf.N; i++) if (grid[i] === OPEN) n++; return n; };
  for (const sk of ['PLANE', 'CUBE']) {
    settings.mode = 'VS'; settings.stageSel = sk; settings.vsCpu = '3'; startGame(); setState('play');
    sparxes = []; player.invuln = 99; for (const r of rivals) r.dead = 99;       // 敵のいない状態で
    const cells = []; const d0 = bfsDist([surf.qixCell(qixes[0])]);
    for (let i = 0; i < surf.N && cells.length < initOpen * 0.04; i++) if (grid[i] === OPEN && d0[i] > 12) { grid[i] = WALL; ownA[i] = 1; colA[i] = teamNo(0); cells.push(i); }
    claimed += cells.length; recountAreas();
    const T = buildTowerFor(cells, 1, 0); T.build = BUILD_T; T.paintCd = 0;
    const a0 = playerArea(), o0 = openN();
    let err = null;
    try { for (let i = 0; i < 60 * 12; i++) { blinkT += 1 / 60; updateTowers(1 / 60); } } catch (e) { err = e.stack; }
    assert(sk + ': 敵がいないとタワーが少しずつ塗り広げる', !err && playerArea() > a0 && openN() < o0, err || (a0 + '→' + playerArea()));
    assert(sk + ': 塗っても占領数の整合がくずれない', claimed === initOpen - openN() - trail.length - rivalTrailCells(), claimed + ' vs ' + (initOpen - openN()));
    assert(sk + ': 塗ったふちは線(ネオン)になる', [...Array(surf.N).keys()].some(c => grid[c] === WALL && ownA[c] === 1 && colA[c] === 0 && lineOwnerHex(c)));
    // 上塗りで乗っ取り
    const r = rivals[0]; r.dead = 0;
    const core = bfsNear(T.c, 1);
    const hold0 = T.hold;
    for (let i = 0; i < 60 * 1; i++) { overPaintCells(core, 2 + r.id, r.team); blinkT += 1 / 60; updateTowers(1 / 60); }
    assert(sk + ': タワーの足もとは上塗りで塗りかえられない', ownA[T.c] === 1 && T.hold < hold0);
    for (let i = 0; i < 60 * 5 && T.team === 0; i++) { overPaintCells(core, 2 + r.id, r.team); blinkT += 1 / 60; updateTowers(1 / 60); }
    assert(sk + ': 上塗りで足もとを走り続けると乗っ取れる', T.team === r.team && T.own === 2 + r.id && ownerTeam(ownA[T.c]) === r.team && towers.includes(T));
    // 途中でやめるとゲージは戻る
    const T2 = buildTowerFor(cells, 1, 0); T2.build = BUILD_T;
    for (let i = 0; i < 30; i++) { overPaintCells(bfsNear(T2.c, 1), 2 + r.id, r.team); blinkT += 1 / 60; updateTowers(1 / 60); }
    const h1 = T2.hold; for (let i = 0; i < 120; i++) { blinkT += 1 / 60; updateTowers(1 / 60); }
    assert(sk + ': 乗っ取りを途中でやめると制御ゲージが戻る', T2.hold > h1 && T2.team === 0, 'h1=' + h1.toFixed(2) + ' hold=' + T2.hold.toFixed(2) + ' team=' + T2.team + ' in=' + towers.includes(T2) + ' dist=' + cellDist(T2.c, T.c).toFixed(1));
    err = null; try { render(); } catch (e) { err = e.stack; } assert(sk + ': 乗っ取りの描画', !err, err);
  }
  // 自機が乗っ取ると実績
  delete achvGot.hijack;
  const T3 = towers.find(T => T.team !== 0) || towers[0]; T3.capOwn = 1; T3.capTeam = 0; hijackTower(T3);
  assert('自分が乗っ取ると「乗っ取り」の実績', !!achvGot.hijack && T3.team === 0);
  settings.stageSel = 'TOUR'; settings.vsCpu = 'AUTO';
}

console.log(fails === 0 ? '\n=== 全テスト合格 ===' : '\n=== 失敗 ' + fails + ' 件 ===');
process.exit(fails === 0 ? 0 : 1);
