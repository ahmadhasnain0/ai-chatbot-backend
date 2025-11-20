const express = require("express");
const { loginUser, verifyAuth } = require("../controllers/authController");
const { 
  validateLogin, 
  handleValidationErrors 
} = require("../middleware/validationMiddleware");

const router = express.Router();

// Login with comprehensive validation
router.post("/login", validateLogin, handleValidationErrors, loginUser);
router.get("/verify", verifyAuth);

module.exports = router;