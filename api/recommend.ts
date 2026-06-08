// Vercel serverless function — OPTIONAL AI mode.
//
// • GET  → reports whether AI mode is available (i.e. ANTHROPIC_API_KEY is set).
// • POST → asks Claude for fresh known-song picks beyond the local catalog,
//          optionally reading a representative keyframe with vision.
//
// The whole app works with ZERO env vars: when the key is absent this function
// simply reports aiAvailable:false and the client stays on its local engine.

interface ReqLike {
  method?: string;
  body?: unknown;
}
interface ResLike {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
  setHeader: (k: string, v: string) => void;
}

interface DerivedSignals {
  moods?: string[];
  scenes?: string[];
  settings?: string[];
  genres?: string[];
  energy?: string;
  keywords?: string[];
}
interface RecommendBody {
  signals?: DerivedSignals;
  brief?: string;
  transcript?: string;
  keyframe?: string; // data URL
}
interface Pick {
  artist: string;
  title: string;
  why: string;
}

const MODEL = 'claude-sonnet-4-6';

export default async function handler(req: ReqLike, res: ResLike): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.ANTHROPIC_API_KEY;

  if (req.method === 'GET') {
    res.status(200).json({ aiAvailable: Boolean(key) });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!key) {
    res.status(200).json({ aiAvailable: false, picks: [] });
    return;
  }

  const body: RecommendBody =
    typeof req.body === 'string'
      ? (JSON.parse(req.body) as RecommendBody)
      : ((req.body as RecommendBody) ?? {});

  const s = body.signals ?? {};
  const profileText = [
    s.moods?.length ? `Moods: ${s.moods.join(', ')}` : '',
    s.scenes?.length ? `Scenes: ${s.scenes.join(', ')}` : '',
    s.settings?.length ? `Settings: ${s.settings.join(', ')}` : '',
    s.genres?.length ? `Genres leaning: ${s.genres.join(', ')}` : '',
    s.energy ? `Energy: ${s.energy}` : '',
    s.keywords?.length ? `Keywords: ${s.keywords.slice(0, 20).join(', ')}` : '',
    body.brief ? `Creative brief: ${body.brief}` : '',
    body.transcript ? `Voiceover transcript (excerpt): ${body.transcript.slice(0, 1200)}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const system =
    'You are an expert music supervisor for short-form video. Given a mood ' +
    'profile of a clip, suggest REAL, well-known, commercially released songs ' +
    '(real artist + real title) that would soundtrack it well. Favor ' +
    'recognizable, licensable tracks across eras and genres. Do NOT invent ' +
    'songs. Return STRICT JSON only: an object {"picks":[{"artist","title","why"}]} ' +
    'with 8 items. "why" is one concise sentence on why it fits this footage.';

  // Build content: text + optional keyframe image for vision.
  const content: unknown[] = [];
  const kf = body.keyframe;
  if (kf && kf.startsWith('data:')) {
    const match = /^data:(image\/[a-zA-Z]+);base64,(.+)$/.exec(kf);
    if (match) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: match[1], data: match[2] },
      });
      content.push({
        type: 'text',
        text: 'Above is a representative keyframe from the clip. Read its scene, color and mood.',
      });
    }
  }
  content.push({
    type: 'text',
    text: `Mood profile:\n${profileText || '(sparse — infer from any image provided)'}\n\nReturn the JSON now.`,
  });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res.status(502).json({ error: 'Upstream error', detail: detail.slice(0, 400), picks: [] });
      return;
    }

    const data = (await r.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = (data.content ?? [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('');

    const picks = parsePicks(text);
    res.status(200).json({ aiAvailable: true, picks });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : 'AI request failed',
      picks: [],
    });
  }
}

function parsePicks(text: string): Pick[] {
  // Tolerate code fences / prose around the JSON.
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return [];
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as { picks?: Pick[] };
    return (obj.picks ?? [])
      .filter((p) => p && p.artist && p.title)
      .map((p) => ({ artist: String(p.artist), title: String(p.title), why: String(p.why ?? '') }))
      .slice(0, 12);
  } catch {
    return [];
  }
}
