import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'all';
  const era = searchParams.get('era') || '';

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  const cacheKey = `${query}-${type}-${era}`;
  // Temporarily disable cache to verify Smithsonian results
  /*
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ results: cached.data, cached: true });
  }
  */

  try {
    const results = await Promise.allSettled([
      searchInternetArchive(query, type, era),
      searchLOC(query, type, era),
      type !== 'video' ? searchSmithsonian(query, type, era) : Promise.resolve([]),
      searchPexels(query, type),
      searchPixabay(query, type),
      searchGoogle(query, type),
    ]);

    const flatResults = results
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    // Save to cache
    cache.set(cacheKey, { data: flatResults, timestamp: Date.now() });

    // Sort by downloads or relevance (mocking relevance by order)
    return NextResponse.json({ results: flatResults });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

async function searchSmithsonian(query: string, type: string, era: string) {
  const API_KEY = process.env.SMITHSONIAN_API_KEY || 'DEMO_KEY';
  const q = `${query} ${era}`.trim();
  // Smithsonian API search
  const url = `https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(q)}&api_key=${API_KEY}&rows=50`;

  try {
    const response = await axios.get(url);
    const rows = response.data.response?.rows || [];

    return rows.map((row: any) => {
      const content = row.content;
      const media = content.descriptiveNonRepeating?.online_media?.media || [];
      // Prefer larger images for thumbnails if available
      const thumbnail = media[0]?.thumbnail || media[0]?.content || '';
      const downloadUrl = media[0]?.content || '';
      
      const year = content.freetext?.date?.[0]?.content || row.year || '';

      return {
        id: row.id,
        source: 'Smithsonian',
        title: row.title || 'Untitled Smithsonian Asset',
        type: 'image', 
        year,
        thumbnail,
        description: content.descriptiveNonRepeating?.metadata_usage?.text || '',
        downloads: 0,
        tags: content.indexedStructured?.topic || [],
        downloadUrl,
      };
    }).filter((item: any) => item.thumbnail);
  } catch (err: any) {
    console.error('Smithsonian search failed:', err.message);
    return [];
  }
}

async function searchInternetArchive(query: string, type: string, era: string) {
  let mediatype = '(mediatype:movies OR mediatype:image)';
  if (type === 'video') mediatype = 'mediatype:movies';
  if (type === 'image') mediatype = 'mediatype:image';

  // Strictly target Prelinger collection for copyright-free content
  const fullQuery = `${mediatype} AND (collection:prelinger) AND "${query}" ${era}`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(fullQuery)}&fl[]=identifier,title,mediatype,year,description,subject,downloads&rows=50&output=json&sort[]=downloads+desc`;

  try {
    const response = await axios.get(url);
    const docs = response.data.response.docs;

    return docs.map((doc: any) => {
      // Smart tagging
      const tags = [...(doc.subject || []), ...(doc.title.split(' '))].filter(t => t.length > 3).slice(0, 10);
      
      return {
        id: doc.identifier,
        source: 'Internet Archive',
        title: doc.title,
        type: doc.mediatype === 'movies' ? 'video' : 'image',
        thumbnail: `https://archive.org/services/img/${doc.identifier}`,
        url: `https://archive.org/details/${doc.identifier}`,
        year: doc.year || '',
        description: doc.description || '',
        downloads: doc.downloads || 0,
        tags: Array.from(new Set(tags)),
        // Heuristic: for videos, we try to guess the MP4 name. 
        // Actual discovery happens in the download/clip routes if this fails.
        downloadUrl: doc.mediatype === 'movies' 
          ? `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp4` 
          : `https://archive.org/download/${doc.identifier}/${doc.identifier}.jpg`,
      };
    });
  } catch (err) {
    console.error('IA Search Error:', err);
    return [];
  }
}

async function searchLOC(query: string, type: string, era: string) {
  const fullQuery = `${query} ${era} vintage`;
  const fa = type === 'image' ? 'online-format:image' : type === 'video' ? 'online-format:video' : '';
  const url = `https://www.loc.gov/photos/?q=${encodeURIComponent(fullQuery)}&fo=json&c=50${fa ? `&fa=${encodeURIComponent(fa)}` : ''}`;

  try {
    const response = await axios.get(url);
    const results = response.data.results || [];

    return results.map((item: any) => ({
      id: item.id,
      source: 'Library of Congress',
      title: item.title,
      type: item.original_format && item.original_format[0].includes('video') ? 'video' : 'image',
      thumbnail: item.image_url ? item.image_url[item.image_url.length - 1] : '',
      url: item.url,
      year: item.date || '',
      description: item.description ? item.description[0] : '',
      downloadUrl: item.image_url ? item.image_url[item.image_url.length - 1] : '',
    }));
  } catch (err) {
    console.error('LOC Search Error:', err);
    return [];
  }
}

async function searchPexels(query: string, type: string) {
  const API_KEY = process.env.PEXELS_API_KEY;
  if (API_KEY) {
    // Official API logic
    const endpoint = type === 'video' ? 'videos/search' : 'search';
    const url = `https://api.pexels.com/v1/${endpoint}?query=${encodeURIComponent(query)}&per_page=30`;
    try {
      const response = await axios.get(url, { headers: { Authorization: API_KEY } });
      const items = type === 'video' ? response.data.videos : response.data.photos;
      return items.map((item: any) => ({
        id: `pexels-${item.id}`,
        source: 'Pexels',
        title: item.alt || 'Pexels Asset',
        type: type === 'video' ? 'video' : 'image',
        thumbnail: type === 'video' ? item.image : item.src.medium,
        downloadUrl: type === 'video' ? item.video_files[0]?.link : item.src.original,
      }));
    } catch (err) {}
  }

  // Scraper Fallback
  try {
    const url = `https://www.pexels.com/search/${encodeURIComponent(query)}/`;
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    const results: any[] = [];
    
    $('article').each((i, el) => {
      if (i >= 20) return;
      const img = $(el).find('img').first();
      const src = img.attr('src') || img.attr('data-big-src');
      if (src) {
        results.push({
          id: `pexels-scrape-${i}`,
          source: 'Pexels',
          title: img.attr('alt') || 'Pexels Scraped',
          type: 'image',
          thumbnail: src,
          downloadUrl: src.split('?')[0],
        });
      }
    });
    return results;
  } catch (err) {
    return [];
  }
}

async function searchPixabay(query: string, type: string) {
  const API_KEY = process.env.PIXABAY_API_KEY;
  if (API_KEY) {
    const endpoint = type === 'video' ? 'videos/' : '';
    const url = `https://pixabay.com/api/${endpoint}?key=${API_KEY}&q=${encodeURIComponent(query)}&per_page=30`;
    try {
      const response = await axios.get(url);
      return response.data.hits.map((item: any) => ({
        id: `pixabay-${item.id}`,
        source: 'Pixabay',
        title: item.tags || 'Pixabay Asset',
        type: type === 'video' ? 'video' : 'image',
        thumbnail: type === 'video' ? `https://i.vimeocdn.com/video/${item.picture_id}_640x360.jpg` : item.webformatURL,
        downloadUrl: type === 'video' ? item.videos.large.url : item.largeImageURL,
      }));
    } catch (err) {}
  }

  // Scraper Fallback
  try {
    const url = `https://pixabay.com/images/search/${encodeURIComponent(query)}/`;
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    const results: any[] = [];
    
    $('.container--37YpY img').each((i, el) => {
      if (i >= 20) return;
      const src = $(el).attr('src') || $(el).attr('data-lazy');
      if (src && src.includes('http')) {
        results.push({
          id: `pixabay-scrape-${i}`,
          source: 'Pixabay',
          title: $(el).attr('alt') || 'Pixabay Scraped',
          type: 'image',
          thumbnail: src,
          downloadUrl: src.replace('_340.', '_1280.'),
        });
      }
    });
    return results;
  } catch (err) {
    return [];
  }
}

async function searchGoogle(query: string, type: string) {
  // Scraper for Google Images (API-less)
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&safe=active&nfpr=1`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    const $ = cheerio.load(data);
    const results: any[] = [];
    
    // Modern Google Images uses a mix of <img> and data-iurl
    $('img').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-iurl');
      if (src && (src.startsWith('http') || src.startsWith('data:image'))) {
        results.push({
          id: `google-scrape-${i}-${Math.random().toString(36).substr(2, 5)}`,
          source: 'Google',
          title: $(el).attr('alt') || `Google Result ${i}`,
          type: 'image',
          thumbnail: src,
          downloadUrl: src,
        });
      }
    });

    // Fallback: If Google returns very few results (blocking), try DuckDuckGo Images
    if (results.length < 5) {
      try {
        const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}+images`;
        const { data: ddgData } = await axios.get(ddgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $$ = cheerio.load(ddgData);
        $$('img').each((i, el) => {
          const src = $$(el).attr('src');
          if (src && src.includes('http')) {
            results.push({
              id: `ddg-scrape-${i}`,
              source: 'Google (via Fallback)',
              title: $$(el).attr('alt') || 'Web Image',
              type: 'image',
              thumbnail: src,
              downloadUrl: src,
            });
          }
        });
      } catch (e) {}
    }

    return results.filter(r => r.thumbnail && r.thumbnail.length > 50).slice(0, 30); 
  } catch (err: any) {
    console.error('Google search failed:', err.message);
    return [];
  }
}
