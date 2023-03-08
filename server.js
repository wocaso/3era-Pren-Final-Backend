//-------------------------------------------------------------------------------------------------------//
//Config server express y socket.io//
//-------------------------------------------------------------------------------------------------------//
const express = require("express");
const handlebars = require("express-handlebars");
const { Server: HttpServer } = require("http");
const { Server: IOServer } = require("socket.io");
//-------------------------------------------------------------------------------------------------------//
//Dotenv y yargs//
//-------------------------------------------------------------------------------------------------------//

const dotenv = require("dotenv");
dotenv.config();

// yargs
const parseArgs = require("yargs/yargs");
const yargs = parseArgs(process.argv.slice(2));
const { PORT, MODE } = yargs
  .alias({
    p: "PORT",
    m: "MODE",
  })
  .default({
    PORT: process.env.PORT || 8080,
    MODE: "FORK",
  }).argv;

console.log({
  PORT,
  MODE,
});

//-------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------//
const app = express();
const httpServer = HttpServer(app);
const io = new IOServer(httpServer);
app.use(express.static("./public"));

//-------------------------------------------------------------------------------------------------------//
//Cluster y fork//
//-------------------------------------------------------------------------------------------------------//
const cluster = require("cluster");
const os = require("os");
let numCpus = os.cpus().length;

if (MODE == "CLUSTER" && cluster.isMaster) {
  console.log(numCpus);
  for (let i = 0; i < numCpus; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker) => {
    cluster.fork();
  });

  //dato importante: este "else" llega hasta el final del archivo.
} else {
  //-------------------------------------------------------------------------------------------------------//
  //Bcrypt//
  //-------------------------------------------------------------------------------------------------------//
  const bcrypt = require("bcrypt");
  const saltRounds = 10;

  //-------------------------------------------------------------------------------------------------------//
  //MongoDB
  //-------------------------------------------------------------------------------------------------------//
  //importo los modelos
  const { usuarios } = require("./models/modelsMongoose.js");
  //importo los containers
  const {
    MongooseContainerUsuarios,
  } = require("./containers/mongooseContainer.js");
  const mongooseDBusers = new MongooseContainerUsuarios(
    process.env.MONGOURLusuarios,
    usuarios
  );
  //-------------------------------------------------------------------------------------------------------//
  //Handlebars//
  //-------------------------------------------------------------------------------------------------------//
  app.engine("handlebars", handlebars.engine());
  app.set("views", "./public/views");
  app.set("view engine", "handlebars");
  app.use(
    express.urlencoded({
      extended: true,
    })
  );
  app.use(express.json());
  //-------------------------------------------------------------------------------------------------------//
  //twilo//
  //-------------------------------------------------------------------------------------------------------//
  const accountSid = "ACb61cac25c8983d5a6793834419ecb3d8";
  //DEJO COMENTADO EL AUTH POR QUE SINO TWILO ME LO BAJA AL CODIGO
  const authToken = "816c63deb07995a448e25fee168ad39b"
  const client = require("twilio")(accountSid, authToken);

  //-------------------------------------------------------------------------------------------------------//
  //Compression y winston//
  //-------------------------------------------------------------------------------------------------------//
  const compression = require("compression");
  const { infoLogger, warnLogger, errorLogger } = require("./utils/logger.js");

  function showReqDataInfo(req) {
    infoLogger.info(
      "Hiciste un " + req.method + " a la ruta: '" + req.originalUrl + "'"
    );
  }

  function showReqDataWarn(req) {
    warnLogger.warn(
      "intentaste hacer un " +
        req.method +
        " a la ruta: '" +
        req.originalUrl +
        "' pero esta no existe :c"
    );
  }

  //-------------------------------------------------------------------------------------------------------//
  //Passport//
  //-------------------------------------------------------------------------------------------------------//
  //-------------//
  //Register//
  //-------------//

  const passport = require("passport");
  const { Strategy: LocalStrategy } = require("passport-local");
  passport.use(
    "register",
    new LocalStrategy(
      {
        passReqToCallback: true,
      },
      (req, username, password, done) => {
        mongooseDBusers.getByUser(username).then((res) => {
          if (res[0]) {
            return done(null);
          }
          bcrypt.hash(password, saltRounds).then(function (hash) {
            const newUser = {
              username,
              password,
            };
            newUser.password = hash;
            newUser.name = req.body.name;
            newUser.age = req.body.age;
            newUser.dir = req.body.dir;
            newUser.phone = req.body.phone;
            newUser.picture = req.body.picture;
            mongooseDBusers.addNew(newUser).then((res) => {
              done(null, res);
            });
          });
        });
      }
    )
  );
  //-------------//
  //Login//
  //-------------//
  passport.use(
    "login",
    new LocalStrategy((username, password, done) => {
      mongooseDBusers.getByUser(username).then((res) => {
        if (!res[0]) {
          return done(null, false);
        }
        bcrypt.compare(password, res[0].password).then(function (result) {
          if (!result) {
            return done(null, false);
          }
          return done(null, res[0]);
        });
      });
    })
  );
  //-------------//
  //reqAuth//
  //-------------//
  function requireAuthentication(req, res, next) {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.redirect("/login");
    }
  }
  //-------------------------------------------------------------------------------------------------------//
  //MongoAtlas-Session//
  //-------------------------------------------------------------------------------------------------------//
  const session = require("express-session");
  const MongoStore = require("connect-mongo");
  const advancedOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };
  app.use(
    session({
      store: MongoStore.create({
        mongoUrl: process.env.URLMongoAtlas,
        mongoOptions: advancedOptions,
      }),
      secret: process.env.SessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 600000,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());
  app.use(compression());

  passport.serializeUser((user, done) => {
    done(null, user.username);
  });

  passport.deserializeUser((username, done) => {
    mongooseDBusers.getByUser(username).then((res) => {
      done(null, res);
    });
  });
  //-------------------------------------------------------------------------------------------------------//
  //Mail nodemailer gmail//
  //-------------------------------------------------------------------------------------------------------//
  const nodemailer = require("nodemailer");
  const MAIL_ADDRESS = "wocaso123@gmail.com";
  const MAIL_PASS = "bfgkxkjayvvetjfj";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    port: 587,
    auth: {
      user: MAIL_ADDRESS,
      pass: MAIL_PASS,
    },
  });

  //  const emailContent = {
  //     from: "E-comerce Busato Gabriel",
  //     to:"wocaso123@gmail.com",
  //     subject: "Nuevo Registro",
  //     text: "Ha habido un nuevo registro en la pagina",
  //     html: "<h1>holis</h1>"
  //  }
  async function sendEmail(mail) {
    try {
      const info = await transporter.sendMail(mail);
      infoLogger.info(info);
    } catch (error) {
      warnLogger.warn(error);
    }
  }
  //-------------------------------------------------------------------------------------------------------//
  //Inicializacion del server y gets.//
  //-------------------------------------------------------------------------------------------------------//

  httpServer.listen(PORT, () => {
    infoLogger.info("servidor escuchando en el puerto " + PORT);
  });
  let userInfo;

  app.get("/register", (req, res) => {
    res.render("register");
    showReqDataInfo(req);
  });

  app.post(
    "/register",
    passport.authenticate("register", {
      failureRedirect: "/failregister",
      successRedirect: "/registerSucces",
    })
  );
  app.get("/registerSucces", (req, res) => {
    mongooseDBusers
      .getByUser(req.session.passport.user)
      .then((res) => {
        if (res != undefined) {
          userInfo = res;
        }
      })
      .then(() => {
        const emailContent = {
          from: "E-comerce Busato Gabriel",
          to: MAIL_ADDRESS,
          subject: "Nuevo Registro",
          text: "Ha habido un nuevo registro en la pagina",
          html: `<h1>nombre: ${userInfo[0].name}</h1><br><h1>mail: ${userInfo[0].username}</h1><br><h1>Edad: ${userInfo[0].age}</h1><br><h1>Direccion: ${userInfo[0].dir}</h1><br><h1>Telefono: ${userInfo[0].phone}</h1><br><h1>imagen: ${userInfo[0].picture}</h1>`,
        };
        sendEmail(emailContent);
        res.redirect("/datos");
      });
  });

  app.get("/failregister", (req, res) => {
    res.render("register-error");
    showReqDataInfo(req);
  });
  //----------------------------//
  //    Rutas Login
  //----------------------------//
  app.get("/login", (req, res) => {
    showReqDataInfo(req);
    if (req.isAuthenticated()) {
      res.redirect("/datos");
    } else {
      res.render("login");
    }
  });

  app.post(
    "/login",
    passport.authenticate("login", {
      failureRedirect: "/faillogin",
      successRedirect: "/datos",
    })
  );

  app.get("/faillogin", (req, res) => {
    res.render("login-error");
    showReqDataInfo(req);
  });
  //----------------------------//
  //    Rutas datos
  //----------------------------//
  app.get("/datos", requireAuthentication, (req, res) => {
    mongooseDBusers
      .getByUser(req.session.passport.user)
      .then((res) => {
        if (res != undefined) {
          userInfo = res;
        }
      })
      .then(() => {
        res.render("datos", {
          user: req.session.passport.user,
        });
      });

    showReqDataInfo(req);
  });
  //----------------------------//
  //    Rutas carrito y userData
  //----------------------------//
  app.get("/buyersInfo", requireAuthentication, (req, res) => {
    res.render("buyersInfo", {
      user: userInfo[0].username,
      name: userInfo[0].name,
      age: userInfo[0].age,
      dir: userInfo[0].dir,
      picture: userInfo[0].picture,
      phone: userInfo[0].phone,
      cart: cart,
    });
    showReqDataInfo(req);
  });
  //----------------------------//
  //    Rutas Logout
  //----------------------------//

  app.get("/logout", (req, res) => {
    showReqDataInfo(req);
    req.logout((err) => {
      res.redirect("/login");
    });
  });
  //----------------------------//
  //    Ruta checkout
  //----------------------------//
  app.get("/checkout", (req, res) => {
    const jsonString = JSON.stringify(searchToCart(itemss, cart));
    const emailContent = {
      from: "E-comerce Busato Gabriel",
      to: MAIL_ADDRESS,
      subject: `Nuevo pedido de ${userInfo[0].username} de nombre ${userInfo[0].name}`,
      text: "Nuevo pedido",
      html: `<h1>${jsonString}</h1><br>`,
    };
    sendEmail(emailContent);
    client.messages
      .create({
        body: `Nuevo pedido de ${userInfo[0].username} de nombre ${userInfo[0].name}`,
        from: "whatsapp:+14155238886",
        to: "whatsapp:+5493541337569",
      })
      .then((message) => console.log(message.sid));
    client.messages
      .create({
        body: `Gracias por su compra ${userInfo[0].name} esta esta siendo procesada para ser enviada`,
        from: "whatsapp:+14155238886",
        to: `whatsapp:+54${userInfo[0].phone}`,
      })
      .then((message) => console.log(message.sid));
    res.render("checkout");
  });

  //----------------------------//
  //    Ruta general
  //----------------------------//
  app.get("*", (req, res) => {
    res.redirect("/datos");
    showReqDataWarn(req);
  });

  //----------------------------//
  //    Socklet io
  //----------------------------//

  io.on("connection", (socket) => {
    console.log("un cliente se ha conectado");
    socket.emit("products", itemss);
    socket.emit("productsUser", searchToCart(itemss, cart));
    socket.on("new-producto", (data) => {
      itemss.push(data);
      socket.emit("products", itemss);
    });
  });

  const itemss = [
    {
      id: 1,
      tittle: "Microndas",
      price: 5000,
      thumbnail:
        "https://cdn1.iconfinder.com/data/icons/home-tools-1/136/microwave-512.png",
    },
    {
      id: 2,
      tittle: "Horno",
      price: 6500,
      thumbnail:
        "https://cdn1.iconfinder.com/data/icons/home-tools-1/136/stove-512.png",
    },
    {
      id: 3,
      tittle: "Aspiradora",
      price: 3000,
      thumbnail:
        "https://cdn0.iconfinder.com/data/icons/home-improvements-set-2-1/66/70-256.png",
    },
    {
      id: 4,
      tittle: "Licuadora",
      price: 2000,
      thumbnail:
        "https://cdn1.iconfinder.com/data/icons/kitchen-and-food-2/44/blender-512.png",
    },
  ];

  const cart = [2, 2, 2, 4];

  function searchToCart(array, IDarray) {
    const realCart = [];
    IDarray.map((ID) => {
      array.map((element) => {
        if (element.id === ID) {
          realCart.push(element);
        }
      });
    });
    return realCart;
  }
}
