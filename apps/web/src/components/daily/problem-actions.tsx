"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Send } from "lucide-react";
import { toast } from "sonner";
import { Button, inputClasses } from "@upsolve/ui";
import { addProblemsToPlan, shareProblem } from "@/app/actions/daily";
import { Modal } from "@/components/fx/overlay";
import { Select } from "@/components/fx/select";

/** "Add to today" and "Share with a group" on a problem page. */
export function ProblemActions({
  problemId,
  title,
  groups,
}: {
  problemId: string;
  title: string;
  groups: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(groups[0]?.id ?? "");
  const [note, setNote] = useState("");

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        loading={pending && !open}
        onClick={() =>
          start(async () => {
            const res = await addProblemsToPlan([problemId], "custom");
            if (res.ok) toast.success("Added to today");
            else toast.error(res.error);
          })
        }
      >
        <CalendarPlus size={14} aria-hidden="true" /> Add to today
      </Button>
      {groups.length > 0 && (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Send size={14} aria-hidden="true" /> Share
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          <>
            Solve this <em className="font-display font-normal">together.</em>
          </>
        }
        description={`Send "${title}" to a group. It lands on their Today plan, and you'll see everyone's time and verdicts on the group page.`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await shareProblem(group, problemId, note || null);
              if (res.ok) {
                toast.success("Shared with the group");
                setOpen(false);
                setNote("");
              } else toast.error(res.error);
            });
          }}
          className="flex flex-col gap-3"
        >
          <Select
            label="Group"
            value={group}
            onChange={setGroup}
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
            placeholder="Add a note (optional), e.g. 'bet you can't do it in 20 min'"
            aria-label="Note"
            className={inputClasses()}
          />
          <Button
            type="submit"
            variant="signal"
            loading={pending}
            disabled={!group}
            className="self-end"
          >
            <Send size={14} aria-hidden="true" /> Share
          </Button>
        </form>
      </Modal>
    </>
  );
}
