(() => {
  "use strict";

  const content = window.USER_GUIDE_CONTENT;
  const languageSelect = document.getElementById("language-select");
  const searchInput = document.getElementById("search-input");
  const searchStatus = document.getElementById("search-status");
  const themeToggle = document.getElementById("theme-toggle");
  const siteTitle = document.getElementById("site-title");
  const guideLabel = document.getElementById("guide-label");
  const languageLabel = document.getElementById("language-label");
  const searchLabel = document.getElementById("search-label");
  const offlineNote = document.getElementById("offline-note");
  const toc = document.getElementById("toc");
  const mainContent = document.getElementById("content");
  const noResults = document.getElementById("no-results");

  const storage = {
    get(key) {
      try { return localStorage.getItem(key); } catch (_) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch (_) { /* file:// privacy modes may block storage */ }
    }
  };

  const browserLanguage = (navigator.language || "ja").toLowerCase().startsWith("ja") ? "ja" : "en";
  let language = storage.get("user-guide-language") || browserLanguage;
  let theme = storage.get("user-guide-theme") || "auto";

  if (!content[language]) language = "ja";
  languageSelect.value = language;

  function effectiveTheme() {
    if (theme !== "auto") return theme;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    const meta = content[language].meta;
    const current = effectiveTheme();
    themeToggle.textContent = current === "dark" ? meta.themeLight : meta.themeDark;
    themeToggle.setAttribute("aria-pressed", current === "dark" ? "true" : "false");
  }

  function stripHtml(html) {
    const node = document.createElement("div");
    node.innerHTML = html;
    return (node.textContent || "").toLowerCase();
  }

  function render() {
    const bundle = content[language];
    const meta = bundle.meta;
    const query = searchInput.value.trim().toLowerCase();
    const visible = bundle.sections.filter(section => {
      if (!query) return true;
      return section.title.toLowerCase().includes(query) || stripHtml(section.html).includes(query);
    });

    document.documentElement.lang = language;
    document.title = meta.siteTitle;
    siteTitle.textContent = meta.siteTitle;
    guideLabel.textContent = meta.guideLabel;
    languageLabel.textContent = meta.languageLabel;
    searchLabel.textContent = meta.searchLabel;
    searchInput.placeholder = meta.searchPlaceholder;
    offlineNote.textContent = meta.offlineNote;

    toc.replaceChildren();
    mainContent.replaceChildren();

    visible.forEach(section => {
      const link = document.createElement("a");
      link.href = `#${section.id}`;
      link.textContent = section.title;
      toc.appendChild(link);

      const wrapper = document.createElement("section");
      wrapper.className = "guide-section";
      wrapper.id = section.id;
      wrapper.innerHTML = `<h2>${section.title}</h2>${section.html}`;
      mainContent.appendChild(wrapper);
    });

    noResults.hidden = visible.length !== 0;
    noResults.textContent = meta.noResults;
    searchStatus.textContent = query ? meta.resultCount(visible.length) : "";
    applyTheme();
  }

  languageSelect.addEventListener("change", () => {
    language = languageSelect.value;
    storage.set("user-guide-language", language);
    render();
  });

  searchInput.addEventListener("input", render);

  themeToggle.addEventListener("click", () => {
    theme = effectiveTheme() === "dark" ? "light" : "dark";
    storage.set("user-guide-theme", theme);
    applyTheme();
  });

  if (window.matchMedia) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    if (media.addEventListener) {
      media.addEventListener("change", () => { if (theme === "auto") applyTheme(); });
    }
  }

  render();
})();
