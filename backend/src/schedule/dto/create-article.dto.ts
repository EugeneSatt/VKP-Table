import { IsString, IsDateString, IsInt, Min } from "class-validator";

export class CreateArticleDto {
  @IsString()
  article: string;

  @IsDateString()
  startDate: string;

  @IsInt()
  @Min(1)
  days: number;
}
