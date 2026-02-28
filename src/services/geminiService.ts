import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Case {
  id: string;
  title: string;
  description: string;
  location: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export interface Clue {
  id: string;
  name: string;
  description: string;
  type: "Physical" | "Testimony" | "Digital";
}

export interface Suspect {
  id: string;
  name: string;
  role: string;
  description: string;
  motive: string;
}

export interface CaseDetails {
  case: Case;
  clues: Clue[];
  suspects: Suspect[];
  solution: {
    culpritId: string;
    reasoning: string;
    keyEvidenceIds: string[];
  };
}

export const generateNewCase = async (difficulty: string = "Medium", language: "en" | "ar" = "en"): Promise<CaseDetails> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a new Detective Conan style mystery case in ${language === 'ar' ? 'Arabic' : 'English'}. 
    The setting should be in Egypt (Cairo, Alexandria, etc.) with Egyptian characters and names.
    If the language is Arabic, use Egyptian dialect for suspect dialogue and descriptions where appropriate to give it an authentic Egyptian feel.
    Difficulty: ${difficulty}. 
    The case should involve a locked-room mystery or a complex alibi.
    Include a title, description, location, 4-5 clues, and 3-4 suspects.
    One suspect is the culprit. Provide the solution.
    Ensure all text fields (title, description, location, clue names/descriptions, suspect names/roles/descriptions/motives, solution reasoning) are in ${language === 'ar' ? 'Arabic' : 'English'}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          case: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              location: { type: Type.STRING },
              difficulty: { type: Type.STRING },
            },
            required: ["id", "title", "description", "location", "difficulty"],
          },
          clues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING },
              },
              required: ["id", "name", "description", "type"],
            },
          },
          suspects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                description: { type: Type.STRING },
                motive: { type: Type.STRING },
              },
              required: ["id", "name", "role", "description", "motive"],
            },
          },
          solution: {
            type: Type.OBJECT,
            properties: {
              culpritId: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              keyEvidenceIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["culpritId", "reasoning", "keyEvidenceIds"],
          },
        },
        required: ["case", "clues", "suspects", "solution"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};

export const chatWithSuspect = async (
  caseContext: string,
  suspect: Suspect,
  message: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  language: "en" | "ar" = "en"
) => {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: `You are ${suspect.name}, a suspect in a Detective Conan mystery case. 
      Role: ${suspect.role}. 
      Background: ${suspect.description}. 
      Motive: ${suspect.motive}.
      Case Context: ${caseContext}.
      
      Respond to the detective's questions in ${language === 'ar' ? 'Arabic' : 'English'}. 
      If you are the culprit, try to be evasive but don't lie about verifiable facts unless you have a solid alibi. If you are innocent, be helpful but maybe a bit annoyed or scared. 
      Keep responses concise and in character.`,
    },
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};

export const evaluateDeduction = async (
  caseDetails: CaseDetails,
  selectedCulpritId: string,
  reasoning: string,
  language: "en" | "ar" = "en"
) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `The player is making a deduction in a mystery case.
    Case: ${JSON.stringify(caseDetails.case)}
    True Culprit: ${caseDetails.solution.culpritId}
    True Reasoning: ${caseDetails.solution.reasoning}
    
    Player's Choice: ${selectedCulpritId}
    Player's Reasoning: ${reasoning}
    
    Evaluate if the player is correct. If they chose the wrong person, explain why their reasoning fails. If they chose the right person but have weak reasoning, point that out. 
    Provide the response in ${language === 'ar' ? 'Arabic' : 'English'}.
    Provide a score from 0 to 100 and a narrative response from Conan or Kogoro Mouri.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isCorrect: { type: Type.BOOLEAN },
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          conanComment: { type: Type.STRING },
        },
        required: ["isCorrect", "score", "feedback", "conanComment"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};
