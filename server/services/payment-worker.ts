import { jobQueue } from "./job-queue";
import { MpesaService } from "./mpesa";
import { storage } from "../storage";
import { JobType, TransactionStatus, ReconciliationStatus, WifiUserStatus } from "@shared/schema";
import type { Job, Tenant } from "@shared/schema";

export class PaymentWorker {
  private isRunning = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private stuckJobInterval: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_INTERVAL_MS = 5000;
  private readonly STUCK_CHECK_INTERVAL_MS = 60000;

  start(): void {
    if (this.isRunning) {
      console.log("[PaymentWorker] Already running");
      return;
    }

    this.isRunning = true;
    console.log("[PaymentWorker] Started - polling every", this.POLL_INTERVAL_MS / 1000, "seconds");

    this.pollInterval = setInterval(async () => {
      await this.processNextJob();
    }, this.POLL_INTERVAL_MS);

    this.stuckJobInterval = setInterval(async () => {
      await this.resetStuckJobs();
    }, this.STUCK_CHECK_INTERVAL_MS);

    this.processNextJob();
  }

  private async resetStuckJobs(): Promise<void> {
    try {
      const count = await jobQueue.resetStuckJobs(15);
      if (count > 0) {
        console.log(`[PaymentWorker] Reset ${count} stuck jobs`);
      }
    } catch (error) {
      console.error("[PaymentWorker] Error resetting stuck jobs:", error);
    }
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.stuckJobInterval) {
      clearInterval(this.stuckJobInterval);
      this.stuckJobInterval = null;
    }
    this.isRunning = false;
    console.log("[PaymentWorker] Stopped");
  }

  private async processNextJob(): Promise<void> {
    try {
      const job = await jobQueue.getNextJob();
      if (!job) return;

      console.log(`[PaymentWorker] Processing job ${job.id} (${job.type})`);

      switch (job.type) {
        case JobType.PAYMENT_STATUS_CHECK:
          await this.handlePaymentStatusCheck(job);
          break;
        case JobType.USER_EXPIRY_CHECK:
          await this.handleUserExpiryCheck(job);
          break;
        case JobType.RECONCILIATION:
          await this.handleReconciliation(job);
          break;
        case JobType.SMS_NOTIFICATION:
          await this.handleSmsNotification(job);
          break;
        default:
          console.warn(`[PaymentWorker] Unknown job type: ${job.type}`);
          await jobQueue.markFailed(job.id, `Unknown job type: ${job.type}`);
      }
    } catch (error) {
      console.error("[PaymentWorker] Error processing job:", error);
    }
  }

  private async handlePaymentStatusCheck(job: Job): Promise<void> {
    const { transactionId, checkoutRequestId } = job.payload as {
      transactionId: string;
      checkoutRequestId: string;
    };

    try {
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        await jobQueue.markFailed(job.id, "Transaction not found");
        return;
      }

      if (transaction.status === TransactionStatus.COMPLETED) {
        console.log(`[PaymentWorker] Transaction ${transactionId} already completed`);
        await jobQueue.markCompleted(job.id);
        return;
      }

      if (!job.tenantId) {
        await jobQueue.markFailed(job.id, "No tenant ID for job");
        return;
      }

      const tenant = await storage.getTenant(job.tenantId);
      if (!tenant) {
        await jobQueue.markFailed(job.id, "Tenant not found");
        return;
      }

      if (!tenant.mpesaConsumerKey || !tenant.mpesaConsumerSecret) {
        console.log(`[PaymentWorker] No M-Pesa credentials configured - simulating success for demo`);
        
        const attempts = job.attempts ?? 0;
        if (attempts >= 2) {
          const receiptNumber = `SIM${Date.now()}`;
          await storage.updateTransaction(transactionId, {
            status: TransactionStatus.COMPLETED,
            mpesaReceiptNumber: receiptNumber,
            reconciliationStatus: ReconciliationStatus.MATCHED,
            statusDescription: "Payment confirmed (simulated)",
          });

          await this.activateUserAfterPayment(transaction.tenantId, transaction);
          
          console.log(`[PaymentWorker] Transaction ${transactionId} completed (simulated)`);
          await jobQueue.markCompleted(job.id);
        } else {
          await jobQueue.markFailed(job.id, "Waiting for payment confirmation...");
        }
        return;
      }

      const mpesa = new MpesaService(tenant, true);
      const result = await mpesa.queryTransactionStatus(checkoutRequestId);

      if (result.ResultCode === "0") {
        await storage.updateTransaction(transactionId, {
          status: TransactionStatus.COMPLETED,
          reconciliationStatus: ReconciliationStatus.MATCHED,
          statusDescription: result.ResultDesc,
        });

        await this.activateUserAfterPayment(transaction.tenantId, transaction);

        console.log(`[PaymentWorker] Transaction ${transactionId} completed successfully`);
        await jobQueue.markCompleted(job.id);
      } else if (result.ResultCode === "1032") {
        await storage.updateTransaction(transactionId, {
          status: TransactionStatus.FAILED,
          statusDescription: "Transaction cancelled by user",
        });
        await jobQueue.markCompleted(job.id);
      } else {
        await jobQueue.markFailed(job.id, `Query returned: ${result.ResultDesc}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[PaymentWorker] Payment check failed: ${message}`);
      await jobQueue.markFailed(job.id, message);
    }
  }

  private async activateUserAfterPayment(tenantId: string, transaction: any): Promise<void> {
    try {
      if (!transaction.planId) return;

      const plan = await storage.getPlan(transaction.planId);
      if (!plan) return;

      let wifiUser = transaction.wifiUserId
        ? await storage.getWifiUser(transaction.wifiUserId)
        : await storage.getWifiUserByPhone(tenantId, transaction.userPhone);

      if (!wifiUser) {
        wifiUser = await storage.createWifiUser({
          tenantId,
          phoneNumber: transaction.userPhone,
          accountType: "HOTSPOT",
          currentPlanId: plan.id,
          macAddress: transaction.macAddress || null,
          status: WifiUserStatus.ACTIVE,
          expiryTime: new Date(Date.now() + plan.durationSeconds * 1000),
        });
        console.log(`[PaymentWorker] Created new WiFi user for ${transaction.userPhone}`);
      } else {
        const newExpiry = new Date(Date.now() + plan.durationSeconds * 1000);
        await storage.updateWifiUser(wifiUser.id, {
          currentPlanId: plan.id,
          status: WifiUserStatus.ACTIVE,
          expiryTime: newExpiry,
        });
        console.log(`[PaymentWorker] Updated WiFi user ${wifiUser.id} with new expiry`);
      }

      await storage.updateTransaction(transaction.id, {
        wifiUserId: wifiUser.id,
        expiresAt: wifiUser.expiryTime,
      });
    } catch (error) {
      console.error("[PaymentWorker] Error activating user:", error);
    }
  }

  private async handleUserExpiryCheck(job: Job): Promise<void> {
    const { userId } = job.payload as { userId: string };

    try {
      const user = await storage.getWifiUser(userId);
      if (!user) {
        await jobQueue.markCompleted(job.id);
        return;
      }

      if (user.expiryTime && new Date(user.expiryTime) < new Date()) {
        await storage.updateWifiUser(userId, {
          status: WifiUserStatus.EXPIRED,
        });
        console.log(`[PaymentWorker] User ${userId} marked as expired`);
      }

      await jobQueue.markCompleted(job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await jobQueue.markFailed(job.id, message);
    }
  }

  private async handleReconciliation(job: Job): Promise<void> {
    try {
      if (!job.tenantId) {
        await jobQueue.markFailed(job.id, "No tenant ID");
        return;
      }

      const transactions = await storage.getTransactions(job.tenantId);
      const pendingReconciliation = transactions.filter(
        (t) => t.reconciliationStatus === ReconciliationStatus.PENDING
      );

      for (const tx of pendingReconciliation) {
        if (tx.status === TransactionStatus.COMPLETED && tx.mpesaReceiptNumber) {
          await storage.updateTransaction(tx.id, {
            reconciliationStatus: ReconciliationStatus.MATCHED,
          });
        } else if (tx.status === TransactionStatus.FAILED) {
          await storage.updateTransaction(tx.id, {
            reconciliationStatus: ReconciliationStatus.UNMATCHED,
          });
        }
      }

      console.log(`[PaymentWorker] Reconciled ${pendingReconciliation.length} transactions`);
      await jobQueue.markCompleted(job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await jobQueue.markFailed(job.id, message);
    }
  }

  private async handleSmsNotification(job: Job): Promise<void> {
    const { phoneNumber, message } = job.payload as {
      phoneNumber: string;
      message: string;
    };

    try {
      console.log(`[PaymentWorker] SMS to ${phoneNumber}: ${message}`);
      await jobQueue.markCompleted(job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await jobQueue.markFailed(job.id, message);
    }
  }
}

export const paymentWorker = new PaymentWorker();
