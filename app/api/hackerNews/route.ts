import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface HackerNewsTopic {
    title: string | null;
    url: string | null;
    description: string | null;
    time: string | null;
}

export async function GET(request: NextRequest) {
    try {
        const response = await fetch('https://news.hada.io', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to fetch news.hada.io: ${response.statusText}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);

        const topics: HackerNewsTopic[] = [];
        const baseUrl = 'https://news.hada.io';

        $('div.topics div.topic_row').each((index, element) => {
            const topicRow = $(element);
            const titleElement = topicRow.find('.topictitle a h1');
            const title = titleElement.text().trim() || null;

            let url = topicRow.find('.topictitle > a').attr('href') || null;
            // Handle internal topic links vs external links
            if (url && url.startsWith('topic?id=')) {
                url = `${baseUrl}/${url}`;
            }

            const description = topicRow.find('.topicdesc a').text().trim() || null;

            // Extract time text node carefully
            const topicInfoElement = topicRow.find('.topicinfo'); // Define topicInfoElement
            const topicInfoHtml = topicInfoElement.html() || '';
            const authorLinkEnd = topicInfoHtml.indexOf('</a>') + 4;
            const timeMatch = topicInfoHtml.substring(authorLinkEnd).match(/^\s*([^<]+)/);
            const time = timeMatch ? timeMatch[1].trim() : null;




            topics.push({
                title,
                url,
                description,
                time,
            });
        });

        return NextResponse.json(topics);

    } catch (error) {
        console.error('Error fetching or parsing Hacker News data:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Failed to fetch Hacker News data', details: errorMessage }, { status: 500 });
    }
}
