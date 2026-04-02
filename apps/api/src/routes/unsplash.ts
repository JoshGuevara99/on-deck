import { Router } from 'express';

export const unsplashRouter = Router();

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY ?? '';

/** GET /unsplash/search?q=open+mic */
unsplashRouter.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q) return res.status(400).json({ error: 'q is required' });

    const url = new URL('https://api.unsplash.com/search/photos');
    url.searchParams.set('query', q);
    url.searchParams.set('per_page', '9');
    url.searchParams.set('orientation', 'landscape');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Unsplash request failed' });
    }

    const data: any = await response.json();
    const photos = (data.results ?? []).map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumb: photo.urls.thumb,
      downloadLocation: photo.links.download_location,
      photographer: photo.user.name,
      photographerUrl: photo.user.links.html,
    }));

    res.json(photos);
  } catch (err) {
    next(err);
  }
});

/** GET /unsplash/track?url=<download_location> — required by Unsplash API guidelines */
unsplashRouter.get('/track', async (req, res, next) => {
  try {
    const url = (req.query.url as string | undefined)?.trim();
    if (!url) return res.status(400).json({ error: 'url is required' });

    // SSRF guard — parse and validate hostname, not just prefix
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid download URL' });
    }
    if (parsed.hostname !== 'api.unsplash.com' || parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Invalid download URL' });
    }

    await fetch(url, {
      headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
