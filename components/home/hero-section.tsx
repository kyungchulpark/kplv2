import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, BarChart3, Users } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-black">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>

      <div className="container relative mx-auto px-4 py-24 md:py-32">
        <div className="flex flex-col items-center space-y-8 text-center">
          {/* Logo/Badge */}
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-nba-red text-4xl font-bold text-white shadow-2xl">
            KPL
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-white md:text-7xl">
              Korea Proam League
            </h1>
            <p className="text-xl text-gray-300 md:text-2xl">
              NBA 2K Online eSports League
            </p>
          </div>

          {/* Description */}
          <p className="max-w-2xl text-lg text-gray-400">
            최고의 실력을 가진 선수들이 펼치는 치열한 경쟁.
            <br />
            리그 순위, 선수 기록, 경기 일정을 실시간으로 확인하세요.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/standings">
              <Button size="lg" className="min-w-[200px]">
                <Trophy className="mr-2 h-5 w-5" />
                순위표 보기
              </Button>
            </Link>
            <Link href="/schedule">
              <Button size="lg" variant="outline" className="min-w-[200px]">
                <Calendar className="mr-2 h-5 w-5" />
                경기 일정
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid w-full max-w-4xl grid-cols-2 gap-4 pt-8 md:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-center space-x-2 text-nba-red">
                <Users className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center text-3xl font-bold">16</div>
              <div className="mt-1 text-center text-sm text-gray-400">
                참가 팀
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-center space-x-2 text-nba-red">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center text-3xl font-bold">80+</div>
              <div className="mt-1 text-center text-sm text-gray-400">
                경기 수
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-center space-x-2 text-nba-red">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center text-3xl font-bold">3</div>
              <div className="mt-1 text-center text-sm text-gray-400">
                시즌 진행
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-center space-x-2 text-nba-red">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center text-3xl font-bold">주3회</div>
              <div className="mt-1 text-center text-sm text-gray-400">
                정기 경기
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
