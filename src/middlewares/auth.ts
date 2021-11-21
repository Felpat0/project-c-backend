import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { prisma } from "../prisma";

export const verifyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let auth = req.get("authorization");

  if (!auth) {
    return res.status(401).send("Authorization Required");
  }

  const bearerToken = auth.split(" ");
  if (bearerToken.length != 2) {
    return res.status(400).send("Invalid authentication header");
  }

  try {
    let user: any = undefined;
    const decoded: any = jwt.decode(bearerToken[1]);
    user = await prisma.user.findFirst({ where: { id: decoded.sub } });

    if (!user) {
      throw new Error("User not found");
    }

    req.user = user;
    next();
  } catch (err) {
    console.log(err);
    return res.status(400).send("Invalid authentication token");
  }
};
