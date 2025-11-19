const express = require("express");
const router = express.Router();
const authenticateUser = require("../middleware/auth");

const {
  createConversation,
  sendMessage,
  getConversationMessages
} = require("../controllers/chatController");

// Create new conversation
router.post("/conversation", authenticateUser, createConversation);

// Send message
router.post("/conversation/:id/message", authenticateUser, sendMessage);

// Fetch messages
router.get("/conversation/:id/messages", authenticateUser, getConversationMessages);

module.exports = router;
