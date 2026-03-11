import { GoogleGenAI, Type } from "@google/genai";
import { Category, Country, Scenario, Evaluation, Language, GameAnalysis, CountryComparison, Interaction, HelpType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateScenario(
  playerCountry: Country,
  targetCountry: Country,
  category: Category,
  language: Language
): Promise<Scenario> {
  const prompt = `Generate a realistic geopolitics scenario between ${playerCountry.name} and ${targetCountry.name} in the ${category} category. 
  The response must be in ${language === 'pt' ? 'Portuguese (Brazilian)' : 'English (US)'}.
  Provide a title, a brief description of the situation, and 3 distinct options for the player to choose from.
  CRITICAL: Make the options highly nuanced, complex, and morally gray. Avoid obvious "good" or "bad" choices. Every option should involve significant trade-offs, making it difficult to predict which yields the highest geopolitical influence. A seemingly aggressive choice might be strategically sound, while a peaceful one might show weakness.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
                action: { type: Type.STRING }
              },
              required: ["id", "text", "action"]
            }
          }
        },
        required: ["title", "description", "options"]
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return {
    ...data,
    id: Math.random().toString(36).substr(2, 9),
    category
  };
}

export async function evaluateChoice(
  playerCountry: Country,
  targetCountry: Country,
  category: Category,
  scenario: Scenario,
  choice: string,
  history: Interaction[],
  language: Language
): Promise<Evaluation> {
  const historyText = history.length > 0 
    ? `Player's Recent History (Last 5 actions):\n${history.slice(0, 5).map(h => `- ${h.category} with ${h.country.name}: Chose "${h.choice}"`).join('\n')}`
    : "No significant history yet.";

  const prompt = `Evaluate the following geopolitical choice:
  Player Country: ${playerCountry.name}
  Target Country: ${targetCountry.name}
  Category: ${category}
  Scenario: ${scenario.title} - ${scenario.description}
  Player Choice: ${choice}

  ${historyText}

  Determine if this is a good or bad choice based on real-world affinity, historical context, and current geopolitical trends between these two countries.
  CRITICAL: You MUST consider the Player's Recent History. If the current choice contradicts past alliances or shows hypocrisy (e.g., allying with rival nations sequentially, or breaking a stance established in a previous turn), penalize the score heavily and explicitly mention this inconsistency in the feedback and justification. If it shows a consistent and strategic geopolitical alignment, reward it.

  Provide a score change (between -20 and +20), a brief feedback message, and a detailed educational justification.
  The response must be in ${language === 'pt' ? 'Portuguese (Brazilian)' : 'English (US)'}.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isGood: { type: Type.BOOLEAN },
          scoreChange: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          justification: { type: Type.STRING }
        },
        required: ["isGood", "scoreChange", "feedback", "justification"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generateGameAnalysis(
  playerCountry: Country,
  history: Interaction[],
  language: Language
): Promise<GameAnalysis> {
  const prompt = `Based on the following history of geopolitical decisions made by the player representing ${playerCountry.name}, provide an end-of-term analysis.
  History: ${JSON.stringify(history.slice(0, 15).map(h => ({ target: h.country.name, category: h.category, choice: h.choice, success: h.isGood })))}
  
  Provide:
  1. A summary of their term.
  2. The global impact of their decisions.
  3. A historical leader they most resemble based on their playstyle (can be from any country/era).
  4. The reasoning for this comparison.
  
  The response must be in ${language === 'pt' ? 'Portuguese (Brazilian)' : 'English (US)'}.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          impact: { type: Type.STRING },
          historicalLeader: { type: Type.STRING },
          leaderReasoning: { type: Type.STRING }
        },
        required: ["summary", "impact", "historicalLeader", "leaderReasoning"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function compareCountries(
  countryA: Country,
  countryB: Country,
  language: Language
): Promise<CountryComparison> {
  const prompt = `Analyze the geopolitical relationship between ${countryA.name} and ${countryB.name}.
  Provide:
  1. A list of 3-5 major compatibilities (economic, political, cultural, or military).
  2. A list of 3-5 major incompatibilities or points of friction.
  3. A brief summary of their overall relationship.
  
  The response must be in ${language === 'pt' ? 'Portuguese (Brazilian)' : 'English (US)'}.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          compatibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
          incompatibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING }
        },
        required: ["compatibilities", "incompatibilities", "summary"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generateHelpResponse(
  scenario: Scenario,
  helpType: HelpType,
  leaderName: string | null,
  language: Language
): Promise<string> {
  let perspective = "";
  if (helpType === 'social') perspective = "the general public on social media (trending topics, public sentiment, memes, protests)";
  else if (helpType === 'advisors') perspective = "the government's top geopolitical and military advisors (pragmatic, strategic, cautious, calculating)";
  else if (helpType === 'leader') perspective = `the historical leader ${leaderName} (acting in character, based on their historical philosophy and famous quotes)`;

  const prompt = `You are providing a lifeline/hint for a player in a geopolitics game.
  Scenario: ${scenario.title} - ${scenario.description}
  Options available:
  ${scenario.options.map(o => `- ${o.text}`).join('\n')}

  Provide a short, immersive response (max 3 sentences) from the perspective of: ${perspective}.
  Do not explicitly say which option to choose, but heavily hint at what this perspective would favor or fear based on the options.
  The response must be in ${language === 'pt' ? 'Portuguese (Brazilian)' : 'English (US)'}.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
  });

  return response.text || "";
}
