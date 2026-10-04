import { GoogleGenAI } from "@google/genai";
import { CandidateProfile, Job } from "../types";

export interface AIServiceStatus {
  isConfigured: boolean;
  model: string;
  provider: "gemini" | "hybrid_local";
}

export function getAIStatus(): AIServiceStatus {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim().length > 0) {
    return {
      isConfigured: true,
      model: "gemini-2.5-flash",
      provider: "gemini",
    };
  }
  return {
    isConfigured: false,
    model: "hybrid-deterministic-nlp",
    provider: "hybrid_local",
  };
}

/**
 * Enriches candidate analysis with Gemini LLM when API key is provided,
 * otherwise returns null for instant deterministic fallback.
 */
export async function enrichWithLLM(
  candidate: CandidateProfile,
  job: Job
): Promise<{ enrichedSummary?: string; interviewQuestions?: string[] } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
You are a senior technical recruiter analyzing a candidate for:
Job Title: ${job.title}
Required Skills: ${job.requirements.requiredSkills.join(", ")}
Min Experience: ${job.requirements.minExperienceYears} years

Candidate:
Name: ${candidate.name}
Total Experience: ${candidate.totalExperienceYears} years
Extracted Skills: ${candidate.skills.join(", ")}
Resume Excerpt:
${candidate.rawResumeText.slice(0, 1500)}

Please return a valid JSON object strictly with:
{
  "enrichedSummary": "2-3 sentences concise recruiter synthesis grounded only in verified facts",
  "interviewQuestions": ["3 tailored technical screen questions targeting their actual background or unverified areas"]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
  } catch (err) {
    console.warn("Gemini enrichment skipped (fallback to local engine):", err);
  }

  return null;
}
