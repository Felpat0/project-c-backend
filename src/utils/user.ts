import { prisma } from "../prisma";
import { Request, Response } from "express";
require("dotenv").config();

export const getSessionUserData = async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user?.id;
  try {
    let user = await prisma.user.findFirst({ where: { id: userId } });
    if (user) user.password = "hidden";
    res.send(user);
  } catch (err) {
    console.log(err);
    res.status(500).send({
      err,
    });
  }
};
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_SECRET);
export async function verifyGoogleToken(token: string) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload["sub"];
  } catch (err) {
    console.log(err);
  }
}

export interface UserVisibleParams {
  id: number;
  nominative: string;
  email: string;
  profilePhoto?: string;
}

export const toUserVisibleParams = (user: any): UserVisibleParams => {
  return {
    id: user.id,
    nominative: user.nominative,
    email: user.email,
    profilePhoto: user.profilePhoto,
  };
};
