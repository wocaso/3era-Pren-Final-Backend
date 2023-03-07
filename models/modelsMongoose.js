const mongoose = require("mongoose") ;

const usuariosCollection = "usuarios"

const UserSchema = new mongoose.Schema({
        username: String,
        password: String,
        name: String,
        age: String,
        dir: String,
        phone: String,
        picture: String,

    })

const usuarios = mongoose.model(usuariosCollection, UserSchema)

module.exports = {usuarios};


