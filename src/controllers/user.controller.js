const userModel = require("../models/user.model")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


/**
 * @name registerUser
 * @description This function is used to register a new user
 * @access public
 */

const registerUser = async(req, res) =>{
    const {username, email, password} = req.body;

    if(!username?.trim() || !email?.trim() || !password?.trim()){
        return res.status(400).json({
            message: "Please fill all the fields"
        })
    }

    const userExists = await userModel.findOne({
       $or: [{username: username}, {email: email}]

    })

    if(userExists){
        return res.status(400).json({
            message: "User already exists"
        })
    }

    

    try{
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        
        const user = new userModel({
        username: username, 
        email: email, 
        password: hash
    })

    await user.save();
    return res.status(201).json({
        message: "User registered successfully"
    })
    }catch(err){
        console.log(err);
        return res.status(500).json({
            message: "Error occurred while registering user"
        })
    }
}

const loginUser = async(req, res) =>{
    const {email, password} = req.body;

    if(!email?.trim() || !password?.trim()){
        return res.status(400).json({
            message: "Please fill all the fields"
        })
    }

    try{
        const user = await userModel.findOne({email});

    if(!user){
        return res.status(400).json({
            message:"Invalid email or password"
        })
    }


    const isMatch = await bcrypt.compare(
        password, 
        user.password
    )

    if(!isMatch){
        return res.status(400).json({
        message: "Invalid email or password"
    });
    }

    const token = jwt.sign(
        {
            id: user._id, username: user.username
        }, 
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    )

    return res.status(200).json({
        message: "Login Successful",
        token : token, 
        user: {
            id: user._id,
            username: user.username, 
            email: user.email
        }
    });

    }catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error occurred during login" });
    }
    

}


module.exports = {
    registerUser, 
    loginUser
}