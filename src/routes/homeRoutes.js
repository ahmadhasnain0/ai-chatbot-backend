const express = require("express");
const router = express.Router();
const authenticateUser = require("../middleware/auth");
const { getUserDashboard } = require("../controllers/homeController");

// All dashboard routes are protected
router.get("/home", authenticateUser, getUserDashboard);

module.exports = router;