import { JSDOM } from 'jsdom';

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
        const response = await fetch(url);
        if (!response.ok) throw new Error('피드 요청 실패');
        const xmlText = await response.text();

        // JSDOM을 사용하여 서버 환경에서 XML 파싱
        const dom = new JSDOM(xmlText, { contentType: "text/xml" });
        const xmlDoc = dom.window.document;

        // RSS 2.0
        const channel = xmlDoc.querySelector("channel");
        if (channel) {
            const items = Array.from(channel.querySelectorAll("item")).map(item => ({
                title: item.querySelector("title")?.textContent || '',
                description: item.querySelector("description")?.textContent || '',
                link: item.querySelector("link")?.textContent || '',
                pubDate: item.querySelector("pubDate")?.textContent || undefined,
                author: item.querySelector("author")?.textContent || item.querySelector("dc\\:creator")?.textContent || undefined,
                categories: Array.from(item.querySelectorAll("category")).map(c => c.textContent || '').filter(Boolean),
                guid: item.querySelector("guid")?.textContent || undefined,
                content: item.querySelector("content\\:encoded")?.textContent || item.querySelector("description")?.textContent || ''
            }));

            return {
                title: channel.querySelector("title")?.textContent || '',
                description: channel.querySelector("description")?.textContent || undefined,
                link: channel.querySelector("link")?.textContent || undefined,
                items,
                lastBuildDate: channel.querySelector("lastBuildDate")?.textContent || undefined
            };
        }

        // Atom
        const feed = xmlDoc.querySelector("feed");
        if (feed) {
            const items = Array.from(feed.querySelectorAll("entry")).map(entry => ({
                title: entry.querySelector("title")?.textContent || '',
                description: entry.querySelector("summary")?.textContent || entry.querySelector("content")?.textContent || '',
                link: entry.querySelector("link")?.getAttribute("href") || '',
                pubDate: entry.querySelector("pubDate")?.textContent || entry.querySelector("updated")?.textContent || entry.querySelector("published")?.textContent || undefined,
                author: entry.querySelector("author > name")?.textContent || undefined,
                categories: Array.from(entry.querySelectorAll("category")).map(c => c.getAttribute("term") || '').filter(Boolean),
                guid: entry.querySelector("id")?.textContent || undefined,
                content: entry.querySelector("content")?.textContent || entry.querySelector("summary")?.textContent || ''
            }));

            return {
                title: feed.querySelector("title")?.textContent || '',
                description: feed.querySelector("subtitle")?.textContent || undefined,
                link: feed.querySelector("link")?.getAttribute("href") || undefined,
                items,
                lastBuildDate: feed.querySelector("updated")?.textContent || undefined
            };
        }

        throw new Error('지원하지 않는 피드 형식입니다.');
    } catch (error) {
        console.error('RSS/Atom 피드 파싱 오류:', error);
        throw new Error('피드를 파싱하는 중 오류가 발생했습니다.');
    }
}
