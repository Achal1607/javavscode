import { TelemetryEvent } from "../telemetryEvent";

export class TelemetryEventQueue {
    events: TelemetryEvent[];

  constructor() {
    this.events = [];
  }
  
  public addEvent(e: TelemetryEvent) {
    this.events.push(e);
  }

  public emptyQueue() {
    this.events = [];
  }
}