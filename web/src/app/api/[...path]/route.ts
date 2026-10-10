/**
 * Everything under /api is the Python engine, forwarded.
 *
 * The browser only ever talks to this origin, so the session cookie the
 * service sets can stay `httpOnly` and same-site — neither of which survives
 * a fetch to a different port. It also means there is no CORS to configure and
 * no API URL baked into the client bundle.
 */

import { NextRequest, NextResponse } from "next/server";

const ENGINE = process.env.OUTFITTER_API_URL ?? "http://127.0.0.1:8000";

/** Hop-by-hop headers belong to this connection, not the next one. */
const STRIP = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
]);

async function proxy(request: NextRequest, path: string[]) {
  const target = new URL(`${ENGINE}/${path.join("/")}`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIP.has(key.toLowerCase())) headers.set(key, value);
  });

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      // GET and HEAD have no body, and passing one is a TypeError.
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
      cache: "no-store",
      // Required by undici whenever a stream is the body.
      // @ts-expect-error -- not in the DOM lib, honoured by Node's fetch.
      duplex: "half",
    });
  } catch {
    return NextResponse.json(
      {
        detail:
          "The Outfitter engine is not running. Start it with `uvicorn main:app --port 8000` in api/.",
      },
      { status: 503 },
    );
  }

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });
  upstream.headers.forEach((value, key) => {
    if (STRIP.has(key.toLowerCase())) return;
    // set-cookie must be appended: a session cookie and a cleared one can
    // arrive together, and Headers.set would keep only the last.
    if (key.toLowerCase() === "set-cookie") response.headers.append(key, value);
    else response.headers.set(key, value);
  });
  return response;
}

type Context = { params: Promise<{ path: string[] }> };

const handler = async (request: NextRequest, context: Context) =>
  proxy(request, (await context.params).path);

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;

// The engine is stateful and per-person; nothing here may be cached or
// prerendered.
export const dynamic = "force-dynamic";
