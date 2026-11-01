import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import type { YoutubeChannelRequest, YoutubeTimeRequest } from "../lib/messages.ts";

/**
 * Answers "where is the video?" (Save-for-later keeps the timestamp) and "whose channel?"
 * (Lab mode counts study channels as focus). Reads nothing else.
 */
export default defineContentScript({
  matches: ["https://www.youtube.com/*", "https://m.youtube.com/*"],
  main() {
    browser.runtime.onMessage.addListener(
      (msg: YoutubeTimeRequest | YoutubeChannelRequest, _sender, sendResponse) => {
        if (msg?.type === "yt:time") {
          const video = document.querySelector<HTMLVideoElement>("video.html5-main-video, video");
          sendResponse(video ? video.currentTime : null);
        } else if (msg?.type === "yt:channel") {
          const el = document.querySelector(
            "ytd-watch-metadata ytd-channel-name a, #owner #channel-name a, ytd-reel-player-overlay-renderer #channel-name a, .slim-owner-channel-name",
          );
          sendResponse(el?.textContent?.trim() || null);
        }
      },
    );
  },
});

