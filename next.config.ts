import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 旧版（ver1〜ver3）は古い制度の値で計算するので、本番では開かずにトップへ戻す。
  // 以前のデザイン案（/preview）も同じ。旧版の入力データは、標準版を初めて開いたときに引き継ぐ
  async redirects() {
    return ["/v1", "/v2", "/v3", "/preview"].flatMap((p) => [
      { source: p, destination: "/", permanent: false },
      { source: `${p}/:path*`, destination: "/", permanent: false },
    ]);
  },
};

export default nextConfig;
