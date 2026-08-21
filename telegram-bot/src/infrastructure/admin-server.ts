import { createHash, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, resolve } from "node:path";
import type { AccessGrant } from "@domain";
import { DomainError, isNonEmptyString } from "@domain";
import type { AccessRepository, Logger, SubscriberRepository } from "@ports";

interface AdminServerOptions {
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly allowedOrigin: string | null;
  readonly access: AccessRepository;
  readonly subscribers: SubscriberRepository;
  readonly logger: Logger;
}

const MAX_BODY_BYTES = 16_384;

const json = (res: ServerResponse, status: number, value: unknown): void => {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
};

const safeEqual = (left: string, right: string): boolean => {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
};

const authenticated = (
  req: IncomingMessage,
  username: string,
  password: string,
): boolean => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Basic ")) return false;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    return (
      safeEqual(decoded.slice(0, separator), username) &&
      safeEqual(decoded.slice(separator + 1), password)
    );
  } catch {
    return false;
  }
};

const readBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("So'rov juda katta");
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
      json(res, 403, { error: "Bu manbadan so'rovga ruxsat yo'q" });
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
      json(res, 404, { error: "Admin panel build topilmadi" });
      return;
    }

    if (!authenticated(req, options.username, options.password)) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Logistic CRM"');
      json(res, 401, { error: "Login yoki parol noto'g'ri" });
      return;
    }

    try {
      if (req.method === "GET" && url.pathname === "/api/session") {
        json(res, 200, { username: options.username });
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
      if (req.method === "POST" && url.pathname === "/api/access") {
        const body = asObject(await readBody(req));
        const username = body.username;
        const phone = body.phone;
        if (!isNonEmptyString(username) || !isNonEmptyString(phone)) {
          json(res, 400, { error: "Username va telefonni to'g'ri kiriting" });
          return;
        }
        const grant = await access.add(username, phone);
        json(res, 201, { grant });
        return;
      }

      const match = url.pathname.match(/^\/api\/access\/([a-f\d]{24})$/i);
      if (match && req.method === "PATCH") {
        const body = asObject(await readBody(req));
        if (typeof body.enabled !== "boolean") {
          json(res, 400, { error: "enabled boolean bo'lishi kerak" });
          return;
        }
        const grant = await access.setEnabled(match[1] ?? "", body.enabled);
        if (!grant) {
          json(res, 404, { error: "Foydalanuvchi topilmadi" });
          return;
        }
        if (!grant.enabled) await stopIfRevoked(grant, access, subscribers);
        json(res, 200, { grant });
        return;
      }
      if (match && req.method === "DELETE") {
        const grant = await access.remove(match[1] ?? "");
        if (!grant) {
          json(res, 404, { error: "Foydalanuvchi topilmadi" });
          return;
        }
        await stopIfRevoked(grant, access, subscribers);
        json(res, 200, { ok: true });
        return;
      }

      json(res, 404, { error: "Endpoint topilmadi" });
    } catch (error) {
      const message = error instanceof DomainError || error instanceof SyntaxError
        ? error.message
        : "Server xatosi";
      if (!(error instanceof DomainError) && !(error instanceof SyntaxError)) {
        logger.error("Admin API xatosi", error);
      }
      json(res, error instanceof DomainError || error instanceof SyntaxError ? 400 : 500, {
        error: message,
      });
    }
  });

  server.listen(options.port, "0.0.0.0", () => {
    logger.success(`Admin API ishga tushdi: http://0.0.0.0:${options.port}`);
  });

  return () => new Promise((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose());
  });
};
