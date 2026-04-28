# /app/v3 — 開発版

このディレクトリは v3 として、今後の機能追加・UI実験を行う場所。

## バージョン管理ポリシー

- **v2** (`/app/v2/`): **凍結**（v2.0-stable タグでgit管理）
  - 法的リスク低減実装（A+B+C：文言修正・フッター免責・初回同意）まで含む安定版
  - URL: `/v2/detail`, `/v2/result`, `/v2/suggest`
  - 原則として **新規変更は加えない**（バグ修正のみ例外）
  - v3 で変更したコンポーネントは forking して `/components/v3_*` に分離する

- **v3** (`/app/v3/`): **アクティブ開発**
  - 新機能・UI改修はここで実験
  - URL: `/v3/detail`, `/v3/result`, `/v3/suggest`

## v2 を呼び出す方法

- ブラウザから直接: `https://lifeplan-simulator-xrqn.vercel.app/v2/detail`
- v3 のヘッダー左上「← v2」リンクから

## v3 を呼び出す方法

- ブラウザから直接: `https://lifeplan-simulator-xrqn.vercel.app/v3/detail`
- v2 のヘッダー右上「v3 →」リンクから

## コンポーネントの共有方針

最初は v2 と v3 で同じ共有コンポーネント（`/components/*`）を import しているため、
共有コンポーネントを変更すると両方に影響する。

v3 で v2 と異なる挙動にしたい場合：

1. 該当コンポーネントを `/components/v3/` 以下にコピー
2. v3 のページのみその新しい import に切り替える
3. v2 は元のまま（凍結状態を維持）

## 過去状態の復元

タグ `v2.0-stable` で v2 完成時点の全コードに戻れる：

```bash
git checkout v2.0-stable -- app/v2/ components/  # v2 の状態を復元
```
