import { GoogleGenerativeAI } from "@google/generative-ai";
import { COPILOT_TOOLS_SCHEMA, executeTool } from "./tools";

// Sliding-window rate limiter (in-memory)
const requestCounts = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(ip: string, limit = 20, windowMs = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now > entry.expiresAt) {
    requestCounts.set(ip, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}

/**
 * Fallback heuristic tool matcher for when external AI APIs are offline or unconfigured.
 */
async function heuristicFallback(prompt: string) {
  const lower = prompt.toLowerCase();
  let toolName = "getFinancialSummary";
  let args = {};

  if (lower.includes("stock") || lower.includes("inventory") || lower.includes("reorder") || lower.includes("product")) {
    toolName = "getInventoryAlerts";
  } else if (lower.includes("technician") || lower.includes("staff") || lower.includes("employee") || lower.includes("attendance")) {
    toolName = "getTechnicianPerformance";
  } else if (lower.includes("complaint") || lower.includes("support") || lower.includes("ticket") || lower.includes("issue")) {
    toolName = "getComplaintTrends";
  } else if (lower.includes("purchase") || lower.includes("po") || lower.includes("vendor") || lower.includes("procurement")) {
    toolName = "getProcurementSummary";
  }

  const result = await executeTool(toolName, args);

  return {
    provider: "local-heuristic-engine",
    text: `Here is the live data analysis for your inquiry regarding **${toolName}**:\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
    toolExecuted: toolName,
    rawResult: result,
  };
}

/**
 * Query Gemini model with tool declarations and multi-turn execution.
 */
async function queryGemini(prompt: string, history: any[] = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: "You are the Executive AI Copilot for this HVAC ERP system. Assist the business owner by querying live data using tools. CRITICAL requirements: 1. Keep your responses extremely concise, direct, and to-the-point to save tokens and screen space. Avoid conversational filler, pleasantries, introductory statements, or chatty summaries. 2. Present data in a tiny markdown table or a direct sentence immediately. 3. Politely but firmly decline to answer questions unrelated to this HVAC ERP, its operations, database, or live data.",
  });

  // Convert tools schema to Gemini function declarations
  const functionDeclarations = COPILOT_TOOLS_SCHEMA.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: {
      type: "OBJECT" as any,
      properties: t.parameters.properties as any,
    },
  }));

  const chat = model.startChat({
    tools: [{ functionDeclarations }],
    history: history && history.length > 0 ? history : undefined,
  });

  const response = await chat.sendMessage(prompt);
  const functionCalls = response.response.functionCalls();

  if (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    const toolResult = await executeTool(call.name, call.args);

    // Send tool result back to model for synthesis
    const finalResponse = await chat.sendMessage([
      {
        functionResponse: {
          name: call.name,
          response: { result: toolResult },
        },
      },
    ]);

    return {
      provider: "gemini-1.5-flash",
      text: finalResponse.response.text(),
      toolExecuted: call.name,
      rawResult: toolResult,
    };
  }

  return {
    provider: "gemini-1.5-flash",
    text: response.response.text(),
  };
}

/**
 * Convert COPILOT_TOOLS_SCHEMA to OpenAI function calling format.
 */
function getOpenAITools() {
  return COPILOT_TOOLS_SCHEMA.map((t) => {
    const properties: any = {};
    if (t.parameters && t.parameters.properties) {
      for (const [key, val] of Object.entries(t.parameters.properties as any)) {
        properties[key] = {
          type: (val as any).type.toLowerCase(),
          description: (val as any).description,
        };
      }
    }
    return {
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: "object",
          properties,
        },
      },
    };
  });
}

/**
 * Generic query wrapper for OpenAI-compatible providers.
 */
async function queryOpenAICompatible(
  providerName: string,
  apiUrl: string,
  apiKey: string,
  modelName: string,
  prompt: string,
  history: any[] = []
) {
  const tools = getOpenAITools();
  const systemInstruction = "You are the Executive AI Copilot for this HVAC ERP system. Assist the business owner by querying live data using tools. CRITICAL requirements: 1. Keep your responses extremely concise, direct, and to-the-point to save tokens and screen space. Avoid conversational filler, pleasantries, introductory statements, or chatty summaries. 2. Present data in a tiny markdown table or a direct sentence immediately. 3. Politely but firmly decline to answer questions unrelated to this HVAC ERP, its operations, database, or live data.";

  const messages: any[] = [
    { role: "system", content: systemInstruction },
    ...history.map((h) => ({
      role: h.role === "model" ? "assistant" : "user",
      content: typeof h.parts === "string" ? h.parts : h.parts?.[0]?.text || "",
    })),
    { role: "user", content: prompt }
  ];

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[${providerName}] HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice) {
    throw new Error(`[${providerName}] Invalid API response structure`);
  }

  const assistantMessage = choice.message;
  const toolCalls = assistantMessage?.tool_calls;

  if (toolCalls && toolCalls.length > 0) {
    const call = toolCalls[0];
    const args = JSON.parse(call.function.arguments || "{}");
    const toolResult = await executeTool(call.function.name, args);

    messages.push(assistantMessage);
    messages.push({
      role: "tool",
      tool_call_id: call.id,
      name: call.function.name,
      content: JSON.stringify(toolResult),
    });

    const synthesisResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages,
      }),
    });

    if (!synthesisResponse.ok) {
      const errText = await synthesisResponse.text();
      throw new Error(`[${providerName} synthesis] HTTP ${synthesisResponse.status}: ${errText}`);
    }

    const synthesisData = await synthesisResponse.json();
    const finalChoice = synthesisData.choices?.[0];
    if (!finalChoice) {
      throw new Error(`[${providerName} synthesis] Invalid API response structure`);
    }

    return {
      provider: `${providerName}-${modelName}`,
      text: finalChoice.message?.content || "",
      toolExecuted: call.function.name,
      rawResult: toolResult,
    };
  }

  return {
    provider: `${providerName}-${modelName}`,
    text: assistantMessage?.content || "",
  };
}

/**
 * Query Groq provider.
 */
async function queryGroq(prompt: string, history: any[] = []) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");
  return queryOpenAICompatible(
    "Groq",
    "https://api.groq.com/openai/v1/chat/completions",
    apiKey,
    "llama-3.3-70b-specdec",
    prompt,
    history
  );
}

/**
 * Query OpenRouter provider.
 */
async function queryOpenRouter(prompt: string, history: any[] = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");
  return queryOpenAICompatible(
    "OpenRouter",
    "https://openrouter.ai/api/v1/chat/completions",
    apiKey,
    "meta-llama/llama-3.3-70b-instruct",
    prompt,
    history
  );
}

/**
 * Multi-Provider Failover Orchestrator
 */
export async function executeCopilotQuery(prompt: string, history: any[] = []) {
  // Provider 1: Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      return await queryGemini(prompt, history);
    } catch (geminiError: any) {
      console.warn("Gemini query failed, attempting secondary fallbacks:", geminiError.message);
    }
  }

  // Provider 2: Groq
  if (process.env.GROQ_API_KEY) {
    try {
      return await queryGroq(prompt, history);
    } catch (groqError: any) {
      console.warn("Groq query failed, attempting secondary fallbacks:", groqError.message);
    }
  }

  // Provider 3: OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      return await queryOpenRouter(prompt, history);
    } catch (orError: any) {
      console.warn("OpenRouter query failed, attempting local fallback:", orError.message);
    }
  }

  // Fallback to local heuristic engine
  return await heuristicFallback(prompt);
}
