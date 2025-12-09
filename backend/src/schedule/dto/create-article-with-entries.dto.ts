import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class ArticleEntryDto {
  @IsDateString()
  date: string;

  @IsInt()
  @Min(0)
  qty: number;
}

export class CreateArticleWithEntriesDto {
  @IsString()
  article: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleEntryDto)
  entries: ArticleEntryDto[];
}
