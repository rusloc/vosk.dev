"use client";

import {
  MARKETING_SUGGESTIONS,
  MIRELO_SUGGESTIONS,
  NORDMARK_SUGGESTIONS,
  PNL_SUGGESTIONS,
  TRUCKS_SUGGESTIONS,
  askAiTriggerCompact,
} from "@/components/chat/ask-ai";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ReportDialog } from "@/components/report-dialog";

const SUGGESTIONS = {
  mirelo: MIRELO_SUGGESTIONS,
  marketing: MARKETING_SUGGESTIONS,
  pnl: PNL_SUGGESTIONS,
  trucks: TRUCKS_SUGGESTIONS,
  nordmark: NORDMARK_SUGGESTIONS,
} as const;

/**
 * A report's Ask AI button in its own header and the chat it opens (ADR-0005). The chat asks about what the visitor is
 * looking at (`state`, the report's query string); a figures card's link applies its state here (`onOpenReport`), then
 * the chat closes. Mirelo keeps the default compact trigger; every other report has its own (`askAiTriggerCompact`).
 */
export function ReportChat({
  report,
  state,
  defaultOpen,
  onOpenReport,
}: {
  report: keyof typeof SUGGESTIONS;
  state: string;
  /** Open at once: the page's Ask AI opened the report (11-06). */
  defaultOpen: boolean;
  onOpenReport: (link: string) => void;
}) {
  return (
    <ReportDialog
      label="Ask AI"
      title="AI assistant"
      closeLabel="Close the assistant"
      trigger={askAiTriggerCompact(
        "Ask AI",
        report === "mirelo" ? undefined : report,
      )}
      size="panel"
      defaultOpen={defaultOpen}
    >
      {(close) => (
        <ChatPanel
          endpoint={`/api/chat/${report}`}
          suggestions={SUGGESTIONS[report]}
          state={state}
          onOpenReport={(link) => {
            onOpenReport(link);
            close();
          }}
        />
      )}
    </ReportDialog>
  );
}
