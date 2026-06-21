import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "b-roll 素材アップロード",
  description: "撮影カットごとに動画素材をアップロード",
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
            <Link href="/" className="brand">🎬 b-roll 素材アップロード</Link>
            <nav className="navlinks">
              <Link href="/">素材一覧</Link>
              <Link href="/summary">サマリ</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
