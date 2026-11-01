import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import type { YoutubeInfoRequest, YoutubeTimeRequest } from "../lib/messages.ts";

/**
 * Answers "where is the video?" (Save-for-later keeps the timestamp) and "whose channel?"
 * (Lab mode counts study channels as focus). Reads nothing else.
 */
export default defineContentScript({
  matches: ["https://www.youtube.com/*", "https://m.youtube.com/*"],
  main() {
    browser.runtime.onMessage.addListener(
      (msg: YoutubeTimeRequest | YoutubeInfoRequest, _sender, sendResponse) => {
        if (msg?.type === "yt:time") {
          const video = document.querySelector<HTMLVideoElement>("video.html5-main-video, video");
          sendResponse(video ? video.currentTime : null);
        } else if (msg?.type === "yt:info") {
          const text = (sel: string) =>
            document.querySelector(sel)?.textContent?.replace(/\s+/g, " ").trim() || null;
          sendResponse({
            channel: text(
              "ytd-watch-metadata ytd-channel-name a, #owner #channel-name a, ytd-reel-player-overlay-renderer #channel-name a, ytd-reel-channel-bar-view-model a, .slim-owner-channel-name",
            ),
            title: text("ytd-watch-metadata h1, #title h1, .slim-video-metadata-title"),
          });
        }
      },
    );
  },
});
