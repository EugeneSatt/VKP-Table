import { IsString } from "class-validator";

export class RenameArticleDto {
  @IsString()
  oldArticle: string;

  @IsString()
  newArticle: string;
}
