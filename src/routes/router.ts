import express from "express";
import passport from "../passport";
import UserController from "../controllers/users";
import { verifyAuth } from "../middlewares/auth";
import { getSessionUserData } from "../utils/user";
import CalendarController from "../controllers/calendars";
import TaskController from "../controllers/tasks";

const router = express.Router();
const morgan = require("morgan");
router.use(morgan("dev"));

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb("Not an image! Please upload an image.", false);
  }
};
const multer = require("multer");
const profileImagesPath = "profileImages";
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/" + profileImagesPath);
  },
  filename: function (req, file, cb) {
    const uniquePrefix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, uniquePrefix + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: multerFilter,
  limits: { fileSize: 1000000 },
});

//---------------------------------------Auth---------------------------------------

router.post(
  "/auth/login",
  passport.authenticate("local", { session: false }),
  async (req, res) => {
    const userController = new UserController();
    const toSend = await userController.localLogin(req);

    toSend.user.password = "";
    if (toSend.error) res.status(403).send(toSend);
    else res.json(toSend);
  }
);

router.post(
  "/auth/signup",
  passport.authenticate("signup", { session: false }),
  async (req, res) => {
    const userController = new UserController();
    const toSend = await userController.localSignup(req);

    toSend.user.password = "";
    if (toSend.error) res.status(403).send(toSend);
    else res.json(toSend);
  }
);

router.post("/auth/forgotPassword", async (req, res) => {
  const userController = new UserController();
  const toSend = await userController.forgotPassword(req.body);

  if (toSend.error) {
    res.status(401).send(toSend);
  } else {
    res.send(toSend);
  }
});

router.post("/auth/verifyPasswordResetCode", async (req, res) => {
  const userController = new UserController();
  const toSend = await userController.verifyPasswordResetCode(req.body);

  if (toSend.error) {
    res.status(401).send(toSend);
  } else {
    res.send(toSend);
  }
});

router.post("/auth/updatePassword", async (req, res) => {
  const userController = new UserController();
  const toSend = await userController.updatePassword(req.body);

  if (toSend.error) {
    res.status(401).send(toSend);
  } else {
    res.send(toSend);
  }
});

router.get("/auth/me", verifyAuth, getSessionUserData);

router.get("/auth/callback/failure", (req, res) => {
  res.send("Error");
});

//---------------------------------------------------------------------------OAuth2---------------------------------------------------------------------------
router.get("/auth/login/success", (req, res) => {
  if (req.user) {
    res.status(200).json({
      success: true,
      user: req.user,
      //   cookies: req.cookies
    });
  } else {
    res.status(401);
  }
});

router.get("/auth/logout", (req, res) => {
  req.logout();
  res.redirect(process.env.FRONTEND_URL);
});

//---------------------------------------Google---------------------------------------
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get("/auth/callback/google", function (req, res, next) {
  passport.authenticate("google", function (err, user, info) {
    if (err) {
      return res.redirect(process.env.GOOGLE_REDIRECT_URL_FAIL);
    }
    if (!user) {
      return res.redirect(process.env.GOOGLE_REDIRECT_URL_FAIL);
    }
    req.logIn(user, function (err) {
      if (err) {
        return res.redirect(process.env.GOOGLE_REDIRECT_URL_FAIL);
      }
      return res.redirect(process.env.GOOGLE_REDIRECT_URL_SUCCESS);
    });
  })(req, res, next);
});

//---------------------------------------Facebook---------------------------------------
router.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: "email" })
);

router.get("/auth/callback/facebook", function (req, res, next) {
  passport.authenticate("facebook", function (err, user, info) {
    if (err) {
      return res.redirect(process.env.FACEBOOK_REDIRECT_URL_FAIL);
    }
    if (!user) {
      return res.redirect(process.env.FACEBOOK_REDIRECT_URL_FAIL);
    }
    req.logIn(user, function (err) {
      if (err) {
        return res.redirect(process.env.FACEBOOK_REDIRECT_URL_FAIL);
      }
      return res.redirect(process.env.FACEBOOK_REDIRECT_URL_SUCCESS);
    });
  })(req, res, next);
});

//---------------------------------------Twitter---------------------------------------

router.get("/auth/twitter", passport.authenticate("twitter"));

router.get("/auth/callback/twitter", function (req, res, next) {
  passport.authenticate("twitter", function (err, user, info) {
    if (err) {
      return res.redirect(process.env.TWITTER_REDIRECT_URL_FAIL);
    }
    if (!user) {
      return res.redirect(process.env.TWITTER_REDIRECT_URL_FAIL);
    }
    req.logIn(user, function (err) {
      if (err) {
        return res.redirect(process.env.TWITTER_REDIRECT_URL_FAIL);
      }
      return res.redirect(process.env.TWITTER_REDIRECT_URL_SUCCESS);
    });
  })(req, res, next);
});

//---------------------------------------Users---------------------------------------
router.post("/users", verifyAuth, async (req: any, res: any) => {
  if (!req.user.role || req.user.role != "admin") {
    return res.status(401).send();
  }

  let userController = new UserController();
  res.json(await userController.createUser(req.body));
});

router.get("/users", verifyAuth, async (req: any, res: any) => {
  if (!req.user.role || req.user.role != "admin") {
    return res.status(401).send();
  }
  let userController = new UserController();
  res.json(await userController.getUsers());
});

router.patch("/users/:id", verifyAuth, async (req: any, res: any) => {
  const { id } = req.params;

  if (!id) return res.status(406).send("Attributes not valid");
  if (+req.user.id !== +id) {
    return res.status(401).send();
  }
  if (req.user.facebookId || req.user.twitterId || req.user.googleId) {
    return res.status(401).send();
  }
  let userController = new UserController();
  res.send(await userController.updateUser(parseInt(id), req.body));
});

router.get("/users/:id", verifyAuth, async (req: any, res: any) => {
  const { id } = req.params;
  if (!id) return res.status(406).send("Attributes not valid");
  if (!req.user.role || req.user.role != "admin") {
    return res.status(401).send();
  }

  let userController = new UserController();
  res.send(await userController.getUser(parseInt(id)));
});

//---------------------------------------Calendars---------------------------------------
router.post("/calendar", verifyAuth, async (req: any, res: any) => {
  let calendarController = new CalendarController();
  res.json(await calendarController.createCalendar(req.body, req));
});

router.get("/calendar/user/:userId", verifyAuth, async (req: any, res: any) => {
  const { userId } = req.params;
  let calendarController = new CalendarController();
  res.json(await calendarController.getUserCalendars(parseInt(userId)));
});

router.get("/calendar/:id", verifyAuth, async (req: any, res: any) => {
  const { id } = req.params;
  let calendarController = new CalendarController();
  res.send(await calendarController.getCalendar(parseInt(id)));
});

router.patch("/calendar/:id", verifyAuth, async (req: any, res: any) => {
  const { id } = req.params;
  let calendarController = new CalendarController();
  res.send(await calendarController.updateCalendar(parseInt(id), req.body));
});

//---------------------------------------Calendars---------------------------------------
router.post("/task", verifyAuth, async (req: any, res: any) => {
  let taskController = new TaskController();
  res.json(await taskController.createTask(req.body, req));
});

router.get("/task/user/:userId", verifyAuth, async (req: any, res: any) => {
  const { userId } = req.params;
  let taskController = new TaskController();
  res.json(await taskController.getUserTasks(parseInt(userId)));
});

router.get("/task/:id", verifyAuth, async (req: any, res: any) => {
  const { id } = req.params;
  let taskController = new TaskController();
  res.send(await taskController.getTask(parseInt(id)));
});

router.patch("/task/:id", verifyAuth, async (req: any, res: any) => {
  const { id } = req.params;
  let taskController = new TaskController();
  res.send(await taskController.updateTask(parseInt(id), req.body));
});

//---------------------------------------File Uploading---------------------------------------
router.post(
  "/upload/profileImage",
  upload.single("avatar"),
  function (req: any, res) {
    if (req.file) {
      let path: string = "";
      if (req.headers.host.indexOf("http") != 0) {
        path += "http://";
      }
      res.json({
        imageUrl:
          path +
          req.headers.host +
          "/" +
          profileImagesPath +
          "/" +
          req.file.filename,
      });
    } else throw "error";
  }
);

module.exports = router;
