"use client";
import React, { useEffect } from 'react';
import HorizontalScroller from './HorizontalScroller';
import CardView from './Card';
import { Button, Skeleton, Spacer } from '@heroui/react';
import { Loader } from './Loader';
import StreamText from './StreamText';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface NewsItem {
    description?: string;
    link: string;
}

function AINews() {
    const [news, setNews] = React.useState<NewsItem[]>([]);
    const [summary, setSummary] = React.useState<string>('');
    const [loading, setLoading] = React.useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/ainews/get', { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                setNews(data.items);
                setSummary(data.summary);
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error fetching Hacker News:', error);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="mt-6">
            <h3 className="text-base font-semibold">이번 주에 나온 AI 소식이에요.</h3>

            <HorizontalScroller children={[
                <Spacer key={'s-0'} x={1} />,
                ...news.map((item, index) => (
                    <CardView key={index} description={item.description} href={item.link} />
                )),
                <Spacer key={'s-0'} x={1} />
            ]} />

            <StreamText text={summary}
                delay={25}
                animateBy="words"
                direction="top"
                className="mt-2 text-gray-500 dark:text-gray-400 break-keep break-words text-balance"
            />

            <Link href="https://www.threads.net/@choi.openai" target='_blank'>
                <Button className='mt-4' variant="bordered" size="sm">
                    더 많은 뉴스 보기
                </Button>
            </Link>
        </div>
    );
}

export default AINews;