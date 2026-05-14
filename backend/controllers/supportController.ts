import type { NextFunction, Request, Response } from "express";
import SupportTicket from "../models/SupportTicket";
import { logger } from "../lib/logger";
import { sendSupportEmail } from "../services/supportEmailService";
import { createSupportTicketBodySchema } from "../validation/supportSchemas";

const MANILA_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Manila",
});

function formatSubmittedAt(date: Date): string {
  const parts = MANILA_FORMATTER.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return `${map.get("year")}-${map.get("month")}-${map.get("day")} ${map.get("hour")}:${map.get("minute")} ${map.get("dayPeriod")}`;
}

function generateTicketId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SUP-${timestamp}-${random}`;
}

export async function submitSupportTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedBody = createSupportTicketBodySchema.parse(req.body);
    const submittedAt = new Date();
    const ticketId = generateTicketId();

    const ticket = await SupportTicket.create({
      ticketId,
      ...parsedBody,
      submittedAt,
      submittedByUserId: req.currentUser?.id ?? "",
      attachment: req.file
        ? {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
          }
        : undefined,
    });

    try {
      const result = await sendSupportEmail({
        ticketId,
        fullName: parsedBody.fullName,
        email: parsedBody.email,
        department: parsedBody.department,
        subject: parsedBody.subject,
        category: parsedBody.category,
        message: parsedBody.message,
        submittedAt: formatSubmittedAt(submittedAt),
        attachment: req.file
          ? {
              filename: req.file.originalname,
              content: req.file.buffer,
              contentType: req.file.mimetype,
            }
          : undefined,
      });

      ticket.emailDelivery = {
        delivered: true,
        deliveredAt: new Date(),
        providerMessageId: result.messageId ?? "",
      };
      await ticket.save();
    } catch (emailError) {
      logger.error(
        {
          err: emailError,
          ticketId,
          submittedByUserId: req.currentUser?.id,
        },
        "Failed to send support email"
      );

      res.status(502).json({
        message: "Your concern was recorded, but we couldn't deliver it by email right now. Please try again shortly.",
        ticketId,
      });
      return;
    }

    res.status(201).json({
      message: "Your support concern has been submitted successfully.",
      ticketId,
      status: ticket.status,
    });
  } catch (error) {
    next(error);
  }
}
