"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface Season {
  id: string;
  name: string;
  is_active: boolean;
}

interface SeasonSelectorProps {
  seasons: Season[];
  selectedSeasonId: string;
  onSeasonChange: (seasonId: string) => void;
}

export function SeasonSelector({
  seasons,
  selectedSeasonId,
  onSeasonChange,
}: SeasonSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedSeasonId} onValueChange={onSeasonChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="시즌 선택" />
        </SelectTrigger>
        <SelectContent>
          {seasons.map((season) => (
            <SelectItem key={season.id} value={season.id}>
              <div className="flex items-center space-x-2">
                <span>{season.name}</span>
                {season.is_active && (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                    진행중
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
