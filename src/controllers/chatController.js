// src/controllers/chatController.js

const prisma = require("../config/db");
const OpenAI = require("openai");

// ------------------------------
// INITIALIZE CLIENT (SAFE)
// ------------------------------
let client = null;

if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log("✅ OpenAI client initialized");
} else {
  console.log("⚠ No OpenAI API key found — running in MOCK MODE");
}

// Assistant defined on OpenAI website
const ASSISTANT_ID = process.env.ASSISTANT_ID;

// =====================================================
// CREATE NEW CONVERSATION (NEW THREAD)
// =====================================================
exports.createConversation = async (req, res) => {
  try {
    // If no OpenAI key → create fake thread ID
    const threadId = client
      ? (await client.beta.threads.create()).id
      : `mock-thread-${Date.now()}`;

    const newConversation = await prisma.conversation.create({
      data: {
        userId: req.userId,
        threadId
      }
    });

    return res.json({
      success: true,
      message: "Conversation created",
      conversation: newConversation
    });

  } catch (error) {
    console.error("Create conversation error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// =====================================================
// SEND MESSAGE TO ASSISTANT
// =====================================================
exports.sendMessage = async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    const { message } = req.body;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const threadId = conversation.threadId;

    // 1️⃣ STORE USER MESSAGE
    await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: message
      }
    });

    // ------------------------------------------------------------
    // MOCK MODE → generate fake assistant reply
    // ------------------------------------------------------------
    if (!client || !ASSISTANT_ID) {
      console.log("⚠ MOCK MODE: No OpenAI keys available.");

      const mockReply = `Mock Reply: "${message}" received successfully.`;

      const saved = await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: mockReply
        }
      });

      return res.json({
        success: true,
        mode: "mock",
        assistantResponse: saved
      });
    }

    // ------------------------------------------------------------
    // REAL OPENAI MODE
    // ------------------------------------------------------------

    // 2️⃣ ADD USER MESSAGE TO THREAD
    await client.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    // 3️⃣ START A RUN
    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID
    });

    // 4️⃣ POLL UNTIL RUN COMPLETES
    let runStatus;
    do {
      await new Promise((r) => setTimeout(r, 1000));
      runStatus = await client.beta.threads.runs.retrieve(threadId, run.id);
    } while (runStatus.status !== "completed");

    // 5️⃣ GET ASSISTANT RESPONSE
    const messages = await client.beta.threads.messages.list(threadId);

    const assistantMessageObj = messages.data.find(
      (m) => m.role === "assistant"
    );

    const assistantMessage =
      assistantMessageObj?.content?.[0]?.text?.value || "No response received.";

    // 6️⃣ SAVE ASSISTANT MESSAGE TO DB
    const savedAssistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: assistantMessage
      }
    });

    return res.json({
      success: true,
      assistantResponse: savedAssistantMessage
    });

  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// =====================================================
// GET FULL CONVERSATION HISTORY
// =====================================================
exports.getConversationMessages = async (req, res) => {
  try {
    const conversationId = Number(req.params.id);

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" }
    });

    return res.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error("Fetch messages error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
