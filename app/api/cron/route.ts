import { NextRequest, NextResponse } from 'next/server';

export const config = {
    runtime: 'edge'
};

async function consumeStream(
    controller: ReadableStreamDefaultController<Uint8Array>,
    encoder: TextEncoder,
    url: string,
    response: Response,
    prefix: string
): Promise<boolean> {
    controller.enqueue(encoder.encode(`${prefix} Request sent to ${url}. Status: ${response.status}\n`));

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error body');
        const message = `${prefix} Request failed: ${response.status} ${response.statusText}. Body: ${errorText}\n`;
        console.error(message);
        controller.enqueue(encoder.encode(message));
        return false;
    }

    if (!response.body) {
        const message = `${prefix} Response OK but has no body. Assuming completion.\n`;
        console.warn(message);
        controller.enqueue(encoder.encode(message));
        return true;
    }

    controller.enqueue(encoder.encode(`${prefix} Stream received. Consuming...\n`));
    const reader = response.body.getReader();
    let chunks = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                controller.enqueue(encoder.encode(`${prefix} Stream finished after ${chunks} chunks.\n`));
                break;
            }
            chunks++;
        }
        return true;
    } catch (error) {
        const message = `${prefix} Stream reading error: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
        console.error(message, error);
        controller.enqueue(encoder.encode(message));
        return false;
    } finally {
    }
}


export async function GET(req: NextRequest) {
    const appUrl = process.env.APP_URL;

    if (!appUrl) {
        return new NextResponse('APP_URL environment variable is not set.', { status: 500 });
    }

    const updateTargets = [
        { url: `${appUrl}/api/news/update`, prefix: "[News Update]" },
        { url: `${appUrl}/api/hackerNews/update`, prefix: "[Hacker News Update]" },
        { url: `${appUrl}/api/ainews/update`, prefix: "[AI News Update]" },
    ];

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode("Cron job starting...\n"));

            try {
                controller.enqueue(encoder.encode(`Initiating parallel fetches for ${updateTargets.length} targets...\n`));
                updateTargets.forEach(target => {
                    controller.enqueue(encoder.encode(` -> ${target.prefix}: ${target.url}\n`));
                });

                const fetchPromises = updateTargets.map(target => fetch(target.url).then(response => ({ response, target })));
                const fetchResults = await Promise.allSettled(fetchPromises);

                controller.enqueue(encoder.encode("Initial fetch responses received. Processing streams...\n"));

                const consumptionPromises: Promise<boolean>[] = [];

                fetchResults.forEach((result, index) => {
                    const target = updateTargets[index];

                    if (result.status === 'fulfilled') {
                        const { response } = result.value;
                        consumptionPromises.push(
                            consumeStream(controller, encoder, target.url, response, target.prefix)
                        );
                    } else {
                        const errorMsg = `${target.prefix} Fetch failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}\n`;
                        console.error(errorMsg);
                        controller.enqueue(encoder.encode(errorMsg));
                        consumptionPromises.push(Promise.resolve(false));
                    }
                });

                const results = await Promise.all(consumptionPromises);
                const allSucceeded = results.every(success => success);

                if (allSucceeded) {
                    controller.enqueue(encoder.encode("All update streams completed successfully.\n"));
                } else {
                    controller.enqueue(encoder.encode("One or more update streams failed or encountered errors. Check logs above.\n"));
                }

            } catch (error) {
                console.error("Critical error during cron job execution:", error);
                controller.enqueue(encoder.encode(`Critical error during updates: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
            } finally {
                controller.enqueue(encoder.encode("Cron job finished.\n"));
                controller.close();
            }
        },
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
