"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/server/auth";
import { normaliseMobile } from "@/lib/utils";

/**
 * Profile and address book mutations.
 *
 * Every action re-reads the session and scopes its query by `userId`. Passing
 * an address id belonging to someone else finds nothing rather than editing
 * their record — ownership is enforced in the WHERE clause, never assumed.
 */

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  name: z.string().trim().min(2, "Enter a name").max(80),
  mobile: z.string().trim().min(6).max(20),
  line1: z.string().trim().min(4, "Enter the address").max(160),
  line2: z.string().trim().max(160).optional(),
  landmark: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, "Enter a city").max(80),
  state: z.string().trim().min(2, "Select a state").max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code"),
  country: z.string().trim().max(60).default("India"),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.input<typeof addressSchema>;

export async function saveAddress(
  input: AddressInput & { id?: string },
): Promise<ActionResult & { addressId?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the address.",
    };
  }

  const mobile = normaliseMobile(parsed.data.mobile);
  if (!mobile) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }

  const data = { ...parsed.data, mobile, userId: user.id };

  // Exactly one default. Clearing the others first keeps that invariant even
  // if two tabs save at once — the last write wins, and it is still one.
  if (data.isDefault) {
    await db.address.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  let addressId: string;

  if (input.id) {
    const existing = await db.address.findFirst({
      where: { id: input.id, userId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "That address no longer exists." };

    await db.address.update({ where: { id: existing.id }, data });
    addressId = existing.id;
  } else {
    // The first address a customer saves becomes their default automatically.
    const count = await db.address.count({
      where: { userId: user.id, deletedAt: null },
    });
    const created = await db.address.create({
      data: { ...data, isDefault: data.isDefault || count === 0 },
    });
    addressId = created.id;
  }

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");

  return { ok: true, addressId, message: "Address saved." };
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const address = await db.address.findFirst({
    where: { id, userId: user.id, deletedAt: null },
    select: { id: true, isDefault: true },
  });
  if (!address) return { ok: false, error: "That address no longer exists." };

  // Soft delete: past orders snapshot their address, but keeping the row keeps
  // any future reference intact rather than dangling.
  await db.address.update({
    where: { id: address.id },
    data: { deletedAt: new Date(), isDefault: false },
  });

  // Promote another address so the customer always has a default.
  if (address.isDefault) {
    const next = await db.address.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (next) {
      await db.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");

  return { ok: true, message: "Address removed." };
}

export async function setDefaultAddress(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const address = await db.address.findFirst({
    where: { id, userId: user.id, deletedAt: null },
    select: { id: true },
  });
  if (!address) return { ok: false, error: "That address no longer exists." };

  await db.$transaction([
    db.address.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    }),
    db.address.update({
      where: { id: address.id },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");

  return { ok: true, message: "Default address updated." };
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.email("Enter a valid email").max(180).optional().or(z.literal("")),
  marketingOptIn: z.boolean().default(false),
});

export async function updateProfile(
  input: z.input<typeof profileSchema>,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check your details.",
    };
  }

  const email = parsed.data.email?.toLowerCase().trim() || null;

  // The unique constraint would throw a raw Prisma error; catch it here and
  // say something a customer can act on.
  if (email && email !== user.email) {
    const taken = await db.user.findFirst({
      where: { email, id: { not: user.id } },
      select: { id: true },
    });
    if (taken) {
      return { ok: false, error: "That email is already on another account." };
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      email,
      marketingOptIn: parsed.data.marketingOptIn,
      // Changing the address invalidates any prior verification.
      ...(email !== user.email ? { emailVerifiedAt: null } : {}),
    },
  });

  revalidatePath("/account");

  return { ok: true, message: "Profile updated." };
}

export async function toggleWishlist(
  productId: string,
): Promise<ActionResult & { inWishlist?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save pieces." };

  const existing = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
    select: { id: true },
  });

  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/account/wishlist");
    return { ok: true, inWishlist: false, message: "Removed from wishlist." };
  }

  await db.wishlistItem.create({ data: { userId: user.id, productId } });
  revalidatePath("/account/wishlist");
  return { ok: true, inWishlist: true, message: "Saved to your wishlist." };
}
