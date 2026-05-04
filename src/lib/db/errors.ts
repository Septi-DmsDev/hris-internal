const DB_CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ETIMEDOUT",
  "ECONNRESET",
]);

const DB_CONNECTION_ERROR_PATTERNS = [
  "connect econnrefused",
  "getaddrinfo enotfound",
  "connect etimedout",
  "connection terminated unexpectedly",
  "write econnreset",
  "connection refused",
];

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const code =
    "code" in error && typeof error.code === "string"
      ? error.code
      : "cause" in error &&
          error.cause &&
          typeof error.cause === "object" &&
          "code" in error.cause &&
          typeof error.cause.code === "string"
        ? error.cause.code
        : null;

  return code;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.toLowerCase();
  return "";
}

export function isDatabaseConnectionError(error: unknown) {
  const code = getErrorCode(error);
  if (code && DB_CONNECTION_ERROR_CODES.has(code)) return true;

  const message = getErrorMessage(error);
  return DB_CONNECTION_ERROR_PATTERNS.some((pattern) =>
    message.includes(pattern),
  );
}

export function getDatabaseTargetLabel(url = process.env.DATABASE_URL) {
  if (!url) return "database server";

  try {
    const parsed = new URL(url);
    return parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
  } catch {
    return "database server";
  }
}

export function isLocalDatabaseTarget(url = process.env.DATABASE_URL) {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}
