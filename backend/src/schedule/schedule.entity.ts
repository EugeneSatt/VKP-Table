import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "ScheduleEntries" })
@Index(["date", "article"], { unique: true })
export class ScheduleEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "datetime2" })
  date: Date;

  @Column({ type: "nvarchar", length: 100 })
  article: string;

  @Column({ type: "int" })
  qty: number;
}
