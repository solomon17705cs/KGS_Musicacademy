import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
let cachedApiKey: string | null = null;
let keyFetchPromise: Promise<string | null> | null = null;

async function getApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  if (keyFetchPromise) return keyFetchPromise;

  const envFallback = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
  if (envFallback) {
    cachedApiKey = envFallback;
    return cachedApiKey;
  }

  keyFetchPromise = (async () => {
    try {
      const snap = await getDoc(doc(db, 'config', 'ai'));
      cachedApiKey = snap.data()?.openrouterApiKey || '';
      if (!cachedApiKey) console.warn('[AI] Firestore doc config/ai has no openrouterApiKey field');
    } catch (err) {
      console.error('[AI] Firestore read failed:', err);
      cachedApiKey = '';
    }
    keyFetchPromise = null;
    return cachedApiKey;
  })();

  return keyFetchPromise;
}

const AI_PROMPT_TEMPLATE = `You are a warm, professional music teacher's assistant writing weekly progress notes for parents at a music academy.

Convert the teacher's short keywords/tags into a natural paragraph for the parent. Follow these rules strictly:

STRUCTURE (in this order):
1. One specific observation about what the student worked on or did well
   (use the topics/strengths given — be concrete, not generic)
2. An effort/improvement note, if strengths are mentioned — acknowledge
   practice or progress, not just describe the skill
3. If "needs work" items are given, frame them as normal/expected for
   this stage, never as a deficiency or criticism
4. End with one forward-looking line — what's next, or a simple home
   practice tip

RULES:
- Write in plain, simple English a parent with no music background
  can understand
- 3-5 sentences total
- Never use the exact same opening phrase as a generic template —
  vary structure based on the actual input given
- Never compare the student to other students or siblings
- If gender is provided, use the correct pronoun naturally; otherwise
  use the student's name instead of a pronoun
- Do not invent specific achievements not implied by the input —
  only elaborate on what's given
- Tone: warm, honest, like a teacher who knows this specific child,
  not a corporate report

Student Name: {studentName}
Date: {date}
Topics Covered: {topicsCovered}
Overall Rating: {rating}/5
Teacher's Tags/Notes: {teacherNotes}

Write the progress note now, as a single paragraph:`;

export interface AIReportParams {
  studentName: string;
  gender: 'male' | 'female' | null;
  date: string;
  topicsCovered: string;
  rating: number;
  teacherNotes: string;
}

export async function generateProgressReport(params: AIReportParams): Promise<string> {
  const prompt = AI_PROMPT_TEMPLATE
    .replace('{studentName}', params.studentName)
    .replace('{gender}', params.gender || 'not specified')
    .replace('{date}', params.date)
    .replace('{topicsCovered}', params.topicsCovered || 'Regular practice session')
    .replace('{rating}', String(params.rating))
    .replace('{teacherNotes}', params.teacherNotes);

  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('AI API key not configured. Add it to Firestore: config/ai → openrouterApiKey');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://kgs-music-academy.app',
      'X-Title': 'KGS Music Academy',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat-v3.1',
      messages: [
        { role: 'user', content: prompt },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from AI');
  }

  return content.trim();
}
