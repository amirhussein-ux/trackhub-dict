import { Document } from "mongoose";
import { WorkflowEventType } from "../workflow/workflowTypes";

type TimelineEntryRecord = {
  timestamp: Date;
  event: string;
  actor: string;
  description: string;
  metadata?: Record<string, unknown>;
};

interface TimelineDocument extends Document {
  timeline?: TimelineEntryRecord[];
}

export class TimelineService {
  static addTimelineEntry(
    policy: TimelineDocument,
    event: WorkflowEventType,
    actor: string,
    description: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!policy.timeline) {
      policy.timeline = [];
    }

    policy.timeline.push({
      timestamp: new Date(),
      event,
      actor,
      description,
      metadata,
    });
  }

  static getTimelineEntries(policy: TimelineDocument): TimelineEntryRecord[] {
    return policy.timeline || [];
  }

  static formatTimelineForDisplay(entries: TimelineEntryRecord[]): Array<{
    date: string;
    time: string;
    event: string;
    actor: string;
    description: string;
  }> {
    return entries.map((entry) => ({
      date: entry.timestamp.toISOString().slice(0, 10),
      time: entry.timestamp.toISOString().slice(11, 16),
      event: entry.event,
      actor: entry.actor,
      description: entry.description,
    }));
  }

  static getLatestTimelineEntry(policy: TimelineDocument): TimelineEntryRecord | null {
    if (!policy.timeline || policy.timeline.length === 0) {
      return null;
    }

    return policy.timeline[policy.timeline.length - 1];
  }

  static getTimelineByEvent(policy: TimelineDocument, eventType: WorkflowEventType): TimelineEntryRecord[] {
    if (!policy.timeline) {
      return [];
    }

    return policy.timeline.filter((entry) => entry.event === eventType);
  }

  static getTimelineByActor(policy: TimelineDocument, actor: string): TimelineEntryRecord[] {
    if (!policy.timeline) {
      return [];
    }

    return policy.timeline.filter((entry) => entry.actor === actor);
  }

  static getTimelineInDateRange(
    policy: TimelineDocument,
    startDate: Date,
    endDate: Date
  ): TimelineEntryRecord[] {
    if (!policy.timeline) {
      return [];
    }

    return policy.timeline.filter(
      (entry) => entry.timestamp >= startDate && entry.timestamp <= endDate
    );
  }
}
