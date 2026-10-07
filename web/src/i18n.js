/* ---------- Amharic (አማርኛ) ----------
   The app renders in English; this layer swaps visible text and labels to Amharic when chosen.
   Code, test names, challenge instructions and anything people type stay as they are.
   Add a string: put the exact English text (as shown on screen) on the left. */
const I18N = (() => {
  // English -> Amharic for the old screens, built from the message files (src/next/messages).
  const AM = (() => { const m = window.TBNext.messages, out = {}; for (const k in m.en) if (m.am[k]) out[m.en[k]] = m.am[k]; return out; })();

  const S = (s) => AM[s] || s;
  // Dynamic text: [pattern, replacement]; replacements may call S() on captured parts.
  const PAT = [
    [/^Next: (.+) →$/, (m, t) => `ቀጣይ፦ ${S(t)} →`],
    [/^🎉 That finishes Module (\d+)\. You can submit it for review\.$/, (m, n) => `🎉 ይህ ሞጁል ${n}ን ያጠናቅቃል። ለግምገማ ማስገባት ይችላሉ።`],
    [/^(\d+)d (\d+)h left$/, (m, d, h) => `${d} ቀን ${h} ሰዓት ቀርቷል`],
    [/^(\d+)h (\d+)m left$/, (m, h, n) => `${h} ሰዓት ${n} ደቂቃ ቀርቷል`],
    [/^(\d+)m left$/, (m, n) => `${n} ደቂቃ ቀርቷል`],
    [/^Nudge @([\w-]+)$/, (m, u) => `@${u}ን አስታውስ`],
    [/^Nudged · again in (\d+) h$/, (m, n) => `ተልኳል · እንደገና በ${n} ሰዓት`],
    [/^You can nudge again in (\d+) h\.?$/, (m, n) => `በ${n} ሰዓት ውስጥ እንደገና ማስታወስ ይችላሉ`],
    [/^Sent\. @([\w-]+) got a notification here and on GitHub\.$/, (m, u) => `ተልኳል። @${u} እዚህና በGitHub ማሳወቂያ ደርሶታል።`],
    [/^Circle: (.+?)( · joined (.+))?$/, (m, c, j, d) => `ክበብ፦ ${c}${j ? ` · የተቀላቀለው ${d}` : ""}`],
    [/^Learner · joined (.+)$/, (m, d) => `ተማሪ · የተቀላቀለው ${d}`],
    [/^Loading @([\w-]+)…$/, (m, u) => `@${u} በመጫን ላይ…`],
    [/^Nobody follows @([\w-]+) yet\.$/, (m, u) => `ገና ማንም @${u}ን አይከተልም።`],
    [/^@([\w-]+) doesn't follow anyone yet\.$/, (m, u) => `@${u} ገና ማንንም አይከተልም።`],
    [/^(\d+) pts reputation$/, (m, n) => `${n} ነጥብ ዝና`],
    [/^(\d+) challenges$/, (m, n) => `${n} ተግዳሮቶች`],
    [/^(JavaScript|Go): (\d+) challenges$/, (m, l, n) => `${l}፦ ${n} ተግዳሮቶች`],
    [/^← (JavaScript|Go) challenges$/, (m, l) => `← የ${l} ተግዳሮቶች`],
    [/^Run the tests once more on (.+) to save (those solutions|that solution) for review\.$/, (m, t, w) => `ለግምገማ ${w === "those solutions" ? "እነዚያን መፍትሔዎች" : "ያንን መፍትሔ"} ለማስቀመጥ ሙከራዎቹን በ${t} ላይ አንድ ጊዜ እንደገና ያሂዱ።`],
    [/^Module (\d+)$/, (m, n) => `ሞጁል ${n}`],
    [/^(\d+)\/(\d+) passed$/, (m, a, b) => `${a}/${b} አልፈዋል`],
    [/^All (\d+) passed\.$/, (m, n) => `ሁሉም ${n} አልፈዋል።`],
    [/^Pass all (\d+) challenges on the grader to submit this module for review\.$/, (m, n) => `ይህን ሞጁል ለግምገማ ለማስገባት ሁሉንም ${n} ተግዳሮቶች በአራሚው ያልፉ።`],
    [/^assigned (.+)$/, (m, t) => `የተመደበው ${S(t)}`],
    [/^\+(\d+) more$/, (m, n) => `+${n} ተጨማሪ`],
    [/^Start (JavaScript|Go) →$/, (m, l) => `${l} ይጀምሩ →`],
    [/^Continue · (\d+\/\d+) →$/, (m, n) => `ይቀጥሉ · ${n} →`],
    [/^(\d+) of (\d+) points$/, (m, a, b) => `${a} ከ${b} ነጥቦች`],
    [/^(\d+) members · reviews go here first$/, (m, n) => `${n} አባላት · ግምገማዎች መጀመሪያ እዚህ ይሄዳሉ`],
    [/^(\d+) to review$/, (m, n) => `${n} የሚገመገሙ`],
    [/^(\d+\/\d+) solved$/, (m, n) => `${n} ተፈተዋል`],
    [/^(\d+) pts$/, (m, n) => `${n} ነጥብ`],
    [/^pts \(([+−-]?\d+)\)$/, (m, n) => `ነጥብ (${n})`],
    [/^(\d+) \/ (\d+) tests passed$/, (m, a, b) => `${a} / ${b} ሙከራዎች አልፈዋል`],
    [/^(\d+) \/ (\d+) passed$/, (m, a, b) => `${a} / ${b} አልፈዋል`],
    [/^(\d+) \/ 40 characters minimum$/, (m, n) => `${n} / 40 ቁምፊዎች ቢያንስ`],
    [/^Reviewed ★(\d)$/, (m, n) => `ተገምግሟል ★${n}`],
    [/^(\d+) rated reviews?$/, (m, n) => `${n} ደረጃ የተሰጣቸው ግምገማዎች`],
    [/^(\d+) to (Helpful|Trusted|Mentor)$/, (m, n, l) => `${S(l)} ለመሆን ${n}`],
    [/^Reputation · (.+)$/, (m, l) => `ዝና · ${S(l)}`],
    [/^(\d+) h ago$/, (m, n) => `ከ${n} ሰዓት በፊት`],
    [/^(\d+) d ago$/, (m, n) => `ከ${n} ቀን በፊት`],
    [/^(\d+) min ago$/, (m, n) => `ከ${n} ደቂቃ በፊት`],
    [/^just now$/, () => "አሁን"],
    [/^Last run: (\d+) of (\d+) tests passed · (.+)$/, (m, a, b, t) => `የመጨረሻ ሙከራ፦ ከ${b} ${a} አልፈዋል · ${tr(t) || t}`],
    [/^Checking commit (\w+)…$/, (m, c) => `commit ${c}ን በመፈተሽ ላይ…`],
    [/^All (\d+) passed ✓$/, (m, n) => `ሁሉም ${n} አልፈዋል ✓`],
    [/^(\d+) of (\d+) passed$/, (m, a, b) => `ከ${b} ${a} አልፈዋል`],
    [/^Your last push, (.+)\. Fix these, commit, and run the tests again:$/, (m, t) => `የመጨረሻው ግፊትዎ፣ ${tr(t) || t}። እነዚህን አስተካክለው commit ያድርጉና ሙከራዎቹን እንደገና ያሂዱ፦`],
    [/^Open (solution\.(?:js|go)) on GitHub ↗$/, (m, f) => `${f}ን በGitHub ይክፈቱ ↗`],
    [/^(\d+) of (\d+) tests passed$/, (m, a, b) => `ከ${b} ሙከራዎች ${a} አልፈዋል`],
    [/^Your last push, (.+)\. Fix these and push again:$/, (m, t) => `የመጨረሻው ግፊትዎ፣ ${tr(t) || t}። እነዚህን አስተካክለው እንደገና ይግፉ፦`],
    [/^run with$/, () => "የሚሄደው በ"],
    [/^Your latest push passed (\d+) of (\d+) tests\.$/, (m, a, b) => `የመጨረሻው ግፊትዎ ከ${b} ሙከራዎች ${a}ቱን አልፏል።`],
    [/^Pushed (.+)$/, (m, t) => `የተገፋው ${S(t)}`],
    [/^in your repository:$/, () => "በማከማቻዎ ውስጥ፦"],
    [/^All (\d+) (tests|checks) pass here\. Now submit it from GitHub\.$/, (m, n, k) => `ሁሉም ${n} ${k === "tests" ? "ሙከራዎች" : "ፍተሻዎች"} እዚህ አልፈዋል። አሁን ከGitHub ያስገቡት።`],
    [/^Push all (\d+) challenges from your GitHub repository to submit this module for review\.$/, (m, n) => `ይህን ሞጁል ለግምገማ ለማስገባት ሁሉንም ${n} ተግዳሮቶች ከGitHub ማከማቻዎ ይግፉ።`],
    [/^Push "(.+)" from your GitHub repository first: only pushed solutions are submitted\.$/, (m, t) => `መጀመሪያ "${S(t)}"ን ከGitHub ማከማቻዎ ይግፉ፦ የሚገቡት የተገፉ መፍትሔዎች ብቻ ናቸው።`],
    [/^All (\d+) (tests|checks) pass in your browser\.$/, (m, n, k) => `ሁሉም ${n} ${k === "tests" ? "ሙከራዎች" : "ፍተሻዎች"} በአሳሽዎ አልፈዋል።`],
    [/^All (\d+) (tests|checks) pass here\. Saving…$/, (m, n, k) => `ሁሉም ${n} ${k === "tests" ? "ሙከራዎች" : "ፍተሻዎች"} እዚህ አልፈዋል። በማስቀመጥ ላይ…`],
    [/^(.*?) ?Run the tests again to retry\.$/, (m, e) => `${e === "No connection to Timirtbet." ? "ከትምህርት ቤት ጋር ግንኙነት የለም።" : e === "The grader took too long." ? "አራሚው በጣም ዘገየ።" : e} እንደገና ለመሞከር ሙከራዎቹን ያሂዱ።`],
    [/^Module (\d+): (\d+) of (\d+) done\.$/, (m, n, a, b) => `ሞጁል ${n}፦ ${a} ከ${b} ተጠናቀዋል።`],
    [/^Module (\d+): all (\d+) done\.$/, (m, n, b) => `ሞጁል ${n}፦ ሁሉም ${b} ተጠናቀዋል።`],
    [/^That completes Module (\d+)\.$/, (m, n) => `ይህ ሞጁል ${n}ን ያጠናቅቃል።`],
    [/^Next: (.+) →$/, (m, t) => `ቀጣይ፦ ${S(t)} →`],
    [/^([+−-]\d+) pts$/, (m, n) => `${n} ነጥብ`],
    [/^Notifications, (\d+) unread$/, (m, n) => `ማሳወቂያዎች፣ ${n} ያልተነበቡ`],
    [/^Review: Module (\d+) · (.+)$/, (m, n, t) => `ግምገማ፦ ሞጁል ${n} · ${S(t)}`],
    [/^solved (.+)$/, (m, t) => `${S(t)}ን ፈታ`],
    [/^reviewed your (.+)$/, (m, t) => `የእርስዎን ${S(t)} ገመገመ`],
    [/^Review: (.+)$/, (m, t) => `ግምገማ፦ ${S(t)}`],
    [/^(\d+) of 8 members\. Your submissions go to a member here first; the wider pool steps in only when nobody here who solved the challenge is free\.$/,
      (m, n) => `ከ8 አባላት ${n}። ያስገቡት መጀመሪያ እዚህ ላለ አባል ይሄዳል፤ ተግዳሮቱን የፈታ ነፃ አባል እዚህ ከሌለ ብቻ ሰፊው ቡድን ይገባል።`],
    [/^Leave (.+)\? Your reviews will come from the wider pool\.$/, (m, c) => `ከ${c} ይውጡ? ግምገማዎችዎ ከሰፊው ቡድን ይመጣሉ።`],
    [/^When every test passes, submit\. Someone in (.+) who solved this challenge reviews it, and you rate their review\.$/,
      (m, c) => `ሁሉም ሙከራዎች ሲያልፉ ያስገቡ። ይህን ተግዳሮት የፈታ የ${c} አባል ይገመግመዋል፣ እርስዎም ግምገማውን ይመዝናሉ።`],
    [/^review rated ★1$/, () => "★1 የተሰጠው ግምገማ"],
  ];

  function tr(s) {
    if (AM[s]) return AM[s];
    for (const [re, fn] of PAT) if (re.test(s)) return s.replace(re, fn);
    if (s.includes(" · ")) { // "Loops · Basic", "JavaScript · Loops · from your circle"
      const parts = s.split(" · "), out = parts.map((p) => tr(p) || p);
      if (out.some((p, i) => p !== parts[i])) return out.join(" · ");
    }
    if (/^· /.test(s)) { const t = tr(s.slice(2)); if (t) return "· " + t; }
    if (/ ·$/.test(s)) { const t = tr(s.slice(0, -2)); if (t) return t + " ·"; }
    return null;
  }

  const SKIP = "pre,code,textarea,script,style,.cm-editor,.track-code,.mono.hash,[data-i18n-skip]";
  const ATTRS = ["placeholder", "aria-label", "title"], SKIP_ATTR = "pre,code,script,style,.cm-editor,[data-i18n-skip]";
  let lang = "en";
  try { lang = localStorage.getItem("timirtbet.lang") || ((navigator.language || "").toLowerCase().startsWith("am") ? "am" : "en"); } catch (e) {}

  function textNode(n) {
    const el = n.parentElement; if (!el || el.closest(SKIP)) return;
    const en = n.__en != null ? n.__en : n.data;
    if (lang === "am") {
      const key = en.replace(/\s+/g, " ").trim(); if (!key || !/[A-Za-z]/.test(key)) return;
      const t = tr(key); if (t == null) return;
      n.__en = en; const lead = en.match(/^\s*/)[0], tail = en.match(/\s*$/)[0];
      if (n.data !== lead + t + tail) n.data = lead + t + tail;
    } else if (n.__en != null) { n.data = n.__en; n.__en = null; }
  }
  function element(el) {
    if (el.closest(SKIP_ATTR)) return;
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      el.__enA = el.__enA || {};
      const en = el.__enA[a] != null ? el.__enA[a] : el.getAttribute(a);
      if (lang === "am") { const t = tr(en.trim()); if (t != null) { el.__enA[a] = en; el.setAttribute(a, t); } }
      else if (el.__enA[a] != null) { el.setAttribute(a, el.__enA[a]); delete el.__enA[a]; }
    }
  }
  function apply(root) {
    if (!root) return;
    if (root.nodeType === 3) return textNode(root);
    if (root.nodeType !== 1) return;
    element(root);
    root.querySelectorAll("[placeholder],[aria-label],[title]").forEach(element);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) textNode(n);
  }
  function set(l) {
    lang = l === "am" ? "am" : "en";
    if (window.TBNext) window.TBNext.setLang(lang);
    try { localStorage.setItem("timirtbet.lang", lang); } catch (e) {}
    document.documentElement.lang = lang;
    document.title = lang === "am" ? "ትምህርት ቤት | Timirtbet" : "Timirtbet | ትምህርት ቤት";
    apply(document.body);
  }
  function start() {
    new MutationObserver((ms) => { if (lang !== "am") return; for (const m of ms) m.addedNodes.forEach(apply); })
      .observe(document.body, { childList: true, subtree: true });
    set(lang);
  }
  return { start, set, tr, get lang() { return lang; } };
})();
