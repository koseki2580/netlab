/* plan-comments.js — self-contained commenting overlay for HTML plan documents.
 *
 * Designed to be inlined into agents/human/<plan>.html via `<script>...</script>`.
 * Zero dependencies. Persists comments in localStorage. All UI is rendered into
 * a `pc-root` container appended to <body> so it never conflicts with page CSS.
 *
 * Anchor types:
 *   - id      : the user hovered an element whose id matches the configured
 *               prefixes (section-, diff-, step-, risk-) and clicked the icon.
 *   - selection: the user selected text; the comment is anchored to the nearest
 *                ancestor with an id, falling back to the nearest heading text.
 */
(function () {
  "use strict";
  if (window.__planCommentsLoaded) return;
  window.__planCommentsLoaded = true;

  const ANCHOR_ID_PREFIXES = ["section-", "diff-", "step-", "risk-"];

  // ---- storage key: stable per (title, pathname), with a one-time init stamp
  const baseKey = `plan-comments:${document.title || "untitled"}:${location.pathname}`;
  const initKey = `${baseKey}:init`;
  let initStamp = localStorage.getItem(initKey);
  if (!initStamp) {
    initStamp = new Date().toISOString();
    try { localStorage.setItem(initKey, initStamp); } catch (e) { /* quota */ }
  }
  const STORAGE_KEY = `${baseKey}:${initStamp}`;

  /** @type {Array<{id:string, createdAt:string, anchorId:string|null, anchorLabel:string, selectionText:string|null, body:string}>} */
  let comments = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) comments = JSON.parse(raw);
  } catch (e) {
    comments = [];
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
    } catch (e) { /* ignore quota */ }
  }

  function uid() {
    return "c_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  // ---- styles
  const style = document.createElement("style");
  style.textContent = `
    .pc-root, .pc-root * { box-sizing: border-box; }
    .pc-root { position: fixed; inset: 0; pointer-events: none; z-index: 2147483600; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 13px; color: #1f2328; }
    .pc-icon { position: absolute; width: 22px; height: 22px; border-radius: 11px; background: #ffd33d; color: #1f2328; border: 1px solid #d4a017; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,.25); pointer-events: auto; font-size: 12px; line-height: 1; user-select: none; }
    .pc-icon:hover { background: #ffea7f; }
    .pc-popover { position: absolute; min-width: 280px; max-width: 360px; background: #fff; border: 1px solid #d0d7de; border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.18); padding: 10px; pointer-events: auto; }
    .pc-popover textarea { width: 100%; min-height: 70px; resize: vertical; padding: 6px 8px; border: 1px solid #d0d7de; border-radius: 4px; font: inherit; font-size: 13px; }
    .pc-popover .pc-anchor-hint { font-size: 11px; color: #57606a; margin-bottom: 6px; word-break: break-word; }
    .pc-actions { display: flex; gap: 6px; justify-content: flex-end; margin-top: 6px; }
    .pc-btn { padding: 4px 10px; border-radius: 4px; border: 1px solid #d0d7de; background: #f6f8fa; cursor: pointer; font: inherit; font-size: 12px; }
    .pc-btn:hover { background: #eaeef2; }
    .pc-btn-primary { background: #1f883d; color: #fff; border-color: #1a7f37; }
    .pc-btn-primary:hover { background: #1a7f37; }
    .pc-btn-danger { color: #cf222e; }
    .pc-panel { position: absolute; right: 16px; bottom: 16px; width: 340px; max-height: 60vh; background: #fff; border: 1px solid #d0d7de; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.18); pointer-events: auto; display: flex; flex-direction: column; }
    .pc-panel.pc-collapsed { max-height: 40px; overflow: hidden; }
    .pc-panel-header { padding: 8px 12px; border-bottom: 1px solid #d0d7de; display: flex; align-items: center; justify-content: space-between; cursor: pointer; background: #f6f8fa; border-radius: 8px 8px 0 0; font-weight: 600; }
    .pc-panel-count { background: #1f883d; color: #fff; border-radius: 10px; padding: 1px 8px; font-size: 11px; font-weight: 600; margin-left: 6px; }
    .pc-panel-body { overflow: auto; padding: 6px 0; flex: 1; }
    .pc-panel-footer { padding: 8px 12px; border-top: 1px solid #d0d7de; display: flex; gap: 6px; background: #f6f8fa; border-radius: 0 0 8px 8px; }
    .pc-comment { padding: 8px 12px; border-bottom: 1px solid #eaeef2; cursor: pointer; }
    .pc-comment:hover { background: #f6f8fa; }
    .pc-comment-anchor { font-size: 11px; color: #0969da; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }
    .pc-comment-selection { font-size: 11px; color: #57606a; font-style: italic; margin-top: 2px; border-left: 2px solid #d0d7de; padding-left: 6px; }
    .pc-comment-body { margin-top: 4px; white-space: pre-wrap; word-break: break-word; }
    .pc-comment-actions { margin-top: 4px; display: flex; gap: 8px; font-size: 11px; }
    .pc-comment-actions a { color: #57606a; cursor: pointer; text-decoration: none; }
    .pc-comment-actions a:hover { text-decoration: underline; }
    .pc-comment-actions a.pc-danger { color: #cf222e; }
    .pc-highlight { background: #fff8c5 !important; outline: 2px solid #ffd33d; outline-offset: 1px; border-radius: 2px; transition: background .2s, outline-color .2s; }
    .pc-badge { position: absolute; display: flex; align-items: center; justify-content: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: #0969da; color: #fff; font-size: 10px; font-weight: 600; line-height: 1; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.18); pointer-events: auto; user-select: none; opacity: 0.82; transform: translate(4px, -50%); transition: opacity .12s, transform .12s, background .12s; z-index: 1; }
    .pc-badge:hover { opacity: 1; transform: translate(4px, -50%) scale(1.15); }
    .pc-badge.pc-badge-empty { background: transparent; color: #8c959f; border: 1px dashed #afb8c1; box-shadow: none; opacity: 0.25; font-weight: 400; }
    .pc-badge.pc-badge-empty:hover { opacity: 1; background: #f6f8fa; color: #57606a; border-color: #8c959f; }
    .pc-badge.pc-badge-hidden { display: none; }
    .pc-comment.pc-selected { background: #fff8c5; }
    .pc-empty { padding: 16px 12px; color: #57606a; text-align: center; font-style: italic; }
    .pc-toast { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); background: #1f2328; color: #fff; padding: 8px 14px; border-radius: 6px; font-size: 12px; opacity: 0; transition: opacity .2s; pointer-events: none; }
    .pc-toast.pc-show { opacity: 1; }
  `;
  document.head.appendChild(style);

  // ---- DOM scaffolding
  const root = document.createElement("div");
  root.className = "pc-root";
  root.innerHTML = `
    <div class="pc-panel pc-collapsed" id="pc-panel">
      <div class="pc-panel-header" id="pc-panel-header">
        <span>Comments <span class="pc-panel-count" id="pc-count">0</span></span>
        <span id="pc-panel-toggle">▴</span>
      </div>
      <div class="pc-panel-body" id="pc-panel-body"></div>
      <div class="pc-panel-footer">
        <button class="pc-btn" id="pc-copy">Copy as Markdown</button>
        <button class="pc-btn" id="pc-download">Download JSON</button>
        <button class="pc-btn pc-btn-danger" id="pc-clear">Clear all</button>
      </div>
    </div>
    <div class="pc-toast" id="pc-toast"></div>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector("#pc-panel");
  const panelBody = root.querySelector("#pc-panel-body");
  const panelHeader = root.querySelector("#pc-panel-header");
  const panelToggle = root.querySelector("#pc-panel-toggle");
  const countEl = root.querySelector("#pc-count");
  const toastEl = root.querySelector("#pc-toast");

  panelHeader.addEventListener("click", () => {
    panel.classList.toggle("pc-collapsed");
    panelToggle.textContent = panel.classList.contains("pc-collapsed") ? "▴" : "▾";
  });

  root.querySelector("#pc-copy").addEventListener("click", (e) => {
    e.stopPropagation();
    copyMarkdown();
  });
  root.querySelector("#pc-download").addEventListener("click", (e) => {
    e.stopPropagation();
    downloadJSON();
  });
  root.querySelector("#pc-clear").addEventListener("click", (e) => {
    e.stopPropagation();
    if (comments.length === 0) { toast("No comments to clear"); return; }
    if (!confirm(`Delete all ${comments.length} comment(s)? This cannot be undone.`)) return;
    comments = [];
    persist();
    render();
    toast("All comments cleared");
  });

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("pc-show");
    setTimeout(() => toastEl.classList.remove("pc-show"), 1600);
  }

  // ---- anchor helpers
  function isAnchorId(id) {
    if (!id) return false;
    return ANCHOR_ID_PREFIXES.some((p) => id.startsWith(p));
  }

  function findAnchorAncestor(node) {
    let el = node && node.nodeType === 3 ? node.parentElement : node;
    while (el && el !== document.body) {
      if (el.id && isAnchorId(el.id)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function findNearestHeading(node) {
    let el = node && node.nodeType === 3 ? node.parentElement : node;
    while (el && el !== document.body) {
      // previous siblings that are headings
      let sib = el.previousElementSibling;
      while (sib) {
        if (/^H[1-6]$/.test(sib.tagName)) return sib.textContent.trim().slice(0, 80);
        sib = sib.previousElementSibling;
      }
      if (/^H[1-6]$/.test(el.tagName)) return el.textContent.trim().slice(0, 80);
      el = el.parentElement;
    }
    return null;
  }

  // ---- popover for adding a new comment
  let activePopover = null;
  function closePopover() {
    if (activePopover) {
      activePopover.remove();
      activePopover = null;
    }
  }
  document.addEventListener("mousedown", (e) => {
    if (activePopover && !activePopover.contains(e.target)) closePopover();
  });

  function openPopover(x, y, draft) {
    closePopover();
    const pop = document.createElement("div");
    pop.className = "pc-popover";
    pop.style.left = Math.min(x, window.innerWidth - 380) + "px";
    pop.style.top = Math.min(y, window.innerHeight - 180) + "px";
    const hintParts = [];
    if (draft.anchorId) hintParts.push("#" + draft.anchorId);
    else if (draft.anchorLabel) hintParts.push(draft.anchorLabel);
    if (draft.selectionText) hintParts.push(`"${draft.selectionText.slice(0, 80)}${draft.selectionText.length > 80 ? "…" : ""}"`);
    const hint = hintParts.join(" — ") || "(no anchor)";
    pop.innerHTML = `
      <div class="pc-anchor-hint">${escapeHtml(hint)}</div>
      <textarea placeholder="Write your comment..."></textarea>
      <div class="pc-actions">
        <button class="pc-btn" data-act="cancel">Cancel</button>
        <button class="pc-btn pc-btn-primary" data-act="save">Save</button>
      </div>
    `;
    root.appendChild(pop);
    activePopover = pop;
    const ta = pop.querySelector("textarea");
    ta.focus();
    pop.querySelector('[data-act="cancel"]').addEventListener("click", closePopover);
    pop.querySelector('[data-act="save"]').addEventListener("click", () => {
      const body = ta.value.trim();
      if (!body) { closePopover(); return; }
      addComment({ ...draft, body });
      closePopover();
    });
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        const body = ta.value.trim();
        if (body) { addComment({ ...draft, body }); closePopover(); }
      } else if (e.key === "Escape") {
        closePopover();
      }
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---- selection-triggered comments
  document.addEventListener("mouseup", (e) => {
    if (activePopover && activePopover.contains(e.target)) return;
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (!text) return;
      const range = sel.getRangeAt(0);
      // ignore selection inside our overlay
      if (root.contains(range.commonAncestorContainer)) return;
      const anchorEl = findAnchorAncestor(range.startContainer);
      const heading = anchorEl ? null : findNearestHeading(range.startContainer);
      const rect = range.getBoundingClientRect();
      openPopover(rect.right + 8, rect.bottom + 8, {
        anchorId: anchorEl ? anchorEl.id : null,
        anchorLabel: heading,
        selectionText: text,
      });
    }, 0);
  });

  // ---- comment list management
  function addComment(c) {
    comments.push({
      id: uid(),
      createdAt: new Date().toISOString(),
      anchorId: c.anchorId || null,
      anchorLabel: c.anchorLabel || null,
      selectionText: c.selectionText || null,
      body: c.body,
    });
    persist();
    render();
    toast("Comment added");
  }

  function removeComment(id) {
    comments = comments.filter((c) => c.id !== id);
    persist();
    render();
  }

  function editComment(id) {
    const c = comments.find((x) => x.id === id);
    if (!c) return;
    const next = prompt("Edit comment:", c.body);
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed) { removeComment(id); return; }
    c.body = trimmed;
    persist();
    render();
  }

  function scrollToAnchor(c) {
    let target = null;
    if (c.anchorId) target = document.getElementById(c.anchorId);
    if (!target && c.anchorLabel) {
      const label = c.anchorLabel.trim();
      const headings = document.querySelectorAll("h1,h2,h3,h4,h5,h6");
      for (const h of headings) {
        if (h.textContent.trim().startsWith(label)) { target = h; break; }
      }
    }
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("pc-highlight");
    setTimeout(() => target.classList.remove("pc-highlight"), 2000);
  }

  function focusPanelItem(commentId) {
    panel.classList.remove("pc-collapsed");
    panelToggle.textContent = "▾";
    const item = panelBody.querySelector(`[data-cid="${commentId}"]`);
    if (!item) return;
    panelBody.querySelectorAll(".pc-comment.pc-selected").forEach((x) => x.classList.remove("pc-selected"));
    item.classList.add("pc-selected");
    item.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => item.classList.remove("pc-selected"), 2000);
  }

  // find a Range matching the given text, searching text nodes outside the overlay.
  // Falls back to a 30-char prefix when the exact text spans multiple nodes.
  function findRangeForText(text) {
    if (!text) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;
    const tryFind = (needle) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          if (root.contains(n)) return NodeFilter.FILTER_REJECT;
          return n.nodeValue && n.nodeValue.indexOf(needle) >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        },
      });
      const node = walker.nextNode();
      if (!node) return null;
      const idx = node.nodeValue.indexOf(needle);
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + needle.length);
      return range;
    };
    return tryFind(trimmed) || (trimmed.length > 30 ? tryFind(trimmed.slice(0, 30)) : null);
  }

  // refs kept between renderBadges() and repositionBadges() so we don't rebuild DOM on scroll
  const badgeRefs = [];

  function renderBadges() {
    badgeRefs.length = 0;
    document.querySelectorAll(".pc-badge").forEach((b) => b.remove());
    // group existing comments by stable key (anchorId wins if present, else selection text)
    const order = [];
    const groups = new Map();
    comments.forEach((c) => {
      const key = c.anchorId ? `id:${c.anchorId}` : (c.selectionText ? `sel:${c.selectionText}` : null);
      if (!key) return;
      if (!groups.has(key)) { groups.set(key, { sample: c, items: [] }); order.push(key); }
      groups.get(key).items.push(c);
    });
    // 1) numbered badges for groups with comments
    order.forEach((key, idx) => {
      const group = groups.get(key);
      const badge = document.createElement("div");
      badge.className = "pc-badge";
      const num = idx + 1;
      badge.textContent = group.items.length > 1 ? `${num}+${group.items.length - 1}` : `${num}`;
      const targetLabel = group.sample.anchorId ? `#${group.sample.anchorId}` : `"${(group.sample.selectionText || "").slice(0, 40)}"`;
      badge.title = `${group.items.length} comment${group.items.length > 1 ? "s" : ""} on ${targetLabel} — click to view`;
      badge.addEventListener("click", (e) => {
        e.stopPropagation();
        focusPanelItem(group.items[0].id);
      });
      root.appendChild(badge);
      const getRect = () => {
        if (group.sample.selectionText) {
          const range = findRangeForText(group.sample.selectionText);
          if (range) {
            const r = range.getBoundingClientRect();
            if (r.width || r.height) return r;
          }
        }
        if (group.sample.anchorId) {
          const el = document.getElementById(group.sample.anchorId);
          if (el && !root.contains(el)) return el.getBoundingClientRect();
        }
        return null;
      };
      badgeRefs.push({ el: badge, getRect });
    });
    // 2) faint "+" add-buttons for anchored elements without comments
    const commentedIds = new Set();
    comments.forEach((c) => { if (c.anchorId) commentedIds.add(c.anchorId); });
    document.querySelectorAll("[id]").forEach((el) => {
      if (!isAnchorId(el.id) || root.contains(el) || commentedIds.has(el.id)) return;
      const addBadge = document.createElement("div");
      addBadge.className = "pc-badge pc-badge-empty";
      addBadge.textContent = "+";
      addBadge.title = `Add comment on #${el.id}`;
      addBadge.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openPopover(ev.clientX, ev.clientY, {
          anchorId: el.id,
          anchorLabel: null,
          selectionText: null,
        });
      });
      root.appendChild(addBadge);
      badgeRefs.push({ el: addBadge, getRect: () => el.getBoundingClientRect() });
    });
    repositionBadges();
  }

  function repositionBadges() {
    badgeRefs.forEach(({ el, getRect }) => {
      const r = getRect();
      if (!r || (r.bottom < -50 || r.top > window.innerHeight + 50)) {
        el.classList.add("pc-badge-hidden");
        return;
      }
      el.classList.remove("pc-badge-hidden");
      el.style.left = r.right + "px";
      el.style.top = r.top + "px";
    });
  }

  let repositionScheduled = false;
  function scheduleReposition() {
    if (repositionScheduled) return;
    repositionScheduled = true;
    requestAnimationFrame(() => {
      repositionScheduled = false;
      repositionBadges();
    });
  }
  window.addEventListener("scroll", scheduleReposition, { passive: true });
  window.addEventListener("resize", scheduleReposition);

  function render() {
    countEl.textContent = comments.length.toString();
    if (comments.length === 0) {
      panelBody.innerHTML = `<div class="pc-empty">No comments yet. Select text or hover an anchored element.</div>`;
      renderBadges();
      return;
    }
    panelBody.innerHTML = "";
    comments.forEach((c) => {
      const item = document.createElement("div");
      item.className = "pc-comment";
      item.dataset.cid = c.id;
      const anchor = c.anchorId ? `#${c.anchorId}` : (c.anchorLabel ? `near "${c.anchorLabel}"` : "(no anchor)");
      const selection = c.selectionText
        ? `<div class="pc-comment-selection">${escapeHtml(c.selectionText.slice(0, 200))}${c.selectionText.length > 200 ? "…" : ""}</div>`
        : "";
      item.innerHTML = `
        <div class="pc-comment-anchor">${escapeHtml(anchor)}</div>
        ${selection}
        <div class="pc-comment-body">${escapeHtml(c.body)}</div>
        <div class="pc-comment-actions">
          <a data-act="edit">edit</a>
          <a data-act="delete" class="pc-danger">delete</a>
        </div>
      `;
      item.addEventListener("click", (e) => {
        if (e.target.dataset.act) return;
        scrollToAnchor(c);
      });
      item.querySelector('[data-act="edit"]').addEventListener("click", (e) => { e.stopPropagation(); editComment(c.id); });
      item.querySelector('[data-act="delete"]').addEventListener("click", (e) => { e.stopPropagation(); removeComment(c.id); });
      panelBody.appendChild(item);
    });
    renderBadges();
  }

  // ---- export
  function toMarkdown() {
    if (comments.length === 0) return "(no comments)";
    const header = `## Plan comments — ${document.title || "untitled"}\n`;
    const body = comments.map((c) => {
      const anchor = c.anchorId ? `[#${c.anchorId}]` : (c.anchorLabel ? `[near: ${c.anchorLabel}]` : `[no anchor]`);
      const sel = c.selectionText ? ` — selection: "${c.selectionText.replace(/\n/g, " ").slice(0, 120)}"` : "";
      return `### ${anchor}${sel}\n${c.body}\n`;
    }).join("\n");
    return header + "\n" + body;
  }

  function copyMarkdown() {
    const md = toMarkdown();
    navigator.clipboard.writeText(md).then(
      () => toast("Markdown copied"),
      () => {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = md;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); toast("Markdown copied"); } catch (e) { toast("Copy failed"); }
        ta.remove();
      }
    );
  }

  function downloadJSON() {
    const data = {
      title: document.title,
      pathname: location.pathname,
      exportedAt: new Date().toISOString(),
      comments,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = (document.title || "plan").replace(/[^\w.-]+/g, "_").slice(0, 60);
    a.download = `${safeTitle}.comments.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("JSON downloaded");
  }

  // initial render
  render();
  if (comments.length > 0) {
    panel.classList.remove("pc-collapsed");
    panelToggle.textContent = "▾";
  }
})();
