// 「お金の引き継ぎ書」の項目の定義。
// エンディングノート（市販・自治体配布）、家庭裁判所の財産目録、デジタル遺品の注意喚起をもとに、
// 「資産（プラス）」「負債（マイナス）」「毎月の契約」「デジタル」「保険・年金」に分けて、種類ごとに書く欄を決めている。
//
// 欄の区分（セキュリティ）
//   text / select / amount / note … 画面で入力してよい（シミュレーターの入力と一緒に保存）
//   secret … 口座番号・ログインIDなど。画面入力は任意（既定は印刷後に手書き）。入れた場合もこの端末の別の場所にだけ保存し、JSONには含めない
//   hand   … パスワード・ロック解除コードなど。画面では入力できない。本体ではなく巻末の「別紙」に手で書き、封をして別に保管する
//   never  … キャッシュカードの暗証番号・カード番号の全桁など。家族の手続きに要らず、悪用の危険だけがあるので書かせない（理由を出す）

export type FieldType = "text" | "select" | "amount" | "note" | "secret" | "hand" | "never";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  wide?: boolean; // 1行を使う
  reason?: string; // never の理由
}

export type Side = "asset" | "debt" | "contract" | "digital";

export interface CategoryDef {
  id: string;
  side: Side;
  title: string;
  hint: string;          // 何を書くか・見落としやすい点
  fields: FieldDef[];
  nameKey: string;       // 一覧で見出しにする欄
  addLabel: string;
  warn?: string;         // 印刷に出す注意
}

const amount = (label = "金額の目安"): FieldDef => ({ key: "amount", label, type: "amount" });
const memo: FieldDef = { key: "memo", label: "備考", type: "note", wide: true };

export const CATEGORIES: CategoryDef[] = [
  // ── 資産（プラスの財産） ──
  {
    id: "bank",
    side: "asset",
    title: "預貯金（銀行・信用金庫・ゆうちょ・ネット銀行）",
    hint: "金融機関名と支店名が分かれば、家族は残高証明や口座の照会ができます。ネット銀行・給与振込口座・定期預金・外貨預金も1口座ずつ。",
    nameKey: "bank",
    addLabel: "口座を追加",
    fields: [
      { key: "bank", label: "金融機関名", type: "text", placeholder: "例：○○銀行、ゆうちょ銀行" },
      { key: "branch", label: "支店名", type: "text", placeholder: "例：玉造支店" },
      { key: "kind", label: "種類", type: "select", options: ["普通", "定期", "当座", "貯蓄", "外貨", "ネット銀行", "その他"] },
      { key: "holder", label: "名義", type: "text", placeholder: "例：本人" },
      { key: "use", label: "使いみち", type: "text", placeholder: "例：給与振込・年金受取・公共料金の引き落とし" },
      { key: "passbook", label: "通帳・証書", type: "select", options: ["通帳あり", "通帳なし（ネットのみ）", "定期の証書あり"] },
      amount("残高の目安"),
      { key: "number", label: "口座番号（ゆうちょは記号・番号）", type: "secret" },
      { key: "netId", label: "ネットバンキングのログインID", type: "secret" },
      { key: "netPw", label: "ネットバンキングのパスワード", type: "hand" },
      {
        key: "pin",
        label: "キャッシュカードの暗証番号",
        type: "never",
        reason: "相続の手続きで家族が使うことはありません。亡くなった後に引き出すと、相続放棄ができなくなるおそれがあります。当面のお金は「遺産分割前の払戻し」（1金融機関150万円まで）で受け取れます。",
      },
      memo,
    ],
  },
  {
    id: "securities",
    side: "asset",
    title: "証券口座（株・投資信託・NISA・債券）",
    hint: "証券会社と口座の種類。NISA・特定口座・一般口座は同じ証券会社でも別に書くと分かりやすい。持株会・外国株・FX・単元未満株もここ。証券会社が分からなくても、家族は「ほふり」に照会すれば一覧が分かります。",
    nameKey: "company",
    addLabel: "証券口座を追加",
    fields: [
      { key: "company", label: "証券会社・銀行", type: "text", placeholder: "例：○○証券" },
      { key: "branch", label: "支店名", type: "text", placeholder: "ネット証券は空欄" },
      { key: "kind", label: "口座の種類", type: "select", options: ["NISA", "特定口座", "一般口座", "持株会", "外国株・外貨預金", "国債・社債", "FX・先物", "その他"] },
      { key: "holdings", label: "主な中身", type: "text", placeholder: "例：全世界株式の投資信託、○○の株" },
      amount("評価額の目安"),
      { key: "number", label: "口座番号", type: "secret" },
      { key: "loginId", label: "ログインID", type: "secret" },
      { key: "pw", label: "パスワード・取引暗証番号", type: "hand" },
      memo,
    ],
  },
  {
    id: "dc",
    side: "asset",
    title: "確定拠出年金・企業年金・財形",
    hint: "iDeCo・企業型DCは死亡一時金として遺族が請求します（5年を過ぎると受け取れない）。確定給付企業年金・財形・社内預金も。",
    nameKey: "kind",
    addLabel: "年金・財形を追加",
    fields: [
      { key: "kind", label: "種類", type: "select", options: ["iDeCo", "企業型DC", "確定給付企業年金", "財形貯蓄", "社内預金", "その他"] },
      { key: "company", label: "運営管理機関・勤務先", type: "text", placeholder: "例：○○証券（iDeCo）、勤務先の人事部" },
      { key: "beneficiary", label: "死亡一時金の受取人の指定", type: "select", options: ["指定していない", "指定している", "わからない"] },
      amount("残高の目安"),
      { key: "number", label: "加入者番号など", type: "secret" },
      { key: "loginId", label: "ログインID", type: "secret" },
      { key: "pw", label: "パスワード", type: "hand" },
      memo,
    ],
  },
  {
    id: "crypto",
    side: "asset",
    title: "暗号資産",
    hint: "どこの取引所かが分からないと、家族はほぼ手続きできません。自分で管理するウォレットは、復元フレーズがないと誰も引き出せません。",
    nameKey: "exchange",
    addLabel: "取引所・ウォレットを追加",
    warn: "復元フレーズ（シードフレーズ）は、これを見た人が誰でも引き出せる情報です。書く場合は別紙にして封をし、金庫などに保管してください。",
    fields: [
      { key: "exchange", label: "取引所・ウォレット名", type: "text", placeholder: "例：○○取引所、ハードウェアウォレット" },
      { key: "coins", label: "主な銘柄", type: "text", placeholder: "例：ビットコイン" },
      { key: "twofa", label: "二段階認証の方法", type: "text", placeholder: "例：スマホの認証アプリ" },
      amount("評価額の目安"),
      { key: "loginId", label: "ログインID（メールアドレス）", type: "secret" },
      { key: "pw", label: "パスワード", type: "hand" },
      { key: "seed", label: "自分で管理するウォレットの復元フレーズ", type: "hand" },
      memo,
    ],
  },
  {
    id: "epay",
    side: "asset",
    title: "電子マネー・QR決済・ポイント・マイル",
    hint: "PayPayのマネー残高は相続の対象（ポイントは対象外）。JAL・ANAのマイルは手続きすれば引き継げます。カードのポイントは多くが失効します。残高が大きいものだけでも。",
    nameKey: "service",
    addLabel: "サービスを追加",
    fields: [
      { key: "service", label: "サービス名", type: "text", placeholder: "例：PayPay、Suica、○○マイル" },
      amount("残高の目安"),
      { key: "loginId", label: "登録している電話番号・メール・会員番号", type: "secret" },
      { key: "pw", label: "パスワード", type: "hand" },
      memo,
    ],
  },
  {
    id: "realestate",
    side: "asset",
    title: "不動産（自宅・土地・投資用・持分）",
    hint: "所在地・地番と名義（持分）を。2026年2月から「所有不動産記録証明」で名義の不動産を一覧にできますが、未登記や旧住所のままの登記はもれます。相続登記は3年以内が義務です。",
    nameKey: "label",
    addLabel: "不動産を追加",
    fields: [
      { key: "label", label: "呼び名", type: "text", placeholder: "例：自宅、実家の土地" },
      { key: "kind", label: "種類", type: "select", options: ["土地と建物", "マンション", "土地", "建物", "その他"] },
      { key: "use", label: "使いみち", type: "select", options: ["自宅", "貸している", "空き家", "土地のみ", "その他"] },
      { key: "address", label: "所在地", type: "text", placeholder: "例：大阪市中央区○○", wide: true },
      { key: "lot", label: "地番・家屋番号", type: "text", placeholder: "登記事項証明書や固定資産税の通知書に載っている" },
      { key: "area", label: "面積", type: "text", placeholder: "例：土地120㎡・建物95㎡" },
      { key: "share", label: "名義・持分", type: "text", placeholder: "例：本人 1/2・妻 1/2" },
      { key: "regAddr", label: "登記の住所・氏名", type: "select", options: ["今の住所・氏名と同じ", "前の住所・氏名のまま", "わからない"] },
      { key: "deed", label: "権利証（登記識別情報）の保管場所", type: "text", placeholder: "番号（符号）は書かない" },
      { key: "manager", label: "管理会社・借主・敷金（貸している場合）", type: "text" },
      amount("評価額の目安"),
      memo,
    ],
  },
  {
    id: "car",
    side: "asset",
    title: "自動車・バイク",
    hint: "名義変更や売却には車検証が必要です。ローン中ならローン会社名も。",
    nameKey: "model",
    addLabel: "車を追加",
    fields: [
      { key: "model", label: "車種", type: "text" },
      { key: "plate", label: "ナンバー", type: "text" },
      { key: "papers", label: "車検証の保管場所", type: "text", placeholder: "例：車のダッシュボード" },
      { key: "keys", label: "スペアキーの場所", type: "text" },
      amount("売却の目安"),
      memo,
    ],
  },
  {
    id: "valuables",
    side: "asset",
    title: "貴金属・美術品・骨董・金の現物",
    hint: "金の地金・宝飾品・時計・美術品。鑑定書や購入時の書類の場所も。",
    nameKey: "item",
    addLabel: "品物を追加",
    fields: [
      { key: "item", label: "品名", type: "text" },
      { key: "place", label: "保管場所", type: "text" },
      amount(),
      memo,
    ],
  },
  {
    id: "member",
    side: "asset",
    title: "会員権（ゴルフ・リゾート・スポーツクラブ）",
    hint: "売却できる会員権もあれば、年会費だけがかかり続けるものもあります。",
    nameKey: "name",
    addLabel: "会員権を追加",
    fields: [
      { key: "name", label: "名称", type: "text" },
      { key: "contact", label: "連絡先", type: "text" },
      { key: "number", label: "会員番号", type: "secret" },
      amount(),
      memo,
    ],
  },
  {
    id: "lent",
    side: "asset",
    title: "貸しているお金・受け取る予定のお金",
    hint: "人に貸したお金、未払いの給与・退職金、税金の還付、保険の給付金など。",
    nameKey: "who",
    addLabel: "追加",
    fields: [
      { key: "who", label: "相手・内容", type: "text", placeholder: "例：弟に貸したお金、勤務先の退職金" },
      { key: "proof", label: "証書・書類の場所", type: "text" },
      amount(),
      memo,
    ],
  },
  {
    id: "homecash",
    side: "asset",
    title: "自宅の現金・貸金庫",
    hint: "自宅に置いている現金も相続財産です。貸金庫は、鍵と契約している金融機関が分からないと開けられません。",
    nameKey: "place",
    addLabel: "追加",
    fields: [
      { key: "place", label: "場所・金融機関", type: "text", placeholder: "例：寝室の金庫、○○銀行の貸金庫" },
      { key: "keyPlace", label: "鍵の保管場所", type: "text" },
      { key: "contents", label: "中身", type: "text", placeholder: "例：現金・権利証・貴金属" },
      { key: "pin", label: "金庫の暗証番号", type: "hand" },
      amount(),
      memo,
    ],
  },
  {
    id: "otherAsset",
    side: "asset",
    title: "その他の財産",
    hint: "上のどれにも当てはまらないもの（著作権・特許のロイヤリティ、事業の持分、出資金など）。",
    nameKey: "name",
    addLabel: "財産を追加",
    fields: [
      { key: "name", label: "名前", type: "text" },
      { key: "place", label: "保管場所・連絡先", type: "text" },
      amount(),
      memo,
    ],
  },

  // ── 負債（マイナスの財産） ──
  {
    id: "housingLoan",
    side: "debt",
    title: "住宅ローン",
    hint: "団信（団体信用生命保険）があれば、亡くなったときに残りのローンは保険で返済されます。銀行に連絡すれば手続きが始まります。",
    nameKey: "bank",
    addLabel: "住宅ローンを追加",
    fields: [
      { key: "bank", label: "金融機関・支店", type: "text" },
      { key: "danshin", label: "団信", type: "select", options: ["あり", "なし", "わからない"] },
      { key: "guarantor", label: "保証会社", type: "text" },
      { key: "payFrom", label: "返済している口座", type: "text" },
      { key: "end", label: "完済予定", type: "text", placeholder: "例：2055年" },
      amount("残高の目安"),
      { key: "number", label: "ローンの契約番号", type: "secret" },
      memo,
    ],
  },
  {
    id: "loan",
    side: "debt",
    title: "ローン・借入（自動車・教育・カードローン・奨学金・事業）",
    hint: "マイナスの財産が多いときは、3か月以内なら相続放棄ができます。見落としやすいのはカードローン・奨学金・事業の借入。家族は信用情報機関（KSC・JICC・CIC）に開示請求して調べられます。",
    nameKey: "lender",
    addLabel: "借入を追加",
    fields: [
      { key: "kind", label: "種類", type: "select", options: ["自動車ローン", "教育ローン", "カードローン", "奨学金", "不動産ローン", "事業の借入", "その他"] },
      { key: "lender", label: "借入先", type: "text" },
      { key: "monthly", label: "毎月の返済", type: "text", placeholder: "例：月3万円・残り24回" },
      { key: "payFrom", label: "引き落とし口座", type: "text" },
      { key: "insurance", label: "保険（団信など）", type: "select", options: ["なし", "あり", "わからない"] },
      amount("残高の目安"),
      { key: "number", label: "契約番号", type: "secret" },
      memo,
    ],
  },
  {
    id: "card",
    side: "debt",
    title: "クレジットカード",
    hint: "分割・リボ払いの残りは借入と同じ扱いです。カード会社に連絡して解約すると、引き落としが止まります。",
    nameKey: "issuer",
    addLabel: "カードを追加",
    fields: [
      { key: "issuer", label: "カード会社・カード名", type: "text", placeholder: "例：○○カード（ゴールド）" },
      { key: "payFrom", label: "引き落とし口座", type: "text" },
      { key: "revo", label: "分割・リボ", type: "select", options: ["なし", "あり", "わからない"] },
      { key: "fee", label: "年会費・付帯保険", type: "text" },
      amount("分割・リボの残りの目安"),
      { key: "last4", label: "カード番号の下4桁", type: "secret" },
      { key: "loginId", label: "会員サイトのログインID", type: "secret" },
      { key: "full", label: "カード番号の全桁・暗証番号・セキュリティコード", type: "never", reason: "解約は下4桁とカード会社名で手続きできます。全桁と暗証番号は不正利用につながるだけなので書きません。" },
      memo,
    ],
  },
  {
    id: "personalDebt",
    side: "debt",
    title: "個人からの借入・未払い",
    hint: "親族・知人からの借入、未払いの税金・医療費・家賃・介護費用など。",
    nameKey: "who",
    addLabel: "追加",
    fields: [
      { key: "who", label: "相手・内容", type: "text" },
      { key: "proof", label: "借用書などの場所", type: "text" },
      amount("金額の目安"),
      memo,
    ],
  },
  {
    id: "guarantee",
    side: "debt",
    title: "保証人になっているもの（連帯保証）",
    hint: "連帯保証人の立場は相続されます。借りた本人が返している間は督促が来ないので、家族はまず気づけません。相続放棄を判断するために必ず書いてください。",
    nameKey: "who",
    addLabel: "保証を追加",
    warn: "保証している借金が多いときは、亡くなったことを知ってから3か月以内に家庭裁判所で相続放棄・限定承認ができます。",
    fields: [
      { key: "who", label: "誰の借入か", type: "text" },
      { key: "lender", label: "借入先", type: "text" },
      { key: "kind", label: "保証の種類", type: "select", options: ["連帯保証", "根保証（上限額つき）", "保証", "わからない"] },
      { key: "proof", label: "保証契約書の場所", type: "text" },
      amount("保証している金額"),
      memo,
    ],
  },

  // ── 毎月の契約・支払い ──
  {
    id: "contract",
    side: "contract",
    title: "毎月の契約・支払い（公共料金・携帯・サブスクなど）",
    hint: "止める・名義を変える手続きが必要なもの。引き落とし口座が凍結されると止まるもの、カード払いで続いてしまうものがあります。",
    nameKey: "service",
    addLabel: "契約を追加",
    fields: [
      { key: "kind", label: "種類", type: "select", options: ["電気・ガス・水道", "携帯電話", "固定電話", "インターネット回線", "NHK", "サブスク（動画・音楽・アプリ）", "新聞・雑誌", "生協・宅配・定期購入", "会費・寄付", "駐車場・トランクルーム", "家賃", "その他"] },
      { key: "service", label: "会社・サービス名", type: "text" },
      { key: "monthly", label: "月額", type: "text", placeholder: "例：1,490円" },
      { key: "payBy", label: "支払い方法", type: "text", placeholder: "例：○○銀行から引き落とし、○○カード" },
      { key: "after", label: "亡くなった後", type: "select", options: ["解約する", "家族の名義に変える", "家族が決める"] },
      { key: "loginId", label: "お客様番号・ログインID", type: "secret" },
      { key: "pw", label: "パスワード（ネットだけで解約するもの）", type: "hand" },
      memo,
    ],
  },

  // ── デジタル ──
  {
    id: "device",
    side: "digital",
    title: "スマホ・パソコン・タブレット",
    hint: "携帯ショップでも画面ロックは解除できません（初期化しかできない）。ロック解除コードは別紙に書いて封をしておきます。",
    nameKey: "model",
    addLabel: "端末を追加",
    fields: [
      { key: "model", label: "端末", type: "text", placeholder: "例：iPhone、自宅のMac" },
      { key: "place", label: "置き場所", type: "text" },
      { key: "inside", label: "中に大事なもの", type: "text", placeholder: "例：写真、ネット銀行のアプリ" },
      { key: "legacy", label: "Apple・Googleの死後の設定", type: "select", options: ["設定済み", "未設定", "わからない"] },
      { key: "legacyWho", label: "指定した人・アクセスキーの控えの場所", type: "text" },
      { key: "code", label: "ロック解除のパスコード", type: "hand" },
      memo,
    ],
  },
  {
    id: "pwmanager",
    side: "digital",
    title: "パスワード管理アプリ",
    hint: "使っているなら、マスターパスワードだけを別紙に書けば、ほかのパスワードはすべて家族が開けます。緊急アクセス機能があるアプリもあります。",
    nameKey: "app",
    addLabel: "アプリを追加",
    fields: [
      { key: "app", label: "アプリ名", type: "text", placeholder: "例：1Password、Bitwarden、iCloudキーチェーン" },
      { key: "kit", label: "緊急キット・回復コードの保管場所", type: "text" },
      { key: "loginId", label: "アカウント（メールアドレス）", type: "secret" },
      { key: "master", label: "マスターパスワード", type: "hand" },
      memo,
    ],
  },
  {
    id: "account",
    side: "digital",
    title: "メール・SNS・クラウド・ネットのサービス",
    hint: "SNSは「削除」「追悼アカウント」などの希望を。LINEのアカウントは相続できません。Facebookは追悼アカウント管理人を生前に指名できます。",
    nameKey: "service",
    addLabel: "アカウントを追加",
    fields: [
      { key: "service", label: "サービス名", type: "text", placeholder: "例：Gmail、iCloud写真、Facebook、Amazon" },
      { key: "wish", label: "亡くなった後の希望", type: "select", options: ["削除してほしい", "追悼アカウントにしてほしい", "写真などを残してほしい", "家族に任せる"] },
      { key: "loginId", label: "アカウント名・メールアドレス", type: "secret" },
      { key: "pw", label: "パスワード（管理アプリにないもの）", type: "hand" },
      memo,
    ],
  },
];

export const SIDE_TITLE: Record<Side, string> = {
  asset: "資産（プラスの財産）",
  debt: "負債（マイナスの財産）",
  contract: "毎月の契約・支払い",
  digital: "デジタル（スマホ・ネットのアカウント）",
};

export const catOf = (id: string) => CATEGORIES.find((c) => c.id === id);

// ── 保険・公的年金に足す欄（保険の中身は入力画面の保険の一覧から自動で入る） ──
export const INSURANCE_EXTRA: FieldDef[] = [
  { key: "place", label: "証券の保管場所", type: "text", placeholder: "例：書斎の引き出し" },
  { key: "agent", label: "担当者・連絡先", type: "text" },
  { key: "number", label: "証券番号", type: "secret" },
];

export const PENSION_FIELDS: FieldDef[] = [
  { key: "status", label: "いまの状況", type: "select", options: ["まだ受け取っていない", "受け取っている"] },
  { key: "amount", label: "受給額（受け取っている場合）", type: "text", placeholder: "例：月15万円（偶数月に2か月分）" },
  { key: "account", label: "受取口座", type: "text", placeholder: "例：○○銀行 玉造支店" },
  { key: "papers", label: "年金手帳・基礎年金番号通知書・年金証書の保管場所", type: "text", wide: true },
  { key: "number", label: "基礎年金番号", type: "secret" },
  { key: "corp", label: "企業年金・年金基金", type: "text", placeholder: "例：○○企業年金基金" },
];

// ── 重要書類・印鑑の保管場所 ──
export const DOCUMENTS: { key: string; label: string; note?: string }[] = [
  { key: "jitsuin", label: "実印" },
  { key: "ginkoin", label: "銀行印" },
  { key: "inkanCard", label: "印鑑登録証（カード）" },
  { key: "mynumber", label: "マイナンバーカード", note: "番号は書かない" },
  { key: "kenpo", label: "マイナ保険証・資格確認書・介護保険証" },
  { key: "nenkin", label: "基礎年金番号通知書・年金手帳・年金証書" },
  { key: "passbook", label: "通帳・キャッシュカード" },
  { key: "deed", label: "権利証（登記識別情報）", note: "番号は書かない" },
  { key: "policy", label: "保険証券" },
  { key: "will", label: "遺言書" },
  { key: "license", label: "運転免許証" },
  { key: "passport", label: "パスポート" },
  { key: "tax", label: "確定申告書・源泉徴収票・固定資産税の通知書" },
  { key: "safeKey", label: "金庫・貸金庫の鍵" },
  { key: "contracts", label: "ローン・賃貸・保証などの契約書" },
  { key: "endingNote", label: "エンディングノート本体" },
  { key: "appleKey", label: "Appleのアクセスキー・Googleの設定の控え" },
];

// 区分ごとの「ある・ない・わからない」（裁判所の財産目録と同じく、書き忘れと「ない」を区別する）
export const CAT_STATUS = ["ある", "ない", "わからない"] as const;
export type CatStatus = (typeof CAT_STATUS)[number];

// 家族が「どこにあるか分からない」ときの調べ方（照会制度）
export const LOOKUP_GUIDE: { what: string; how: string }[] = [
  { what: "銀行口座", how: "預金保険機構の「相続時・災害時の預貯金口座照会」（生前にマイナンバーを付けた口座。亡くなってから10年まで。どの金融機関の窓口でも申し込める）。ゆうちょは「貯金等照会書」" },
  { what: "証券口座", how: "証券保管振替機構（ほふり）の登録済加入者情報の開示請求（口座のある証券会社・信託銀行の一覧が分かる。有料）" },
  { what: "生命保険", how: "生命保険協会の「生命保険契約照会制度」（Web 6,000円・書面 7,000円）" },
  { what: "借入", how: "信用情報機関への開示請求（銀行系はKSC、消費者金融・クレジットはJICC・CIC）。個人からの借入は分からない" },
  { what: "不動産", how: "法務局の「所有不動産記録証明制度」（2026年2月開始・1件1,600円）。未登記や旧住所のままの登記はもれる。固定資産税の名寄帳も" },
  { what: "戸籍", how: "戸籍の広域交付（2024年3月から、最寄りの市区町村で出生から死亡までまとめて取れる）" },
  { what: "当面のお金", how: "遺産分割前の払戻し制度（民法909条の2）。1つの金融機関で150万円まで、相続人が単独で受け取れる" },
];

// ── 本人・希望 ──
export const PROFILE_FIELDS: FieldDef[] = [
  { key: "kana", label: "ふりがな", type: "text" },
  { key: "address", label: "住所", type: "text", wide: true },
  { key: "honseki", label: "本籍地", type: "text", wide: true, placeholder: "相続手続きで戸籍を取るときに必要" },
  { key: "phone", label: "電話番号", type: "text" },
  { key: "email", label: "メールアドレス", type: "text" },
  { key: "blood", label: "血液型", type: "text" },
  { key: "workplace", label: "勤務先", type: "text" },
];

export const WISH_FIELDS: FieldDef[] = [
  { key: "lifeSupport", label: "延命治療", type: "select", options: ["希望する", "希望しない", "家族に任せる", "決めていない"] },
  { key: "organ", label: "臓器提供", type: "select", options: ["提供する", "提供しない", "家族に任せる", "決めていない"] },
  { key: "doctor", label: "かかりつけ医・持病・飲んでいる薬", type: "note", wide: true },
  { key: "care", label: "介護が必要になったとき", type: "note", wide: true, placeholder: "例：できれば自宅で。施設でもよい" },
  { key: "funeral", label: "葬儀", type: "note", wide: true, placeholder: "例：家族だけで。宗派・菩提寺、遺影に使ってほしい写真" },
  { key: "grave", label: "お墓・納骨", type: "note", wide: true },
  { key: "pet", label: "ペットのこと", type: "note", wide: true },
  { key: "keepsake", label: "形見分け・残してほしいもの", type: "note", wide: true },
  { key: "notify", label: "亡くなったことを知らせてほしい人", type: "note", wide: true, placeholder: "例：大学の友人○○さん（連絡先は6ページ）" },
];
