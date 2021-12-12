import { user } from ".prisma/client";
import { Route, Post, Security, Body, Get, Tags, Path, Patch } from "tsoa";
import { prisma } from "../prisma";
import { generateRandomString, hashPassword } from "../utils/password";
import { transporter } from "../utils/transporter";

interface AuthResponse {
  token?: object;
  user?: any;
  error?: any;
}

interface ForgotPasswordParams {
  email: string;
}

interface SignupParams {
  nominative: string;
  email: string;
  password: string;
  profilePhoto?: string;
}

interface UpdateParams {
  nominative?: string;
  email?: string;
  password?: string;
  profilePhoto?: string;
}

@Route("")
export default class UserController {
  @Post("/auth/login")
  @Tags("Auth")
  public async localLogin(@Body() request: any): Promise<AuthResponse> {
    if (request.user.googleId != null) {
      Promise.resolve({ Error: "Sign in via the Google Button" });
    } else if (request.user.facebookId != null) {
      Promise.resolve({ Error: "Sign in via the Facebook Button" });
    } else if (request.user.twitterleId != null) {
      Promise.resolve({ Error: "Sign in via the Twitter Button" });
    }
    return Promise.resolve(request.user);
  }

  @Post("/auth/signup")
  @Tags("Auth")
  public async localSignup(@Body() request: any): Promise<AuthResponse> {
    return Promise.resolve(request.user);
  }

  @Post("/auth/forgotPassword")
  @Tags("Auth")
  public async forgotPassword(
    @Body() body: ForgotPasswordParams
  ): Promise<any> {
    const user = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });

    if (user && !user.facebookId && !user.twitterId && !user.googleId) {
      const generatedString = generateRandomString(6);
      const expireDate = new Date();
      expireDate.setDate(new Date().getDate() + 1);

      const user2 = await prisma.user.update({
        data: {
          passwordResetCode: generatedString,
          passwordResetExpireDate: expireDate,
        },
        where: {
          email: body.email,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: body.email,
        subject: "Password reset",
        text: "Your password reset code is " + generatedString,
      });
      return Promise.resolve({ error: false, message: "ok" });
    }
    return Promise.resolve({ error: true, message: "User not found" });
  }

  @Post("/auth/verifyPasswordResetCode")
  @Tags("Auth")
  public async verifyPasswordResetCode(
    @Body() body: { email: string; passwordResetCode: string }
  ) {
    const user = await prisma.user.findMany({
      where: {
        AND: [{ email: body.email, passwordResetCode: body.passwordResetCode }],
      },
      take: 1,
    });

    if (
      user.length === 1 &&
      !user[0].facebookId &&
      !user[0].twitterId &&
      !user[0].googleId
    ) {
      if (new Date(user[0].passwordResetExpireDate) > new Date()) {
        return Promise.resolve({ error: false, message: "ok" });
      } else {
        return Promise.resolve({ error: true, message: "Expired code" });
      }
    }
    return Promise.resolve({ error: true, message: "Wrong email" });
  }

  @Post("/auth/updatePassword")
  @Tags("Auth")
  public async updatePassword(
    @Body()
    body: {
      email: string;
      passwordResetCode: string;
      newPassword: string;
    }
  ) {
    const user = await prisma.user.findMany({
      where: {
        AND: [{ email: body.email, passwordResetCode: body.passwordResetCode }],
      },
      take: 1,
    });

    if (
      user.length === 1 &&
      !user[0].facebookId &&
      !user[0].twitterId &&
      !user[0].googleId
    ) {
      if (new Date(user[0].passwordResetExpireDate) > new Date()) {
        await prisma.user.update({
          data: { password: await hashPassword(body.newPassword) },
          where: { email: user[0].email },
        });
        return Promise.resolve({ error: false, message: "ok" });
      } else {
        return Promise.resolve({ error: true, message: "Expired code" });
      }
    }
    return Promise.resolve({
      error: true,
      message: "Wrong email or wrong code",
    });
  }

  @Post("/users")
  @Tags("Users")
  @Security("bearer")
  public async createUser(@Body() body: SignupParams) {
    return await prisma.user.create({
      data: {
        email: body.email,
        nominative: body.nominative,
        password: body.password,
      },
    });
  }

  @Get("/users")
  @Tags("Users")
  @Security("bearer")
  public async getUsers() {
    return await prisma.user.findMany();
  }

  @Get("/users/{id}")
  @Tags("Users")
  @Security("bearer")
  public async getUser(@Path() id: number) {
    return await prisma.user.findUnique({
      where: {
        id: +id,
      },
    });
  }
  @Get("/users/task/{taskId}")
  @Tags("Users")
  @Security("bearer")
  public async getTaskCreator(@Path() taskId: number) {
    const task = await prisma.task.findUnique({
      where: {
        id: +taskId,
      },
    });

    return await prisma.user.findUnique({
      where: {
        id: task.createdById,
      },
    });
  }

  @Patch("/users/{id}")
  @Tags("Users")
  @Security("bearer")
  public async updateUser(@Path() id: number, @Body() body: UpdateParams) {
    let data: UpdateParams = {};
    if (body.nominative) data.nominative = body.nominative;
    if (body.email) data.email = body.email;
    if (body.profilePhoto) data.profilePhoto = body.profilePhoto;

    return await prisma.user.update({
      where: {
        id: +id,
      },
      data,
    });
  }

  public findOrCreateUser = async (
    profileId: string,
    defaultUser: user,
    service: "facebook" | "google" | "twitter"
  ) => {
    let user: any;
    if (service == "google") {
      user = await prisma.user.findFirst({
        where: { googleId: profileId },
      });
    } else if (service == "facebook") {
      user = await prisma.user.findFirst({
        where: { facebookId: profileId },
      });
    } else if (service == "twitter") {
      user = await prisma.user.findFirst({
        where: { twitterId: profileId },
      });
    }

    if (user) {
      return user;
    } else {
      const user2 = await prisma.user.create({
        data: {
          nominative: defaultUser.nominative,
          email: defaultUser.email,
          password: "no_pass",
          googleId: defaultUser.googleId,
          facebookId: defaultUser.facebookId,
          twitterId: defaultUser.twitterId,
          profilePhoto: defaultUser.profilePhoto,
        },
      });

      return user2;
    }
  };
}
