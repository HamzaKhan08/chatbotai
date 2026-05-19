import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy initialization of GoogleGenAI SDK to prevent immediate crash if key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Check Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "PLACEHOLDER_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Boost JSON payload limit for base64 image uploads
  app.use(express.json({ limit: "25mb" }));

  // API endpoints:
  
  // 1. Chat Generation Endpoint (Accepts message history + optional image + search grounding + system instruction)
  app.post("/api/chat", async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { messages, systemInstruction, enableSearch } = req.body;

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "Missing or invalid 'messages' field." });
        return;
      }

      // Format messages history into Gemini content protocol
      const contents = messages.map((msg: any) => {
        const parts: any[] = [];

        // Check if there's an attached image in the message
        if (msg.image && msg.image.data && msg.image.mimeType) {
          parts.push({
            inlineData: {
              mimeType: msg.image.mimeType,
              data: msg.image.data,
            },
          });
        }

        // Add text part (ensure it is always present, even if empty string)
        parts.push({
          text: msg.content || "",
        });

        return {
          role: msg.role === "assistant" ? "model" : "user",
          parts,
        };
      });

      const client = getGeminiClient();

      // Configure tools and config parameters
      const config: any = {
        systemInstruction: systemInstruction || "You are AetherChat, a helpful, friendly, and expert AI assistant.",
        temperature: 0.7,
      };

      // Toggle search grounding if requested by the user
      if (enableSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      // We define a cascading list of stable and advanced models to try.
      // If the preferred 'gemini-3-flash-preview' model is currently experiencing high demand (503),
      // we gracefully fall back on-the-fly to the next candidate to guarantee continuous service.
      const modelsToTry = [
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest"
      ];

      let response: any = null;
      let lastError: any = null;
      let chosenModel = "";

      for (const modelName of modelsToTry) {
        try {
          console.log(`Sending generateContent request to ${modelName}. Grounding: ${enableSearch}`);
          response = await client.models.generateContent({
            model: modelName,
            contents,
            config,
          });
          chosenModel = modelName;
          console.log(`Successfully generated chat content with ${modelName}`);
          break; // Success! Exit candidate loop
        } catch (err: any) {
          console.warn(`Model ${modelName} failed. Reason: ${err.message || err}. Trying next fallback...`);
          lastError = err;
        }
      }

      if (!response) {
        throw lastError || new Error("All active Gemini models are currently experiencing high demand. Please try again shortly.");
      }

      const replyText = response.text || "";

      // Extract search grounding citations, if any
      const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = searchChunks.map((chunk: any) => {
        if (chunk.web) {
          return {
            title: chunk.web.title || "Web Source",
            uri: chunk.web.uri || "",
          };
        }
        return null;
      }).filter(Boolean);

      res.json({
        content: replyText,
        sources,
        modelUsed: chosenModel
      });

    } catch (error: any) {
      console.error("Gemini Chat API Error:", error);
      res.status(500).json({ 
        error: error.message || "An error occurred while generating a response from Gemini." 
      });
    }
  });

  // 2. Text-to-Speech Generation Endpoint
  app.post("/api/tts", async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { text, voiceName } = req.body;

      if (!text) {
        res.status(400).json({ error: "Missing required field 'text'." });
        return;
      }

      const client = getGeminiClient();
      const selectedVoice = voiceName || "Kore"; // Prebuilt choices: Kore, Puck, Zephyr, Charon, Kore

      console.log(`Generating TTS audio with voice: ${selectedVoice}`);

      let response: any = null;
      let lastError: any = null;

      // Retry block to handle transient connectivity and demand spikes
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await client.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: [{ parts: [{ text: `Read cleanly: ${text}` }] }],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: selectedVoice },
                },
              },
            },
          });
          break; // Success! Exit try queue
        } catch (err: any) {
          console.warn(`TTS synthesis attempt ${attempt} failed: ${err.message || err}`);
          lastError = err;
        }
      }

      if (!response) {
        throw lastError || new Error("Speech synthesis is currently unavailable. Please try again shortly.");
      }

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        throw new Error("No audio content returned by the model.");
      }

      res.json({ audio: base64Audio });

    } catch (error: any) {
      console.error("Gemini TTS API Error:", error);
      res.status(500).json({ 
        error: error.message || "An error occurred while generating audio narration." 
      });
    }
  });

  // Serve Client-Side application using Vite middleware in development, or Express.static in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // PORT bindings must be 3000 and 0.0.0.0
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on http://localhost:${PORT} with NODE_ENV=${process.env.NODE_ENV}`);
  });
}

startServer();
