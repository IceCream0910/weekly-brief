import { NextRequest, NextResponse } from 'next/server';
import { fetchRssFeed } from '@/app/utils/rssToJson';

export async function GET(request: NextRequest) {
    try {
        const feed = await fetchRssFeed("https://hnrss.org/best");
        return NextResponse.json(feed.items);
    } catch (error) {
        console.error('RSS API 오류:', error);
        return NextResponse.json(
            { error: 'RSS 피드를 처리하는 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
