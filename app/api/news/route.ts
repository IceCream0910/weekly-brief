import { NextResponse } from 'next/server';
import { list, head } from '@vercel/blob';

export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

export async function GET() {
    try {
        // Find the blob without listing all if possible, or use list if needed
        // Using head is more efficient if the blob exists
        let blobUrl: string | null = null;
        try {
            const blobInfo = await head('weeklyNews.json');
            blobUrl = blobInfo.url;
        } catch (error: any) {
            // Handle case where blob doesn't exist (e.g., first run)
            if (error?.status === 404) {
                console.log('weeklyNews.json not found. Returning empty list.');
                return NextResponse.json({ items: [] });
            }
            // Re-throw other errors
            throw error;
        }

        const response = await fetch(blobUrl, { cache: 'no-store' });

        if (!response.ok) {
            throw new Error(`Failed to fetch weeklyNews.json: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error in /api/news:', error);
        return NextResponse.json({ error: 'Failed to fetch news data.', items: [] }, { status: 500 });
    }
}