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
    await prisma.user.update({
      where: { id: user.id },
      data: { authToken },
    });

    res.json({
      success: true,
      message: "Login successful",
      token: authToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
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




const jwt = require("jsonwebtoken");

exports.verifyAuth = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

     const user = await prisma.user.findUnique({ 
      where: {id: decoded.userId } 
    });
      if (!user || user.authToken !== token) {
      return res.status(401).json({
        success: false,
        message: "Token mismatch or expired"
      });
    }

    return res.json({
      success: true,
      user: user,
    });

  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};



//Logout
exports.logoutUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded userId during logout:", decoded.userId);

      // Remove token from DB
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { authToken: null },
      });
    }

    return res.json({
      success: true,
      message: "Logout successful"
    });

  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during logout"
    });
  }
};
