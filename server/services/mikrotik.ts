import type { Hotspot, Plan, WifiUser } from "@shared/schema";

interface MikrotikResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface HotspotUser {
  ".id": string;
  name: string;
  password?: string;
  profile?: string;
  disabled?: string;
  comment?: string;
}

interface ActiveSession {
  ".id": string;
  user: string;
  address: string;
  macAddress: string;
  uptime: string;
  bytesIn: string;
  bytesOut: string;
}

export class MikrotikService {
  private hotspot: Hotspot;
  private baseUrl: string;

  constructor(hotspot: Hotspot) {
    this.hotspot = hotspot;
    const ip = hotspot.routerApiIp || hotspot.nasIp;
    const port = hotspot.routerApiPort || 8728;
    this.baseUrl = `http://${ip}:${port}`;
  }

  private async makeRequest(endpoint: string, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", body?: any): Promise<MikrotikResponse> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const auth = Buffer.from(`${this.hotspot.routerApiUser || "admin"}:${this.hotspot.routerApiPass || ""}`).toString("base64");

      const response = await fetch(url, {
        method,
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `API error: ${response.status} - ${errorText}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Mikrotik] Request failed for ${this.hotspot.locationName}:`, message);
      return { success: false, error: message };
    }
  }

  async addHotspotUser(username: string, password: string, profile: string, comment?: string): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Adding hotspot user ${username} to ${this.hotspot.locationName}`);
    
    const user = {
      name: username,
      password,
      profile,
      comment: comment || `Created by MnetiFi at ${new Date().toISOString()}`,
    };

    return this.makeRequest("/rest/ip/hotspot/user", "POST", user);
  }

  async removeHotspotUser(username: string): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Removing hotspot user ${username} from ${this.hotspot.locationName}`);
    
    const users = await this.getHotspotUser(username);
    if (!users.success || !users.data?.[0]) {
      return { success: false, error: "User not found" };
    }

    const userId = users.data[0][".id"];
    return this.makeRequest(`/rest/ip/hotspot/user/${userId}`, "DELETE");
  }

  async getHotspotUser(username: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/hotspot/user?name=${encodeURIComponent(username)}`);
  }

  async updateHotspotUser(username: string, updates: Partial<HotspotUser>): Promise<MikrotikResponse> {
    const users = await this.getHotspotUser(username);
    if (!users.success || !users.data?.[0]) {
      return { success: false, error: "User not found" };
    }

    const userId = users.data[0][".id"];
    return this.makeRequest(`/rest/ip/hotspot/user/${userId}`, "PUT", updates);
  }

  async disableUser(username: string): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Disabling user ${username} on ${this.hotspot.locationName}`);
    return this.updateHotspotUser(username, { disabled: "true" });
  }

  async enableUser(username: string): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Enabling user ${username} on ${this.hotspot.locationName}`);
    return this.updateHotspotUser(username, { disabled: "false" });
  }

  async getActiveSessions(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/hotspot/active");
  }

  async disconnectSession(sessionId: string): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Disconnecting session ${sessionId} on ${this.hotspot.locationName}`);
    return this.makeRequest(`/rest/ip/hotspot/active/${sessionId}`, "DELETE");
  }

  async disconnectUser(username: string): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Disconnecting user ${username} from ${this.hotspot.locationName}`);
    
    const sessions = await this.getActiveSessions();
    if (!sessions.success || !sessions.data) {
      return sessions;
    }

    const userSessions = sessions.data.filter((s: ActiveSession) => s.user === username);
    
    for (const session of userSessions) {
      await this.disconnectSession(session[".id"]);
    }

    return { success: true, data: { disconnected: userSessions.length } };
  }

  async createUserProfile(name: string, rateLimit: string, sessionTimeout?: number): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Creating user profile ${name} on ${this.hotspot.locationName}`);
    
    const profile: any = {
      name,
      "rate-limit": rateLimit,
    };

    if (sessionTimeout) {
      profile["session-timeout"] = `${sessionTimeout}s`;
    }

    return this.makeRequest("/rest/ip/hotspot/user/profile", "POST", profile);
  }

  async getSystemResources(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/system/resource");
  }

  async getInterfaceStats(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/interface");
  }

  async getHotspotProfiles(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/hotspot/user/profile");
  }

  async addPPPoEUser(username: string, password: string, service: string, profile?: string): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Adding PPPoE user ${username} to ${this.hotspot.locationName}`);
    
    const secret = {
      name: username,
      password,
      service,
      profile: profile || "default",
      comment: `PPPoE user created by MnetiFi at ${new Date().toISOString()}`,
    };

    return this.makeRequest("/rest/ppp/secret", "POST", secret);
  }

  async removePPPoEUser(username: string): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Removing PPPoE user ${username} from ${this.hotspot.locationName}`);
    
    const users = await this.makeRequest(`/rest/ppp/secret?name=${encodeURIComponent(username)}`);
    if (!users.success || !users.data?.[0]) {
      return { success: false, error: "PPPoE user not found" };
    }

    const userId = users.data[0][".id"];
    return this.makeRequest(`/rest/ppp/secret/${userId}`, "DELETE");
  }

  async disconnectPPPoESession(username: string): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Disconnecting PPPoE session for ${username} on ${this.hotspot.locationName}`);
    
    const sessions = await this.makeRequest(`/rest/ppp/active?name=${encodeURIComponent(username)}`);
    if (!sessions.success || !sessions.data?.[0]) {
      return { success: true, data: { message: "No active session" } };
    }

    const sessionId = sessions.data[0][".id"];
    return this.makeRequest(`/rest/ppp/active/${sessionId}`, "DELETE");
  }

  async addStaticBinding(macAddress: string, ipAddress: string, comment?: string): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Adding static binding ${macAddress} -> ${ipAddress} on ${this.hotspot.locationName}`);
    
    const binding = {
      "mac-address": macAddress,
      address: ipAddress,
      comment: comment || `Static binding by MnetiFi at ${new Date().toISOString()}`,
    };

    return this.makeRequest("/rest/ip/arp", "POST", binding);
  }

  async removeStaticBinding(macAddress: string): Promise<MikrotikResponse> {
    const bindings = await this.makeRequest(`/rest/ip/arp?mac-address=${encodeURIComponent(macAddress)}`);
    if (!bindings.success || !bindings.data?.[0]) {
      return { success: false, error: "Binding not found" };
    }

    const bindingId = bindings.data[0][".id"];
    return this.makeRequest(`/rest/ip/arp/${bindingId}`, "DELETE");
  }

  static buildRateLimit(plan: Plan): string {
    const upload = plan.uploadLimit || "1M";
    const download = plan.downloadLimit || "2M";
    
    if (plan.burstRateUp && plan.burstRateDown && plan.burstThreshold && plan.burstTime) {
      return `${upload}/${download} ${plan.burstRateUp}/${plan.burstRateDown} ${plan.burstThreshold}/${plan.burstThreshold} ${plan.burstTime}/${plan.burstTime}`;
    }
    
    return `${upload}/${download}`;
  }

  async blockTenantTraffic(message: string = "Service temporarily suspended"): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Blocking all traffic on ${this.hotspot.locationName}`);
    
    const rule = {
      chain: "forward",
      action: "reject",
      "reject-with": "icmp-admin-prohibited",
      comment: `MnetiFi Block: ${message}`,
      disabled: "false",
    };

    return this.makeRequest("/rest/ip/firewall/filter", "POST", rule);
  }

  async unblockTenantTraffic(): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Unblocking traffic on ${this.hotspot.locationName}`);
    
    const rules = await this.makeRequest("/rest/ip/firewall/filter?comment~MnetiFi%20Block");
    if (!rules.success || !rules.data) {
      return rules;
    }

    for (const rule of rules.data) {
      await this.makeRequest(`/rest/ip/firewall/filter/${rule[".id"]}`, "DELETE");
    }

    return { success: true, data: { removed: rules.data.length } };
  }

  async testConnection(): Promise<MikrotikResponse> {
    try {
      const result = await this.getSystemResources();
      if (result.success) {
        console.log(`[Mikrotik] Connection test successful for ${this.hotspot.locationName}`);
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      return { success: false, error: message };
    }
  }

  async rebootRouter(): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Rebooting router ${this.hotspot.locationName}`);
    return this.makeRequest("/rest/system/reboot", "POST");
  }

  async getTrafficStats(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/interface/ethernet");
  }

  async getBandwidthUsage(interfaceName: string = "ether1"): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/interface/monitor-traffic?interface=${encodeURIComponent(interfaceName)}&once=`);
  }

  async getActiveConnections(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/firewall/connection");
  }

  async getDHCPLeases(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/dhcp-server/lease");
  }

  async getRouterIdentity(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/system/identity");
  }

  async getRouterHealth(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/system/health");
  }

  async getQueueStats(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/queue/simple");
  }

  // ============== FIREWALL RULES ==============
  async getFirewallFilterRules(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/firewall/filter");
  }

  async getFirewallNatRules(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/firewall/nat");
  }

  async getFirewallMangleRules(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/firewall/mangle");
  }

  async enableFirewallRule(ruleId: string, type: "filter" | "nat" | "mangle" = "filter"): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/firewall/${type}/${ruleId}`, "PUT", { disabled: "false" });
  }

  async disableFirewallRule(ruleId: string, type: "filter" | "nat" | "mangle" = "filter"): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/firewall/${type}/${ruleId}`, "PUT", { disabled: "true" });
  }

  async deleteFirewallRule(ruleId: string, type: "filter" | "nat" | "mangle" = "filter"): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/firewall/${type}/${ruleId}`, "DELETE");
  }

  async addFirewallRule(type: "filter" | "nat" | "mangle", rule: Record<string, any>): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/firewall/${type}`, "POST", rule);
  }

  // ============== IP POOL MANAGEMENT ==============
  async getIpPools(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/pool");
  }

  async addIpPool(name: string, ranges: string): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/pool", "POST", { name, ranges });
  }

  async deleteIpPool(poolId: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/pool/${poolId}`, "DELETE");
  }

  async updateIpPool(poolId: string, updates: { name?: string; ranges?: string }): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/pool/${poolId}`, "PUT", updates);
  }

  // ============== DHCP SERVER ==============
  async getDhcpServers(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/dhcp-server");
  }

  async getDhcpNetworks(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/dhcp-server/network");
  }

  async releaseDhcpLease(leaseId: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/dhcp-server/lease/${leaseId}`, "DELETE");
  }

  async makeLeaseStatic(leaseId: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/dhcp-server/lease/${leaseId}`, "PUT", { dynamic: "false" });
  }

  // ============== HOTSPOT SERVER MANAGEMENT ==============
  async getHotspotServers(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/hotspot");
  }

  async getHotspotServerProfiles(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/hotspot/profile");
  }

  async updateHotspotServerProfile(profileId: string, updates: Record<string, any>): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/hotspot/profile/${profileId}`, "PUT", updates);
  }

  async getHotspotIpBindings(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/hotspot/ip-binding");
  }

  async addHotspotIpBinding(address: string, type: "bypassed" | "blocked" | "regular", comment?: string): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/hotspot/ip-binding", "POST", {
      address,
      type,
      comment: comment || `MnetiFi binding at ${new Date().toISOString()}`,
    });
  }

  async deleteHotspotIpBinding(bindingId: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/hotspot/ip-binding/${bindingId}`, "DELETE");
  }

  // ============== WALLED GARDEN SYNC ==============
  async getWalledGardenEntries(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/hotspot/walled-garden");
  }

  async getWalledGardenIpEntries(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/hotspot/walled-garden/ip");
  }

  async addWalledGardenEntry(dstHost: string, action: "allow" | "deny" = "allow", comment?: string): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/hotspot/walled-garden", "POST", {
      "dst-host": dstHost,
      action,
      comment: comment || `MnetiFi at ${new Date().toISOString()}`,
    });
  }

  async addWalledGardenIpEntry(dstAddress: string, action: "accept" | "drop" = "accept", comment?: string): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/hotspot/walled-garden/ip", "POST", {
      "dst-address": dstAddress,
      action,
      comment: comment || `MnetiFi at ${new Date().toISOString()}`,
    });
  }

  async deleteWalledGardenEntry(entryId: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/hotspot/walled-garden/${entryId}`, "DELETE");
  }

  async deleteWalledGardenIpEntry(entryId: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/hotspot/walled-garden/ip/${entryId}`, "DELETE");
  }

  async syncWalledGarden(entries: { domain: string; description?: string }[]): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Syncing ${entries.length} walled garden entries to ${this.hotspot.locationName}`);
    
    const results = { added: 0, failed: 0, errors: [] as string[] };
    
    for (const entry of entries) {
      const result = await this.addWalledGardenEntry(entry.domain, "allow", entry.description);
      if (result.success) {
        results.added++;
      } else {
        results.failed++;
        results.errors.push(`${entry.domain}: ${result.error}`);
      }
    }
    
    return { success: results.failed === 0, data: results };
  }

  // ============== SIMPLE QUEUES ==============
  async getSimpleQueues(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/queue/simple");
  }

  async addSimpleQueue(name: string, target: string, maxLimit: string, comment?: string): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/queue/simple", "POST", {
      name,
      target,
      "max-limit": maxLimit,
      comment: comment || `MnetiFi queue at ${new Date().toISOString()}`,
    });
  }

  async updateSimpleQueue(queueId: string, updates: Record<string, any>): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/queue/simple/${queueId}`, "PUT", updates);
  }

  async deleteSimpleQueue(queueId: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/queue/simple/${queueId}`, "DELETE");
  }

  // ============== ARP TABLE ==============
  async getArpTable(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/arp");
  }

  async addArpEntry(address: string, macAddress: string, interfaceName: string, comment?: string): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/arp", "POST", {
      address,
      "mac-address": macAddress,
      interface: interfaceName,
      comment: comment || `MnetiFi at ${new Date().toISOString()}`,
    });
  }

  async deleteArpEntry(entryId: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/arp/${entryId}`, "DELETE");
  }

  // ============== ROUTES ==============
  async getRoutes(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/route");
  }

  async addRoute(dstAddress: string, gateway: string, comment?: string): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/route", "POST", {
      "dst-address": dstAddress,
      gateway,
      comment: comment || `MnetiFi route at ${new Date().toISOString()}`,
    });
  }

  async deleteRoute(routeId: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/route/${routeId}`, "DELETE");
  }

  // ============== IP ADDRESSES ==============
  async getIpAddresses(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/address");
  }

  async addIpAddress(address: string, interfaceName: string, comment?: string): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/address", "POST", {
      address,
      interface: interfaceName,
      comment: comment || `MnetiFi at ${new Date().toISOString()}`,
    });
  }

  async deleteIpAddress(addressId: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/ip/address/${addressId}`, "DELETE");
  }

  // ============== DNS ==============
  async getDnsSettings(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/dns");
  }

  async getDnsStaticEntries(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/dns/static");
  }

  async setDnsServers(servers: string): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ip/dns", "PUT", { servers });
  }

  // ============== ROUTER BACKUP ==============
  async createBackup(name?: string): Promise<MikrotikResponse> {
    const backupName = name || `mnetifi_backup_${Date.now()}`;
    console.log(`[Mikrotik] Creating backup ${backupName} on ${this.hotspot.locationName}`);
    return this.makeRequest("/rest/system/backup/save", "POST", { name: backupName });
  }

  async exportConfig(): Promise<MikrotikResponse> {
    console.log(`[Mikrotik] Exporting config from ${this.hotspot.locationName}`);
    return this.makeRequest("/rest/export");
  }

  async getFiles(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/file");
  }

  async getFileContent(fileName: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/file/${encodeURIComponent(fileName)}`);
  }

  async deleteFile(fileName: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/file/${encodeURIComponent(fileName)}`, "DELETE");
  }

  // ============== SCRIPTS & SCHEDULER ==============
  async getScripts(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/system/script");
  }

  async getScheduler(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/system/scheduler");
  }

  // ============== LOGS ==============
  async getLogs(topics?: string): Promise<MikrotikResponse> {
    const endpoint = topics ? `/rest/log?topics=${encodeURIComponent(topics)}` : "/rest/log";
    return this.makeRequest(endpoint);
  }

  // ============== INTERFACE MANAGEMENT ==============
  async getWirelessInterfaces(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/interface/wireless");
  }

  async getEthernetInterfaces(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/interface/ethernet");
  }

  async getBridges(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/interface/bridge");
  }

  async getBridgePorts(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/interface/bridge/port");
  }

  async enableInterface(interfaceId: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/interface/${interfaceId}`, "PUT", { disabled: "false" });
  }

  async disableInterface(interfaceId: string): Promise<MikrotikResponse> {
    return this.makeRequest(`/rest/interface/${interfaceId}`, "PUT", { disabled: "true" });
  }

  // ============== PPP PROFILES ==============
  async getPppProfiles(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ppp/profile");
  }

  async addPppProfile(name: string, localAddress: string, remoteAddress: string, rateLimit?: string): Promise<MikrotikResponse> {
    const profile: Record<string, any> = {
      name,
      "local-address": localAddress,
      "remote-address": remoteAddress,
    };
    if (rateLimit) {
      profile["rate-limit"] = rateLimit;
    }
    return this.makeRequest("/rest/ppp/profile", "POST", profile);
  }

  async getPppSecrets(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ppp/secret");
  }

  async getActivePppSessions(): Promise<MikrotikResponse> {
    return this.makeRequest("/rest/ppp/active");
  }

  // ============== COMPREHENSIVE CONNECTION TEST ==============
  async fullConnectionTest(): Promise<MikrotikResponse> {
    try {
      const [identity, resources, health] = await Promise.all([
        this.getRouterIdentity(),
        this.getSystemResources(),
        this.getRouterHealth(),
      ]);

      if (!identity.success && !resources.success) {
        return { success: false, error: "Cannot connect to router" };
      }

      return {
        success: true,
        data: {
          identity: identity.data,
          resources: resources.data,
          health: health.data,
          connectionTime: new Date().toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection test failed";
      return { success: false, error: message };
    }
  }
}

export async function createMikrotikService(hotspot: Hotspot): Promise<MikrotikService | null> {
  if (!hotspot.routerApiIp && !hotspot.nasIp) {
    console.warn(`[Mikrotik] No API IP configured for hotspot ${hotspot.id}`);
    return null;
  }

  const service = new MikrotikService(hotspot);
  return service;
}
