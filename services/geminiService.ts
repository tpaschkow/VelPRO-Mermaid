import { GoogleGenAI } from "@google/genai";
import { DiagramFile, AnalysisResult, ChatMessage } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateMermaidCode = async (
  prompt: string, 
  currentCode: string, 
  useThinking: boolean = false,
  projectContext: string = "",
  otherFiles: DiagramFile[] = []
): Promise<string> => {
  const ai = getClient();
  
  // Summarize other files to save tokens but provide context
  const filesContext = otherFiles.length > 0 
    ? `\nCONTEXT - OTHER RELATED DIAGRAMS IN PROJECT:\n${otherFiles.map(f => `- ${f.name} (${f.type}):\n${f.code.slice(0, 500)}...`).join('\n')}`
    : "";

  const systemInstruction = `
    You are an expert diagram architect for VelPRO.
    
    PROJECT CONTEXT (Global definitions for this project):
    ${projectContext || "No specific project context provided."}

    ${filesContext}

    Your task is to generate VALID Mermaid.js code based on the user's description.
    
    Rules:
    1. Return ONLY the raw Mermaid code.
    2. Do NOT wrap the code in markdown code blocks.
    3. Do NOT provide explanations.
    4. Maintain valid syntax.
    5. Prefer modern syntax (graph TD/LR).
  `;

  try {
    const fullPrompt = currentCode 
      ? `Current Diagram Code:\n${currentCode}\n\nRequest: ${prompt}`
      : prompt;

    const model = useThinking ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';

    const config: any = {
      systemInstruction,
    };

    if (useThinking) {
      config.thinkingConfig = { thinkingBudget: 32768 };
    } else {
      config.temperature = 0.2;
    }

    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
      config
    });

    const text = response.text;
    if (!text) throw new Error("No content generated");

    return text.replace(/^```mermaid\n/, '').replace(/^```\n/, '').replace(/```$/, '').trim();
    
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const explainDiagram = async (code: string, useThinking: boolean = false): Promise<string> => {
  const ai = getClient();
  const systemInstruction = "You are a helpful assistant. Explain this Mermaid diagram concisely to a non-technical stakeholder.";

  const model = useThinking ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
  
  const config: any = { systemInstruction };
  if (useThinking) {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  const response = await ai.models.generateContent({
    model,
    contents: `Explain this diagram:\n${code}`,
    config
  });

  return response.text || "Could not generate explanation.";
};

export const analyzeDiagram = async (code: string, projectContext: string): Promise<AnalysisResult> => {
  const ai = getClient();
  
  // Use Flash for fast, lightweight analysis
  const model = 'gemini-2.5-flash';
  
  const systemInstruction = `
    You are a QA bot for Mermaid diagrams. 
    Project Context: ${projectContext}
    
    Analyze the code for:
    1. Syntax correctness.
    2. Logical flow gaps (dead ends, isolated nodes).
    3. Alignment with project context (if provided).
    
    Return JSON format:
    {
      "suggestions": ["suggestion1", "suggestion2"],
      "syntaxValid": true/false,
      "logicGaps": ["gap1", "gap2"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Analyze this Mermaid code:\n${code}`,
      config: { 
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return { suggestions: [], syntaxValid: true, logicGaps: [] };
    
    return JSON.parse(text) as AnalysisResult;
  } catch (e) {
    console.error("Analysis failed", e);
    return { suggestions: ["Analysis unavailable"], syntaxValid: true, logicGaps: [] };
  }
};

export const sendPlanningChat = async (
  newMessage: string, 
  history: ChatMessage[], 
  projectContext: string,
  files: DiagramFile[]
): Promise<string> => {
  const ai = getClient();
  
  const fileStates = files.map(f => 
    `FILE: ${f.name} (${f.type}) \nCODE:\n${f.code}`
  ).join('\n\n');

  // We explicitly construct the context every time to ensure the AI knows the *current* state of diagrams
  const systemInstruction = `
    You are the Strategic Planning Lead for VelPRO. 
    Your role is to help the user plan macro and micro architectures, ensuring consistency across the entire system.
    
    You have access to the current state of all diagram files in the project.
    
    PROJECT CONTEXT:
    ${projectContext}
    
    CURRENT DIAGRAM STATES:
    ${fileStates}
    
    Your Goals:
    1. Provide high-level architectural advice.
    2. Identify inconsistencies between macro and micro flows.
    3. Help plan next steps for implementation.
    4. Be concise but insightful.
    
    Do not generate Mermaid code unless specifically asked for a snippet example. Focus on reasoning and strategy.
  `;

  // Format history for the prompt (simple text append since we are using generateContent for stateless-with-context approach)
  // We use this approach instead of sendMessage because the 'system' context (file states) changes frequently.
  const conversationHistory = history.map(msg => 
    `${msg.role === 'user' ? 'User' : 'Planner'}: ${msg.text}`
  ).join('\n');

  const fullPrompt = `${conversationHistory}\nUser: ${newMessage}\nPlanner:`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // High reasoning model
    contents: fullPrompt,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingBudget: 32768 } // Max thinking for reasoning
    }
  });

  return response.text || "I'm thinking, but I couldn't formulate a response.";
};
