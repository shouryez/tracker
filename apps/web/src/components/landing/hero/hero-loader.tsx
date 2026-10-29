"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { sceneAllowed } from "./scene-script";

// Code-split: the scene (and motion) load after the server-rendered headline has painted.
const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

/**
 * Mounts the scroll scene when the inline gate turned it on. After a client-side
 * navigation the inline script doesn't run again, so the same check runs here.
 */
export function HeroSceneLoader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.scene !== "on" && sceneAllowed()) html.dataset.scene = "on";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the DOM once on mount
    setOn(html.dataset.scene === "on");
  }, []);
  return on ? <HeroScene /> : null;
}
