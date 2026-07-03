const {Router} = require('express');
const authRouter = Router();

const userController = require("../controllers/user.controller")

authRouter.post("/register", userController.registerUser);
authRouter.post("/login", userController.loginUser);

module.exports = authRouter;