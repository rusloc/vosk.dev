import Link from "next/link";
import type { MDXComponents } from "mdx/types";
import { WorkflowDiagram } from "@/components/workflow-diagram";
import { BiStackDiagram } from "@/components/bi-stack-diagram";
import { ReportEmbed } from "@/components/report-embed";
import { EmailReportPreview } from "@/components/email-report-preview";

/**
 * Element map for rendered MDX, styled to the cream theme. Code blocks are
 * highlighted by rehype-pretty-code (shiki) and kept in <pre>; inline code is
 * styled via the `.mdx` rule in globals.css. Heading anchors (rehype-autolink-
 * headings, behavior "wrap") get the `heading-anchor` class and render plain.
 */
export const mdxComponents: MDXComponents = {
  // Custom blocks usable directly in MDX: <WorkflowDiagram />, <ReportEmbed … />
  WorkflowDiagram,
  BiStackDiagram,
  ReportEmbed,
  EmailReportPreview,
  h2: (props) => (
    <h2
      className="mt-10 mb-4 scroll-mt-24 text-2xl font-semibold tracking-tight"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="mt-8 mb-3 scroll-mt-24 text-xl font-semibold tracking-tight"
      {...props}
    />
  ),
  h4: (props) => (
    <h4 className="mt-6 mb-2 scroll-mt-24 text-lg font-semibold" {...props} />
  ),
  p: (props) => <p className="my-4 leading-7" {...props} />,
  ul: (props) => <ul className="my-4 list-disc space-y-1 pl-6" {...props} />,
  ol: (props) => <ol className="my-4 list-decimal space-y-1 pl-6" {...props} />,
  li: (props) => <li className="leading-7" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="border-primary text-muted-foreground my-6 border-l-4 pl-4 italic"
      {...props}
    />
  ),
  hr: (props) => <hr className="border-border my-10" {...props} />,
  pre: (props) => (
    <pre
      className="border-border my-6 overflow-x-auto rounded-lg border p-4 text-sm"
      {...props}
    />
  ),
  a: ({ href = "", className, children, ...props }) => {
    // Heading self-link from rehype-autolink-headings — inherit color, no underline.
    if (typeof className === "string" && className.includes("heading-anchor")) {
      return (
        <a href={href} className="text-inherit no-underline" {...props}>
          {children}
        </a>
      );
    }
    const linkClass =
      "text-primary underline underline-offset-2 hover:opacity-80";
    if (href.startsWith("/") || href.startsWith("#")) {
      return (
        <Link href={href} className={linkClass} {...props}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        {...props}
      >
        {children}
      </a>
    );
  },
  // Plain <img>: MDX markdown images carry no intrinsic dimensions, so next/image
  // isn't a fit here.
  img: ({ src = "", alt = "" }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === "string" ? src : ""}
      alt={alt as string}
      loading="lazy"
      className="border-border my-6 rounded-lg border"
    />
  ),
};
