import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import type { YoutubeTimeRequest } from "../lib/messages.ts";

/** Answers "where is the video?" so Save-for-later can keep the timestamp. Reads nothing else. */
export default defineContentScript({
  matches: ["https://www.youtube.com/*", "https://m.youtube.com/*"],
  main() {
    browser.runtime.onMessage.addListener((msg: YoutubeTimeRequest, _sender, sendResponse) => {
      if (msg?.type !== "yt:time") return;
      const video = document.querySelector<HTMLVideoElement>("video.html5-main-video, video");
      sendResponse(video ? video.currentTime : null);
    });
  },
});
