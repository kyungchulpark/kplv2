import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">KPL</h3>
            <p className="text-sm text-muted-foreground">
              Korea Proam League · NBA 2K Online eSports
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nba-red font-bold text-white">
              KPL
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/schedule" className="text-muted-foreground hover:text-foreground">
                  Schedule
                </Link>
              </li>
              <li>
                <Link href="/standings" className="text-muted-foreground hover:text-foreground">
                  Standings
                </Link>
              </li>
              <li>
                <Link href="/stats" className="text-muted-foreground hover:text-foreground">
                  Player Stats
                </Link>
              </li>
              <li>
                <Link href="/teams" className="text-muted-foreground hover:text-foreground">
                  Teams
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Community</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://cafe.naver.com/nbakpl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Naver Cafe
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
            <p>© {currentYear} Korea Proam League. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
