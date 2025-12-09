import { Entity, Column, PrimaryColumn, Index } from "typeorm";

@Entity({ name: "plan_self_purchases" })
@Index(["date", "article"], { unique: true })
export class PlanSelf {
  @PrimaryColumn({ type: "date", name: "date" })
  date: Date;

  @PrimaryColumn({ type: "nvarchar", length: 100, name: "article" })
  article: string;

  @Column({ type: "int", name: "qty" })
  qty: number;
}
