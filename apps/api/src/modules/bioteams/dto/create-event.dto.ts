export class CreateEventDto {
  title!: string;
  description?: string;
  eventType!: string;
  startDate!: string;
  endDate?: string;
  location?: string;
}
