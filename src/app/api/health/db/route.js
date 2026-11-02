import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma.js";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      success: true,
      message: "Prisma connected to Neon successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Database connection failed" },
      { status: 500 }
    );
  }
}