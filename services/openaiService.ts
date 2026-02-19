
import OpenAI from 'openai';
import { ScanResult, AIRecommendation } from "../types";

const generateLocalInsights = (scanResult: ScanResult): AIRecommendation => {
  // 1. Analyze File Types
  const typeMap = new Map<string, number>();
  scanResult.duplicates.forEach(group => {
    const type = group.files[0].type || 'Unknown';
    typeMap.set(type, (typeMap.get(type) || 0) + group.totalWastedSize);
  });

  // Find biggest waster
  let biggestType = 'Files';
  let maxWaste = 0;
  typeMap.forEach((waste, type) => {
    if (waste > maxWaste) {
      maxWaste = waste;
      biggestType = type.split('/')[1]?.toUpperCase() || type;
    }
  });

  // 2. Generate Suggestions based on data
  const suggestions: string[] = [];

  if (biggestType.includes('IMAGE') || biggestType.includes('MP4') || biggestType.includes('MOV')) {
    suggestions.push("Check 'Camera Uploads' or 'Screenshots' folders for varying versions of the same media.");
  }

  if (scanResult.duplicates.some(g => g.totalWastedSize > 100 * 1024 * 1024)) {
    suggestions.push("You have very large individual duplicate files (>100MB). Review these first for quick gains.");
  }

  suggestions.push("Sort by 'Oldest' to safely keep the original versions of your files.");
  suggestions.push("Consider organizing files by year/month to prevent future scattering.");

  const wastedMB = (scanResult.wastedSpace / (1024 * 1024)).toFixed(0);

  return {
    summary: `Offline Analysis Complete. You can recover ~${wastedMB} MB immediately. Your storage is primarily cluttered with ${biggestType} duplicates.`,
    suggestions: suggestions.slice(0, 3),
    priority: scanResult.wastedSpace > 500 * 1024 * 1024 ? "high" : "medium"
  };
};

export const getStorageInsights = async (scanResult: ScanResult): Promise<AIRecommendation> => {
  const apiKey = process.env.OPENAI_API_KEY;

  // Check for missing or placeholder key -> USE LOCAL BACKUP
  if (!apiKey || apiKey.includes('efgh5678') || apiKey === 'INSERT_OPENAI_API_KEY_HERE') {
    console.log("No valid API Key found. Switching to Local Intelligence.");
    // Simulate a short "thinking" delay for UX
    await new Promise(resolve => setTimeout(resolve, 1500));
    return generateLocalInsights(scanResult);
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Client-side usage for this specific local app
  });

  const duplicateSample = scanResult.duplicates.slice(0, 5).map(group => ({
    name: group.files[0].name,
    count: group.files.length,
    wastedSize: group.totalWastedSize
  }));

  const prompt = `
    Analyze the following duplicate file scan results and provide storage optimization advice.
    Total Files: ${scanResult.totalFiles}
    Total Scanned Size: ${(scanResult.totalSize / (1024 * 1024)).toFixed(2)} MB
    Total Wasted Space: ${(scanResult.wastedSpace / (1024 * 1024)).toFixed(2)} MB
    Number of Duplicate Groups: ${scanResult.duplicates.length}
    
    Sample of duplicates:
    ${JSON.stringify(duplicateSample)}

    Provide a professional summary and actionable suggestions to manage this storage.
    
    Return ONLY a JSON object with the following structure:
    {
      "summary": "string",
      "suggestions": ["string", "string"],
      "priority": "low" | "medium" | "high"
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful storage optimization assistant. Output valid JSON only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content received from OpenAI");

    const result = JSON.parse(content);
    return result as AIRecommendation;
  } catch (error) {
    console.error("OpenAI Error, falling back to local:", error);
    return generateLocalInsights(scanResult);
  }
};
