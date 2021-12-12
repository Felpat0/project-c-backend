import { Calendar } from ".prisma/client";
import { Task, user } from "@prisma/client";
import {
  Route,
  Post,
  Security,
  Body,
  Get,
  Tags,
  Path,
  Patch,
  Request,
} from "tsoa";
import { prisma } from "../prisma";

interface CreateParams {
  name: string;
  description?: string;
}

interface CalendarUpdateParams {
  name?: string;
  description?: string;
  //tasks?: Task[];
}

interface CalendarResponse {
  id: number;
  name: string;
  description?: string;
  tasks?: Task[];
}

@Route("calendar")
export default class CalendarController {
  @Post("/")
  @Tags("Calendar")
  @Security("bearer")
  public async createCalendar(
    @Body() body: CreateParams,
    @Request() request: any
  ): Promise<CalendarResponse> {
    const calendar: Calendar = await prisma.calendar.create({
      data: { ...body, createdBy: { connect: { id: request.user.id } } },
    });

    return calendar;
  }

  @Get("/user/{userId}")
  @Tags("Calendar")
  @Security("bearer")
  public async getUserCalendars(
    @Path() userId: number
  ): Promise<CalendarResponse[]> {
    return await prisma.calendar.findMany({
      where: {
        createdById: userId,
      },
    });
  }

  @Get("/{id}")
  @Tags("Calendar")
  @Security("bearer")
  public async getCalendar(@Path() id: number): Promise<CalendarResponse> {
    return await prisma.calendar.findUnique({
      where: {
        id: +id,
      },
    });
  }

  @Patch("/{id}")
  @Tags("Calendar")
  @Security("bearer")
  public async updateCalendar(
    @Path() id: number,
    @Body() body: CalendarUpdateParams
  ) {
    return await prisma.calendar.update({
      where: {
        id: +id,
      },
      data: body,
    });
  }
}
