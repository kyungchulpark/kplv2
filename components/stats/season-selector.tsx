"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SeasonOption = {
  id: string;
  name: string;
  is_active: boolean;
};

interface SeasonSelectorProps {
  seasons: SeasonOption[];
  selectedSeasonId: string;
}

export function SeasonSelector({ seasons, selectedSeasonId }: SeasonSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const options = useMemo(() => seasons, [seasons]);

  const handleChange = (seasonId: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("seasonId", seasonId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={selectedSeasonId} onValueChange={handleChange}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Select season" />
      </SelectTrigger>
      <SelectContent>
        {options.map((season) => (
          <SelectItem key={season.id} value={season.id}>
            {season.name}
            {season.is_active ? " (Active)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
