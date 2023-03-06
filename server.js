//-------------------------------------------------------------------------------------------------------//
//Config server express y socket.io//
//-------------------------------------------------------------------------------------------------------//
const express = require("express");
const handlebars = require("express-handlebars");
const {
    Server: HttpServer
} = require("http");
const {
    Server: IOServer
} = require("socket.io");
//-------------------------------------------------------------------------------------------------------//
//Dotenv y yargs//
//-------------------------------------------------------------------------------------------------------//
const dotenv = require("dotenv");
dotenv.config();

// yargs
const parseArgs = require("yargs/yargs");
const yargs = parseArgs(process.argv.slice(2));
const {
    PORT,
    MODE
} = yargs
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
    MODE
});

//-------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------//
const app = express();
const httpServer = HttpServer(app);
const io = new IOServer(httpServer);
app.use(express.static("./public"));

//-------------------------------------------------------------------------------------------------------//
//Bcrypt//
//-------------------------------------------------------------------------------------------------------//
const bcrypt = require("bcrypt");
const saltRounds = 10;

//-------------------------------------------------------------------------------------------------------//
//MongoDB y faker//
//-------------------------------------------------------------------------------------------------------//
//importo los modelos
const {
    usuarios
} = require("./models/modelsMongoose.js");
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
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());

//-------------------------------------------------------------------------------------------------------//
//Compression y winston//
//-------------------------------------------------------------------------------------------------------//
const compression = require("compression");
const {
    infoLogger,
    warnLogger,
    errorLogger
} = require("./utils/logger.js")

function showReqDataInfo(req) {
    infoLogger.info("Hiciste un " + req.method + " a la ruta: '" + req.originalUrl + "'");
}

function showReqDataWarn(req) {
    warnLogger.warn("intentaste hacer un " + req.method + " a la ruta: '" + req.originalUrl + "' pero esta no existe :c");
}

//-------------------------------------------------------------------------------------------------------//
//Passport//
//-------------------------------------------------------------------------------------------------------//
//-------------//
//Register//
//-------------//

const passport = require("passport");
const {
    Strategy: LocalStrategy
} = require("passport-local");
passport.use(
    "register",
    new LocalStrategy({
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
app.use(compression())

passport.serializeUser((user, done) => {
    done(null, user.username);
});

passport.deserializeUser((username, done) => {
    mongooseDBusers.getByUser(username).then((res) => {
        done(null, res);
    });
});





//-------------------------------------------------------------------------------------------------------//
//Inicializacion del server y gets.//
//-------------------------------------------------------------------------------------------------------//

httpServer.listen(PORT, () => {
    infoLogger.info("servidor escuchando en el puerto " + PORT);
});



app.get("/register", (req, res) => {
    res.render("register");
    showReqDataInfo(req)
});

app.post(
    "/register",
    passport.authenticate("register", {
        failureRedirect: "/failregister",
        successRedirect: "/datos",
    })
);

app.get("/failregister", (req, res) => {
    res.render("register-error");
    showReqDataInfo(req)
});
//----------------------------//
//    Rutas Login
//----------------------------//
app.get("/login", (req, res) => {
    showReqDataInfo(req)
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
    showReqDataInfo(req)
});
//----------------------------//
//    Rutas datos
//----------------------------//

app.get("/datos", requireAuthentication, (req, res) => {
    res.render("datos", {
        user: req.session.passport.user
    });
    showReqDataInfo(req)
});
//----------------------------//
//    Rutas Logout
//----------------------------//

app.get("/logout", (req, res) => {
    showReqDataInfo(req)
    req.logout((err) => {
        res.redirect("/login");
    });
});

//----------------------------//
//    Ruta general
//----------------------------//
app.get("*", (req, res) => {
    res.redirect("/datos");
    showReqDataWarn(req)
});

//----------------------------//
//    Socklet io
//----------------------------//

io.on("connection", (socket) => {
    console.log("un cliente se ha conectado");
    socket.emit("messages", mensajess);
    socket.emit("products", itemss);
    socket.on("new-message", (data) => {
        mensajess.messages.push(data)
        socket.emit("messages", mensajess);
    });
    socket.on("new-producto", (data) => {
        itemss.push(data);
        socket.emit("products", itemss);
    });
});

const mensajess = [
    {
            author: {
                email: "Eduardo@gmail.com",
                nombre: "Eduardo",
                apellido: "Bustamante",
                edad: "20",
                alias: "Edu",
                avatar: "Hermoso avatar.jpg",
            },
            text: "Holis",
            id: 0,
        },
        {
            author: {
                email: "Eduardo@gmail.com",
                nombre: "Eduardo",
                apellido: "Bustamante",
                edad: "20",
                alias: "Edu",
                avatar: "Hermoso avatar.jpg",
            },
            text: "Alguien me responde",
            id: 1,
        },
        {
            author: {
                email: "Eduardo@gmail.com",
                nombre: "Eduardo",
                apellido: "Bustamante",
                edad: "20",
                alias: "Edu",
                avatar: "Hermoso avatar.jpg",
            },
            text: "Bueno",
            id: 2,
        },
        {
            author: {
                email: "Carla@gmail.com",
                nombre: "Carla",
                apellido: "Lopez",
                edad: "30",
                alias: "Carli",
                avatar: "Feo avatar.jpg",
            },
            text: "ei hola",
            id: 3,
        },
        {
            author: {
                email: "Carla@gmail.com",
                nombre: "Carla",
                apellido: "Lopez",
                edad: "30",
                alias: "Carli",
                avatar: "Feo avatar.jpg",
            },
            text: "Hola hola hola",
            id: 4,
        },
        {
            author: {
                email: "Carla@gmail.com",
                nombre: "Carla",
                apellido: "Lopez",
                edad: "30",
                alias: "Carli",
                avatar: "Feo avatar.jpg",
            },
            text: "bueno.....",
            id: 5,
        },
];

const itemss = [{
        id: 1,
        tittle: 'Microndas',
        price: 5000,
        thumbnail: 'https://cdn1.iconfinder.com/data/icons/home-tools-1/136/microwave-512.png'
    },
    {
        id: 2,
        tittle: 'Horno',
        price: 6500,
        thumbnail: 'https://cdn1.iconfinder.com/data/icons/home-tools-1/136/stove-512.png'
    },
    {
        id: 3,
        tittle: 'Aspiradora',
        price: 3000,
        thumbnail: 'https://cdn0.iconfinder.com/data/icons/home-improvements-set-2-1/66/70-256.png'
    },
    {
        id: 4,
        tittle: 'Licuadora',
        price: 2000,
        thumbnail: 'https://cdn1.iconfinder.com/data/icons/kitchen-and-food-2/44/blender-512.png'
    }
];