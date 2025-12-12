"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, parseISO, isSameDay } from "date-fns";

interface DateSliderProps {
    dates: string[];
    selectedDate: string;
    onDateChange: (date: string) => void;
}

export function DateSlider({ dates, selectedDate, onDateChange }: DateSliderProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to selected date on mount and when selectedDate changes
    useEffect(() => {
        if (scrollContainerRef.current) {
            const selectedElement = scrollContainerRef.current.querySelector(
                `[data-date="${selectedDate}"]`
            );
            if (selectedElement) {
                selectedElement.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "center",
                });
            }
        }
    }, [selectedDate]);

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const scrollAmount = 200;
            scrollContainerRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            });
        }
    };

    const handlePrevDate = () => {
        const currentIndex = dates.indexOf(selectedDate);
        if (currentIndex > 0) {
            onDateChange(dates[currentIndex - 1]);
        }
    };

    const handleNextDate = () => {
        const currentIndex = dates.indexOf(selectedDate);
        if (currentIndex < dates.length - 1) {
            onDateChange(dates[currentIndex + 1]);
        }
    };

    if (dates.length === 0) return null;

    return (
        <div className="relative flex items-center gap-2 py-4">
            {/* Previous Button */}
            <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex shrink-0"
                onClick={() => scroll("left")}
                disabled={dates.indexOf(selectedDate) === 0}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Date Scroll Container */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-2 px-1 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {dates.map((date) => {
                    const isSelected = isSameDay(parseISO(date), parseISO(selectedDate));
                    const dateObj = parseISO(date);

                    return (
                        <button
                            key={date}
                            data-date={date}
                            onClick={() => onDateChange(date)}
                            className={cn(
                                "flex flex-col items-center justify-center min-w-[70px] h-[70px] rounded-xl transition-all snap-center",
                                isSelected
                                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <span className="text-xs font-medium">
                                {format(dateObj, "MMM")}
                            </span>
                            <span className="text-xl font-bold">
                                {format(dateObj, "d")}
                            </span>
                            <span className="text-xs opacity-80">
                                {format(dateObj, "EEE")}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Next Button */}
            <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex shrink-0"
                onClick={() => scroll("right")}
                disabled={dates.indexOf(selectedDate) === dates.length - 1}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
