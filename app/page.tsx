"use client";
import { useEffect, useState } from "react";
import { Link } from "@heroui/link";
import { Snippet } from "@heroui/snippet";
import { Code } from "@heroui/code";
import { Button } from "@heroui/button";
import { ThemeSwitch } from "@/components/theme-switch";
import News from "@/components/News";
import HackerNews from "@/components/HackerNews";
import { Spacer } from "@heroui/react";
import AINews from "@/components/AINews";

export default function Home() {
  const [currentWeekLabel, setCurrentWeekLabel] = useState<string>("");

  useEffect(() => {
    const today = new Date();
    getCurrentWeekLabel(today);
  }, []);

  const getCurrentWeekLabel = (date: Date) => {
    const currentDate = date.getDate();
    const currentMonth = date.getMonth() + 1;
    const firstDay = new Date(date.setDate(1)).getDay();
    const week = Math.ceil((currentDate + firstDay) / 7);
    setCurrentWeekLabel(`${currentMonth}월 ${week}주차`);
  };

  return (
    <>
      <div className="fixed top-0 right-0 z-10 p-6">
        <ThemeSwitch />
      </div>
      <h1 className="text-2xl font-bold break-keep break-words">
        <span className="text-orange-500 dark:text-orange-400">{currentWeekLabel} </span>
        소식을<br />정리해봤어요.</h1>

      <News />
      <Spacer y={8} />
      {/* <AINews /> */}
      <Spacer y={8} />
      <HackerNews />
      <Spacer y={16} />

    </>
  );
}
