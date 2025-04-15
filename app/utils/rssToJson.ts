import Parser from 'rss-parser';

export interface RssFeedItem {
    title: string;
    description: string;
    link: string;
    pubDate?: string;
    author?: string;
    categories?: string[];
    guid?: string;
    content?: string;
}

export interface RssFeed {
    title: string;
    description?: string;
    link?: string;
    items: RssFeedItem[];
    lastBuildDate?: string;
}

/**
 * RSS/Atom 피드 URL을 받아 JSON 형태로 변환하는 함수
 * @param url RSS/Atom 피드 URL
 * @returns 파싱된 피드 데이터
 */
export async function fetchRssFeed(url: string): Promise<RssFeed> {
    try {
        const parser = new Parser({
            customFields: {
                item: [
                    ['content:encoded', 'contentEncoded'],
                    ['dc:creator', 'dcCreator']
                ]
            }
        });
        const feed = await parser.parseURL(url);

        const result: RssFeed = {
            title: feed.title || '',
            description: feed.description,
            link: feed.link,
            items: feed.items.map(item => ({
                title: (item as any).title || '',
                description: (item as any).description || (item as any).content || '',
                link: (item as any).link || (item as any).id || '',
                pubDate: (item as any).pubDate || (item as any).published || (item as any).updated,
                author: (item as any).dcCreator || (item as any).creator || ((item as any).author && typeof (item as any).author === 'object' ? (item as any).author.name : (item as any).author),
                categories: (item as any).categories,
                guid: (item as any).guid || (item as any).id,
                content: (item as any).contentEncoded || (item as any).content || (item as any).description || ''
            })),
            lastBuildDate: feed.lastBuildDate
        };

        return result;
    } catch (error) {
        console.error('RSS/Atom 피드 파싱 오류:', error);
        throw new Error('피드를 파싱하는 중 오류가 발생했습니다.');
    }
}
