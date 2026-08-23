import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Classifies complaint into category, urgency, and generates a drafted acknowledgment.
 * Uses Gemini API if GEMINI_API_KEY is configured, or smart heuristic fallback.
 */
export async function triageComplaint(description, customApiKey = null) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
You are the AI triage assistant for a housing society management application called "Smart Complaint Box".
Analyze the resident's complaint and return a STRICT JSON object with no markdown codeblocks or commentary:

Complaint description: "${description}"

Categories available:
- Plumbing
- Electrical
- Lift
- Security
- Noise
- Parking
- Sanitation
- Other

Urgency levels:
- High (safety threats, gas leaks, water main bursts, lift stuck with people, security breaches)
- Medium (functional issues needing attention within 24 hours e.g. tap leak, hallway lights off)
- Low (minor inconvenience, noise disputes, parking line alignment)

Respond strictly in JSON format matching this schema:
{
  "category": "<One of the categories exact name>",
  "urgency": "<High | Medium | Low>",
  "ai_drafted_response": "<A warm, professional 1-2 sentence acknowledgment reassuring the resident that the issue has been classified and routed to the facility admin. Tone should be serious for High urgency, helpful for Medium/Low.>"
}
`;

      const result = await model.generateContent(prompt);
      const rawText = result.response.text()?.trim() || '';
      // Clean JSON if code blocks exist
      const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);

      return {
        category: parsed.category || 'Other',
        urgency: parsed.urgency || 'Medium',
        ai_drafted_response: parsed.ai_drafted_response || 'Thank you for submitting your complaint. The facility team has been notified.',
        source: 'gemini-api'
      };
    } catch (err) {
      console.warn('Gemini API call failed or key invalid, using fallback triage:', err.message);
    }
  }

  // Fallback heuristic Engine
  return fallbackTriage(description);
}

function fallbackTriage(description) {
  const text = description.toLowerCase();

  let category = 'Other';
  let urgency = 'Medium';

  // Category Detection
  if (text.includes('leak') || text.includes('water') || text.includes('tap') || text.includes('pipe') || text.includes('flush') || text.includes('drain') || text.includes('sewage')) {
    category = 'Plumbing';
  } else if (text.includes('power') || text.includes('light') || text.includes('electric') || text.includes('spark') || text.includes('wire') || text.includes('fuse') || text.includes('switch')) {
    category = 'Electrical';
  } else if (text.includes('lift') || text.includes('elevator')) {
    category = 'Lift';
  } else if (text.includes('gas') || text.includes('security') || text.includes('thief') || text.includes('guard') || text.includes('gate') || text.includes('stranger') || text.includes('cctv')) {
    category = 'Security';
  } else if (text.includes('noise') || text.includes('music') || text.includes('sound') || text.includes('party') || text.includes('shout') || text.includes('bark')) {
    category = 'Noise';
  } else if (text.includes('park') || text.includes('car') || text.includes('bike') || text.includes('vehicle') || text.includes('slot')) {
    category = 'Parking';
  } else if (text.includes('garbage') || text.includes('trash') || text.includes('stink') || text.includes('dirty') || text.includes('clean') || text.includes('pest')) {
    category = 'Sanitation';
  }

  // Urgency Detection
  if (text.includes('gas') || text.includes('spark') || text.includes('stuck') || text.includes('trapped') || text.includes('fire') || text.includes('urgent') || text.includes('burst') || text.includes('emergency') || text.includes('blood') || text.includes('smoke')) {
    urgency = 'High';
  } else if (text.includes('minor') || text.includes('noise') || text.includes('music') || text.includes('parking') || text.includes('dust')) {
    urgency = 'Low';
  } else {
    urgency = 'Medium';
  }

  let ai_drafted_response = '';
  if (urgency === 'High') {
    ai_drafted_response = `URGENT NOTICE: We have received your high-priority issue regarding "${description}". The facility management team and emergency contacts have been immediately notified.`;
  } else if (urgency === 'Medium') {
    ai_drafted_response = `Thank you for bringing this to our notice. We have recorded your complaint under ${category} and routed it to the facility team for prompt action.`;
  } else {
    ai_drafted_response = `Your complaint regarding ${category.toLowerCase()} has been logged. The admin team will review it during routine operational hours.`;
  }

  return {
    category,
    urgency,
    ai_drafted_response,
    source: 'local-ai-engine'
  };
}
