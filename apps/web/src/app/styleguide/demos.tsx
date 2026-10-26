"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Switch } from "@upsolve/ui";

export function SwitchDemo() {
  const [on, setOn] = useState(true);
  return (
    <span className="flex items-center gap-2 text-[13px] text-ink-2">
      <Switch checked={on} onCheckedChange={setOn} label="Demo switch" />
      {on ? "On" : "Off"}
      <Switch checked={false} onCheckedChange={() => {}} label="Disabled switch" disabled />
    </span>
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
    </>
  );
}
