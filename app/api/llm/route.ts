import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        // Parse request body to get newsData
        const { newsData } = await request.json();

        // Create a readable stream for the response
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Construct the Gemini API request
                    const geminiRequest = {
                        contents: [
                            {
                                role: 'user',
                                parts: [
                                    {
                                        text: "## `items` 선정\njson 배열로 주어지는 전체 뉴스 기사들 중 일주일 동안의 이슈를 요약할 만한 주요 기사를 10개 내외로 선택하여 `items` 배열에 추가해. 이때 각 item의 모든 값들은 주어진 전체 기사에서의 해당 item이 가진 값들과 동일하게 작성해(추가적인 요약이나 변형 불필요).\n\n## `summary` 작성\n- 요약문은 선택한 기사의 내용을 모두 읽지 않고도 각각의 세부 내용까지 빠르게 읽을 수 있도록 간결하면서도 상세하게 작성해야 하며, 문장의 종결어미는 `~요.`와 같이 친근한 대화체로 해줘.\n- 요약문은 앞에서 선정한 각 item의 content 값을 바탕으로 작성해야 해.\n- 총 분량은 10문장 내외로 해줘."
                                    }
                                ]
                            },

                            {
                                role: 'user',
                                parts: [
                                    {
                                        text: JSON.stringify(newsData)
                                    }
                                ]
                            }
                        ],
                        generationConfig: {
                            temperature: 0.5,
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: "object",
                                properties: {
                                    items: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                title: { type: "string" },
                                                description: { type: "string" },
                                                link: { type: "string" },
                                                content: { type: "string" }
                                            },
                                            required: ["title", "description", "link", "content"]
                                        }
                                    },
                                    summary: { type: "string" }
                                },
                                required: ["items", "summary"]
                            }
                        }
                    };

                    // Call Gemini API
                    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
                    if (!GEMINI_API_KEY) {
                        throw new Error('GEMINI_API_KEY is not defined');
                    }

                    const MODEL_ID = "gemini-2.0-flash-lite";
                    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;

                    // Interval to send pending status while waiting for response
                    let closed = false;
                    const intervalId = setInterval(() => {
                        if (closed) return;
                        controller.enqueue(new TextEncoder().encode(`pending\n`));
                    }, 1000);

                    try {
                        const geminiResponse = await fetch(GEMINI_API_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(geminiRequest),
                        });

                        if (!geminiResponse.ok) {
                            throw new Error(`Gemini API error: ${geminiResponse.status} ${await geminiResponse.text()}`);
                        }

                        // Read the entire response as text
                        const responseText = JSON.parse(await geminiResponse.text());

                        // Parse the JSON content
                        const finalResponse = JSON.parse(responseText.candidates[0].content.parts[0].text);

                        // Clear the interval and send the final response
                        if (!closed) {
                            clearInterval(intervalId);
                            closed = true;
                            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(finalResponse)}`));
                            controller.close();
                        }
                    } catch (error) {
                        // Send error response
                        const errorMessage = JSON.stringify({
                            status: 'error',
                            error: error instanceof Error ? error.message : 'Unknown error',
                            timestamp: new Date().toISOString()
                        });
                        if (!closed) {
                            clearInterval(intervalId);
                            closed = true;
                            controller.enqueue(new TextEncoder().encode(`data: ${errorMessage}\n\n`));
                            controller.close();
                        }
                    }
                } catch (error) {
                    // Send error response
                    const errorMessage = JSON.stringify({
                        status: 'error',
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date().toISOString()
                    });
                    controller.enqueue(new TextEncoder().encode(`data: ${errorMessage}\n\n`));
                    controller.close();
                }
            }
        });

        // Return the response with appropriate headers
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
