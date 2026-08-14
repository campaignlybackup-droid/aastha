import Link from "next/link";

import {
  AdminHeading,
  AdminPagination,
  EmptyRow,
  Panel,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/ui";
import { CustomerActions } from "@/components/admin/customer-actions";
import { Badge } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { formatDate, formatMobile } from "@/lib/utils";
import { requireArea } from "@/server/auth";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Customers" };

const PER_PAGE = 25;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; staff?: string }>;
}) {
  const staffUser = await requireArea("customers");
  const params = await searchParams;

  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const staffOnly = params.staff === "1";

  const where: Prisma.UserWhereInput = {
    ...(staffOnly ? { role: { not: "CUSTOMER" } } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { mobile: { contains: query.replace(/\D/g, "") } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { orders: true } },
        orders: {
          where: { status: "CONFIRMED" },
          select: { totalPaise: true },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  const hrefFor = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = {
      q: query,
      page: String(page),
      staff: staffOnly ? "1" : "",
      ...overrides,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value && !(key === "page" && value === "1")) next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  };

  return (
    <>
      <AdminHeading
        title="Customers"
        description={`${total} ${total === 1 ? "account" : "accounts"}`}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <nav aria-label="Filter" className="flex gap-1.5">
          <Link
            href={hrefFor({ staff: "", page: "1" })}
            aria-current={!staffOnly ? "page" : undefined}
            className={
              !staffOnly
                ? "rounded-xs bg-brand-800 px-3 py-1.5 text-xs text-sand-50"
                : "rounded-xs border border-line-strong px-3 py-1.5 text-xs text-content-muted hover:border-[var(--color-accent)]"
            }
          >
            Everyone
          </Link>
          <Link
            href={hrefFor({ staff: "1", page: "1" })}
            aria-current={staffOnly ? "page" : undefined}
            className={
              staffOnly
                ? "rounded-xs bg-brand-800 px-3 py-1.5 text-xs text-sand-50"
                : "rounded-xs border border-line-strong px-3 py-1.5 text-xs text-content-muted hover:border-[var(--color-accent)]"
            }
          >
            Staff only
          </Link>
        </nav>

        <form method="GET" action="/admin/customers" className="ml-auto flex gap-2">
          {staffOnly ? <input type="hidden" name="staff" value="1" /> : null}
          <label htmlFor="customer-search" className="sr-only">
            Search customers
          </label>
          <input
            id="customer-search"
            name="q"
            defaultValue={query}
            placeholder="Name, mobile or email"
            className="h-9 w-60 rounded-sm border border-line-strong bg-surface-raised px-3 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="submit"
            className="rounded-sm border border-line-strong px-3 text-xs hover:border-[var(--color-accent)]"
          >
            Search
          </button>
        </form>
      </div>

      <Panel>
        <TableWrap>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Joined</Th>
              <Th align="right">Orders</Th>
              <Th align="right">Spent</Th>
              <Th>Role</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <EmptyRow
                colSpan={6}
                message={query ? `Nobody matches “${query}”.` : "No accounts yet."}
              />
            ) : (
              users.map((user) => {
                const spent = user.orders.reduce((sum, o) => sum + o.totalPaise, 0);

                return (
                  <tr key={user.id} className="hover:bg-sand-50">
                    <Td>
                      <span className="block">
                        {user.name ?? <span className="text-content-subtle">No name</span>}
                        {user.status === "BLOCKED" ? (
                          <Badge variant="danger" className="ml-2">
                            Blocked
                          </Badge>
                        ) : null}
                      </span>
                      <span className="block text-xs text-content-subtle">
                        {formatMobile(user.mobile)}
                        {user.email ? ` · ${user.email}` : ""}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-content-muted">
                      {formatDate(user.createdAt)}
                      <span className="block text-content-subtle">
                        {user.lastLoginAt
                          ? `Last seen ${formatDate(user.lastLoginAt)}`
                          : "Never signed in"}
                      </span>
                    </Td>
                    <Td align="right">{user._count.orders}</Td>
                    <Td align="right" className="whitespace-nowrap">
                      {spent > 0 ? formatPrice(spent) : "—"}
                    </Td>
                    <Td>
                      <span className="text-xs text-content-muted">
                        {user.role.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </Td>
                    <Td align="right">
                      <CustomerActions
                        userId={user.id}
                        role={user.role}
                        status={user.status}
                        isSelf={user.id === staffUser.id}
                        canManageRoles={staffUser.role === "SUPER_ADMIN"}
                      />
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </TableWrap>

        <AdminPagination
          page={page}
          pageCount={pageCount}
          buildHref={(p) => hrefFor({ page: String(p) })}
        />
      </Panel>
    </>
  );
}
