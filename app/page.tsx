import { Link } from "@heroui/link";
import { Snippet } from "@heroui/snippet";
import { Code } from "@heroui/code";
import { Button } from "@heroui/button";
import { ThemeSwitch } from "@/components/theme-switch";
import News from "@/components/News";
import HackerNews from "@/components/HackerNews";
import { Spacer } from "@heroui/react";

export default function Home() {
  return (
    <>
      <div className="fixed top-0 right-0 z-10 p-6">
        <ThemeSwitch />
      </div>
      <h1 className="text-2xl font-bold break-keep break-words">
        <span className="text-orange-500 dark:text-orange-400">4월 2주차 </span>
        소식을<br />정리해봤어요.</h1>

      <News />
      <Spacer y={4} />
      <HackerNews />
      <Spacer y={16} />

    </>
  );
}
