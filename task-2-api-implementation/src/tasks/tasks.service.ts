import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTaskDto, userId: number) {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        priority: dto.priority,
        assignedTo: dto.assignedTo,
        assignedBy: userId,
      },
    });
  }

  findAll(query: { assignedTo?: string; status?: string }) {
    return this.prisma.task.findMany({
      where: {
        assignedTo: query.assignedTo ? Number(query.assignedTo) : undefined,
        status: query.status as any,
      },
    });
  }

  async update(id: number, dto: UpdateTaskDto, userId: number) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) throw new NotFoundException('Task not found');
    if (task.assignedBy !== userId)
      throw new ForbiddenException('Only the assigner can update this task');

    return this.prisma.task.update({ where: { id }, data: dto });
  }

  async updateStatus(id: number, status: string, userId: number) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) throw new NotFoundException('Task not found');
    if (task.assignedTo !== userId)
      throw new ForbiddenException('Only the assignee can update the status');

    return this.prisma.task.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async unassign(id: number, userId: number) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) throw new NotFoundException('Task not found');
    if (task.assignedBy !== userId)
      throw new ForbiddenException('Only the assigner can unassign this task');

    return this.prisma.task.update({
      where: { id },
      data: { assignedTo: null },
    });
  }

  async delete(id: number, userId: number) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) throw new NotFoundException('Task not found');
    if (task.assignedBy !== userId)
      throw new ForbiddenException('Only the assigner can delete this task');

    return this.prisma.task.delete({ where: { id } });
  }
}