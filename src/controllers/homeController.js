const prisma = require("../config/db");

exports.getUserDashboard = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { 
        id: true, 
        name: true, 
        email: true,
        createdAt: true
      },
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: user,
      dashboard: {
        greeting: `Hello ${user.name}, you're successfully logged in!`,
        lastLogin: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching user dashboard",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};