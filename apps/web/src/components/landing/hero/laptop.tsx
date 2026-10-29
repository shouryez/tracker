import type { CSSProperties, ReactNode } from "react";
import { LogoMark, cn } from "@upsolve/ui";
import { CAMERA, RIG } from "./scene";

/**
 * A laptop built from DOM + CSS 3D (no images, no models): base slab with a keyboard deck,
 * a lid on a hinge, bezel, notch and a reflection that moves with the lid. The screen is a
 * slot for real React UI. Pure markup, so the server-rendered poster can use it too; the
 * scroll scene animates the parts through their `data-part` attributes.
 *
 * Coordinates: the rig's top edge is the hinge line. The base lies flat (rotateX 90°) and
 * reaches toward the viewer; the lid rotates around the hinge by (angle − 90°).
 */
export function Laptop({
  screen,
  pose,
  className,
}: {
  screen: ReactNode;
  /**
   * A fixed pose (static poster, loading placeholder); the scene drives transforms itself
   * when omitted. `y` moves the hinge (default: centres the open screen).
   */
  pose?: { tilt: number; lid: number; y?: number };
  className?: string;
}) {
  const lidW = RIG.screenW + RIG.bezel * 2;
  const lidH = RIG.screenH + RIG.bezel * 2 + 10;
  const vars = {
    "--sw": `${RIG.screenW}px`,
    "--sh": `${RIG.screenH}px`,
    "--bz": `${RIG.bezel}px`,
    "--lw": `${lidW}px`,
    "--lh": `${lidH}px`,
    "--bw": `${RIG.baseW}px`,
    "--bd": `${RIG.baseD}px`,
  } as CSSProperties;
  const rigStyle = pose
    ? {
        transform: `translateY(${pose.y ?? RIG.screenH * 0.5 + RIG.bezel}px) rotateX(${-pose.tilt}deg)`,
      }
    : undefined;
  const lidStyle = pose ? { transform: `rotateX(${pose.lid - 90}deg)` } : undefined;
  return (
    <div data-part="persp" aria-hidden="true" className={cn("lt-persp", className)} style={vars}>
      <div data-part="rig" className="lt-rig" style={rigStyle}>
        <div data-part="desk" className="lt-desk">
          <span
            data-part="desk-spill"
            className="lt-desk-spill"
            style={{ opacity: pose?.lid ? 0.9 : 0 }}
          />
        </div>
        <div data-part="base" className="lt-base">
          <div className="lt-keys">
            {Array.from({ length: 5 * 14 }, (_, i) => (
              <i key={i} className={cn(i === 5 * 14 - 9 && "lt-key-wide")} />
            ))}
            <i className="lt-space" />
          </div>
          <div className="lt-pad" />
          <span data-part="spill" className="lt-spill" style={{ opacity: pose?.lid ? 0.8 : 0 }} />
        </div>
        <div data-part="edge" className="lt-edge" />
        <div data-part="lid" className="lt-lid" style={lidStyle}>
          <div data-part="lid-back" className="lt-lid-back">
            <LogoMark size={64} className="opacity-25" />
          </div>
          <div className="lt-lid-front">
            <span data-part="bezel" className="lt-bezel">
              <span className="lt-notch" />
              <span data-part="reflect" className="lt-reflect" />
            </span>
            <div data-part="screen" className="lt-screen">
              {screen}
              <span data-part="screen-glow" className="lt-screen-glow" style={{ opacity: 0 }} />
              <span
                data-part="screen-off"
                className="lt-screen-off"
                style={{ opacity: pose ? 0 : 1 }}
              />
              <span data-part="frame" className="lt-frame" style={{ opacity: 0 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Rest pose the scene starts from (kept here so the poster and scene agree). */
export const POSTER_POSE = { tilt: CAMERA.tiltOpen + 2, lid: CAMERA.lidOpen } as const;
