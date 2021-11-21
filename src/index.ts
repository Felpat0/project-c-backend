require("dotenv").config();
import express from "express";
import passport from "passport";
import swaggerUi from "swagger-ui-express";
const morgan = require("morgan");
const cookieSession = require("cookie-session");
const port = process.env.PORT || 3000;
const router = require("./routes/router");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();

const swaggerJSON = require("../public/swagger.json");

//CORS
app.options("*", cors({ origin: "http://localhost:3000", credentials: true }));
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);

app.use(
  cookieSession({
    name: "session",
    keys: [process.env.COOKIE_KEY1, process.env.COOKIE_KEY2],
    maxAge: 24 * 60 * 60 * 1000,
  })
);
app.use(express.static("public"));
app.use("/images", express.static("images"));
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());
app.use(express.json());
app.use(router);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerJSON));

app.use(morgan("dev"));

app.listen(port, () => console.log("Listening on port " + port));

module.exports = app;
