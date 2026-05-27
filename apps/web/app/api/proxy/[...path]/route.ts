import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_ACCESS } from "@/lib/auth/cookies";
import { getApiBaseUrl } from "@/lib/api-url";

async function proxyRequest(request: NextRequest, method: string) {
  const jar = await cookies();
  const access = jar.get(COOKIE_ACCESS)?.value;
  const api = getApiBaseUrl();

  const segments = request.nextUrl.pathname.replace(/^\/api\/proxy\//, "");
  const targetUrl = new URL(`${api}/${segments}`);
  request.nextUrl.searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v));

  const headers: Record<string, string> = {};
  if (access) {
    headers["Authorization"] = `Bearer ${access}`;
  }

  const fetchOptions: RequestInit = { method, headers, cache: "no-store" };

  if (method !== "GET" && method !== "HEAD") {
    try {
      const body = await request.text();
      if (body) {
        fetchOptions.body = body;
        headers["Content-Type"] = "application/json";
      }
    } catch {
      // no body
    }
  }

  try {
    const upstream = await fetch(targetUrl.toString(), fetchOptions);
    const data = await upstream.text();

    return new NextResponse(data, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "API proxy error", error: (error as Error).message },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  return proxyRequest(request, "GET");
}
export async function POST(request: NextRequest) {
  return proxyRequest(request, "POST");
}
export async function PUT(request: NextRequest) {
  return proxyRequest(request, "PUT");
}
export async function PATCH(request: NextRequest) {
  return proxyRequest(request, "PATCH");
}
export async function DELETE(request: NextRequest) {
  return proxyRequest(request, "DELETE");
}
