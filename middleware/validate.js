const { body, validationResult } = require("express-validator");

// Validation rules for signup
const signupValidation = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Name must be between 2 and 100 characters"),

    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email address")
        .normalizeEmail(),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters")
        .matches(/\d/)
        .withMessage("Password must contain at least one number"),

    body("role")
        .optional()
        .isIn(["learner", "mentor"])
        .withMessage("Role must be either learner or mentor"),
];

// Validation rules for login
const loginValidation = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email address")
        .normalizeEmail(),

    body("password").notEmpty().withMessage("Password is required"),
];

// Handle validation errors
function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: errors.array()[0].msg,
            errors: errors.array(),
        });
    }
    next();
}

module.exports = { signupValidation, loginValidation, handleValidation };
