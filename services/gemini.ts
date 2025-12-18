
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const getAnnouncerResponse = async (event: 'start' | 'win' | 'loss' | 'near_miss', dollName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a sophisticated yet excited announcer for a premium Pop Mart mystery toy shop. 
      The style is sleek, trendy, and collector-focused.
      An event just happened: ${event}. 
      The target vinyl figure is named "${dollName}".
      Provide a very short, cool response in English with a tiny bit of hype.
      Keep it under 12 words.`,
      config: {
        temperature: 0.9,
      }
    });

    return response.text?.trim() || "Good luck, collector!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return event === 'win' ? "A rare find! Congratulations!" : "The chase continues...";
  }
};
