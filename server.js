const express = require("express");
const app = express();
const mongoose = require("mongoose");
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser')
const flash = require('express-flash');
const path = require("path");
const passportSetup = require('./config/passport-setup');

// Connect to database
mongoose.connect("mongodb://localhost/electronic_newspaper", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
mongoose.connection.once("open", () =>
    console.log("Successfully connected to database")
);
mongoose.connection.on("error", () => {
    console.error.bind(console, "connection error:");
});

mongoose.set('useFindAndModify', false);
app.set("view engine", "ejs");
app.set('views',path.join(__dirname, "views"));
//  middleware
app.use("/static", express.static(path.join(__dirname, "public/user")));
app.use("/avatar", express.static(path.join(__dirname, "tmp/avatar_img")));
app.use("/thumbnail", express.static(path.join(__dirname, "tmp/thumbnail_img")));
app.use("/admin/static", express.static(path.join(__dirname, "public/admin/")));
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({
    name: 'user.id',
    secret: "phatductran secret string",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24*3600*1000*7,
    }
}));
app.use(flash());
passportSetup(passport);
app.use(passport.initialize());
app.use(passport.session());
app.use(passport.authenticate('remember-me'));

// Routes for Users
app.use( require('./routes/user/userRouter') );

// Routes for Administration
app.use('/admin', require('./routes/admin/routes') );

// SET PORT
app.listen(process.env.PORT || 5000, () => {
    console.log(`Server is listening`); 
});
