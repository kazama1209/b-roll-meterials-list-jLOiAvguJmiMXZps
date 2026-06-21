// 競合アカウント一覧（正本 deliverable/index.html の ACCOUNTS と同一）
// 出所: tenshoku/research_20260620_broll/build_site.py の ACCOUNTS
export type Competitor = {
  name: string; // @id
  genre: string;
  plays: string; // 代表作再生
  face: string; // 顔の扱い
  broll: string; // b-rollの傾向
  star: boolean; // ★ 特に手本価値が高い
};

export const COMPETITORS: Competitor[] = [
  { name: "@cheriecherrry_", genre: "丸の内OLの準備vlog", plays: "1,560万", face: "手元中心＋一部顔/猫スタンプ", broll: "白湯・スキンケア商品手元・服選び・着席脚元", star: true },
  { name: "@suzu_tensyoku24", genre: "受付嬢の1日", plays: "140万", face: "掴みだけ顔→以降なし", broll: "ネイル×マウス・ランチ俯瞰・エスカレーター・香水棚", star: true },
  { name: "@shigotoyametter", genre: "受付OLの1日＋転職アフィ", plays: "50万", face: "掴みだけ顔→本編なし", broll: "ビル見上げ・受付PC指差し・Dior購入→「良い求人紹介された」", star: true },
  { name: "@jimu.ol.vlog", genre: "受付事務に1日密着", plays: "6万", face: "掴みのみ→本編なし", broll: "タイピング手元・牛カツ断面・フラペ俯瞰・ショップ袋", star: true },
  { name: "@hono_ol", genre: "事務OLの1日（完成形）", plays: "数千〜", face: "完全に顔なし（首から下）", broll: "胴体ミラー導入・マウス手元・手巻き寿司・夜渋谷CTA", star: true },
  { name: "@shachikuolrisa_jp", genre: "社畜OLの休日（長尺）", plays: "168万", face: "完全に顔なし（後ろ姿/脚）", broll: "着替え後ろ姿・歩き足元POV・コンビニ棚", star: false },
  { name: "@kirakira_eigyou", genre: "営業OLのルーティン", plays: "19万", face: "顔は変形フィルターで隠す", broll: "出社コーデ胴体POV・弁当袋手元・PC手元", star: false },
  { name: "@jiyu_ollife", genre: "限界OLのだらけ休日", plays: "47万", face: "唇スタンプで顔隠し", broll: "散らかり部屋の引き・静物・スマホ手元", star: false },
  { name: "@arasa_ol_genkai", genre: "アラサーOL（PR多め）", plays: "数千〜", face: "完全に顔なし", broll: "パンプス足元・ネイル手元・物撮り", star: false },
  { name: "@ns_y_k_o8o9", genre: "アラサー看護師", plays: "16万", face: "後ろ姿＋顔フィルター", broll: "看護師ヘアアレンジの後ろ姿", star: false },
  { name: "@3coins_takahashi_", genre: "雑貨店員のworkvlog", plays: "200万", face: "手元中心", broll: "改札タッチ・キーボード俯瞰・買い物カゴ手元", star: false },
  { name: "@goto_syahu", genre: "首から下ノウハウ型（退職/転職）", plays: "—", face: "完全に顔なし（首から下）", broll: "机で手だけで語る＝アバターの実写手本", star: false },
];

export const COMPETITORS_LEGEND =
  "★＝特に手本価値が高い。別型：@goto_syahu＝首から下ノウハウ型（G. 首から下トーク）。@cocoa.0107/@noyasukzaz0＝紙芝居型で実写b-rollは薄いが「受付嬢＝勝ち組/手取り35万」のネタは共通。";
