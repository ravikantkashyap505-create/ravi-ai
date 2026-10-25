const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "30kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "Ravi AI",
    apiKeyConfigured: Boolean(process.env.GROQ_API_KEY)
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error: "Server setup incomplete: API key configured nahi hai."
      });
    }

    const incoming = Array.isArray(req.body.messages)
      ? req.body.messages
      : [];

    const messages = incoming
      .filter(
        m =>
          m &&
          ["user", "assistant"].includes(m.role) &&
          typeof m.content === "string"
      )
      .slice(-12)
      .map(m => ({
        role: m.role,
        content: m.content.slice(0, 4000)
      }));

    if (
      !messages.length ||
      messages[messages.length - 1].role !== "user"
    ) {
      return res.status(400).json({
        error: "Pehle apna sawal likho."
      });
    }

    messages.unshift({
      role: "system",
      content:
        "You are Ravi AI, a helpful assistant. Reply in Hindi or Hinglish when the user uses Hindi or Hinglish. Be clear, friendly, and honest."
    });

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model:
            process.env.GROQ_MODEL ||
            "llama-3.3-70b-versatile",
          messages,
          temperature: 0.7,
          max_tokens: 700
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(
        "Groq API error:",
        response.status,
        data?.error?.message || "unknown"
      );

      return res.status(502).json({
        error:
          "AI service se response nahi mila. API key, model ya usage limit check karein."
      });
    }

    const answer = data?.choices?.[0]?.message?.content;

    if (typeof answer !== "string") {
      return res.status(502).json({
        error: "AI ka jawab nahi mila."
      });
    }

    res.json({ reply: answer });
  } catch (error) {
    console.error("Server error:", error.message);

    res.status(500).json({
      error: "Server mein dikkat aayi. Dobara try karein."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Ravi AI server started on port ${PORT}`);
});
