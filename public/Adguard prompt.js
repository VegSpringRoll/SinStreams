/**
 * AdGuard install message box
 * --------------------------------------------------
 * Shows a simple message box once per visitor, recommending AdGuard.
 * Includes a "Never show this again" option for users who've already
 * installed it (or just don't want to see it).
 *
 * Usage: include this file on every page, e.g.
 *   <script src="/adguard-prompt.js" defer></script>
 * No other markup needed — everything is injected at runtime.
 */
(function () {
  var INSTALL_URL =
    "https://chromewebstore.google.com/detail/adguard-adblocker/bgnkhhnnamicmpeenaelnjfhikgbkllg";
  var HIDE_KEY = "adguardPromptHideForever";

  function init() {
    if (localStorage.getItem(HIDE_KEY) === "true") return;

    var overlay = document.createElement("div");
    overlay.id = "adguard-prompt-overlay";
    overlay.innerHTML =
      '<div id="adguard-prompt-card">' +
      '  <button id="adguard-prompt-close" aria-label="Close">&times;</button>' +
      '  <div id="adguard-prompt-icon">🛡️</div>' +
      "  <p id=\"adguard-prompt-text\">For the best ads-free experience, download the <strong>AdGuard</strong> extension — it just takes seconds :)</p>" +
      '  <a id="adguard-prompt-install" href="' +
      INSTALL_URL +
      '" target="_blank" rel="noopener noreferrer">Get AdGuard</a>' +
      '  <label id="adguard-prompt-never">' +
      '    <input type="checkbox" id="adguard-prompt-checkbox" /> Never show this again' +
      "  </label>" +
      "</div>";

    var style = document.createElement("style");
    style.textContent =
      "#adguard-prompt-overlay{position:fixed;left:0;right:0;bottom:0;z-index:999999;" +
      "display:flex;justify-content:center;padding:20px;" +
      "font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;" +
      "animation:adguard-slide-up .25s ease-out;}" +
      "@keyframes adguard-slide-up{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}" +
      "#adguard-prompt-card{position:relative;background:#15181d;color:#f2f3f5;" +
      "max-width:420px;width:100%;padding:20px 44px 18px 20px;border-radius:12px;" +
      "display:flex;align-items:center;flex-wrap:wrap;gap:12px;" +
      "box-shadow:0 10px 40px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.08);}" +
      "#adguard-prompt-icon{font-size:26px;flex-shrink:0;}" +
      "#adguard-prompt-text{font-size:13.5px;line-height:1.4;color:#d3d6db;margin:0;flex:1 1 220px;}" +
      "#adguard-prompt-install{flex-shrink:0;background:#68b84e;color:#0a0c10;" +
      "font-weight:600;text-decoration:none;padding:9px 14px;border-radius:7px;" +
      "font-size:13.5px;white-space:nowrap;transition:filter .15s;}" +
      "#adguard-prompt-install:hover{filter:brightness(1.08);}" +
      "#adguard-prompt-never{flex-basis:100%;display:flex;align-items:center;gap:6px;" +
      "font-size:12px;color:#8a8f98;cursor:pointer;margin-top:2px;}" +
      "#adguard-prompt-never input{cursor:pointer;}" +
      "#adguard-prompt-close{position:absolute;top:8px;right:10px;background:none;" +
      "border:none;color:#8a8f98;font-size:20px;line-height:1;cursor:pointer;}" +
      "#adguard-prompt-close:hover{color:#f2f3f5;}" +
      "@media (max-width:480px){#adguard-prompt-card{padding:16px 40px 14px 16px;}}";

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    function close() {
      if (document.getElementById("adguard-prompt-checkbox").checked) {
        localStorage.setItem(HIDE_KEY, "true");
      }
      overlay.remove();
    }

    document.getElementById("adguard-prompt-close").onclick = close;
    document
      .getElementById("adguard-prompt-install")
      .addEventListener("click", function () {
        // Assume they're installing it now — don't show again next visit.
        localStorage.setItem(HIDE_KEY, "true");
      });
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();