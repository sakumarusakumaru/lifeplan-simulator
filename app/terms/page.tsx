import Link from "next/link";

export const metadata = {
  title: "利用規約 ／ LIFE PLAN SIMULATOR",
};

export default function TermsPage() {
  return (
    <main
      className="min-h-screen px-4 py-10 sm:px-8 sm:py-14"
      style={{ background: "#f0f0ee" }}
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 border-b-2 border-[#0a0a0a] pb-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#0a0a0a]/50">
            TERMS OF USE
          </p>
          <h1 className="text-2xl font-bold text-[#0a0a0a]">利用規約</h1>
          <p className="mt-2 text-[11px] text-[#0a0a0a]/55">
            最終更新日: 2026年4月29日
          </p>
        </div>

        <div className="flex flex-col gap-5 text-[13px] leading-relaxed text-[#0a0a0a]/80">
          <Section title="第1条（適用）">
            <p>
              本規約は、本サイト「LIFE PLAN SIMULATOR」（以下「本サイト」）の利用条件を定めるものです。
              利用者は本サイトを利用することにより、本規約に同意したものとみなします。
            </p>
          </Section>

          <Section title="第2条（運営者と性格）">
            <p>
              本サイトは個人が無償で運営する情報提供を目的とした計算ツールです。
              運営者は金融商品取引業者・税理士・社労士・弁護士・ファイナンシャルプランナー（FP）等の登録・資格を有しておりません。
            </p>
          </Section>

          <Section title="第3条（提供内容）">
            <p>
              本サイトは、利用者がブラウザ上で入力したライフプラン情報をもとに、
              純資産推移・キャッシュフロー・資金ショート時期等を試算し、参考情報として表示するものです。
            </p>
            <p className="mt-2">
              本サイトは
              <span className="font-bold">投資・保険・税務・法務その他いかなる分野においても個別の助言・推奨・勧誘を行うものではありません</span>
              。表示される試算結果・参考情報は、特定の金融商品の購入や契約を勧誘するものではなく、利用者の意思決定の参考となる一般情報です。
            </p>
          </Section>

          <Section title="第4条（試算結果の限界）">
            <p>
              試算結果は、利用者が入力した値および本サイトが内部で用いる前提条件
              （インフレ率・運用利回り・税率・耐用年数・年金制度の現行水準等）にもとづく概算値です。
              将来の経済情勢・税制改正・年金制度改正・運用成果・寿命・健康状態等により、実際の結果と大きく乖離する可能性があります。
              本サイトは
              <span className="font-bold">将来の資産・収支・年金額・税額のいずれも保証しません</span>。
            </p>
          </Section>

          <Section title="第5条（利用者の責任）">
            <p>
              本サイトの試算結果はあくまで概算の参考情報であり、最終的な意思決定は利用者ご自身の責任において行ってください。
              個別具体的な商品選択・税務判断・契約に関わる意思決定は、必ず
              <span className="font-bold">登録のある専門家（FP・税理士・社労士・弁護士・金融機関の有資格担当者等）</span>
              にご相談ください。
            </p>
          </Section>

          <Section title="第6条（免責事項）">
            <p>
              運営者は、本サイトの利用または利用不能により利用者または第三者に生じた一切の損害（直接損害・間接損害・特別損害・派生損害を含む）について、責任を負いません。
            </p>
            <p className="mt-2">
              これには、試算結果に基づいて行った投資・保険加入・契約・繰上返済・転居等の意思決定により発生した損害、
              本サイトの誤計算・データ消失・サービス停止により発生した損害、
              および運営者が予見できないあらゆる事象による損害を含みますが、これらに限られません。
            </p>
          </Section>

          <Section title="第7条（個人情報・データの取り扱い）">
            <p>
              本サイトは入力データを運営者のサーバーへ送信せず、お使いのブラウザ内
              （localStorage）にのみ保存します。詳細は
              <Link href="/privacy" className="font-bold underline hover:text-[#c8383a]">
                プライバシーポリシー
              </Link>
              をご覧ください。
            </p>
          </Section>

          <Section title="第8条（禁止事項）">
            <p>利用者は本サイトの利用にあたり、以下の行為を行ってはなりません。</p>
            <ul className="mt-2 list-inside list-disc space-y-1 pl-1">
              <li>本サイトのサーバー・運営に過度の負荷をかける行為</li>
              <li>本サイトのソースコード・デザインを無断で複製・再配布・商用利用する行為</li>
              <li>本サイトを他者への投資勧誘・営業・商業目的で用いる行為</li>
              <li>法令または公序良俗に反する行為</li>
            </ul>
          </Section>

          <Section title="第9条（サービスの変更・終了）">
            <p>
              運営者は、利用者への事前通知なくいつでも本サイトの内容を変更・追加・削除・終了することができ、これにより生じた損害について一切の責任を負いません。
            </p>
          </Section>

          <Section title="第10条（規約の変更）">
            <p>
              運営者は本規約をいつでも変更することができます。変更後の規約は本サイトに掲載した時点で効力を生じ、利用者が継続利用した場合は変更後の規約に同意したものとみなします。
            </p>
          </Section>

          <Section title="第11条（準拠法・管轄）">
            <p>
              本規約は日本法に準拠し、本サイトの利用に関連して紛争が生じた場合、運営者の住所地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
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
