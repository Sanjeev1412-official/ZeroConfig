import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { authToken: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ token: user.authToken });
  } catch (e: any) {
    console.error("[GET /api/user/token] Error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const newToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: session.user.id },
      data: { authToken: newToken }
    });

    return NextResponse.json({ token: newToken });
  } catch (e: any) {
    console.error("[POST /api/user/token] Error regenerating token:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
