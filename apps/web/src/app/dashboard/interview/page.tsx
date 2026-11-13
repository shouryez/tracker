import type { Metadata } from "next";
import { InterviewRoom } from "@/components/interview/room";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Mock interview" };

/**
 * Mock interview mode (FEATURES-PLAN F1): pick a round, get a hidden set drawn from your
 * sheets and weakest topics, run it on the clock, read the scorecard.
 */
export default function InterviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Mock interview · the clock is the point"
        title={
          <>
            Pressure, <em>on purpose</em>
          </>
        }
        subtitle="A set you haven't solved, drawn from your sheets and weakest topics. The extension times every problem; the scorecard tells you what an interviewer would."
      />
      <InterviewRoom />
    </div>
  );
}
