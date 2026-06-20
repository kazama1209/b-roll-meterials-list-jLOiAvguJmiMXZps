import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "b-roll トラッカー",
  description: "撮影カットの発注・納入・報酬を管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <header className="topnav">
          <div className="inner">
            <span className="brand">🎬 b-roll トラッカー</span>
            <Link href="/">ダッシュボード</Link>
            <Link href="/items">カット一覧</Link>
            <Link href="/deliveries">納入履歴</Link>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
