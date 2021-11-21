import passport from "passport";
import * as jsonwebtoken from "jsonwebtoken";
import { Strategy as LocalStrategy } from "passport-local";
import { comparePasswords, hashPassword } from "./utils/password";
import { prisma } from "./prisma";
import { user } from ".prisma/client";
import UserController from "./controllers/users";

let GoogleStrategy = require("passport-google-oauth2").Strategy;
let FacebookStrategy = require("passport-facebook").Strategy;
let TwitterStrategy = require("passport-twitter").Strategy;

//Login
passport.use(
  "local",
  new LocalStrategy(
    {
      passwordField: "password",
      usernameField: "email",
    },
    async (email: string, password: string, done: Function): Promise<any> => {
      if (process.env.SECRET_KEY) {
        try {
          let user = await prisma.user.findFirst({
            where: { email },
          });

          if (!user) {
            return done(null, false);
          }

          if (!(await comparePasswords(password, user.password))) {
            return done(null, false);
          }

          const tokenPayload = {
            sub: user.id,
            email: user.email,
            nominative: user.nominative,
          };

          const token = jsonwebtoken.sign(tokenPayload, process.env.SECRET_KEY);

          return done(null, {
            token,
            user: {
              id: user.id,
              nominative: user.nominative,
              email: user.email,
            },
          });
        } catch (err) {
          return done(err);
        }
      }
    }
  )
);

//Signup
passport.use(
  "signup",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req: any, email: string, password: string, done: any) => {
      if (process.env.SECRET_KEY) {
        try {
          // Check if already exist
          let user = await prisma.user.findFirst({ where: { email } });

          if (user) {
            return done(null, false, { message: "User already exists" });
          }

          //Check password's complexity
          if (password.length < 8) {
            return done(null, false, { message: "Password too weak" });
          }

          const userHashPsw = await hashPassword(password);

          user = await prisma.user.create({
            data: {
              email,
              password: userHashPsw,
              nominative: req.body.nominative,
            },
          });

          const tokenPayload = {
            sub: user.id,
            email: user.email,
            u: {
              user_id: user.id,
            },
          };

          const token = jsonwebtoken.sign(tokenPayload, process.env.SECRET_KEY);

          return done(null, { token, user });
        } catch (error) {
          done(error);
        }
      }
    }
  )
);

//Google
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        "http://localhost:" + process.env.PORT + "/auth/callback/google",
      passReqToCallback: true,
    },
    async (
      request: any,
      accessToken: any,
      refreshToken: any,
      profile: any,
      done: any
    ) => {
      try {
        let temp = await prisma.user.findFirst({
          where: {
            AND: [{ email: profile.emails[0].value }, { googleId: "" }],
          },
        });

        if (temp) {
          throw new Error("User aleardy exists");
        }

        const defaultUser: user = {
          id: -1,
          nominative: profile.name.givenName + " " + profile.name.familyName,
          email: profile.emails[0].value,
          profilePhoto: profile.photos[0].value,
          googleId: profile.id,
          facebookId: "",
          twitterId: "",
          password: "",
          role: "user",
          passwordResetCode: null,
          passwordResetExpireDate: null,
        };

        const userController = new UserController();
        const user: any = await userController
          .findOrCreateUser(profile.id, defaultUser, "google")
          .catch((err) => {
            done(err);
          });
        if (user && process.env.SECRET_KEY) {
          const tokenPayload = {
            sub: user.id,
            email: user.email,
            nominative: user.nominative,
          };
          user.token = jsonwebtoken.sign(tokenPayload, process.env.SECRET_KEY);
        }

        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

//Facebook
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID_TEST,
      clientSecret: process.env.FACEBOOK_APP_SECRET_TEST,
      callbackURL:
        "http://localhost:" + process.env.PORT + "/auth/callback/facebook",
      profileFields: ["id", "displayName", "photos", "email"],
    },
    async (accessToken: any, refreshToken: any, profile: any, done: any) => {
      try {
        let temp = await prisma.user.findFirst({
          where: {
            AND: [{ email: profile.emails[0].value }, { facebookId: "" }],
          },
        });

        if (temp) {
          throw new Error("User aleardy exists");
        }

        const defaultUser: user = {
          id: -1,
          nominative: profile.displayName,
          email: profile.emails[0].value,
          profilePhoto: profile.photos[0].value,
          googleId: "",
          facebookId: profile.id,
          twitterId: "",
          password: "",
          role: "user",
          passwordResetCode: null,
          passwordResetExpireDate: null,
        };

        const userController = new UserController();
        const user: any = await userController
          .findOrCreateUser(profile.id, defaultUser, "facebook")
          .catch((err) => {
            done(err);
          });
        if (user && process.env.SECRET_KEY) {
          const tokenPayload = {
            sub: user.id,
            email: user.email,
            nominative: user.nominative,
          };
          user.token = jsonwebtoken.sign(tokenPayload, process.env.SECRET_KEY);
        }

        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

//Twitter
passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_API_KEY,
      consumerSecret: process.env.TWITTER_API_SECRET,
      callbackURL:
        "http://localhost:" + process.env.PORT + "/auth/callback/twitter",
      includeEmail: true,
    },
    async (accessToken: any, refreshToken: any, profile: any, done: any) => {
      try {
        let temp = await prisma.user.findFirst({
          where: {
            AND: [{ email: profile.emails[0].value }, { twitterId: "" }],
          },
        });

        if (temp) {
          throw new Error("User aleardy exists");
        }

        const defaultUser: user = {
          id: -1,
          nominative: profile.displayName,
          email: profile.emails[0].value,
          googleId: "",
          facebookId: "",
          twitterId: profile.id,
          password: "",
          profilePhoto: profile.photos[0].value,
          role: "user",
          passwordResetCode: null,
          passwordResetExpireDate: null,
        };

        const userController = new UserController();
        const user: any = await userController
          .findOrCreateUser(profile.id, defaultUser, "twitter")
          .catch((err) => {
            done(err);
          });
        if (user && process.env.SECRET_KEY) {
          const tokenPayload = {
            sub: user.id,
            email: user.email,
            nominative: user.nominative,
          };
          user.token = jsonwebtoken.sign(tokenPayload, process.env.SECRET_KEY);
        }

        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser(async (userProp: any, done) => {
  const user: any = await prisma.user
    .findFirst({ where: { id: userProp.id } })
    .catch((err) => {
      done(err, null);
    });

  if (user) {
    user.token = userProp.token;
    done(null, user);
  }
});

export default passport;
