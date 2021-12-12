import { Task } from "@prisma/client";
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

interface TaskCreateParams {
  type: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isGlobal: boolean;
  calendarId: number;
}

interface TaskUpdateParams {
  type?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  isGlobal?: boolean;
}

interface TaskResponse {
  type: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isGlobal?: boolean;
}

@Route("task")
export default class TaskController {
  @Post("/")
  @Tags("Task")
  @Security("bearer")
  public async createTask(
    @Body() body: TaskCreateParams,
    @Request() request: any
  ): Promise<TaskResponse> {
    let data = { ...body };
    delete data.calendarId;

    const task: Task = await prisma.task.create({
      data: {
        ...data,
        createdBy: { connect: { id: request.user.id } },
        ofCalendar: { connect: { id: body.calendarId } },
      },
    });

    return task;
  }

  @Get("/user/{userId}")
  @Tags("Task")
  @Security("bearer")
  public async getUserTasks(@Path() userId: number): Promise<TaskResponse[]> {
    return await prisma.task.findMany({
      where: {
        createdById: userId,
      },
    });
  }

  @Get("/{id}")
  @Tags("Task")
  @Security("bearer")
  public async getTask(@Path() id: number): Promise<TaskResponse> {
    return await prisma.task.findUnique({
      where: {
        id: +id,
      },
    });
  }

  @Patch("/{id}")
  @Tags("Task")
  @Security("bearer")
  public async updateTask(@Path() id: number, @Body() body: TaskUpdateParams) {
    return await prisma.task.update({
      where: {
        id: +id,
      },
      data: body,
    });
  }
}