import * as dgram from "dgram";
import * as crypto from "crypto";
import type { Hotspot, Plan, WifiUser } from "@shared/schema";

const RADIUS_PORT = 1812;
const RADIUS_ACCT_PORT = 1813;
const COA_PORT = 3799;

const RADIUS_CODES = {
  ACCESS_REQUEST: 1,
  ACCESS_ACCEPT: 2,
  ACCESS_REJECT: 3,
  ACCOUNTING_REQUEST: 4,
  ACCOUNTING_RESPONSE: 5,
  ACCESS_CHALLENGE: 11,
  COA_REQUEST: 43,
  COA_ACK: 44,
  COA_NAK: 45,
  DISCONNECT_REQUEST: 40,
  DISCONNECT_ACK: 41,
  DISCONNECT_NAK: 42,
} as const;

const RADIUS_ATTRIBUTES = {
  USER_NAME: 1,
  USER_PASSWORD: 2,
  CHAP_PASSWORD: 3,
  NAS_IP_ADDRESS: 4,
  NAS_PORT: 5,
  SERVICE_TYPE: 6,
  FRAMED_PROTOCOL: 7,
  FRAMED_IP_ADDRESS: 8,
  FRAMED_IP_NETMASK: 9,
  FRAMED_ROUTING: 10,
  FILTER_ID: 11,
  FRAMED_MTU: 12,
  FRAMED_COMPRESSION: 13,
  LOGIN_IP_HOST: 14,
  LOGIN_SERVICE: 15,
  LOGIN_TCP_PORT: 16,
  REPLY_MESSAGE: 18,
  CALLBACK_NUMBER: 19,
  CALLBACK_ID: 20,
  FRAMED_ROUTE: 22,
  FRAMED_IPX_NETWORK: 23,
  STATE: 24,
  CLASS: 25,
  VENDOR_SPECIFIC: 26,
  SESSION_TIMEOUT: 27,
  IDLE_TIMEOUT: 28,
  TERMINATION_ACTION: 29,
  CALLED_STATION_ID: 30,
  CALLING_STATION_ID: 31,
  NAS_IDENTIFIER: 32,
  PROXY_STATE: 33,
  ACCT_STATUS_TYPE: 40,
  ACCT_DELAY_TIME: 41,
  ACCT_INPUT_OCTETS: 42,
  ACCT_OUTPUT_OCTETS: 43,
  ACCT_SESSION_ID: 44,
  ACCT_AUTHENTIC: 45,
  ACCT_SESSION_TIME: 46,
  ACCT_INPUT_PACKETS: 47,
  ACCT_OUTPUT_PACKETS: 48,
  ACCT_TERMINATE_CAUSE: 49,
  ACCT_MULTI_SESSION_ID: 50,
  ACCT_LINK_COUNT: 51,
  CHAP_CHALLENGE: 60,
  NAS_PORT_TYPE: 61,
  PORT_LIMIT: 62,
  LOGIN_LAT_PORT: 63,
  MIKROTIK_RATE_LIMIT: 8, // Vendor-specific under MIKROTIK vendor ID
} as const;

const MIKROTIK_VENDOR_ID = 14988;

interface RadiusPacket {
  code: number;
  identifier: number;
  authenticator: Buffer;
  attributes: Map<number, Buffer>;
}

interface CoAResult {
  success: boolean;
  code?: number;
  message?: string;
  error?: string;
}

export class RadiusService {
  private secret: string;
  private nasIp: string;

  constructor(hotspot: Hotspot) {
    this.secret = hotspot.secret;
    this.nasIp = hotspot.nasIp;
  }

  private createPacket(code: number, attributes: Map<number, Buffer>): Buffer {
    const identifier = Math.floor(Math.random() * 256);
    const authenticator = crypto.randomBytes(16);
    
    let attributesBuffer = Buffer.alloc(0);
    
    attributes.forEach((value, type) => {
      const attrLength = 2 + value.length;
      const attrBuffer = Buffer.alloc(attrLength);
      attrBuffer.writeUInt8(type, 0);
      attrBuffer.writeUInt8(attrLength, 1);
      value.copy(attrBuffer, 2);
      attributesBuffer = Buffer.concat([attributesBuffer, attrBuffer]);
    });

    const length = 20 + attributesBuffer.length;
    const header = Buffer.alloc(20);
    header.writeUInt8(code, 0);
    header.writeUInt8(identifier, 1);
    header.writeUInt16BE(length, 2);
    authenticator.copy(header, 4);

    const packet = Buffer.concat([header, attributesBuffer]);

    if (code === RADIUS_CODES.COA_REQUEST || code === RADIUS_CODES.DISCONNECT_REQUEST) {
      const authInput = Buffer.concat([packet, Buffer.from(this.secret)]);
      const newAuth = crypto.createHash("md5").update(authInput).digest();
      newAuth.copy(packet, 4);
    }

    return packet;
  }

  private parsePacket(data: Buffer): RadiusPacket {
    const code = data.readUInt8(0);
    const identifier = data.readUInt8(1);
    const length = data.readUInt16BE(2);
    const authenticator = data.subarray(4, 20);
    
    const attributes = new Map<number, Buffer>();
    let offset = 20;
    
    while (offset < length) {
      const attrType = data.readUInt8(offset);
      const attrLength = data.readUInt8(offset + 1);
      const attrValue = data.subarray(offset + 2, offset + attrLength);
      attributes.set(attrType, attrValue);
      offset += attrLength;
    }

    return { code, identifier, authenticator, attributes };
  }

  private async sendPacket(packet: Buffer, port: number, timeout: number = 5000): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket("udp4");
      
      const timer = setTimeout(() => {
        socket.close();
        reject(new Error("RADIUS request timeout"));
      }, timeout);

      socket.on("message", (msg) => {
        clearTimeout(timer);
        socket.close();
        resolve(msg);
      });

      socket.on("error", (err) => {
        clearTimeout(timer);
        socket.close();
        reject(err);
      });

      socket.send(packet, port, this.nasIp);
    });
  }

  async sendCoA(sessionId: string, newRateLimit?: string): Promise<CoAResult> {
    console.log(`[RADIUS] Sending CoA to ${this.nasIp} for session ${sessionId}`);
    
    try {
      const attributes = new Map<number, Buffer>();
      
      attributes.set(RADIUS_ATTRIBUTES.ACCT_SESSION_ID, Buffer.from(sessionId));
      attributes.set(RADIUS_ATTRIBUTES.NAS_IP_ADDRESS, this.encodeIpAddress(this.nasIp));

      if (newRateLimit) {
        const vendorAttr = this.encodeVendorSpecific(
          MIKROTIK_VENDOR_ID,
          RADIUS_ATTRIBUTES.MIKROTIK_RATE_LIMIT,
          Buffer.from(newRateLimit)
        );
        attributes.set(RADIUS_ATTRIBUTES.VENDOR_SPECIFIC, vendorAttr);
      }

      const packet = this.createPacket(RADIUS_CODES.COA_REQUEST, attributes);
      const response = await this.sendPacket(packet, COA_PORT);
      const parsed = this.parsePacket(response);

      if (parsed.code === RADIUS_CODES.COA_ACK) {
        console.log(`[RADIUS] CoA accepted for session ${sessionId}`);
        return { success: true, code: parsed.code, message: "CoA accepted" };
      } else if (parsed.code === RADIUS_CODES.COA_NAK) {
        console.log(`[RADIUS] CoA rejected for session ${sessionId}`);
        return { success: false, code: parsed.code, message: "CoA rejected by NAS" };
      }

      return { success: false, error: `Unexpected response code: ${parsed.code}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[RADIUS] CoA failed for session ${sessionId}:`, message);
      return { success: false, error: message };
    }
  }

  async disconnectUser(sessionId: string, username?: string): Promise<CoAResult> {
    console.log(`[RADIUS] Sending Disconnect-Request to ${this.nasIp} for session ${sessionId}`);
    
    try {
      const attributes = new Map<number, Buffer>();
      
      attributes.set(RADIUS_ATTRIBUTES.ACCT_SESSION_ID, Buffer.from(sessionId));
      attributes.set(RADIUS_ATTRIBUTES.NAS_IP_ADDRESS, this.encodeIpAddress(this.nasIp));
      
      if (username) {
        attributes.set(RADIUS_ATTRIBUTES.USER_NAME, Buffer.from(username));
      }

      const packet = this.createPacket(RADIUS_CODES.DISCONNECT_REQUEST, attributes);
      const response = await this.sendPacket(packet, COA_PORT);
      const parsed = this.parsePacket(response);

      if (parsed.code === RADIUS_CODES.DISCONNECT_ACK) {
        console.log(`[RADIUS] Disconnect successful for session ${sessionId}`);
        return { success: true, code: parsed.code, message: "User disconnected" };
      } else if (parsed.code === RADIUS_CODES.DISCONNECT_NAK) {
        console.log(`[RADIUS] Disconnect rejected for session ${sessionId}`);
        return { success: false, code: parsed.code, message: "Disconnect rejected by NAS" };
      }

      return { success: false, error: `Unexpected response code: ${parsed.code}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[RADIUS] Disconnect failed for session ${sessionId}:`, message);
      return { success: false, error: message };
    }
  }

  async updateSessionRateLimit(sessionId: string, plan: Plan): Promise<CoAResult> {
    const rateLimit = this.buildMikrotikRateLimit(plan);
    return this.sendCoA(sessionId, rateLimit);
  }

  private buildMikrotikRateLimit(plan: Plan): string {
    const upload = plan.uploadLimit || "1M";
    const download = plan.downloadLimit || "2M";
    
    if (plan.burstRateUp && plan.burstRateDown && plan.burstThreshold && plan.burstTime) {
      return `${upload}/${download} ${plan.burstRateUp}/${plan.burstRateDown} ${plan.burstThreshold}/${plan.burstThreshold} ${plan.burstTime}/${plan.burstTime}`;
    }
    
    return `${upload}/${download}`;
  }

  private encodeIpAddress(ip: string): Buffer {
    const parts = ip.split(".").map(Number);
    return Buffer.from(parts);
  }

  private encodeVendorSpecific(vendorId: number, attrType: number, value: Buffer): Buffer {
    const vendorAttrLength = 2 + value.length;
    const totalLength = 4 + vendorAttrLength;
    
    const buffer = Buffer.alloc(totalLength);
    buffer.writeUInt32BE(vendorId, 0);
    buffer.writeUInt8(attrType, 4);
    buffer.writeUInt8(vendorAttrLength, 5);
    value.copy(buffer, 6);
    
    return buffer;
  }

  static buildRadiusAttributes(user: WifiUser, plan: Plan | null): Record<string, string> {
    const attrs: Record<string, string> = {
      "Simultaneous-Use": String(plan?.simultaneousUse || 1),
    };

    if (plan) {
      const upload = plan.uploadLimit || "1M";
      const download = plan.downloadLimit || "2M";
      let rateLimit = `${upload}/${download}`;
      
      if (plan.burstRateUp && plan.burstRateDown && plan.burstThreshold && plan.burstTime) {
        rateLimit = `${upload}/${download} ${plan.burstRateUp}/${plan.burstRateDown} ${plan.burstThreshold}/${plan.burstThreshold} ${plan.burstTime}/${plan.burstTime}`;
      }
      
      attrs["Mikrotik-Rate-Limit"] = rateLimit;
      
      if (plan.durationSeconds) {
        attrs["Session-Timeout"] = String(plan.durationSeconds);
      }
    }

    if (user.accountType === "PPPOE") {
      attrs["Framed-Protocol"] = "PPP";
      attrs["Service-Type"] = "Framed-User";
    } else if (user.accountType === "STATIC" && user.ipAddress) {
      attrs["Framed-IP-Address"] = user.ipAddress;
      attrs["Service-Type"] = "Framed-User";
    }

    return attrs;
  }
}

export function createRadiusService(hotspot: Hotspot): RadiusService {
  return new RadiusService(hotspot);
}
