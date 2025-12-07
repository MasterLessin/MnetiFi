import { jobQueue } from "./job-queue";
import { MpesaService } from "./mpesa";
import { createMikrotikService, MikrotikService } from "./mikrotik";
import { storage } from "../storage";
import { JobType, TransactionStatus, ReconciliationStatus, WifiUserStatus, WalletTransactionType } from "@shared/schema";
import type { Job, Tenant, Plan, WifiUser } from "@shared/schema";

export class PaymentWorker {
  private isRunning = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private stuckJobInterval: ReturnType<typeof setInterval> | null = null;
  private expiryCheckInterval: ReturnType<typeof setInterval> | null = null;
  private trialCheckInterval: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_INTERVAL_MS = 5000;
  private readonly STUCK_CHECK_INTERVAL_MS = 60000;
  private readonly EXPIRY_CHECK_INTERVAL_MS = 30000;
  private readonly TRIAL_CHECK_INTERVAL_MS = 60000; // Check trials every minute

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

    this.expiryCheckInterval = setInterval(async () => {
      await this.checkAndMarkExpiredUsers();
    }, this.EXPIRY_CHECK_INTERVAL_MS);

    this.trialCheckInterval = setInterval(async () => {
      await this.checkAndExpireTrials();
    }, this.TRIAL_CHECK_INTERVAL_MS);

    this.processNextJob();
    this.checkAndMarkExpiredUsers();
    this.checkAndExpireTrials();
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
    if (this.expiryCheckInterval) {
      clearInterval(this.expiryCheckInterval);
      this.expiryCheckInterval = null;
    }
    if (this.trialCheckInterval) {
      clearInterval(this.trialCheckInterval);
      this.trialCheckInterval = null;
    }
    this.isRunning = false;
    console.log("[PaymentWorker] Stopped");
  }

  private async checkAndExpireTrials(): Promise<void> {
    try {
      const expiredCount = await storage.markExpiredTrials();
      if (expiredCount > 0) {
        console.log(`[PaymentWorker] Suspended ${expiredCount} ISP(s) with expired trials`);
      }
    } catch (error) {
      console.error("[PaymentWorker] Error checking expired trials:", error);
    }
  }

  private async checkAndMarkExpiredUsers(): Promise<void> {
    try {
      const expiredCount = await storage.markExpiredUsers();
      if (expiredCount > 0) {
        console.log(`[PaymentWorker] Marked ${expiredCount} users as expired`);
      }
      
      const staleTxCount = await storage.markStaleTransactionsAsFailed();
      if (staleTxCount > 0) {
        console.log(`[PaymentWorker] Marked ${staleTxCount} stale transactions as failed`);
      }
    } catch (error) {
      console.error("[PaymentWorker] Error checking expired users:", error);
    }
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
        console.log(`[PaymentWorker] No M-Pesa credentials configured - simulating payment for demo`);
        
        const attempts = job.attempts ?? 0;
        if (attempts >= 2) {
          const shouldFail = Math.random() < 0.1;
          
          if (shouldFail) {
            await storage.updateTransaction(transactionId, {
              status: TransactionStatus.FAILED,
              reconciliationStatus: ReconciliationStatus.UNMATCHED,
              statusDescription: "Payment cancelled by user (simulated)",
            });
            console.log(`[PaymentWorker] Transaction ${transactionId} failed (simulated)`);
          } else {
            const receiptNumber = `SIM${Date.now()}`;
            await storage.updateTransaction(transactionId, {
              status: TransactionStatus.COMPLETED,
              mpesaReceiptNumber: receiptNumber,
              reconciliationStatus: ReconciliationStatus.MATCHED,
              statusDescription: "Payment confirmed (simulated)",
            });
            await this.activateUserAfterPayment(transaction.tenantId, transaction);
            console.log(`[PaymentWorker] Transaction ${transactionId} completed (simulated)`);
          }
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

      // Handle excess payments - credit to wallet
      const excessAmount = transaction.amount - plan.price;
      if (excessAmount > 0 && wifiUser) {
        try {
          await storage.creditExcessToWallet(
            tenantId,
            wifiUser.id,
            excessAmount,
            `Excess payment credited from transaction ${transaction.mpesaReceiptNumber || transaction.id}`,
            transaction.id
          );
          console.log(`[PaymentWorker] Credited KES ${excessAmount} excess to wallet for user ${wifiUser.id}`);
        } catch (walletError) {
          console.error("[PaymentWorker] Error crediting excess to wallet:", walletError);
        }
      }

      // Activate user on MikroTik router
      await this.activateUserOnRouter(tenantId, wifiUser, plan);
    } catch (error) {
      console.error("[PaymentWorker] Error activating user:", error);
    }
  }

  private async activateUserOnRouter(tenantId: string, wifiUser: WifiUser, plan: Plan): Promise<boolean> {
    try {
      // Get hotspots for this tenant
      const hotspots = await storage.getHotspots(tenantId);
      if (!hotspots || hotspots.length === 0) {
        console.log(`[PaymentWorker] No hotspots configured for tenant ${tenantId} - skipping router activation`);
        return false;
      }

      // Use the user's current hotspot or the first available one
      const hotspot = wifiUser.currentHotspotId 
        ? hotspots.find(h => h.id === wifiUser.currentHotspotId) || hotspots[0]
        : hotspots[0];

      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        console.log(`[PaymentWorker] MikroTik service not available for hotspot ${hotspot.locationName}`);
        return false;
      }

      // Only generate new credentials if user doesn't have them
      const username = wifiUser.username || wifiUser.phoneNumber.replace(/\+/g, '');
      const password = wifiUser.password || Math.random().toString(36).substring(2, 10);
      const needsCredentialUpdate = !wifiUser.username || !wifiUser.password;

      // Build rate limit string from plan
      const rateLimit = MikrotikService.buildRateLimit(plan);

      // Handle based on plan/account type
      const accountType = plan.planType || wifiUser.accountType || "HOTSPOT";
      let result;
      
      switch (accountType) {
        case "PPPOE":
          // Create profile with rate limit first (if it doesn't exist)
          await mikrotik.createUserProfile(plan.name, rateLimit, plan.durationSeconds);
          result = await mikrotik.addPPPoEUser(
            username,
            password,
            "pppoe",
            plan.name
          );
          break;
          
        case "STATIC":
          // For static IP, add ARP/MAC binding
          if (wifiUser.macAddress && wifiUser.ipAddress) {
            result = await mikrotik.addStaticBinding(
              wifiUser.macAddress,
              wifiUser.ipAddress,
              `Static IP for ${username}, Plan: ${plan.name}`
            );
          } else {
            console.log(`[PaymentWorker] Static IP user ${username} missing MAC or IP address`);
            return false;
          }
          break;
          
        default: // HOTSPOT
          result = await mikrotik.addHotspotUser(
            username,
            password,
            plan.name,
            `Plan: ${plan.name}, Phone: ${wifiUser.phoneNumber}`
          );
          break;
      }

      if (result.success) {
        // Only update credentials if they were newly generated
        if (needsCredentialUpdate) {
          await storage.updateWifiUser(wifiUser.id, {
            username,
            password,
            currentHotspotId: hotspot.id,
          });
        }
        console.log(`[PaymentWorker] Successfully activated ${username} (${accountType}) on router ${hotspot.locationName}`);
        return true;
      } else {
        console.error(`[PaymentWorker] Failed to activate user on router: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error("[PaymentWorker] Error activating user on router:", error);
      return false;
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
