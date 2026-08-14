import { AdminHeading, Panel } from "@/components/admin/ui";
import { CouponManager } from "@/components/admin/coupon-manager";
import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";

export const metadata = { title: "Coupons" };

export default async function AdminCouponsPage() {
  await requireArea("coupons");

  const coupons = await db.coupon.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      code: true,
      description: true,
      type: true,
      value: true,
      minOrderPaise: true,
      maxDiscountPaise: true,
      startsAt: true,
      endsAt: true,
      usageLimit: true,
      usageCount: true,
      perCustomerLimit: true,
      isActive: true,
      _count: { select: { usages: true } },
    },
  });

  return (
    <>
      <AdminHeading
        title="Coupons"
        description="Codes are validated again at checkout, so a coupon that expires or runs out mid-session is caught before payment."
      />

      <Panel>
        <CouponManager
          coupons={coupons.map((coupon) => ({
            ...coupon,
            startsAt: coupon.startsAt?.toISOString() ?? null,
            endsAt: coupon.endsAt?.toISOString() ?? null,
          }))}
        />
      </Panel>
    </>
  );
}
