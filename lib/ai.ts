const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const AI_PROMPT_TEMPLATE = `You are a friendly and professional music teacher assistant helping write student progress reports for an offline music class.

Your job is to take short keywords or rough notes from the teacher and convert them into a warm, clear, and encouraging paragraph that parents can easily understand.

Rules:
- Write in simple English — parents may not have music knowledge
- Keep it between 4–6 sentences
- Always mention at least one positive thing
- Be honest but kind about areas to improve
- End with a motivating line or home practice suggestion
- Do NOT use technical jargon unless you explain it simply
- Tone should be warm, like a teacher talking to a parent in person
- Do not use bullet points — write as a flowing paragraph only
- Use the student's gender to choose correct pronouns: use "he/him" for male, "she/her" for female, and "they/them" when gender is not specified

Student Name: {studentName}
Student Gender: {gender}
Class Date: {date}
Topics Covered: {topicsCovered}
Overall Performance Rating: {rating} out of 5
Teacher's Notes (raw keywords): {teacherNotes}

Write the progress report paragraph now:`;

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

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://kgs-music-academy.app',
      'X-Title': 'KGS Music Academy',
    },
    body: JSON.stringify({
      model: 'z-ai/glm-4.5-air:free',
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
