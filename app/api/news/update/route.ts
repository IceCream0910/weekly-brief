import { NextRequest, NextResponse } from 'next/server';
import { fetchRssFeed } from '@/app/utils/rssToJson';
import { list, put } from '@vercel/blob';

export const config = {
    runtime: 'nodejs',
    maxDuration: 60,
};

async function callLlmApi(newsData: any) {
    try {
        const response = await fetch('http://localhost:3000/api/llm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ newsData }),
        });

        if (!response.ok) {
            throw new Error(`LLM API 호출 실패: ${response.status} ${await response.text()}`);
        }

        if (!response.body) {
            throw new Error('LLM API 응답 본문이 없습니다.');
        }

        // Process the streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        let finalData = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            result += decoder.decode(value, { stream: true });

            // Process line by line
            const lines = result.split('\n');
            result = lines.pop() || ''; // Keep the last partial line

            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const jsonData = line.substring(5).trim();
                    try {
                        finalData = JSON.parse(jsonData);
                        // Found the final data, no need to process further
                        await reader.cancel(); // Stop reading the stream
                        break;
                    } catch (e) {
                        console.error('LLM 응답 JSON 파싱 오류:', e, 'Data:', jsonData);
                        // Continue reading in case it's a partial JSON in the stream
                    }
                } else if (line.trim() === 'pending') {
                    // Ignore pending messages
                }
            }
            if (finalData) break; // Exit loop once final data is parsed
        }

        // Handle case where stream ended without final data
        if (!finalData && result.startsWith('data:')) {
            const jsonData = result.substring(5).trim();
            try {
                finalData = JSON.parse(jsonData);
            } catch (e) {
                console.error('LLM 응답 최종 JSON 파싱 오류:', e, 'Data:', jsonData);
            }
        }


        if (!finalData) {
            throw new Error('LLM API에서 최종 데이터(data:)를 찾을 수 없습니다.');
        }

        return finalData;

    } catch (error) {
        console.error('LLM API 호출 오류:', error);
        // Fallback to returning only items without summary in case of LLM failure
        return {
            items: newsData.map((item: any) => ({
                title: item.title,
                description: item.description || '',
                link: item.link,
                content: item.content || item.description || ''
            })),
            summary: "알 수 없는 오류로 요약을 생성하지 못했어요." // Provide an empty summary on error
        };
    }
}

async function handleUpdate() {
    const newsFeed = await fetchRssFeed("https://www.yonhapnewstv.co.kr/category/news/headline/feed/");
    const newNewsItems = newsFeed.items || [];

    const { blobs } = await list();
    const weeklyNewsBlob = blobs.find(blob => blob.pathname === 'weeklyNews.json');

    let existingNewsItems: any[] = [];
    if (weeklyNewsBlob) {
        const response = await fetch(weeklyNewsBlob.url);
        existingNewsItems = await response.json();
    }

    const existingUrls = new Set(existingNewsItems.map(item => item.link));
    const uniqueNewItems = newNewsItems.filter(item => !existingUrls.has(item.link));

    const combinedNewsItems = [...uniqueNewItems, ...existingNewsItems];

    await put('weeklyNews.json', JSON.stringify(combinedNewsItems), {
        access: 'public',
        allowOverwrite: true
    });

    const processedData = await callLlmApi(combinedNewsItems);

    await put('newsResult.json', JSON.stringify(processedData), {
        access: 'public',
        allowOverwrite: true
    });

    return {
        message: '뉴스 업데이트 완료',
        newItemsAdded: uniqueNewItems.length,
        totalNewsCount: combinedNewsItems.length,
    };
}

export async function GET(request: NextRequest) {
    try {
        const result = await handleUpdate();
        return NextResponse.json(result);
    } catch (error) {
        console.error('뉴스 업데이트 오류:', error);
        return NextResponse.json(
            { error: '뉴스 데이터를 업데이트하는 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}