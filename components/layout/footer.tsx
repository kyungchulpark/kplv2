import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* About */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">KPL 소개</h3>
            <p className="text-sm text-muted-foreground">
              NBA 2K 온라인 리그 관리 시스템
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nba-red font-bold text-white">
              KPL
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">바로가기</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/schedule"
                  className="text-muted-foreground hover:text-foreground"
                >
                  경기 일정
                </Link>
              </li>
              <li>
                <Link
                  href="/standings"
                  className="text-muted-foreground hover:text-foreground"
                >
                  팀 순위
                </Link>
              </li>
              <li>
                <Link
                  href="/stats"
                  className="text-muted-foreground hover:text-foreground"
                >
                  선수 기록
                </Link>
              </li>
              <li>
                <Link
                  href="/teams"
                  className="text-muted-foreground hover:text-foreground"
                >
                  팀 정보
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">리소스</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/rules"
                  className="text-muted-foreground hover:text-foreground"
                >
                  리그 규정
                </Link>
              </li>
              <li>
                <Link
                  href="/history"
                  className="text-muted-foreground hover:text-foreground"
                >
                  시즌 히스토리
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-muted-foreground hover:text-foreground"
                >
                  자주 묻는 질문
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">커뮤니티</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  디스코드
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  트위터
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  유튜브
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Korea Proam League. All rights reserved.
            </p>
            <div className="flex gap-4 text-sm">
              <Link
                href="/privacy"
                className="text-muted-foreground hover:text-foreground"
              >
                개인정보처리방침
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-foreground"
              >
                이용약관
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
