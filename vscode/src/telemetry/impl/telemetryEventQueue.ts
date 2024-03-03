import { TelemetryEvent } from "../types";

export class TelemetryEventQueue {
  events: TelemetryEvent[] = [];

  constructor() {
  }

  public addEvent(e: TelemetryEvent) {
    this.events.push(e);
  }

  public emptyQueue() {
    this.events = [];
  }
}