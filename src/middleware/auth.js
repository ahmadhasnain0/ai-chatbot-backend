const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
  // READ token from HttpOnly cookie
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // store decoded user (contains userId)
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = authenticateUser;