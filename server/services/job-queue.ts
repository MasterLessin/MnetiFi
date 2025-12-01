import { db } from "../db";
import { jobs, JobStatus, JobType } from "@shared/schema";
import { eq, and, lte, or, sql } from "drizzle-orm";
import type { InsertJob, Job } from "@shared/schema";

export class JobQueue {
  private isRunning = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  async enqueue(job: InsertJob): Promise<Job> {
    const [created] = await db.insert(jobs).values({
      ...job,
      status: JobStatus.PENDING,
    }).returning();
    return created;
  }

  async schedulePaymentCheck(tenantId: string, transactionId: string, checkoutRequestId: string, delaySeconds: number = 20): Promise<Job> {
    const scheduledFor = new Date(Date.now() + delaySeconds * 1000);
    return this.enqueue({
      tenantId,
      type: JobType.PAYMENT_STATUS_CHECK,
      payload: { transactionId, checkoutRequestId },
      priority: 10,
      maxAttempts: 5,
      scheduledFor,
    });
  }

  async scheduleUserExpiryCheck(tenantId: string, userId: string): Promise<Job> {
    return this.enqueue({
      tenantId,
      type: JobType.USER_EXPIRY_CHECK,
      payload: { userId },
      priority: 5,
      maxAttempts: 3,
    });
  }

  async scheduleReconciliation(tenantId: string): Promise<Job> {
    return this.enqueue({
      tenantId,
      type: JobType.RECONCILIATION,
      payload: {},
      priority: 1,
      maxAttempts: 1,
    });
  }

  async scheduleSmsNotification(tenantId: string, phoneNumber: string, message: string): Promise<Job> {
    return this.enqueue({
      tenantId,
      type: JobType.SMS_NOTIFICATION,
      payload: { phoneNumber, message },
      priority: 8,
      maxAttempts: 3,
    });
  }

  async getNextJob(): Promise<Job | null> {
    const now = new Date();
    
    const [job] = await db
      .update(jobs)
      .set({
        status: JobStatus.PROCESSING,
        startedAt: now,
        attempts: sql`${jobs.attempts} + 1`,
      })
      .where(
        and(
          or(
            eq(jobs.status, JobStatus.PENDING),
            eq(jobs.status, JobStatus.RETRY)
          ),
          lte(jobs.scheduledFor, now)
        )
      )
      .returning();

    return job || null;
  }

  async markCompleted(jobId: string): Promise<void> {
    await db
      .update(jobs)
      .set({
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));
  }

  async markFailed(jobId: string, error: string): Promise<void> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    
    if (!job) return;

    const attempts = job.attempts ?? 0;
    const maxAttempts = job.maxAttempts ?? 3;
    const shouldRetry = attempts < maxAttempts;
    const nextSchedule = new Date(Date.now() + Math.pow(2, attempts) * 1000 * 10);

    await db
      .update(jobs)
      .set({
        status: shouldRetry ? JobStatus.RETRY : JobStatus.FAILED,
        lastError: error,
        scheduledFor: shouldRetry ? nextSchedule : undefined,
        completedAt: shouldRetry ? undefined : new Date(),
      })
      .where(eq(jobs.id, jobId));
  }

  async getPendingJobs(tenantId?: string): Promise<Job[]> {
    const conditions = [
      or(
        eq(jobs.status, JobStatus.PENDING),
        eq(jobs.status, JobStatus.RETRY),
        eq(jobs.status, JobStatus.PROCESSING)
      )
    ];
    
    if (tenantId) {
      conditions.push(eq(jobs.tenantId, tenantId));
    }

    return db.select().from(jobs).where(and(...conditions));
  }

  async getRecentJobs(limit: number = 50): Promise<Job[]> {
    return db
      .select()
      .from(jobs)
      .orderBy(sql`${jobs.createdAt} DESC`)
      .limit(limit);
  }
}

export const jobQueue = new JobQueue();
