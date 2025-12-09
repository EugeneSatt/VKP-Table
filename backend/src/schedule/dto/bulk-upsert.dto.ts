import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class BulkEntryDto {
  @IsDateString()
  date: string;

  @IsString()
  article: string;

  @IsInt()
  @Min(0)
  qty: number;
}

export class BulkUpsertDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkEntryDto)
  entries: BulkEntryDto[];
}
