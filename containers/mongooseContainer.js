const mongoose = require("mongoose");
const {errorLogger}= require("../utils/logger")
// function getDate() {
//   let fullDate = new Date();
//   let date =
//     fullDate.getDate() +
//     "/" +
//     (fullDate.getMonth() + 1) +
//     "/" +
//     fullDate.getFullYear() +
//     " " +
//     fullDate.getHours() +
//     ":" +
//     (fullDate.getMinutes() >= 10 ?
//       fullDate.getMinutes() :
//       "0" + fullDate.getMinutes());
//   return date;
// }

class MongooseContainer{
    constructor(collection, model) {
        this.collection = collection;
        this.model = model;
      }


      async #connectDB() {
        return mongoose.connect(this.collection, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
      }
    
      async #disconnectDB() {
        await mongoose.disconnect();
      }


    async getAll(){
        try{
            await this.#connectDB()
            const allMensajes = await this.model.find();
            console.log("se llego hacia "+allMensajes)
            return allMensajes; 
        }catch(error){
          errorLogger.error("no se pudieron traer los mensajes error:"+error)
        }finally {
          await this.#disconnectDB();
        }
        
    }


    async addNew(mensaje){
        
        try{
          await this.#connectDB()
            let insertedMensaje = await this.model.updateMany({id: "coderChat"},{
              $push: {messages:mensaje}
          })
            return insertedMensaje;
        }catch(error){
          errorLogger.error(error)
        }finally {
            await this.#disconnectDB();
          }
    }



}
//============================================================================================================================================================//
class MongooseContainerUsuarios{
  constructor(collection, model) {
      this.collection = collection;
      this.model = model;
    }


    async #connectDB() {
      return mongoose.connect(this.collection, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }
  
    async #disconnectDB() {
      await mongoose.disconnect();
    }

    async getByUser(user){  
      try{
        await this.#connectDB()
          const usuario = await this.model.find({username: user});
          return usuario
      }catch(error){
        errorLogger.error(error)
      }finally {
          await this.#disconnectDB();
        }
      
  
  }

  async addNew(Producto){
        
    try{
      await this.#connectDB()
        const newProducto = new this.model(Producto);
        const insertedProducto = await newProducto.save();
        return insertedProducto;
    }catch(error){
      errorLogger.error(error)
    }finally {
        await this.#disconnectDB();
      }
}





}
//============================================================================================================================================================//
module.exports = {MongooseContainer, MongooseContainerUsuarios}