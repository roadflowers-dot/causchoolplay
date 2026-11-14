// 밝게/어둡게 설정. 화면이 깜빡이지 않도록 가장 먼저 실행됩니다.
(function () {
  var KEY = "theme";
  var mq = window.matchMedia("(prefers-color-scheme: dark)");

  function choice() {
    try {
      var v = localStorage.getItem(KEY);
      return v === "light" || v === "dark" ? v : "auto";
    } catch (e) { return "auto"; }
  }
  function apply() {
    var c = choice();
    var theme = c === "auto" ? (mq.matches ? "dark" : "light") : c;
    var root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.themeChoice = c;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#0e1124" : "#f4f6ff";
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: theme, choice: c } }));
  }
  function set(c) {
    try {
      if (c === "auto") localStorage.removeItem(KEY); else localStorage.setItem(KEY, c);
    } catch (e) {}
    apply();
  }

  window.Theme = {
    get: function () { return { theme: document.documentElement.dataset.theme, choice: choice() }; },
    set: set,
    toggle: function () { set(document.documentElement.dataset.theme === "dark" ? "light" : "dark"); },
  };
  mq.addEventListener("change", apply);
  apply();
})();
