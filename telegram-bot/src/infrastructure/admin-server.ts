import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, resolve } from "node:path";
import type { AccessGrant } from "@domain";
import { AccessInputError, DomainError, isNonEmptyString } from "@domain";
import type { AccessRepository, Logger, SubscriberRepository } from "@ports";
import type { AdminCredentialStore, AdminSession } from "./admin-credential-store";

interface AdminServerOptions {
  readonly port: number;
  readonly credentials: AdminCredentialStore;
  readonly allowedOrigin: string | null;
  readonly access: AccessRepository;
  readonly subscribers: SubscriberRepository;
  readonly logger: Logger;
}

const MAX_BODY_BYTES = 16_384;

class AdminRequestError extends Error {
  constructor(
    readonly code: "request-too-large",
    message: string,
  ) {
    super(message);
  }
}

const json = (res: ServerResponse, status: number, value: unknown): void => {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
};

const errorJson = (
  res: ServerResponse,
  status: number,
  code: string,
  error: string,
): void => json(res, status, { code, error });

const authenticate = async (
  req: IncomingMessage,
  credentials: AdminCredentialStore,
): Promise<AdminSession | null> => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return credentials.authenticate(decoded.slice(0, separator), decoded.slice(separator + 1));
  } catch {
    return null;
  }
};

const readBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new AdminRequestError("request-too-large", "So'rov hajmi juda katta");
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
};

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const stopIfRevoked = async (
  grant: AccessGrant,
  access: AccessRepository,
  subscribers: SubscriberRepository,
): Promise<void> => {
  if (grant.linkedUserId === null) return;
  if (await access.isAuthorized(grant.linkedUserId, grant.linkedUsername)) return;
  const subscriber = await subscribers.find(grant.linkedUserId);
  if (!subscriber) return;
  await subscribers.update(grant.linkedUserId, {
    active: false,
    state: "idle",
    nextRunAt: null,
  });
};

const mime = (file: string): string => {
  switch (extname(file)) {
    case ".html": return "text/html; charset=utf-8";
    case ".js": return "text/javascript; charset=utf-8";
    case ".css": return "text/css; charset=utf-8";
    case ".svg": return "image/svg+xml";
    case ".png": return "image/png";
    default: return "application/octet-stream";
  }
};

const findAdminDist = (): string | null => {
  const candidates = [
    resolve(process.cwd(), "../admin/dist"),
    resolve(process.cwd(), "admin/dist"),
  ];
  return candidates.find((candidate) => existsSync(join(candidate, "index.html"))) ?? null;
};

const serveStatic = (req: IncomingMessage, res: ServerResponse, root: string): boolean => {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const rawPath = new URL(req.url ?? "/", "http://localhost").pathname;
  const requested = rawPath === "/" ? "index.html" : rawPath.slice(1);
  let file = resolve(root, requested);
  if (!file.startsWith(`${root}/`) && file !== root) return false;
  if (!existsSync(file) || !statSync(file).isFile()) file = join(root, "index.html");
  const stat = statSync(file);
  res.writeHead(200, {
    "Content-Type": mime(file),
    "Content-Length": stat.size,
    "Cache-Control": file.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
  });
  if (req.method === "HEAD") res.end();
  else createReadStream(file).pipe(res);
  return true;
};

export const startAdminServer = (options: AdminServerOptions): (() => Promise<void>) => {
  const { access, subscribers, logger } = options;
  const staticRoot = findAdminDist();

  const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && options.allowedOrigin && origin !== options.allowedOrigin) {
      errorJson(res, 403, "origin-forbidden", "Bu manbadan so'rovga ruxsat yo'q");
      return;
    }
    if (options.allowedOrigin && origin === options.allowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(!origin || !options.allowedOrigin || origin === options.allowedOrigin ? 204 : 403).end();
      return;
    }

    const url = new URL(req.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith("/api/")) {
      if (staticRoot && serveStatic(req, res, staticRoot)) return;
      errorJson(res, 404, "admin-build-missing", "Admin panel build topilmadi");
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      json(res, 200, { status: "ok" });
      return;
    }

    const adminSession = await authenticate(req, options.credentials);
    if (!adminSession) {
      errorJson(res, 401, "invalid-credentials", "Login yoki parol noto'g'ri");
      return;
    }

    try {
      if (req.method === "GET" && url.pathname === "/api/session") {
        json(res, 200, adminSession);
        return;
      }
      if (req.method === "PATCH" && url.pathname === "/api/profile") {
        const body = asObject(await readBody(req));
        const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
        const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
        const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
          errorJson(res, 400, "invalid-admin-username", "To'g'ri email manzil kiriting");
          return;
        }
        if (newPassword.length < 8) {
          errorJson(res, 400, "weak-password", "Yangi parol kamida 8 belgidan iborat bo'lishi kerak");
          return;
        }
        if (!(await options.credentials.authenticate(adminSession.username, currentPassword))) {
          errorJson(res, 400, "invalid-current-password", "Joriy parol noto'g'ri");
          return;
        }
        json(res, 200, await options.credentials.update(username, newPassword));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/access") {
        json(res, 200, { grants: await access.list() });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/stats") {
        const grants = await access.list();
        json(res, 200, {
          total: grants.length,
          active: grants.filter((grant) => grant.enabled).length,
          linked: grants.filter((grant) => grant.linkedUserId !== null).length,
          subscribers: await subscribers.countAll(),
        });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/analytics") {
        json(res, 200, await access.analytics());
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/access") {
        const body = asObject(await readBody(req));
        const username = typeof body.username === "string" && body.username.trim() !== ""
          ? body.username
          : null;
        const phone = body.phone;
        const fullName = body.fullName;
        if (!isNonEmptyString(phone) || !isNonEmptyString(fullName)) {
          errorJson(res, 400, "missing-fields", "Ism-familiya va telefon raqamini to'g'ri kiriting");
          return;
        }
        const grant = await access.add(username, phone, fullName);
        json(res, 201, { grant });
        return;
      }

      const match = url.pathname.match(/^\/api\/access\/([a-f\d]{24})$/i);
      if (match && req.method === "PATCH") {
        const body = asObject(await readBody(req));
        if (typeof body.fullName === "string") {
          const grant = await access.updateFullName(match[1] ?? "", body.fullName);
          if (!grant) {
            errorJson(res, 404, "access-not-found", "Foydalanuvchi topilmadi");
            return;
          }
          json(res, 200, { grant });
          return;
        }
        if (typeof body.enabled !== "boolean") {
          errorJson(res, 400, "invalid-enabled", "enabled boolean bo'lishi kerak");
          return;
        }
        const grant = await access.setEnabled(match[1] ?? "", body.enabled);
        if (!grant) {
          errorJson(res, 404, "access-not-found", "Foydalanuvchi topilmadi");
          return;
        }
        if (!grant.enabled) await stopIfRevoked(grant, access, subscribers);
        json(res, 200, { grant });
        return;
      }
      if (match && req.method === "DELETE") {
        const grant = await access.remove(match[1] ?? "");
        if (!grant) {
          errorJson(res, 404, "access-not-found", "Foydalanuvchi topilmadi");
          return;
        }
        await stopIfRevoked(grant, access, subscribers);
        json(res, 200, { ok: true });
        return;
      }

      errorJson(res, 404, "endpoint-not-found", "Endpoint topilmadi");
    } catch (error) {
      if (error instanceof AccessInputError) {
        errorJson(res, 400, error.code, error.message);
        return;
      }
      if (error instanceof AdminRequestError) {
        errorJson(res, 413, error.code, error.message);
        return;
      }
      if (error instanceof SyntaxError) {
        errorJson(res, 400, "invalid-json", "So'rov ma'lumoti noto'g'ri formatda");
        return;
      }
      if (error instanceof DomainError) {
        errorJson(res, 400, "validation-error", error.message);
        return;
      }
      const mongoCode = typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
      if (mongoCode === 11000) {
        errorJson(res, 409, "duplicate-access", "Username yoki telefon allaqachon mavjud");
        return;
      }
      logger.error("Admin API xatosi", error);
      errorJson(res, 500, "server-error", "Server xatosi");
    }
  });

  server.listen(options.port, "0.0.0.0", () => {
    logger.success(`Admin API ishga tushdi: http://0.0.0.0:${options.port}`);
  });

  return () => new Promise((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose());
  });
};
