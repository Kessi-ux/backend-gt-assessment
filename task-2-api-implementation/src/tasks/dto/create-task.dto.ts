import { IsNotEmpty, IsNumber, IsString, IsIn, IsOptional } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsIn(['low', 'medium', 'high'])
  priority: string;

  @IsNumber()
  assignedTo: number;
}