"use client";
import React, { useEffect } from 'react';
import HorizontalScroller from './HorizontalScroller';
import CardView from './Card';
import { Button, Skeleton, Spacer } from '@heroui/react';
import { Loader } from './Loader';
import StreamText from './StreamText';
import { useRouter } from 'next/navigation';

interface NewsItem {
    image?: string;
    title: string;
    description?: string;
    link: string;
}

function News() {
    const [news, setNews] = React.useState<NewsItem[]>([]);
    const [summary, setSummary] = React.useState<string>('');
    const [loading, setLoading] = React.useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/news/get', { cache: 'no-store' })
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
            <h3 className="text-base font-semibold">이번 주 주요 뉴스를 요약해줄게요.</h3>

            {news &&
                <HorizontalScroller children={[
                    <Spacer key={'s-0'} x={1} />,
                    ...news.map((item, index) => (
                        <CardView key={index} title={item.title} image={item.image} description={item.description} href={item.link} />
                    )),
                    <Spacer key={'s-0'} x={1} />
                ]} />
            }


            <StreamText text={summary}
                delay={25}
                animateBy="words"
                direction="top"
                className="mt-2 text-gray-500 dark:text-gray-400 break-keep break-words text-balance"
            />

            <Button className='mt-4' variant="bordered" size="sm" onPress={() => router.push('/news')}>
                더 많은 뉴스 보기
            </Button>
        </div>
    );
}

export default News;