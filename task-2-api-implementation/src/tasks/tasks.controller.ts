import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Query() query: { assignedTo?: string; status?: string }) {
    return this.tasksService.findAll(query);
  }

  @Post()
  create(
    @Body() dto: CreateTaskDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.tasksService.create(dto, Number(userId));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.tasksService.update(Number(id), dto, Number(userId));
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.tasksService.updateStatus(Number(id), dto.status, Number(userId));
  }

  @Patch(':id/unassign')
  unassign(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.tasksService.unassign(Number(id), Number(userId));
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.tasksService.delete(Number(id), Number(userId));
  }
}