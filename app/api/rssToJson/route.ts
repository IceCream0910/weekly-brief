import { NextRequest, NextResponse } from 'next/server';
import { fetchRssFeed } from '../../utils/rssToJson';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    try {
        const decodedUrl = decodeURIComponent(url);
        const feedData = await fetchRssFeed(decodedUrl);
        return NextResponse.json(feedData);
    } catch (error) {
        console.error('Error fetching or parsing RSS feed:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: `Failed to process RSS feed: ${errorMessage}` }, { status: 500 });
    }
}
