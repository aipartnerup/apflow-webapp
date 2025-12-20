/**
 * Layout for task detail page
 * 
 * This layout file allows us to export generateStaticParams
 * for static export compatibility
 */

export async function generateStaticParams() {
  // Return a placeholder path for static export
  // All actual task detail pages will be handled by client-side routing
  // This ensures Next.js can generate at least one static page for the route
  return [{ id: 'placeholder' }];
}

export default function TaskDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

