"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Youtube } from "lucide-react";

interface StreamUrlInputsProps {
  homeTeamName: string;
  awayTeamName: string;
  onHomeUrlChange: (url: string) => void;
  onAwayUrlChange: (url: string) => void;
  initialHomeUrl?: string;
  initialAwayUrl?: string;
}

export function StreamUrlInputs({
  homeTeamName,
  awayTeamName,
  onHomeUrlChange,
  onAwayUrlChange,
  initialHomeUrl = "",
  initialAwayUrl = "",
}: StreamUrlInputsProps) {
  const [homeUrl, setHomeUrl] = useState(initialHomeUrl);
  const [awayUrl, setAwayUrl] = useState(initialAwayUrl);

  const handleHomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setHomeUrl(url);
    onHomeUrlChange(url);
  };

  const handleAwayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setAwayUrl(url);
    onAwayUrlChange(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-600" />
          스트리밍 링크 <span className="text-red-600 text-sm">(필수)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Home Team Stream */}
        <div className="space-y-2">
          <Label htmlFor="home-stream" className="text-sm font-medium">
            {homeTeamName} (홈팀) 스트리밍 URL
          </Label>
          <Input
            id="home-stream"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={homeUrl}
            onChange={handleHomeChange}
            required
            className="font-mono text-sm"
          />
        </div>

        {/* Away Team Stream */}
        <div className="space-y-2">
          <Label htmlFor="away-stream" className="text-sm font-medium">
            {awayTeamName} (원정팀) 스트리밍 URL
          </Label>
          <Input
            id="away-stream"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={awayUrl}
            onChange={handleAwayChange}
            required
            className="font-mono text-sm"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          YouTube, Twitch, AfreecaTV 등 스트리밍 플랫폼 링크를 입력하세요. 양팀 모두 입력 필수입니다.
        </p>
      </CardContent>
    </Card>
  );
}
