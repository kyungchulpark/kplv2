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
    };
    away_team: {
        id: string;
        name: string;
        logo_url: string | null;
        conference?: string | null;
    };
};

type ScheduleViewProps = {
    matches: Match[];
};

export function ScheduleView({ matches }: ScheduleViewProps) {
    const [view, setView] = useState<"list" | "calendar">("list");

    return (
        <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")}>
            <div className="flex justify-end mb-4">
                <TabsList>
                    <TabsTrigger value="list" className="flex items-center gap-2">
                        <List className="h-4 w-4" />
                        리스트
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        캘린더
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="list">
                <ScheduleTable matches={matches} />
            </TabsContent>

            <TabsContent value="calendar">
                <ScheduleCalendar matches={matches as any} />
            </TabsContent>
        </Tabs>
    );
}
