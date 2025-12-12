"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleTable } from "./schedule-table";
import { ScheduleCalendar } from "./schedule-calendar";
import { Calendar, List } from "lucide-react";

type Match = {
    id: string;
    match_date: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
    match_sequence: string | null;
    game_password: string | null;
  home_team: {
        id: string;
        name: string;
        logo_url: string | null;
        conference?: string | null;
        rank?: number | null;
    };
    away_team: {
        id: string;
        name: string;
        logo_url: string | null;
        conference?: string | null;
        rank?: number | null;
    };
};

type ScheduleViewProps = {
    matches: Match[];
    initialSelectedDate?: string;
    leagueEnded?: boolean;
};

export function ScheduleView({ matches, initialSelectedDate = "", leagueEnded = false }: ScheduleViewProps) {
    const [view, setView] = useState<"list" | "calendar">("list");
    const [selectedDate, setSelectedDate] = useState<string>(initialSelectedDate);

    return (
        <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")}>
            <div className="flex justify-end mb-4">
                <TabsList>
                    <TabsTrigger value="list" className="flex items-center gap-2">
                        <List className="h-4 w-4" />
                        List
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Calendar
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="list">
                <ScheduleTable
                    matches={matches}
                    selectedDate={selectedDate}
                    onDateChange={(date) => setSelectedDate(date)}
                    leagueEnded={leagueEnded}
                />
            </TabsContent>

            <TabsContent value="calendar">
                <ScheduleCalendar
                    matches={matches as any}
                    onDateSelect={(date) => {
                        setSelectedDate(date);
                        setView("list");
                    }}
                />
            </TabsContent>
        </Tabs>
    );
}
