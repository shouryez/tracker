"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Field, SegmentedControl, SwitchField } from "@upsolve/ui";
import { burst, burstFrom } from "@/components/dashboard/celebrate";
import { DateRangePicker } from "@/components/fx/date-range";
import { NumberTicker } from "@/components/fx/number-ticker";
import { HoldToConfirm, Modal } from "@/components/fx/overlay";
import { Select } from "@/components/fx/select";
import { AnimatedCheckbox, StarToggle } from "@/components/fx/toggles";

// Dev-only interactive demos for /styleguide. Sample data only.

export function SwitchDemo() {
  const [on, setOn] = useState(true);
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <SwitchField
        title="Weekly email"
        description="A Sunday summary of what you solved and what's due."
        checked={on}
        onCheckedChange={setOn}
      />
      <SwitchField
        title="Disabled"
        description="Shown when a setting is locked."
        checked={false}
        onCheckedChange={() => {}}
        disabled
      />
    </div>
  );
}

export function ToastDemo() {
  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => toast.success("Marked done", { description: "Two Sum" })}
      >
        Success toast
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => toast.error("Couldn't save. Try again.")}
      >
        Error toast
      </Button>
      <Button variant="secondary" size="sm" onClick={() => toast("Synced LeetCode")}>
        Info toast
      </Button>
    </>
  );
}

export function ButtonStatesDemo() {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  return (
    <Button
      variant="secondary"
      loading={state === "loading"}
      done={state === "done"}
      onClick={() => {
        setState("loading");
        setTimeout(() => setState("done"), 1100);
        setTimeout(() => setState("idle"), 2400);
      }}
    >
      Save changes
    </Button>
  );
}

export function SegmentedDemo() {
  const [range, setRange] = useState<"7" | "30" | "90" | "all">("30");
  const [filter, setFilter] = useState<"all" | "todo" | "done" | "starred" | "revise">("all");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SegmentedControl
        label="Range"
        value={range}
        onChange={setRange}
        items={[
          { value: "7", label: "7d" },
          { value: "30", label: "30d" },
          { value: "90", label: "90d" },
          { value: "all", label: "All" },
        ]}
      />
      <SegmentedControl
        label="Filter"
        size="sm"
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: "All" },
          { value: "todo", label: "To do", count: 474 },
          { value: "done", label: "Done", count: 21 },
          { value: "starred", label: "Starred" },
          { value: "revise", label: "Revise", count: 5 },
        ]}
      />
    </div>
  );
}

export function FieldsDemo() {
  const [college, setCollege] = useState("msrit");
  const [year, setYear] = useState("3");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Name" placeholder="Your name" helper="Shown on your public profile." />
      <Field label="Handle" defaultValue="shourya" success helper="dsakaro.in/u/shourya" />
      <Field label="LeetCode username" defaultValue="" error="That username doesn't exist." />
      <Field label="Disabled" disabled defaultValue="locked" />
      <div className="flex flex-col gap-1.5">
        <span className="text-13 font-[550] text-ink-2">College</span>
        <Select
          label="College"
          value={college}
          onChange={setCollege}
          options={[
            { value: "msrit", label: "M S Ramaiah Institute of Technology", hint: "Bengaluru" },
            { value: "rvce", label: "RV College of Engineering", hint: "Bengaluru" },
            { value: "bms", label: "BMS College of Engineering", hint: "Bengaluru" },
            { value: "pes", label: "PES University", hint: "Bengaluru" },
            { value: "iitb", label: "IIT Bombay", hint: "Mumbai" },
            { value: "iitd", label: "IIT Delhi", hint: "Delhi" },
            { value: "nitk", label: "NIT Karnataka", hint: "Surathkal" },
            { value: "bits", label: "BITS Pilani", hint: "Pilani" },
          ]}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-13 font-[550] text-ink-2">Year</span>
        <Select
          label="Year"
          value={year}
          onChange={setYear}
          options={["1", "2", "3", "4"].map((y) => ({ value: y, label: `Year ${y}` }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-13 font-[550] text-ink-2">Exam-week freeze</span>
        <DateRangePicker
          start={start}
          end={end}
          min="2026-10-28"
          onChange={(s, e) => {
            setStart(s);
            setEnd(e);
          }}
        />
      </div>
    </div>
  );
}

export function TogglesDemo() {
  const [checked, setChecked] = useState(false);
  const [star, setStar] = useState(true);
  return (
    <div className="flex items-center gap-3">
      <AnimatedCheckbox
        checked={checked}
        aria-label="Two Sum done"
        onClick={(e) => {
          const next = !checked;
          setChecked(next);
          if (next) void burstFrom(e.currentTarget);
        }}
      />
      <span className="text-13 text-ink-2">Tick me</span>
      <StarToggle on={star} aria-label="Star" onClick={() => setStar((s) => !s)} />
    </div>
  );
}

export function TickerDemo() {
  const [n, setN] = useState(412);
  return (
    <div className="flex items-center gap-4">
      <NumberTicker value={n} className="num text-48" />
      <Button size="sm" variant="secondary" onClick={() => setN((v) => v + 7)}>
        +7 (sync)
      </Button>
      <Button size="sm" variant="ghost" onClick={() => void burst()}>
        Celebrate
      </Button>
    </div>
  );
}

export function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Disconnect this browser?"
        description="The extension stops syncing from this device until you connect it again."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <HoldToConfirm
            onConfirm={() => {
              setOpen(false);
              toast.success("Disconnected (demo)");
            }}
          >
            Hold to disconnect
          </HoldToConfirm>
        </div>
      </Modal>
    </>
  );
}
