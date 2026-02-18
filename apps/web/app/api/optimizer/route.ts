import { NextResponse } from "next/server";
import { optimizeBudget } from "@ims/algorithms";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = optimizeBudget(body);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to optimize", error: (error as Error).message },
      { status: 400 }
    );
  }
}
