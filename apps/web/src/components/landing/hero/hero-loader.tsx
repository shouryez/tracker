"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { sceneAllowed } from "./scene-script";

// Code-split: the scene (and motion) load after the server-rendered headline has painted.
// The download starts as soon as this small module runs, not after hydration finishes.
const loadScene = () => import("./hero-scene");
if (typeof window !== "undefined" && document.documentElement.dataset.scene === "on")
  void loadScene();
const HeroScene = dynamic(loadScene, { ssr: false });

/**
 * Mounts the scroll scene when the inline gate turned it on. After a client-side
 * navigation the inline script doesn't run again, so the same check runs here.
 */
export function HeroSceneLoader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.scene !== "on" && sceneAllowed()) html.dataset.scene = "on";
    const u = navigator.userAgent;
    if (/iP(hone|ad|od)/.test(u) || (/Mac/.test(u) && navigator.maxTouchPoints > 1))
      html.dataset.ios = "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the DOM once on mount
    setOn(html.dataset.scene === "on");
  }, []);
  return on ? <HeroScene /> : null;
}

