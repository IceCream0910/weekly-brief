"use client";
import { useEffect, useState } from "react";
import { ThemeSwitch } from "@/components/theme-switch";
import { Loader } from "@/components/Loader";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button, Image, Spacer } from "@heroui/react";
import { Link } from "@heroui/link";
import { useRouter } from "next/navigation";

export default function AllNews() {
    const [currentWeekLabel, setCurrentWeekLabel] = useState<string>("");
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [groupedNews, setGroupedNews] = useState<Record<string, any[]>>({});
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        getCurrentWeekLabel();
        fetch('/api/news')
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                if (data && typeof data === 'object' && Array.isArray(data.items)) {
                    setNews(data.items);
                    setGroupedNews(groupNewsByDate(data.items));
                } else {
                    console.error('Unexpected data format received from /api/news:', data);
                    setError("뉴스 데이터를 불러오는 데 실패했습니다. 형식이 올바르지 않습니다.");
                    setNews([]);
                    setGroupedNews({});
                }
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error fetching news:', error);
                setError(`뉴스 데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
                setLoading(false);
            });
    }, []);

    const groupNewsByDate = (newsItems: any[]): Record<string, any[]> => {
        if (!Array.isArray(newsItems)) {
            console.error("groupNewsByDate received non-array:", newsItems);
            return {};
        }
        return newsItems.reduce((groups: Record<string, any[]>, item) => {
            const dateKey = formatDateKey(item.pubDate);
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(item);
            return groups;
        }, {});
    };

    const formatDateKey = (pubDate: string): string => {
        try {
            const parts = pubDate.split(' ');
            if (parts.length >= 4) {
                const day = parseInt(parts[1], 10);
                const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(parts[2]);
                const year = parseInt(parts[3], 10);

                if (!isNaN(day) && month !== -1 && !isNaN(year)) {
                    return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                }
            }

            const date = new Date(pubDate);
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.error('Error parsing date:', pubDate);
            const date = new Date(pubDate);
            return date.toISOString().split('T')[0];
        }
    };

    const formatDateForDisplay = (dateKey: string): string => {
        const date = new Date(dateKey);
        const month = date.getMonth() + 1;
        const day = date.getDate();

        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        const weekday = weekdays[date.getDay()];

        return `${month}월 ${day}일 ${weekday}요일`;
    };

    const getCurrentWeekLabel = () => {
        const date = new Date();
        const month = date.getMonth() + 1;
        const week = Math.ceil(date.getDate() / 7);
        setCurrentWeekLabel(`${month}월 ${week}주차`);
    };

    const formatDescription = (title: string, description?: string): string => {
        if (!description) return "";
        const plainText = description.replace(/<[^>]*>/g, "");

        const totalCharacterBudget = 100;

        const titleLength = title.length;
        const maxDescriptionLength = Math.max(40, totalCharacterBudget - titleLength);

        if (plainText.length <= maxDescriptionLength) return plainText;

        return plainText.substring(0, maxDescriptionLength) + "...";
    };

    if (loading) {
        return <Loader />;
    }

    if (error) {
        return (
            <div className="text-center text-red-500">
                <p>{error}</p>
                <Button className='mt-4' variant="bordered" size="sm" onClick={() => router.back()}>
                    ← 뒤로 가기
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="fixed top-0 right-0 z-10 p-6">
                <ThemeSwitch />
            </div>

            <h1 className="text-2xl font-bold break-keep break-words">
                <span className="text-orange-500 dark:text-orange-400">{currentWeekLabel}</span><br />
                주요 뉴스 모두 보기.
            </h1>

            <Button className='mt-4' variant="bordered" size="sm" onClick={() => router.back()}>
                ← 피드로 돌아가기
            </Button>

            <Spacer y={8} />

            {Object.keys(groupedNews)
                .sort((a, b) => b.localeCompare(a))
                .map((dateKey) => (
                    <div key={dateKey} className="mb-8">
                        <h2 className="text-default text-default-600 font-semibold mb-4">
                            {formatDateForDisplay(dateKey)}
                        </h2>

                        {groupedNews[dateKey].map((item, index) => (
                            <Link key={index} href={item.link} target="_blank" className="w-full mb-4">
                                <Card key={index} className="py-2">
                                    <CardHeader className="pb-0 pt-2 px-4 flex-col items-start">
                                        <h4 className="font-bold text-large">{item.title}</h4>
                                        <p className="text-sm text-default-500 my-2">{formatDescription(item.title, item.description)}</p>
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ))}
        </>
    );
}
