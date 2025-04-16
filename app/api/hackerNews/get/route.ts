import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(request: NextRequest) {
    try {
        const { blobs } = await list();
        const newsResultBlob = blobs.find(blob => blob.pathname === 'hackernewsResult.json');

        if (!newsResultBlob) {
            return NextResponse.json(
                { error: '뉴스 데이터를 찾을 수 없습니다.' },
                { status: 404 }
            );
        }

        const response = await fetch(newsResultBlob.url);

        if (!response.ok) {
            return NextResponse.json(
                { error: '뉴스 데이터를 가져오는데 실패했습니다.' },
                { status: 500 }
            );
        }

        const newsData = await response.json();
        return NextResponse.json(newsData);
    } catch (error) {
        console.error('뉴스 데이터 가져오기 오류:', error);
        return NextResponse.json(
            { error: '뉴스 데이터를 처리하는 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}