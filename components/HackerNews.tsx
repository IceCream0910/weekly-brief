"use client";
import React, { useEffect } from 'react';
import HorizontalScroller from './HorizontalScroller';
import CardView from './Card';
import { Skeleton, Spacer } from '@heroui/react';
import { Loader } from './Loader';
import { Link } from '@heroui/link';
import StreamText from './StreamText';

interface NewsItem {
    image?: string;
    title: string;
    description?: string;
    link: string;
}

function HackerNews() {
    const [news, setNews] = React.useState<NewsItem[]>([]);
    const [loading, setLoading] = React.useState(true);

    useEffect(() => {
        fetch('/api/hackerNews')
            .then((res) => res.json())
            .then((data) => {
                setNews(data);
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
            <h3 className="text-base font-semibold"><Link className='text-inherit underline' href="https://news.hada.io/" target="_blank">Hacker News</Link>에서 인기있었던 글들이에요.</h3>

            <HorizontalScroller children={[
                <Spacer key={'s-0'} x={1} />,
                ...news.map((item, index) => (
                    <CardView key={index} title={item.title} href={item.link} />
                ))
            ]} />

            <StreamText text={"dd"}
                delay={50}
                animateBy="words"
                direction="top"
                className="mt-2 text-gray-500 dark:text-gray-400 break-keep break-words text-balance"
            />
        </div>
    );
}

export default HackerNews;