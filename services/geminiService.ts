import { GoogleGenAI } from "@google/genai";
import { VerifiedResult, WebResource, AdvancedVerifiedResult, VideoResource } from "../types";

const apiKey = process.env.API_KEY;

// We use the 2.5 Flash model for speed and tool capability
const MODEL_NAME = "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey: apiKey });

// Helper to clean JSON string from markdown or conversational text
const cleanJsonString = (text: string): string => {
  // 1. Try to match markdown code blocks containing JSON
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) {
    text = jsonBlockMatch[1];
  } else {
    // Try generic code block
    const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      text = codeBlockMatch[1];
    }
  }

  // 2. Find the first '{'
  const start = text.indexOf('{');
  if (start === -1) return text.trim();

  // 3. Smart extraction: Count braces to find the matching closing '}'
  // We need to ignore braces inside strings to avoid false positives.
  let balance = 0;
  let end = -1;
  let insideString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    // Handle escape characters (e.g. \" inside a string)
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }

    // Toggle string state
    if (char === '"') {
      insideString = !insideString;
      continue;
    }

    // Only count braces if NOT inside a string
    if (!insideString) {
      if (char === '{') {
        balance++;
      } else if (char === '}') {
        balance--;
        // If balance hits zero, we found the closing brace for the root object
        if (balance === 0) {
          end = i;
          break;
        }
      }
    }
  }

  if (end !== -1) {
    return text.substring(start, end + 1);
  }

  // 4. Fallback: If strict parsing failed (e.g. malformed), try simple lastIndexOf
  const lastEnd = text.lastIndexOf('}');
  if (lastEnd > start) {
      return text.substring(start, lastEnd + 1);
  }
  
  return text.trim();
};

/**
 * PRIMARY METHOD: Fast, single-pass verification suitable for the MVP UI.
 */
export const searchVerifiedTopic = async (query: string): Promise<VerifiedResult> => {
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  try {
    const prompt = `
      Act as "Learnn", a multi-model consensus engine. 
      The user is searching for: "${query}".
      
      Step 1: Simulate a cross-verification process where you analyze this topic as if you were cross-referencing Gemini, GPT-4, and Claude. 
      Step 2: Synthesize a verified, clean, and educational answer. Remove noise and conflicting info.
      Step 3: Provide a reliability score (0-100). 100 means established scientific fact or historical consensus. Lower scores imply debate or ambiguity.
      Step 4: Suggest 3 highly specific educational YouTube video titles that cover this exact topic.

      CRITICAL INSTRUCTION: You MUST return the output strictly as a valid JSON object. Do not add any conversational text before or after the JSON.
      
      Use this JSON structure:
      {
        "summary": "A concise 2-sentence summary of the verified answer.",
        "detailedExplanation": "A comprehensive, verified explanation of the topic formatted in Markdown. Use **bold** for key terms, ### for sections, and - for bullet points.",
        "reliabilityScore": 85,
        "consensusNote": "A brief note on whether standard models (GPT-4, Claude 3, Gemini) generally agree on this topic or if there is conflict.",
        "recommendedVideos": [
          { "title": "Video Title 1", "query": "Search query for video 1" },
          { "title": "Video Title 2", "query": "Search query for video 2" },
          { "title": "Video Title 3", "query": "Search query for video 3" }
        ]
      }
    `;

    // We use googleSearch tool to get the "Web Sources" for the grounding part
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    let parsedData;
    try {
      parsedData = JSON.parse(cleanJsonString(text));
    } catch (e) {
      console.error("Failed to parse JSON response:", text);
      throw new Error("The AI response was not in a valid format. Please try again.");
    }

    // Extract Grounding Metadata for Web Sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources: WebResource[] = groundingChunks
      .map((chunk: any) => {
        if (chunk.web) {
          return {
            title: chunk.web.title || "Source Link",
            url: chunk.web.uri,
            source: new URL(chunk.web.uri).hostname.replace('www.', ''),
          };
        }
        return null;
      })
      .filter((item: any): item is WebResource => item !== null)
      // Deduplicate by URL
      .filter((v: WebResource, i: number, a: WebResource[]) => a.findIndex(t => (t.url === v.url)) === i)
      .slice(0, 4); // Take top 4

    return {
      summary: parsedData.summary,
      detailedExplanation: parsedData.detailedExplanation,
      reliabilityScore: parsedData.reliabilityScore,
      consensusNote: parsedData.consensusNote,
      recommendedVideos: parsedData.recommendedVideos || [],
      sources: webSources,
      mode: 'quick'
    };

  } catch (error) {
    console.error("Learnn Search Error:", error);
    throw error;
  }
};

/**
 * SECONDARY METHOD (DEEP VERIFICATION):
 * Generates 4 distinct responses, compares them, and synthesizes a result.
 */
export const advancedVerifiedSearch = async (topic: string): Promise<VerifiedResult> => {
  if (!apiKey) throw new Error("API Key is missing");

  const prompt = `
    You are an advanced consensus engine.
    Topic: "${topic}"

    Step 1: Generate 4 separate responses in your internal thought process:
      1. Beginner Explanation
      2. Technical/Factual Explanation
      3. Key Points + Misconceptions
      4. Step-by-Step Teaching Explanation

    Step 2: Compare these 4 responses.
      - Identify common facts.
      - Identify conflicting points.
      - Calculate a consistency score (0.0 to 1.0).

    Step 3: Create one final verified explanation.
      - Use facts repeated across responses.
      - Remove contradictory points.
      - Ensure clear, accurate, concise wording.
      - Format with **bold** for emphasis and markdown headers (###) for structure.

    Step 4: Generate supporting resources.
      - 3 relevant websites (title and url placeholders if not browsing)
      - 3 relevant YouTube videos (titles)

    Output ONLY this JSON structure:
    {
      "topic": "${topic}",
      "rawResponses": {
        "beginner": "...",
        "technical": "...",
        "keypoints": "...",
        "stepbystep": "..."
      },
      "analysis": {
        "common": ["fact 1", "fact 2"],
        "conflicts": ["conflict 1", "conflict 2"],
        "consistencyScore": 0.95
      },
      "verifiedAnswer": "The final consolidated answer...",
      "webLinks": [
        { "title": "Example Site", "url": "https://example.com" }
      ],
      "youtubeLinks": [
        { "title": "Example Video", "url": "https://youtube.com/..." }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const cleanText = cleanJsonString(text);
    let parsedData: AdvancedVerifiedResult;
    try {
        parsedData = JSON.parse(cleanText) as AdvancedVerifiedResult;
    } catch(e) {
        console.error("Advanced Search JSON Parse Error. Cleaned text:", cleanText);
        throw new Error("Failed to process advanced search results. Please try again.");
    }

    // ADAPTER: Convert Advanced Result to Standard VerifiedResult
    const reliabilityScore = Math.round(parsedData.analysis.consistencyScore * 100);
    
    // Create a dynamic summary from the analysis
    const summary = `Based on a 4-step analysis (Beginner, Technical, Teaching, Key Points), this topic has a ${reliabilityScore}% consistency score. Common facts include: ${parsedData.analysis.common.slice(0, 2).join(', ')}.`;

    // Map resources
    const sources: WebResource[] = parsedData.webLinks.map(link => ({
        title: link.title,
        url: link.url,
        source: new URL(link.url).hostname || 'web'
    }));

    const recommendedVideos: VideoResource[] = parsedData.youtubeLinks.map(link => ({
        title: link.title,
        query: link.title,
        url: link.url
    }));

    return {
        summary: summary,
        detailedExplanation: parsedData.verifiedAnswer,
        reliabilityScore: reliabilityScore,
        consensusNote: `Synthesized from 4 distinct AI reasoning paths. ${parsedData.analysis.conflicts.length > 0 ? 'Conflicts detected in: ' + parsedData.analysis.conflicts.join(', ') : 'High consensus across all reasoning models.'}`,
        sources: sources,
        recommendedVideos: recommendedVideos,
        mode: 'deep'
    };

  } catch (error) {
    console.error("Advanced Search Error:", error);
    throw error;
  }
};