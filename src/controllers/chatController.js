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

    // Save user msg
    await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: message
      }
    });

    // MOCK MODE
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

    // REAL OPENAI MODE
    const threadId = conversation.threadId;

    // 1️⃣ Add user message to thread
    await client.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    // 2️⃣ Create ASSISTANT RUN
    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID
    });

    console.log("Run created:", run.id);

    // 3️⃣ POLLING LOOP — wait for assistant to finish
    let runStatus = run;
    console.log("This is the run status:", runStatus.id);
    console.log("This is the thread ID:", threadId);

    while (runStatus.status === "in_progress" || runStatus.status === "queued") {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Add these debug logs
  console.log("About to retrieve - threadId:", threadId);
  console.log("About to retrieve - runStatus.id:", runStatus.id);
  console.log("About to retrieve - conversation.threadId:", conversation.threadId);
  
  runStatus = await client.beta.threads.runs.retrieve(runStatus.id, {
  thread_id: threadId
});
  
  console.log(`Run status: ${runStatus.status}`);
}

    if (runStatus.status === "failed") {
      console.error("Run failed:", runStatus.last_error);
      return res.status(500).json({
        success: false,
        message: "Assistant failed to process message",
        error: runStatus.last_error
      });
    }

    if (runStatus.status !== "completed") {
      return res.status(500).json({
        success: false,
        message: `Assistant run ended with status: ${runStatus.status}`
      });
    }

    // 4️⃣ Fetch assistant response
    const messagesResponse = await client.beta.threads.messages.list(threadId);

    // Get the latest assistant message
    const assistantMessageObj = messagesResponse.data
      .filter(m => m.role === "assistant")
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    const assistantMessage =
      assistantMessageObj?.content?.[0]?.text?.value || "No response";

    // 5️⃣ Save assistant message
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