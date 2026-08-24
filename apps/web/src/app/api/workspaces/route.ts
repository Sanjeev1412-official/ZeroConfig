import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await prisma.workspace.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(workspaces);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error("[POST /api/workspaces] Failed to parse request body:", parseErr);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { clientId, name } = body;

    if (!clientId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
      const workspace = await prisma.workspace.create({
        data: {
          clientId,
          name,
          userId: session.user.id
        }
      });

      return NextResponse.json(workspace);
    } catch (e: any) {
      console.error("[POST /api/workspaces] Prisma error:", e);
      if (e.code === 'P2002') {
        return NextResponse.json({ error: "Workspace ID already taken" }, { status: 409 });
      }
      return NextResponse.json({ error: e.message || "Database error" }, { status: 500 });
    }
  } catch (e: any) {
    console.error("[POST /api/workspaces] Unhandled error:", e);
    return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("id");

  if (!workspaceId) {
    return NextResponse.json({ error: "Missing workspace ID" }, { status: 400 });
  }

  // Verify ownership before deleting
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId: session.user.id }
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
  }

  await prisma.workspace.delete({ where: { id: workspaceId } });

  return NextResponse.json({ success: true });
}

