# NAWABARI DEFENSE(ナワバリディフェンス)引き継ぎメモ

> **返事は必ず日本語で書く。** 途中の一言(「〜を確認します」など)・報告・質問もすべて日本語。長い作業のあとでも英語に切り替えない。
> オーナーはこれまで何度も「英語になってる」と注意している。いちばん大事な約束。

## 目標
NAWABARI(ナワバリバトル、`C:\Users\sisho\Desktop\nawabari`、タグ v1-battle)を土台に、
**陣地を取ると広さに応じたタワーが建って侵入者を撃つ「ナワバリディフェンス」**へ大きく作り変える。

- このフォルダ `C:\Users\sisho\Desktop\nawabari-defense` は nawabari を履歴ごと複製したもの(2026-09-26)。
- GitHub: `https://github.com/hacchake/nawabari-defense`(remote `origin` は設定済み。**GitHub 側の空リポジトリはオーナーが作る**)。
- 公開先(GitHub Pages): `https://hacchake.github.io/nawabari-defense/`(push 後、Settings → Pages で main / root)。
- 保存キーは `nwdef.`(ナワバリバトルと混ざらない)。ブラウザで見るときはポート 8780。
- NAWABARI・QLAIM 1・2 はそのまま残す。こちらの作業で触らない。

### オーナーの決定(2026-09-26)
- CPU もタワーを建てる / タワーが撃つ相手は設定で切替(ファイターだけ ⇔ ファイター+ヌメリン・バチッコ)
- タワーは一度に囲んだ広さで7段階(`TOWERS`)/ BGM・効果音は当面そのまま

### タワーの仕組み(index.html の「タワー(ナワバリディフェンス)」)
- `buildTowerFor(cells, own, team)`: 囲んだ広さ → `towerTier` → 陣地の奥(`bfsDist`)に建設。`BUILD_T` 秒の建設アニメ
- `updateTowers(dt)`: ねらう(`towerEnemies` / `nearestEnemy`、射程は `towerRange` = 基本射程 × `towerScale`)→ `fireTower` → 弾 `shots`(bullet / missile / shell / beam / zap)→ `hurtTarget`
- 体力 `FIGHTER_HP`(自機 `player.hp`・CPU `r.hp`)、`HP_REGEN_WAIT` 秒で回復。0 で `death` / `rivalFail(r, 'tower', 持ち主)`
- タワーの下の陣地の持ち主が変わるとこわれる(`removeTower`)。1人 `TOWER_MAX` 基まで
- 描画: `drawTowers` / `drawTower`(台座 `drawTowerBase` + 種類ごとの砲台 `drawTowerTop`)/ `drawShots` / `drawHpBars`

## オーナーについて(大事)
- 返事はすべて日本語(上のとおり)。
- オーナーはコードを書かない。報告は「何が変わって、遊ぶとどう感じるか」を日本語でわかりやすく。
- **push はオーナーが「pushして」と言ったときだけ。** 作業はローカルでコミットまで。
- push が 403 になったら: `printf "protocol=https\nhost=github.com\n\n" | git credential-manager erase` のあと `git push origin main`
  (ブラウザでログインし直すと通る)。
- **画面をチカチカ・フラッシュさせない**(点滅・白い閃光・拍に合わせた明滅は禁止。ゆっくりのフェードや輪で目立たせる)。
- ギターを弾くので、音楽の話は音名・コード進行で伝えると通じる。
- 手順を説明するより、できる操作は自分でやる。

## いまのナワバリバトル(残すべき中身)
単一の `index.html`(約8100行、依存なし、GitHub Pages でそのまま動く)。

- **VS(ナワバリバトル)**: 自機(赤)+ CPU 1〜7人、全員敵同士。
  - タイトルで決定 → 準備画面 state `'vssetup'`(`VSSET_ITEMS`):ステージ / 広さ / ルール(時間制・残機制)/ 時間か残機 / CPUの数 / CPUの強さ
  - 時間制: 時間切れで一番広い人の勝ち。残機制(`isStock()`): 残機がなくなると脱落、最後まで残るか90%で一番広ければ勝ち
  - 勝ったら次のラウンド(盤面が TOUR の順に変わる:平面 → 立方体 → 球 …)
- **PARTY(3チーム対戦)**: 赤・黄・青。人間1〜3人(1台のPC。P1=WASD+左Shift / P2=矢印+右Shift / P3=IJKL+])+ CPU、1チーム1〜5人。
  ロビー state `'lobby'`。立体で人間2〜3人なら画面を上下に分割(`splitHumans`・`withCam`)。
- **動き**: 平面は自由移動(`freeMove`、斜めもなめらか、`player.fx/fy`)。立体はマスごと(`updateRival3D`)。
- **CPU**: `rivals` 配列。平面 AI `planRival`、立体 AI `planRival3D`。強さ5段階 `CPU_LV`(よわい〜悪魔、`rivalSkill`)。
- **チームの色**: 8系統 `TEAM_SHADES`(系統の中で揺らぐ)。中立 = 上塗りで2色が混ざった色(`neutralNo`)。持ち主 `ownA`、広さ `recountAreas`。
- **上塗りアイテム**(`overPaint`)、**コンボの柄**(市松・麻の葉・フラワーオブライフ `applyTeamPattern`)。
- **演出**: 魂(やられると昇る、復活前に戻ってくる `soulPos`)、描く音のハーモニー(`Snd.voice*`)、掛け合い(`BANTER`「そもさん」「せっぱ」)。
- **結果**: `'vsres'` / `'partyres'`(順位・広さ・たおした・やられた、MVP)、観察モード(ドラッグで立体を回す・V で表を隠す)。
- **設定**: `'matchopts'`(対戦の設定)、`'keycfg'`(キーコンフィグ)、ステージの広さ(`applyStageSize`、平面のマスの大きさを変える)。
- **操作**: キーボード / ゲームパッド / タブレットのアナログスティック(`#stick`、`stickVec`)。
- 敵キャラ: ヌメリン(クラゲ、QIX)・バチッコ(火の玉、SPARX)は対戦の邪魔役として出ている。

詳しい仕組みは `CLAUDE.md` の「QLAIM 2 の仕組み」(10行目あたりから)にまとまっている。

## 削る候補(オーナーに確認してから)
ナワバリバトルに関係ない、QLAIM 1〜2 のひとり用の要素:
- モード: TOUR / DAILY / ZEN / 盤面を1つ選ぶモード(`MODES` の VS・PARTY 以外)
- ひとり用の進行: エリアクリア(`startClear` は VS の勝ちでも得点・記録に使っているので注意して分離)、エンディング、BONUS AREA、チュートリアル
- buddy 18種と図鑑(`BUDDIES`・`'dex'`)、実績、ランキングの名前入力、結果のシェア
- 球の地球の地図(`earthMode`。対戦では元から無効)、インクの MIX・虹・PAINT/SPLASH などのアイテム、Clawd の色(スキン)
- オイカケ(SEEKER)、導火線(fuse。ひとり用の自機にだけある)
- ギャラリー(残してもよい)

**オーナーに聞くこと**(勝手に決めない):
1. PARTY(3チーム対戦)も NAWABARI に残すか
2. ヌメリン・バチッコ(邪魔役の敵)は残すか
3. ギャラリー・実績は残すか
4. タイトルの名前・見た目(「NAWABARI」でよいか)
5. 保存キー: 今は `store` が `qlaim.` → `qlaim2.` に読み替えている。NAWABARI では `nawabari.` に変える(同じ github.io の下で混ざらないように)

### オーナーの答え(2026-09-25)
1. PARTY(3チーム対戦)→ **削る**(VS だけのゲームにする)
2. ヌメリン・バチッコ → **両方残す。ただし設定(コンフィグ)で ON/OFF できるようにする**
3. ギャラリー・実績 → **両方残す**(実績は対戦向けに合わせて直す必要あり)
4. タイトル → **「NAWABARI」+ 下に小さく「ナワバリ」**
5. 保存キー → `nawabari.` にする

### 済んだこと(2026-09-25)
- タイトルを NAWABARI(+ナワバリ)、保存キー `nawabari.`、`MODES = ['VS']`
- PARTY を削除(ロビー・画面分割・人間ファイター)。キーコンフィグは1人ぶん `PLAY_KEYS`
- 線をネオン風に: `inkBand`(色の帯 + 白い芯)。できあがった線も同じ帯のまま(`drawOwnedLines`、持ち主の色 `lineOwnerHex`)
- 大きく囲んだときの和柄 `BIG_PATS`(`claimPattern` がコンボの柄か和柄を選ぶ)
- じゃま役の ON/OFF(`settings.numerin` / `settings.bachikko`、準備画面の「じゃま役」)。ヌメリンなしは狭いほうを塗る `keepCell`
- 時間制は残機なし(`vsTimeRule()`)。やられてもすぐ戻る、負けたら同じラウンドをやり直し
- 削除: buddy・図鑑、ZEN・DAILY・エンディング・チュートリアル、オイカケ、導火線、ランキング・名前入力・ゲームオーバー・コンティニュー・シェア、BONUS AREA、地球の地図、Clawd の色、アイテム RAINBOW/SPLASH/PAINT
- 実績を対戦向けに21個(`ACHV`)。あそんだ記録・あそびかたも対戦向け
- 決着前10秒の BGM の盛り上げ(`Bgm.climax`: 小節の頭で全音上へ転調・テンポ1.1倍)、逆転の知らせ(`checkLeader`)、順位バーがすべる(`hudAnim`)
- 結果画面のタイムラプス(`lapse` / `startLapse`。1秒ごとの差分を記録、勝った試合はギャラリーに16枚つける)

- (2026-09-26)タイムラプスに順位バーと推移グラフ・再生中も立体を回せる。タイトルを最小限(説明はあそびかたへ)。足もとの光・つや・ビネット・立体の後光
- 陣地が確定したときの演出(`claimFx`、広さで3段階。帯 `fxBanner`・スロー `slowMoT`・花火 `fwQueue`・アルペジオ `Snd.fanfare`)
- ナワバリバトルは「狭いほう」を塗る(`keepCell`)。設定「塗れる側」(`settings.fillRule`: SMALL / QIX)。閉じこめられたヌメリンは `rescueQixes`
- 英語 / 日本語(`settings.lang`、辞書 `I18N_EN`、`tr()`。ctx.fillText の入り口で訳す)。文字を足したら辞書にも足す
- BGM 3曲追加(battle / neon / matsuri)。曲の調 `Bgm.key()`(自動判定 or 曲の key/scale)。描く音は調の和音・16分にそろえる(`voiceHz`・`onGrid`)

### 次にやること(候補)
- 中身の整理の残り: エンジンの中に TOUR / 単独盤面 の分岐(`settings.mode` が 'PLANE' などのとき)、ひとり用の `startClear` の流れ、
  インクの MIX/虹(`settings.ink`、`applyPattern`)が残っている。テストがこれらを使っているので、テストを VS に書き換えながら消す
- CLAUDE.md の「QLAIM 2 の仕組み」以下の古い説明の整理

## 進め方の提案
1. 保存キーを `nawabari.` に変え、タイトルを NAWABARI にする
2. オーナーの答えに合わせて、要らないモード・機能を少しずつ削る(削るたびにテスト)
3. VS の勝ちの流れを `startClear` から切り離す
4. テストも削った機能のぶんを消す/直す。fuzz(`test/fuzz.js`)の `FUZZ_MODES` も VS・PARTY だけに

## テスト・確認のしかた
```
node test/run-tests.js      # 全テスト(1分ほど)。「=== 全テスト合格 ===」を確認
node test/fuzz.js           # ランダム操作で約6万フレーム。「problems 0」を確認(数分)
```
- テストは Node 上で `test/shim.js` が canvas などをスタブにして動く。新しいブラウザAPIを使うなら shim にも足す。
- 同じ `const` をファイルの後ろで定義したものを、前のほうの `const` の初期化で使うと起動時に落ちる(TDZ)。何度かやった。定義の順番に注意。
- テストは順番に依存している(前のテストの settings が残る)。項目の並び番号ではなく `findIndex(it => it.k === ...)` で探す。

### ブラウザで見るとき
- `python -m http.server 8779` を nawabari フォルダで起動して `http://localhost:8779/`(8765 は別のプロジェクト、8777・8778 は qlaim・qlaim2 で使っていた)。
- Claude のブラウザ画面は裏にあると描画がほぼ止まる。確認は JS でフレームを進めて(`update(1/60)` などをループ)`render()` し、
  `cv.toDataURL()` の画像をページに貼ってからスクリーンショットを撮ると確実。

## 最近の主な変更(qlaim2 の履歴)
- ステージの広さ、リザルトの観察モード、準備画面と残機制、CPU の強さ5段階、結果画面、キーコンフィグ、掛け合い、コンボの柄、
  全員敵同士の VS、立体の画面分割、立体での対戦、魂の演出、3チーム対戦、上塗りと中立、自由移動 …(`git log` を参照)
