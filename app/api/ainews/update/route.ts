import { NextRequest, NextResponse } from 'next/server';
import { fetchRssFeed } from '@/app/utils/rssToJson';
import { list, put } from '@vercel/blob';

export const config = {
    runtime: 'edge'
};

const getCurrentWeekLabel = (date: Date): string => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // 해당 연도의 첫 날부터 현재 목요일까지의 일 수 차이 계산 후 주차 계산
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};


async function callLlmApi(newsData: any) {
    try {
        const response = await fetch(`${process.env.APP_URL}/api/llm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                newsData,
                instruction: "## `items` 선정\njson 배열로 주어지는 전체 AI 소식들 중 일주일 동안의 이슈를 요약할 만한 주요 소식을 10개 내외로 선택하여 `items` 배열에 추가해.\n- 각 item의 모든 값들은 주어진 전체 소식에서의 해당 item이 가진 값들과 동일하게 작성해(추가적인 요약이나 변형 불필요).\n-같은 주제가 중복되어서는 안돼.\n- 같은 주제지만 사건이 시간이 흐름에 따라 진행된 경우 가장 마지막 소식을 선정하고, 향후 요약문에 전체 흐름을 포함해.\n\n## `summary` 작성\n- 요약문은 선정한 소식 각각의 세부 내용까지 빠르게 읽을 수 있도록 간결하면서도 상세하게 작성해야 하며, 문장의 종결어미는 `~요.`와 같이 친근한 대화체로 해줘(반말은 하지 마).\n- 총 분량은 10문장 내외로 해줘.",
                outputStructure: {
                    type: "object",
                    properties: {
                        items: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    description: { type: "string" },
                                    link: { type: "string" },
                                },
                                required: ["description", "link"]
                            }
                        },
                        summary: { type: "string" }
                    },
                    required: ["items", "summary"]
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`LLM API 호출 실패: ${response.status} ${await response.text()}`);
        }

        if (!response.body) {
            throw new Error('LLM API 응답 본문이 없습니다.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        let finalData = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            result += decoder.decode(value, { stream: true });

            const lines = result.split('\n');
            result = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const jsonData = line.substring(5).trim();
                    try {
                        finalData = JSON.parse(jsonData);
                        await reader.cancel();
                        break;
                    } catch (e) {
                        console.error('LLM 응답 JSON 파싱 오류:', e, 'Data:', jsonData);
                    }
                } else if (line.trim() === 'pending') {
                    // Ignore pending messages
                }
            }
            if (finalData) break;
        }

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
            items: newsData.map((item: any) => ({
                description: item.description || '',
                link: item.link
            })),
            summary: "알 수 없는 오류로 요약을 생성하지 못했어요."
        };
    }
}

async function handleUpdate() {
    const currentWeekLabel = getCurrentWeekLabel(new Date());

    const newsFeed = await fetchRssFeed("https://rss.app/feeds/tLVoDtyUrmq0EQMf.xml");
    const newNewsItems = newsFeed.items || [];

    const { blobs } = await list();
    const weeklyNewsBlob = blobs.find(blob => blob.pathname === 'weeklyNews.json');

    let existingNewsItems: any[] = [];
    let lastUpdateWeekLabel: string | null = null;

    if (weeklyNewsBlob) {
        try {
            const response = await fetch(weeklyNewsBlob.url);
            if (response.ok) {
                const storedData = await response.json();
                if (storedData && typeof storedData === 'object' && storedData.lastUpdateWeekLabel && Array.isArray(storedData.items)) {
                    lastUpdateWeekLabel = storedData.lastUpdateWeekLabel;
                    existingNewsItems = storedData.items;
                }
            }
        } catch (error) {
            console.error("Error fetching or parsing weeklyNews.json:", error, ". 새 주차로 간주합니다.");
        }
    }

    // 주차가 변경되었거나, 기존 라벨이 없거나(null), 기존 데이터 로딩에 실패한 경우, 기존 뉴스 목록 초기화
    if (currentWeekLabel !== lastUpdateWeekLabel) {
        console.log(`새로운 주차(${currentWeekLabel}) 시작 또는 데이터 초기화 필요. 기존 데이터를 초기화합니다. 이전 주차 라벨: ${lastUpdateWeekLabel}`);
        existingNewsItems = [];
    }

    const existingUrls = new Set(existingNewsItems.map(item => item.link));
    const uniqueNewItems = newNewsItems.filter(item => item.link && !existingUrls.has(item.link));

    const combinedNewsItems = [...uniqueNewItems, ...existingNewsItems];

    const dataToStore = {
        lastUpdateWeekLabel: currentWeekLabel,
        items: combinedNewsItems
    };

    await put('aiWeeklyNews.json', JSON.stringify(dataToStore), {
        access: 'public',
        allowOverwrite: true
    });

    const processedData = await callLlmApi(combinedNewsItems);

    await put('ainewsResult.json', JSON.stringify(processedData), {
        access: 'public',
        allowOverwrite: true
    });

    return {
        message: '뉴스 업데이트 완료',
        combinedNewsItems: combinedNewsItems,
        newsResult: processedData,
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