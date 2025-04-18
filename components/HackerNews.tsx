"use client";
import React, { useEffect } from 'react';
import HorizontalScroller from './HorizontalScroller';
import CardView from './Card';
import { Button, Skeleton, Spacer } from '@heroui/react';
import { Loader } from './Loader';
import StreamText from './StreamText';
import { Link } from '@heroui/link';

interface NewsItem {
    image?: string;
    title: string;
    description?: string;
    url: string;
}

function HackerNews() {
    const [news, setNews] = React.useState<NewsItem[]>([]);
    const [summary, setSummary] = React.useState<string>('');
    const [loading, setLoading] = React.useState(true);

    useEffect(() => {
        fetch('/api/hackerNews/get', { cache: 'no-store' })
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
            <h3 className="text-base font-semibold">Hacker News에서 인기있었던 글들이에요.</h3>

            <HorizontalScroller children={[
                <Spacer key={'s-0'} x={1} />,
                ...news.map((item, index) => (
                    <CardView key={index} title={item.title} description={item.description} href={item.url} />
                )),
                <Spacer key={'s-0'} x={1} />
            ]} />

            <StreamText text={summary}
                delay={25}
                animateBy="words"
                direction="top"
                className="mt-2 text-gray-500 dark:text-gray-400 break-keep break-words text-balance"
            />
        </div>
    );
}

export default HackerNews;