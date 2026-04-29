import Link from "next/link";

export const metadata = {
  title: "プライバシーポリシー ／ LIFE PLAN SIMULATOR",
};

export default function PrivacyPage() {
  return (
    <main
      className="min-h-screen px-4 py-10 sm:px-8 sm:py-14"
      style={{ background: "#f0f0ee" }}
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 border-b-2 border-[#0a0a0a] pb-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#0a0a0a]/50">
            PRIVACY POLICY
          </p>
          <h1 className="text-2xl font-bold text-[#0a0a0a]">プライバシーポリシー</h1>
          <p className="mt-2 text-[11px] text-[#0a0a0a]/55">
            最終更新日: 2026年4月29日
          </p>
        </div>

        <div className="flex flex-col gap-5 text-[13px] leading-relaxed text-[#0a0a0a]/80">
          <Section title="基本方針">
            <p>
              本サイト「LIFE PLAN SIMULATOR」は、利用者のプライバシーを最大限尊重するため、
              <span className="font-bold">利用者の入力データを運営者のサーバーへ一切送信しない設計</span>
              を採用しています。
            </p>
          </Section>

          <Section title="1. 入力データの取り扱い">
            <p>
              利用者がライフプラン入力欄に入力した情報（生年月日・年収・資産額・家族構成・住宅情報等）は、
              <span className="font-bold">お使いのウェブブラウザ内（localStorage）にのみ保存</span>
              されます。
            </p>
            <p className="mt-2">
              これらのデータは
              <span className="font-bold">運営者のサーバーには送信されず、運営者は内容を取得・閲覧・保管・分析することができません</span>
              。第三者への提供・販売も一切行いません。
            </p>
            <p className="mt-2">
              利用者がブラウザの履歴・キャッシュ・サイトデータを削除した場合、保存された入力データは消失します。バックアップが必要な場合は、詳細入力タブの「JSONでDL」機能をご利用ください。
            </p>
          </Section>

          <Section title="2. クッキー・類似技術">
            <p>
              本サイトは利用者識別のためのクッキーを使用していません。
              localStorage には以下の情報のみが保存されます。
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 pl-1">
              <li>利用者がフォームに入力したライフプラン情報</li>
              <li>同意ダイアログに同意した日時の記録</li>
              <li>UIの表示状態（セクションの開閉状態等）</li>
            </ul>
          </Section>

          <Section title="3. アクセスログ（ホスティング事業者）">
            <p>
              本サイトはホスティングサービス
              <span className="font-bold">Vercel Inc.</span>
              のインフラ上で配信されています。Vercel 側では、サイトの安定運用・不正利用防止の目的で、
              利用者のIPアドレス・ユーザーエージェント（ブラウザ種別）・参照元URL・アクセス日時等の技術ログが自動的に記録される場合があります。
            </p>
            <p className="mt-2">
              これらは Vercel 社の
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline hover:text-[#c8383a]"
              >
                プライバシーポリシー
              </a>
              に従って管理され、運営者個人がこれらのログにアクセスして利用者を識別することはありません。
            </p>
          </Section>

          <Section title="4. アクセス解析・広告">
            <p>
              本サイトは Google Analytics その他のアクセス解析ツールを利用していません。
              広告も配信していません。
            </p>
          </Section>

          <Section title="5. お問い合わせ">
            <p>
              本サイトは個人運営のため、お問い合わせ専用窓口は設けておりません。
              本ポリシーに関する質問・要望がある場合は、サイトの利用を中止していただきますようお願いします。
            </p>
          </Section>

          <Section title="6. 改定">
            <p>
              本ポリシーは予告なく改定することがあります。改定後の内容は本サイトに掲載した時点から適用されます。
            </p>
          </Section>
        </div>

        <div className="mt-10 border-t pt-4" style={{ borderColor: "#0a0a0a30" }}>
          <Link
            href="/"
            className="text-xs font-bold text-[#0a0a0a] underline hover:text-[#c8383a]"
          >
            ← トップに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 text-sm font-bold text-[#0a0a0a]">{title}</h2>
      <div className="text-[#0a0a0a]/75">{children}</div>
    </section>
  );
}
