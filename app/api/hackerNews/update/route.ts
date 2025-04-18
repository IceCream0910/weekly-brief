import { NextRequest, NextResponse } from 'next/server';
import { fetchRssFeed } from '@/app/utils/rssToJson';
import { list, put } from '@vercel/blob';

export const runtime = 'edge';

async function callLlmApi(newsData: any) {
    try {
        const response = await fetch(`${process.env.APP_URL}/api/llm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                newsData,
                instruction: "## `summary` 작성\n- 요약문은 주어진 글들의 내용을 포괄하며 간결하면서도 상세하게 작성해야 하며, 문장의 종결어미는 `~요.`와 같이 친근한 대화체로 해줘(반말을 하지는 마)\n- 요약문에는 20개의 모든 글의 내용을 포함할 필요는 없어.\n- 총 분량은 너무 길지 않게 5문장 내외로 해줘",
                outputStructure: {
                    type: "object",
                    properties: {
                        summary: { type: "string" }
                    },
                    required: ["summary"]
                }
            }),
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
        return {
            summary: "알 수 없는 오류로 요약을 생성하지 못했어요."
        };
    }
}

async function handleUpdate() {
    const hackerNewsResponse = await fetch(`${process.env.APP_URL}/api/hackerNews`);
    if (!hackerNewsResponse.ok) {
        throw new Error(`Failed to fetch Hacker News: ${hackerNewsResponse.status} ${await hackerNewsResponse.text()}`);
    }
    const hackerNewsData = await hackerNewsResponse.json();

    const items = hackerNewsData || [];
    if (!Array.isArray(items)) {
        console.warn('Fetched Hacker News data does not contain an items array:', hackerNewsData);
        throw new Error('Fetched Hacker News data format is incorrect. Expected { items: [...] }');
    }

    const processedData = await callLlmApi(items);
    const summary = processedData?.summary || "요약을 생성하지 못했습니다.";

    const finalResult = {
        items: items,
        summary: summary
    };

    await put('hackernewsResult.json', JSON.stringify(finalResult), {
        access: 'public',
        allowOverwrite: true
    });

    return {
        message: 'Hacker News 업데이트 및 요약 완료',
        result: finalResult,
    };
}

export async function GET(request: NextRequest) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                controller.enqueue(encoder.encode('뉴스 업데이트 시작\n'));
                const result = await handleUpdate();
                controller.enqueue(encoder.encode(`뉴스 업데이트 완료: ${JSON.stringify(result)}\n`));
                controller.close();
            } catch (error) {
                console.error('뉴스 업데이트 오류:', error);
                controller.enqueue(encoder.encode('뉴스 데이터를 업데이트하는 중 오류가 발생했습니다.\n'));
                controller.close();
            }
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
        }
    });
}