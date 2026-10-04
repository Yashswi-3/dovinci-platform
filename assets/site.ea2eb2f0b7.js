(function () {
var f = document.querySelector(".demo-form");
if (!f) return;
f.addEventListener("submit", function (e) {
e.preventDefault();
var ok = true;
f.querySelectorAll("[required]").forEach(function (i) {
var bad = !i.checkValidity();
i.setAttribute("aria-invalid", bad);
if (bad && ok) { i.focus(); ok = false; }
});
if (ok) f.querySelector(".form-status").classList.add("shown");
});
})();
(function () {
var sec = document.querySelector(".walk-section");
var box = sec && sec.querySelector(".walk-frame");
if (!box) return;
var tabs = [].slice.call(sec.querySelectorAll("[role=tab]"));
var dev = sec.querySelector(".walk-device"), back = sec.querySelector(".walk-back"), next = sec.querySelector(".walk-next");
var line = sec.querySelector(".walk-line"), sub = sec.querySelector(".walk-sub"), mark = sec.querySelector(".walk-mark");
var asked = (location.search.match(/[?&]sub=(over|strip)/) || [])[1];
var STRIP = (asked || sec.dataset.subMode) === "strip";
if (!STRIP) dev.appendChild(sub);
var LAST = parseFloat(sec.dataset.storyLast), LOOP = sec.dataset.loop === "true";
var frames = [], told = [];
var story = 0, seen = false, held = false, timer = 0;
function tell(cmd, k) {
var f = frames[k === undefined ? story : k];
if (f && f.contentWindow) f.contentWindow.postMessage({ target: "story", cmd: cmd }, "*");
}
function visible() { return seen && !document.hidden && !intro; }
var INTRO = parseFloat(sec.dataset.intro) * 1000 || 0, introEl = sec.querySelector(".walk-intro"), intro = false, introTimer = 0;
function card(k) {
if (!INTRO || !introEl) return;
clearTimeout(introTimer);
var t = tabs[k], ic = t.querySelector("svg");
introEl.innerHTML = '<div class="walk-intro-in"><span class="walk-intro-n">Story ' + (k + 1) + ' of ' + tabs.length + '</span>' +
(ic ? ic.outerHTML : "") + '<p class="walk-intro-q"></p></div>';
introEl.querySelector(".walk-intro-q").textContent = t.querySelector(".hook").textContent;
introEl.className = "walk-intro"; void introEl.offsetWidth; introEl.className = "walk-intro on";
intro = true;
introTimer = setTimeout(function () { intro = false; introEl.className = "walk-intro off"; apply(); }, INTRO);
}
function now() { return told[story]; }
function onLast() { var t = now(); return !!t && t.beat === t.count - 1; }
function make(k) {
if (frames[k]) return;
var f = frames[k] = document.createElement("iframe");
f.src = tabs[k].getAttribute("data-src");
f.title = tabs[k].querySelector(".hook").textContent;
f.tabIndex = -1;
f.setAttribute("aria-hidden", "true");
f.className = k === story ? "on" : "";
box.appendChild(f);
}
function more() {
if (document.readyState !== "complete") return;
for (var k = 0; k < tabs.length; k++) {
if (!frames[k]) { make(k); return; }
if (!told[k]) return;
}
}
function apply() {
clearTimeout(timer);
if (!visible()) { tell("hide"); return; }
tell("show");
if (held || onLast()) tell("pause"); else tell("play");
if (!held && onLast()) timer = setTimeout(function () { if (LOOP || story < tabs.length - 1) open(story + 1); }, LAST * 1000);
}
function open(k) {
k = (k + tabs.length) % tabs.length;
clearTimeout(timer);
var old = frames[story];
if (old && (k !== story || told[story])) {
tell("hide");
old.className = "";
told[story] = null;
old.src = tabs[story].getAttribute("data-src");
}
if (k !== story && old) card(k);
story = k;
tabs.forEach(function (t, n) { t.setAttribute("aria-selected", n === story ? "true" : "false"); t.tabIndex = n === story ? 0 : -1; });
make(k);
frames[k].className = "on";
show(now());
if (now()) apply();
}
var markTimer = 0, markOk = false;
function pointAt() {
if (!STRIP || !markOk) return;
mark.className = "walk-mark on";
sub.classList.add("pointed");
}
function show(t) {
if (STRIP) {
var m = t ? ((tabs[story].getAttribute("data-mark-at") || "").split(";")[t.beat] || "").split(" ").map(Number) : [];
var ok = m.length === 4 && m.every(function (n) { return n === n; });
clearTimeout(markTimer);
mark.className = "walk-mark";
sub.className = "walk-sub walk-strip";
markOk = ok;
if (ok) {
mark.style.cssText = "left:" + m[0] + "%;top:" + m[1] + "%;width:" + m[2] + "%;height:" + m[3] + "%";
sub.style.setProperty("--tail", (m[0] + m[2] / 2) + "%");
markTimer = setTimeout(pointAt, 1500);
}
} else {
var at = t ? (tabs[story].getAttribute("data-sub-at") || "").split(" ")[t.beat] || "bottom" : "bottom";
sub.className = "walk-sub at-" + at;
}
var span = document.createElement("span");
span.textContent = t ? t.note : "";
line.textContent = "";
if (t && t.note) line.appendChild(span);
sub.classList.remove("in"); void sub.offsetWidth; sub.classList.add("in");
}
window.addEventListener("message", function (e) {
var d = e.data;
if (!d || d.source !== "story") return;
var k = -1;
frames.forEach(function (f, n) { if (f.contentWindow === e.source) k = n; });
if (k < 0) return;
if (d.type === "beat") {
var first = !told[k];
told[k] = { beat: d.index, count: d.count, note: d.note };
if (k === story) { show(told[k]); apply(); }
if (first) more();
} else if (k !== story) return;
else if (d.type === "anim") {
if (now() && d.index === now().beat && markOk && !mark.classList.contains("on")) {
clearTimeout(markTimer);
markTimer = setTimeout(pointAt, 800);
}
}
else if (d.type === "end") { if (LOOP || story < tabs.length - 1) open(story + 1); }
else if (d.type === "start") { if (LOOP || story > 0) open(story - 1); }
});
function hold(on) { held = on; apply(); }
function bring() {
var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
dev.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
}
next.addEventListener("click", function () { if (onLast()) open(story + 1); else tell("next"); });
back.addEventListener("click", function () { tell("prev"); });
dev.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hold(true); });
dev.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") hold(false); });
dev.addEventListener("focusin", function (e) { var kb = false; try { kb = e.target.matches(":focus-visible"); } catch (x) {} if (kb) hold(true); });
dev.addEventListener("focusout", function (e) { if (!dev.contains(e.relatedTarget) && !dev.matches(":hover")) hold(false); });
dev.addEventListener("keydown", function (e) {
if (e.key === "ArrowRight") { next.click(); e.preventDefault(); }
else if (e.key === "ArrowLeft") { back.click(); e.preventDefault(); }
});
tabs.forEach(function (t, k) {
t.addEventListener("click", function () { open(k); bring(); });
t.addEventListener("keydown", function (e) {
var m = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
if (m) { open(story + m); tabs[story].focus(); e.preventDefault(); }
});
});
if ("IntersectionObserver" in window) {
new IntersectionObserver(function (es) {
var e = es[0], room = (e.rootBounds && e.rootBounds.height) || window.innerHeight;
seen = e.isIntersecting && (e.intersectionRatio >= 0.98 || e.intersectionRect.height >= 0.9 * room);
apply();
}, { threshold: [0, 0.25, 0.5, 0.75, 0.9, 0.95, 0.98, 1] }).observe(dev);
} else { seen = true; }
document.addEventListener("visibilitychange", apply);
window.addEventListener("load", more);
open(0);
})();