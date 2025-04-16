import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        const { newsData, instruction, outputStructure } = await request.json();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const generationConfig: {
                        temperature: number;
                        responseMimeType: string;
                        responseSchema?: any;
                    } = {
                        temperature: 0.5,
                        responseMimeType: "application/json",
                    };

                    if (outputStructure) {
                        generationConfig.responseSchema = outputStructure;
                    }

                    const geminiRequest = {
                        contents: [
                            {
                                role: 'user',
                                parts: [
                                    {
                                        text: instruction
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
                        generationConfig: generationConfig
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
