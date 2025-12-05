// src/controllers/chatController.js

const prisma = require("../config/db");
const OpenAI = require("openai");

// ------------------------------
// INITIALIZE CLIENT
// ------------------------------
let client = null;

if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });
  console.log("✅ OpenAI client initialized");
} else {
  console.log("⚠ No OpenAI API key — running in MOCK MODE");
}

const ASSISTANT_ID = process.env.ASSISTANT_ID;

// =====================================================
// CREATE NEW CONVERSATION (THREAD CREATION)
// =====================================================
exports.createConversation = async (req, res) => {
  console.log("This is the request: ", req.user.userId);
  try {
    const threadId = client
      ? (await client.beta.threads.create()).id
      : `mock-thread-${Date.now()}`;

    const conversation = await prisma.conversation.create({
      data: {
        userId: req.user.userId,
        threadId
      }
    });

    return res.json({
      success: true,
      message: "Conversation created",
      conversation
    });

  } catch (err) {
    console.error("Create conversation error:", err);
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
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }

    // ✅ Save user message
    await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: message
      }
    });

    // ✅ MOCK MODE
    if (!client || !ASSISTANT_ID) {
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

    const threadId = conversation.threadId;

    // ✅ 1. Add user message to thread
    await client.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    // ✅ 2. Create assistant run
    let run = await client.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID
    });

    console.log("Run created:", run.id);

    // ✅ 3. SAFE Polling with Timeout Protection
    let attempts = 0;
    const MAX_ATTEMPTS = 15;

    while (
      (run.status === "in_progress" || run.status === "queued") &&
      attempts < MAX_ATTEMPTS
    ) {
      await new Promise(resolve => setTimeout(resolve, 1200));

      run = await client.beta.threads.runs.retrieve(run.id, {
        thread_id: threadId
      });

      console.log(`Run status: ${run.status}`);
      attempts++;
    }

    if (attempts >= MAX_ATTEMPTS) {
      return res.status(504).json({
        success: false,
        message: "Assistant timeout"
      });
    }

    if (run.status === "failed") {
      return res.status(500).json({
        success: false,
        message: "Assistant failed",
        error: run.last_error
      });
    }

    // ✅ 4. Fetch ONLY latest assistant message (FAST)
    const messagesResponse = await client.beta.threads.messages.list(threadId, {
      limit: 1
    });

    const assistantMessage =
      messagesResponse?.data?.[0]?.content?.[0]?.text?.value || "No response";

    // ✅ 5. Save assistant message
    const savedAssistant = await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: assistantMessage
      }
    });

    return res.json({
      success: true,
      assistantResponse: savedAssistant
    });

  } catch (err) {
    console.error("Send message error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

// =====================================================
// GET ALL MESSAGES
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

  } catch (err) {
    console.error("Fetch messages error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
