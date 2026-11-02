
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../auth.js";
import { prisma } from "../../../lib/prisma.js";

const measurementUnits = {
  WEIGHT: "kg",
  HEIGHT: "cm",
  WAIST: "cm",
  HIPS: "cm",
  CHEST: "cm",
  ARM: "cm",
  THIGH: "cm",
  BODY_FAT: "%",
};

const measurementTypes = [
  "WEIGHT",
  "HEIGHT",
  "WAIST",
  "HIPS",
  "CHEST",
  "ARM",
  "THIGH",
  "BODY_FAT",
];

const measurementSchema = z.object({
  type: z.enum(measurementTypes),
  value: z.number().positive().finite(),
  recordedAt: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

// GET: Retrieve the signed-in user's measurement history
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const measurements = await prisma.bodyMeasurement.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    return NextResponse.json({
      measurements: measurements.map((measurement) => ({
        ...measurement,
        value: Number(measurement.value),
      })),
    });
  } catch (error) {
    console.error("GET body measurements error:", error);

    return NextResponse.json(
      { message: "Could not retrieve measurements." },
      { status: 500 }
    );
  }
}

// POST: Save a new body measurement
export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = measurementSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Please provide a valid measurement.",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { type, value, recordedAt, notes } = validation.data;

    const date = recordedAt ? new Date(recordedAt) : new Date();

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { message: "Please provide a valid measurement date." },
        { status: 400 }
      );
    }

    const measurement = await prisma.bodyMeasurement.create({
      data: {
        userId: session.user.id,
        type,
        value,
        unit: measurementUnits[type],
        recordedAt: date,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json(
      {
        message: "Measurement saved successfully.",
        measurement: {
          ...measurement,
          value: Number(measurement.value),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST body measurement error:", error);

    return NextResponse.json(
      { message: "Could not save your measurement." },
      { status: 500 }
    );
  }
}

// PATCH: Edit an existing body measurement
export async function PATCH(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const validation = z.object({
      id: z.string().min(1),
      ...measurementSchema.shape,
    }).safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Please provide valid measurement details." },
        { status: 400 }
      );
    }

    const { id, type, value, recordedAt, notes } = validation.data;

    const date = recordedAt ? new Date(recordedAt) : new Date();

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { message: "Please provide a valid measurement date." },
        { status: 400 }
      );
    }

    const result = await prisma.bodyMeasurement.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data: {
        type,
        value,
        unit: measurementUnits[type],
        recordedAt: date,
        notes: notes?.trim() || null,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { message: "Measurement not found." },
        { status: 404 }
      );
    }

    const measurement = await prisma.bodyMeasurement.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      message: "Measurement updated successfully.",
      measurement: {
        ...measurement,
        value: Number(measurement.value),
      },
    });
  } catch (error) {
    console.error("PATCH body measurements error:", error);

    return NextResponse.json(
      { message: "Could not update your measurement." },
      { status: 500 }
    );
  }
}
// DELETE: Remove an existing body measurement
export async function DELETE(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const validation = z.object({
      id: z.string().min(1),
    }).safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "A valid measurement ID is required." },
        { status: 400 }
      );
    }

    const result = await prisma.bodyMeasurement.deleteMany({
      where: {
        id: validation.data.id,
        userId: session.user.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { message: "Measurement not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Measurement deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE body measurements error:", error);

    return NextResponse.json(
      { message: "Could not delete your measurement." },
      { status: 500 }
    );
  }
}