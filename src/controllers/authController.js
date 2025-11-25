const prisma = require("../config/db");
const generateToken = require("../utils/generateToken");
const jwt = require("jsonwebtoken");

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

    // Send token via HttpOnly cookie
    res.cookie("token", authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",  
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });


    res.json({
      success: true,
      message: "Login successful",
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

// LOGOUT - Clear the token cookie
exports.logoutUser = async (req, res) => {
  try {
    // Clear the token cookie by setting it with an expired date
    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      expires: new Date(0), // Set expiry to past date
    });

    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error during logout",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// VERIFY AUTH
exports.verifyAuth = async (req, res) => {
  console.log("This is the req: ", req.cookies);
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ success: false, message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

     const user = await prisma.user.findUnique({ 
      where: {id: decoded.userId } 
    });

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
    // Since we're using stateless JWTs, logout can be handled on the client side
    return res.json({ 
      success: true,
      message: "Logout successful" 
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during logout",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
