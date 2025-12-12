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
          <Youtube className="h-5 w-5 text-emerald-600" />
          Streaming Links <span className="text-emerald-600 text-sm">(Required)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Home Team Stream */}
        <div className="space-y-2">
          <Label htmlFor="home-stream" className="text-sm font-medium">
            {homeTeamName} (Home) Streaming URL
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
            {awayTeamName} (Away) Streaming URL
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
          Enter streaming platform links (YouTube, Twitch, AfreecaTV, etc.). Both teams must provide URLs.
        </p>
      </CardContent>
    </Card>
  );
}
