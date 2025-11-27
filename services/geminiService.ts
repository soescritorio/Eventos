import { GoogleGenAI } from "@google/genai";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.warn("Gemini API Key is missing. AI features will be disabled.");
        return null;
    }
    return new GoogleGenAI({ apiKey });
}

export const generateEventDescription = async (title: string, location: string): Promise<string> => {
    const client = getClient();
    if (!client) return "Descrição não gerada (API Key ausente).";

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Write a compelling, professional, yet inviting description for a corporate event titled "${title}" happening at "${location}". Keep it around 30-50 words. Language: Portuguese (Brazil).`,
        });
        return response.text || "";
    } catch (error) {
        console.error("Error generating description:", error);
        return "Erro ao gerar descrição.";
    }
};
