(() => {
  function requiredElement(id) {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing #${id}`);
    return element;
  }

  function createGameUi() {
    const canvas = requiredElement("gameCanvas");
    const ctx = canvas.getContext("2d");
    const overlay = requiredElement("overlay");
    const panel = overlay.querySelector(".panel");
    const primaryButton = requiredElement("primaryButton");
    const pauseButton = document.getElementById("pauseButton");

    return {
      canvas,
      ctx,
      overlay,
      panel,
      primaryButton,
      pauseButton,
      showOverlay() {
        overlay.classList.remove("hidden");
      },
      hideOverlay() {
        overlay.classList.add("hidden");
      },
      setPanel(html) {
        panel.innerHTML = html;
        return panel;
      },
    };
  }

  window.WxGameUi = { createGameUi };
})();
