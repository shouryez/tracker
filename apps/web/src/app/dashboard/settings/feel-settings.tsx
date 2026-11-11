"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { SegmentedControl, SwitchField } from "@upsolve/ui";
import { SERVER_FEEL, feel, getFeel, setFeel, subscribeFeel, type FeelPrefs } from "@/lib/feel";

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
      <div className="min-w-0 flex-1 basis-[260px]">
        <p className="text-14 font-[550]">{title}</p>
        <p className="mt-0.5 text-13 text-ink-3">{description}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * Feel: sound, haptics, cursor and motion. Saved in this browser only, so each device can
 * be different (a laptop with the halo and sound, a phone with haptics).
 */
export function FeelSettings() {
  const prefs = useSyncExternalStore(subscribeFeel, getFeel, () => SERVER_FEEL);
  return (
    <div className="flex flex-col gap-5">
      <SwitchField
        title="Sounds"
        description="Quiet clicks and chimes when you tick a problem, grade a revision or finish your day. Made in your browser, no audio files."
        checked={prefs.sound}
        onCheckedChange={(on) => {
          setFeel({ sound: on });
          if (on) feel.success();
        }}
      />
      <SwitchField
        title="Haptics"
        description="A small tap on phones that support it (most Android browsers)."
        checked={prefs.haptics}
        onCheckedChange={(on) => {
          setFeel({ haptics: on });
          if (on) feel.tick();
        }}
      />
      <Row
        title="Cursor"
        description="Halo is a soft ring that wraps buttons and shows what a click will do. Desktop only; your normal cursor stays."
      >
        <SegmentedControl<FeelPrefs["cursor"]>
          label="Cursor"
          size="sm"
          className="w-[200px]"
          value={prefs.cursor}
          onChange={(v) => {
            setFeel({ cursor: v });
            feel.tick();
          }}
          items={[
            { value: "halo", label: "Halo" },
            { value: "system", label: "System" },
          ]}
        />
      </Row>
      <Row
        title="Motion"
        description="Reduced calms every animation on DsaKaro. System follows your device setting."
      >
        <SegmentedControl<FeelPrefs["motion"]>
          label="Motion"
          size="sm"
          className="w-[260px]"
          value={prefs.motion}
          onChange={(v) => {
            setFeel({ motion: v });
            feel.tick();
          }}
          items={[
            { value: "system", label: "System" },
            { value: "full", label: "Full" },
            { value: "reduced", label: "Reduced" },
          ]}
        />
      </Row>
      <p className="text-12 text-ink-3">Saved on this device only.</p>
    </div>
  );
}
