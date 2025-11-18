const prisma = require("../config/db");
const generateToken = require("../utils/generateToken");

// LOGIN - SIMPLIFIED (All validation moved to middleware)
exports.loginUser = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user (already validated in middleware)
    const user = await prisma.user.findUnique({ 
      where: { email } 
    });

    // Generate token
    const authToken = generateToken(user.id);

    res.json({
      success: true,
      message: "Login successful",
      token: authToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error during login",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};