import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        // Parse request body to get newsData
        const { newsData } = await request.json();

        // Create a readable stream for the response
        const stream = new ReadableStream({
            async start(controller) {
                let closed = false; // Flag to prevent multiple closes
                const closeStream = () => {
                    if (!closed) {
                        closed = true;
                        controller.close();
                    }
                };

                try {
                    // Construct the Gemini API request
                    const geminiRequest = {
                        contents: [
                            {
                                role: 'user',
                                parts: [
                                    {
                                        text: "## 요약문 작성\n- 요약문은 아래에 주어진 포스팅들의 내용을 모든 내용을 빠르게 읽을 수 있도록 간결하면서도 상세하게 작성해야 하며, 문장의 종결어미는 `~요.`와 같이 친근한 대화체로 해줘.\n"
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
                            temperature: 0.7,
                        }
                    };

                    // Call Gemini API
                    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
                    if (!GEMINI_API_KEY) {
                        throw new Error('GEMINI_API_KEY is not defined');
                    }

                    const MODEL_ID = "gemini-2.0-flash-lite";
                    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:streamGenerateContent?key=${GEMINI_API_KEY}`;

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

                    // Process the streaming response from Gemini
                    const reader = geminiResponse.body?.getReader();
                    if (!reader) {
                        throw new Error('Failed to get reader from Gemini response');
                    }

                    const decoder = new TextDecoder();
                    let accumulatedJson = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        // Decode the chunk
                        const chunk = decoder.decode(value, { stream: true });
                        accumulatedJson += chunk;

                        // Process potential complete JSON objects in the accumulated string
                        // Gemini stream sends JSON objects separated by newlines
                        let newlineIndex;
                        while ((newlineIndex = accumulatedJson.indexOf('\n')) >= 0) {
                            const line = accumulatedJson.substring(0, newlineIndex).trim();
                            accumulatedJson = accumulatedJson.substring(newlineIndex + 1);

                            if (line.startsWith('[') || line.startsWith(',')) continue; // Skip array start/commas if present

                            if (line) {
                                try {
                                    const data = JSON.parse(line);
                                    // Extract text content from the candidates
                                    if (data.candidates && data.candidates[0]?.content?.parts?.length > 0) {
                                        const text = data.candidates[0].content.parts[0].text || '';
                                        if (text && !closed) {
                                            // Send the extracted text chunk to the client
                                            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ chunk: text })}\n\n`));
                                        }
                                    }
                                } catch (e) {
                                    // Ignore lines that are not valid JSON
                                    // console.warn('Skipping invalid JSON line:', line, e);
                                }
                            }
                        }
                    }
                    // Process any remaining part after the loop
                    if (accumulatedJson.trim()) {
                        try {
                            const data = JSON.parse(accumulatedJson.trim());
                            if (data.candidates && data.candidates[0]?.content?.parts?.length > 0) {
                                const text = data.candidates[0].content.parts[0].text || '';
                                if (text && !closed) {
                                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ chunk: text })}\n\n`));
                                }
                            }
                        } catch (e) {
                            // console.warn('Skipping invalid JSON line at end:', accumulatedJson.trim(), e);
                        }
                    }


                    // Signal completion
                    if (!closed) {
                        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ status: "complete" })}\n\n`));
                    }

                } catch (error) {
                    // Send error response to the client stream
                    const errorMessage = JSON.stringify({
                        status: 'error',
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date().toISOString()
                    });
                    if (!closed) {
                        controller.enqueue(new TextEncoder().encode(`data: ${errorMessage}\n\n`));
                    }
                } finally {
                    // Ensure the stream is closed
                    closeStream();
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
        // Handle errors in setting up the stream itself
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
