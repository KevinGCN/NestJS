import { IsNotEmpty, IsUUID, IsString, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  name!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsUUID()
  categoryEditionId!: string;
}
