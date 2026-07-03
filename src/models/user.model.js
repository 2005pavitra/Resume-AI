const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username:{
        type: String,
        unique: [true, "Username already exists"],
        required: true,
        trim: true

    },
    email:{
        type: String,
        unique: [true, "Email already exists"],
        required: true,
        trim: true

    },

    password:{
        type: String, 
        required: true,
        trim: true
    }
})

const userModel = mongoose.model("user", userSchema);
module.exports = userModel;