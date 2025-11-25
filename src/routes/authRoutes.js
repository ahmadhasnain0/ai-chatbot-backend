const express = require("express");
const { loginUser, verifyAuth, logoutUser } = require("../controllers/authController");
const { 
  validateLogin, 
  handleValidationErrors 
} = require("../middleware/validationMiddleware");
const authenticateUser = require("../middleware/auth");

const router = express.Router();

// Login with comprehensive validation
router.post("/login", validateLogin, handleValidationErrors, loginUser);
router.get("/verify", verifyAuth);
router.post("/logout", logoutUser);

module.exports = router;