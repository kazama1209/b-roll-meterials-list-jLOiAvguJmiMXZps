import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// サイト全体に Basic 認証をかける（Next.js 16 の proxy = 旧 middleware）。
// 認証情報は環境変数で渡す（このリポジトリは public なのでパスワードを直書きしない）:
//   BASIC_AUTH_USER, BASIC_AUTH_PASSWORD
// 未設定のときは素通し（env を入れるまでロックアウトしないため）。
export function proxy(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !pass) return NextResponse.next();

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(":");
    const u = decoded.slice(0, idx);
    const p = decoded.slice(idx + 1);
    if (u === user && p === pass) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="b-roll", charset="UTF-8"' },
  });
}

export const config = {
  // 静的アセット等は除外（CSS/JS/画像がブロックされないように）
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
