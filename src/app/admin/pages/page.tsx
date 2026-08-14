import { AdminHeading, Panel } from "@/components/admin/ui";
import { PagesEditor } from "@/components/admin/pages-editor";
import { Alert } from "@/components/ui/primitives";
import { requireArea } from "@/server/auth";
import { PAGE_DEFINITIONS, getAllStaticPages } from "@/server/pages";

export const metadata = { title: "Pages" };

export default async function AdminPagesPage() {
  await requireArea("seo");

  const pages = await getAllStaticPages();
  const unwritten = pages.filter((page) => !page.body);

  return (
    <>
      <AdminHeading
        title="Pages"
        description="About, Contact, Care Guide and the four policy pages. The FAQ page is built from the FAQ list instead."
      />

      {unwritten.length > 0 ? (
        <Alert
          variant="warning"
          title={`${unwritten.length} page${unwritten.length === 1 ? " is" : "s are"} still empty`}
          className="mb-6"
        >
          <p>
            They are linked from the footer, so customers can reach them. Until
            each has content it shows an outline of what it should cover and is
            excluded from search engines.
          </p>
          <p className="mt-2">
            <strong>
              Have a lawyer review the privacy policy, terms, shipping policy
              and return policy before you take real orders.
            </strong>{" "}
            These are legally operative documents and nothing has been written
            for you.
          </p>
        </Alert>
      ) : null}

      <Panel>
        <PagesEditor
          pages={pages.map((page) => ({
            ...page,
            prompts: PAGE_DEFINITIONS[page.slug].prompts,
          }))}
        />
      </Panel>
    </>
  );
}
