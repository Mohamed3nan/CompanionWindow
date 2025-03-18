import Mellowtel from "mellowtel";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  allFrames: true,
  main: async () => {
    // The API key can be obtained from the Mellowtel dashboard
    // https://www.mellowtel.it/mellowtel-dashboard
    const MELLOWTEL_API_KEY = import.meta.env.VITE_MELLOWTEL_API_KEY;
    const mellowtel = new Mellowtel(MELLOWTEL_API_KEY);

    await mellowtel.initContentScript('pascoli.html');
  },
});