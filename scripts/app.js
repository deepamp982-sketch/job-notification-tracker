(() => {
  const SAVED_KEY = "job-notification-tracker-saved";
  const PREF_KEY = "jobTrackerPreferences";
  const jobs = typeof window.JOB_DATA !== "undefined" ? window.JOB_DATA : [];

  const routes = {
    "/": {
      title: "Stop Missing The Right Jobs.",
      subtitle: "Precision-matched job discovery delivered daily at 9AM.",
      type: "landing"
    },
    "/dashboard": {
      title: "Dashboard",
      subtitle: "Browse and filter jobs below.",
      type: "dashboard"
    },
    "/saved": {
      title: "Saved",
      subtitle: "Jobs you save will appear here.",
      type: "saved"
    },
    "/digest": {
      title: "Digest",
      subtitle: "Your daily job summary will appear here, delivered at 9AM.",
      type: "empty-digest"
    },
    "/settings": {
      title: "Settings",
      subtitle: "Set your preferences so we can match you with the right roles.",
      type: "settings"
    },
    "/proof": {
      title: "Proof",
      subtitle: "Artifact collection and deployment proof will live here.",
      type: "proof"
    }
  };

  const notFoundTitle = "Page Not Found";
  const notFoundSubtitle = "The page you are looking for does not exist.";

  let currentPath = null;
  let showOnlyMatches = false;
  let filterState = {
    keyword: "",
    location: "",
    mode: "",
    experience: "",
    source: "",
    sort: "latest"
  };

  function normalizePath(pathname) {
    if (!pathname || pathname === "/") return "/";
    if (pathname.endsWith("index.html")) return "/";
    return pathname;
  }

  function loadPreferences() {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;

      return {
        roleKeywords: String(parsed.roleKeywords || ""),
        preferredLocations: Array.isArray(parsed.preferredLocations)
          ? parsed.preferredLocations.map(String)
          : [],
        preferredMode: Array.isArray(parsed.preferredMode)
          ? parsed.preferredMode.map(String)
          : [],
        experienceLevel: String(parsed.experienceLevel || ""),
        skills: String(parsed.skills || ""),
        minMatchScore:
          typeof parsed.minMatchScore === "number"
            ? Math.max(0, Math.min(100, parsed.minMatchScore))
            : 40
      };
    } catch (_) {
      return null;
    }
  }

  function savePreferences(prefs) {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch (_) {}
  }

  function splitTokens(csv) {
    return String(csv || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  function preferencesAreSet(prefs) {
    if (!prefs) return false;
    const hasKeywords = splitTokens(prefs.roleKeywords).length > 0;
    const hasLocations = (prefs.preferredLocations || []).length > 0;
    const hasModes = (prefs.preferredMode || []).length > 0;
    const hasExp = Boolean((prefs.experienceLevel || "").trim());
    const hasSkills = splitTokens(prefs.skills).length > 0;
    return hasKeywords || hasLocations || hasModes || hasExp || hasSkills;
  }

  function computeMatchScore(job, prefs) {
    const p = prefs || {
      roleKeywords: "",
      preferredLocations: [],
      preferredMode: [],
      experienceLevel: "",
      skills: "",
      minMatchScore: 40
    };

    const keywords = splitTokens(p.roleKeywords);
    const userSkills = splitTokens(p.skills);
    const title = String(job.title || "").toLowerCase();
    const description = String(job.description || "").toLowerCase();

    let score = 0;

    // +25 if any roleKeyword appears in job.title (case-insensitive)
    if (keywords.length > 0 && keywords.some((k) => title.includes(k))) score += 25;

    // +15 if any roleKeyword appears in job.description
    if (keywords.length > 0 && keywords.some((k) => description.includes(k))) score += 15;

    // +15 if job.location matches preferredLocations
    if ((p.preferredLocations || []).length > 0 && p.preferredLocations.includes(job.location))
      score += 15;

    // +10 if job.mode matches preferredMode
    if ((p.preferredMode || []).length > 0 && p.preferredMode.includes(job.mode)) score += 10;

    // +10 if job.experience matches experienceLevel
    if (p.experienceLevel && job.experience === p.experienceLevel) score += 10;

    // +15 if overlap between job.skills and user.skills (any match)
    if (
      userSkills.length > 0 &&
      Array.isArray(job.skills) &&
      job.skills.map((s) => String(s).toLowerCase()).some((s) => userSkills.includes(s))
    ) {
      score += 15;
    }

    // +5 if postedDaysAgo <= 2
    if ((job.postedDaysAgo ?? 999) <= 2) score += 5;

    // +5 if source is LinkedIn
    if (String(job.source || "").toLowerCase() === "linkedin") score += 5;

    return Math.min(100, score);
  }

  function matchBadgeVariant(score) {
    if (score >= 80) return "badge--success";
    if (score >= 60) return "badge--warning";
    if (score >= 40) return "badge--neutral";
    return "badge--subtle";
  }

  function parseSalaryValue(salaryRange) {
    const raw = String(salaryRange || "").toLowerCase();

    if (raw.includes("lpa")) {
      const nums = raw.match(/(\\d+(\\.\\d+)?)/g);
      if (!nums || nums.length === 0) return 0;
      const a = parseFloat(nums[0]);
      const b = nums.length > 1 ? parseFloat(nums[1]) : a;
      const midLpa = (a + b) / 2;
      return midLpa * 100000;
    }

    if (raw.includes("/month") || raw.includes("month")) {
      const nums = raw.match(/(\\d+(\\.\\d+)?)/g);
      if (!nums || nums.length === 0) return 0;
      const a = parseFloat(nums[0]);
      const b = nums.length > 1 ? parseFloat(nums[1]) : a;
      const midK = (a + b) / 2;
      const monthly = midK * 1000;
      return monthly * 12;
    }

    return 0;
  }

  function setActiveLink(path) {
    const links = document.querySelectorAll("[data-route]");
    links.forEach((link) => {
      const linkPath = link.getAttribute("data-route");
      if (path && linkPath === path) {
        link.classList.add("primary-nav__link--active");
      } else {
        link.classList.remove("primary-nav__link--active");
      }
    });
  }

  function getSavedIds() {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function setSavedIds(ids) {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
    } catch (_) {}
  }

  function isSaved(id) {
    return getSavedIds().includes(id);
  }

  function saveJob(id) {
    const ids = getSavedIds();
    if (ids.includes(id)) return;
    setSavedIds([...ids, id]);
  }

  function unsaveJob(id) {
    setSavedIds(getSavedIds().filter((s) => s !== id));
  }

  function getFilteredJobs() {
    let list = jobs.slice();
    const kw = (filterState.keyword || "").trim().toLowerCase();
    if (kw) {
      list = list.filter(
        (j) =>
          (j.title || "").toLowerCase().includes(kw) ||
          (j.company || "").toLowerCase().includes(kw)
      );
    }
    if (filterState.location) {
      list = list.filter((j) => (j.location || "") === filterState.location);
    }
    if (filterState.mode) {
      list = list.filter((j) => (j.mode || "") === filterState.mode);
    }
    if (filterState.experience) {
      list = list.filter((j) => (j.experience || "") === filterState.experience);
    }
    if (filterState.source) {
      list = list.filter((j) => (j.source || "") === filterState.source);
    }
    const prefs = loadPreferences();
    const prefsReady = preferencesAreSet(prefs);
    if (showOnlyMatches && prefsReady) {
      const min = typeof prefs.minMatchScore === "number" ? prefs.minMatchScore : 40;
      list = list.filter((j) => computeMatchScore(j, prefs) >= min);
    }

    if (filterState.sort === "latest") {
      list.sort((a, b) => (a.postedDaysAgo || 0) - (b.postedDaysAgo || 0));
    } else if (filterState.sort === "match") {
      list.sort((a, b) => computeMatchScore(b, prefs) - computeMatchScore(a, prefs));
    } else if (filterState.sort === "salary") {
      list.sort((a, b) => parseSalaryValue(b.salaryRange) - parseSalaryValue(a.salaryRange));
    } else if (filterState.sort === "oldest") {
      list.sort((a, b) => (b.postedDaysAgo || 0) - (a.postedDaysAgo || 0));
    }
    return list;
  }

  function getFilterBarMarkup() {
    const locations = [...new Set(jobs.map((j) => j.location).filter(Boolean))].sort();
    const modes = [...new Set(jobs.map((j) => j.mode).filter(Boolean))].sort();
    const experiences = [...new Set(jobs.map((j) => j.experience).filter(Boolean))].sort();
    const sources = [...new Set(jobs.map((j) => j.source).filter(Boolean))].sort();
    const prefs = loadPreferences();
    const prefsReady = preferencesAreSet(prefs);
    const threshold = prefsReady ? Number(prefs.minMatchScore ?? 40) : 40;

    return `
      ${!prefsReady ? `<div class="banner card"><p class="state__body">Set your preferences to activate intelligent matching.</p><div class="state__actions"><a class="btn btn--secondary btn--sm" href="/settings" data-navigate="/settings">Go to Settings</a></div></div>` : ""}
      <div class="filter-bar card">
        <div class="filter-bar__row">
          <div class="field filter-bar__keyword">
            <label class="field__label" for="filter-keyword">Keyword</label>
            <input id="filter-keyword" class="input" type="text" placeholder="Title or company" value="${escapeHtml(filterState.keyword)}" data-filter="keyword" />
          </div>
          <div class="field">
            <label class="field__label" for="filter-location">Location</label>
            <select id="filter-location" class="select" data-filter="location">
              <option value="">All</option>
              ${locations.map((l) => `<option value="${escapeHtml(l)}" ${filterState.location === l ? "selected" : ""}>${escapeHtml(l)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label class="field__label" for="filter-mode">Mode</label>
            <select id="filter-mode" class="select" data-filter="mode">
              <option value="">All</option>
              ${modes.map((m) => `<option value="${escapeHtml(m)}" ${filterState.mode === m ? "selected" : ""}>${escapeHtml(m)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label class="field__label" for="filter-experience">Experience</label>
            <select id="filter-experience" class="select" data-filter="experience">
              <option value="">All</option>
              ${experiences.map((e) => `<option value="${escapeHtml(e)}" ${filterState.experience === e ? "selected" : ""}>${escapeHtml(e)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label class="field__label" for="filter-source">Source</label>
            <select id="filter-source" class="select" data-filter="source">
              <option value="">All</option>
              ${sources.map((s) => `<option value="${escapeHtml(s)}" ${filterState.source === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label class="field__label" for="filter-sort">Sort</label>
            <select id="filter-sort" class="select" data-filter="sort">
              <option value="latest" ${filterState.sort === "latest" ? "selected" : ""}>Latest</option>
              <option value="match" ${filterState.sort === "match" ? "selected" : ""}>Match Score</option>
              <option value="salary" ${filterState.sort === "salary" ? "selected" : ""}>Salary</option>
              <option value="oldest" ${filterState.sort === "oldest" ? "selected" : ""}>Oldest</option>
            </select>
          </div>
        </div>
        <div class="toggle-row">
          <label class="toggle">
            <input type="checkbox" data-filter="showOnlyMatches" ${showOnlyMatches ? "checked" : ""} ${prefsReady ? "" : "disabled"} />
            <span>Show only jobs above my threshold</span>
          </label>
          <span class="text-muted toggle-hint">${prefsReady ? `Threshold: ${escapeHtml(String(threshold))}` : "Set preferences to enable"}</span>
        </div>
      </div>
    `;
  }

  function escapeHtml(s) {
    if (s == null) return "";
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function postedLabel(days) {
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  }

  function getJobCardMarkup(job, options = {}) {
    const { showSave = true, showUnsave = false } = options;
    const saved = isSaved(job.id);
    const prefs = loadPreferences();
    const score = computeMatchScore(job, prefs);
    const scoreVariant = matchBadgeVariant(score);

    return `
      <article class="job-card card" data-job-id="${escapeHtml(job.id)}">
        <header class="job-card__header">
          <h3 class="job-card__title">${escapeHtml(job.title)}</h3>
          <div class="job-card__badges">
            <span class="badge ${scoreVariant} badge--score" title="Match score">${score}</span>
            <span class="badge badge--source">${escapeHtml(job.source)}</span>
          </div>
        </header>
        <p class="job-card__company">${escapeHtml(job.company)}</p>
        <p class="job-card__meta">${escapeHtml(job.location)} · ${escapeHtml(job.mode)} · ${escapeHtml(job.experience)}</p>
        <p class="job-card__salary">${escapeHtml(job.salaryRange)}</p>
        <p class="job-card__posted">${postedLabel(job.postedDaysAgo ?? 0)}</p>
        <div class="job-card__actions button-row">
          <button type="button" class="btn btn--secondary btn--sm" data-action="view" data-job-id="${escapeHtml(job.id)}">View</button>
          ${showSave && !saved ? `<button type="button" class="btn btn--secondary btn--sm" data-action="save" data-job-id="${escapeHtml(job.id)}">Save</button>` : ""}
          ${showUnsave || saved ? `<button type="button" class="btn btn--ghost btn--sm" data-action="unsave" data-job-id="${escapeHtml(job.id)}">${saved ? "Unsave" : "Unsave"}</button>` : ""}
          <a href="${escapeHtml(job.applyUrl || "#")}" target="_blank" rel="noopener" class="btn btn--primary btn--sm" data-action="apply" data-job-id="${escapeHtml(job.id)}">Apply</a>
        </div>
      </article>
    `;
  }

  function openModal(job) {
    const el = document.getElementById("job-modal");
    const body = document.getElementById("modal-body");
    if (!el || !body) return;
    const skills = (job.skills || []).join(", ");
    body.innerHTML = `
      <p class="modal__description">${escapeHtml(job.description || "")}</p>
      ${skills ? `<p class="modal__skills"><strong>Skills:</strong> ${escapeHtml(skills)}</p>` : ""}
    `;
    document.getElementById("modal-title").textContent = job.title || "Job details";
    el.classList.add("modal--open");
    el.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    const el = document.getElementById("job-modal");
    if (!el) return;
    el.classList.remove("modal--open");
    el.setAttribute("aria-hidden", "true");
  }

  function bindModal() {
    document.querySelectorAll("[data-modal-close]").forEach((node) => {
      node.addEventListener("click", closeModal);
    });
  }

  function bindFilterBar(container) {
    if (!container) return;
    container.querySelectorAll("[data-filter]").forEach((el) => {
      const key = el.getAttribute("data-filter");
      const isCheckbox = el.tagName === "INPUT" && el.getAttribute("type") === "checkbox";
      const event = el.tagName === "INPUT" && !isCheckbox ? "input" : "change";
      el.addEventListener(event, () => {
        if (key === "showOnlyMatches") {
          showOnlyMatches = Boolean(el.checked);
        } else {
          filterState[key] = el.value || "";
        }
        if (currentPath === "/dashboard") renderDashboardContent();
        if (currentPath === "/saved") renderSavedContent();
      });
    });
  }

  function bindJobCards(container) {
    if (!container) return;
    container.querySelectorAll("[data-action]").forEach((btn) => {
      const action = btn.getAttribute("data-action");
      const jobId = btn.getAttribute("data-job-id");
      const job = jobs.find((j) => j.id === jobId);
      if (action === "view" && job) {
        btn.addEventListener("click", () => openModal(job));
      } else if (action === "save" && jobId) {
        btn.addEventListener("click", () => {
          saveJob(jobId);
          if (currentPath === "/dashboard") renderDashboardContent();
          if (currentPath === "/saved") renderSavedContent();
        });
      } else if (action === "unsave" && jobId) {
        btn.addEventListener("click", () => {
          unsaveJob(jobId);
          if (currentPath === "/dashboard") renderDashboardContent();
          if (currentPath === "/saved") renderSavedContent();
        });
      }
      if (action === "apply") {
        btn.addEventListener("click", (e) => {
          const j = jobId ? jobs.find((j) => j.id === jobId) : job;
          if (j && j.applyUrl && (btn.getAttribute("href") === "#" || !btn.getAttribute("href"))) {
            e.preventDefault();
            window.open(j.applyUrl, "_blank", "noopener");
          }
        });
      }
    });
  }

  function renderDashboardContent() {
    const primary = document.getElementById("workspace-primary");
    if (!primary) return;
    const list = getFilteredJobs();
    primary.innerHTML =
      getFilterBarMarkup() +
      '<div class="job-list">' +
      list.map((j) => getJobCardMarkup(j, { showSave: true, showUnsave: false })).join("") +
      "</div>";
    if (list.length === 0) {
      const prefs = loadPreferences();
      const prefsReady = preferencesAreSet(prefs);
      const message =
        showOnlyMatches && prefsReady
          ? "No roles match your criteria. Adjust filters or lower threshold."
          : "No jobs match your search.";
      primary.innerHTML =
        getFilterBarMarkup() +
        `<div class="card state"><p class="state__body">${escapeHtml(message)}</p></div>`;
    }
    bindFilterBar(primary);
    bindJobCards(primary);
    bindNavigateLinks(primary);
  }

  function renderSavedContent() {
    const primary = document.getElementById("workspace-primary");
    if (!primary) return;
    const savedIds = getSavedIds();
    const savedJobs = savedIds.map((id) => jobs.find((j) => j.id === id)).filter(Boolean);
    if (savedJobs.length === 0) {
      primary.innerHTML = `
        <article class="card">
          <div class="state">
            <p class="state__body">Jobs you save will appear here. Start tracking from the Dashboard to build your list.</p>
          </div>
        </article>
      `;
      return;
    }
    primary.innerHTML =
      '<div class="job-list">' +
      savedJobs.map((j) => getJobCardMarkup(j, { showSave: false, showUnsave: true })).join("") +
      "</div>";
    bindJobCards(primary);
  }

  function getSettingsMarkup() {
    const prefs = loadPreferences() || {
      roleKeywords: "",
      preferredLocations: [],
      preferredMode: [],
      experienceLevel: "",
      skills: "",
      minMatchScore: 40
    };
    const locations = [...new Set(jobs.map((j) => j.location).filter(Boolean))].sort();
    const selectedLocations = new Set((prefs.preferredLocations || []).map(String));
    const selectedModes = new Set((prefs.preferredMode || []).map(String));

    return `
      <article class="card">
        <header class="card__header">
          <h2 class="card__title">Preferences</h2>
          <p class="card__subtitle">Saved locally. Used for deterministic match scoring.</p>
        </header>
        <div class="card__section form-grid">
          <div class="field">
            <label class="field__label" for="pref-role-keywords">Role keywords</label>
            <input id="pref-role-keywords" class="input" type="text" placeholder="e.g. backend, SDE, intern" value="${escapeHtml(prefs.roleKeywords)}" />
            <p class="field__hint">Comma-separated. Used to score title and description matches.</p>
          </div>
          <div class="field">
            <label class="field__label" for="pref-locations">Preferred locations</label>
            <select id="pref-locations" class="select" multiple size="4">
              ${locations
                .map(
                  (l) =>
                    `<option value="${escapeHtml(l)}" ${selectedLocations.has(l) ? "selected" : ""}>${escapeHtml(l)}</option>`
                )
                .join("")}
            </select>
            <p class="field__hint">Multi-select. Hold Ctrl/⌘ to select multiple.</p>
          </div>
        </div>
        <div class="card__section form-grid">
          <div class="field">
            <span class="field__label">Preferred mode</span>
            <div class="checklist">
              <label class="checklist__item"><input type="checkbox" value="Remote" ${selectedModes.has("Remote") ? "checked" : ""} data-pref-mode /> Remote</label>
              <label class="checklist__item"><input type="checkbox" value="Hybrid" ${selectedModes.has("Hybrid") ? "checked" : ""} data-pref-mode /> Hybrid</label>
              <label class="checklist__item"><input type="checkbox" value="Onsite" ${selectedModes.has("Onsite") ? "checked" : ""} data-pref-mode /> Onsite</label>
            </div>
          </div>
          <div class="field">
            <label class="field__label" for="pref-experience">Experience level</label>
            <select id="pref-experience" class="select">
              <option value="" ${prefs.experienceLevel === "" ? "selected" : ""}>Any</option>
              <option value="Fresher" ${prefs.experienceLevel === "Fresher" ? "selected" : ""}>Fresher</option>
              <option value="0-1" ${prefs.experienceLevel === "0-1" ? "selected" : ""}>0-1</option>
              <option value="1-3" ${prefs.experienceLevel === "1-3" ? "selected" : ""}>1-3</option>
              <option value="3-5" ${prefs.experienceLevel === "3-5" ? "selected" : ""}>3-5</option>
            </select>
          </div>
        </div>
        <div class="card__section form-grid">
          <div class="field">
            <label class="field__label" for="pref-skills">Skills</label>
            <input id="pref-skills" class="input" type="text" placeholder="e.g. Java, SQL, React" value="${escapeHtml(prefs.skills)}" />
            <p class="field__hint">Comma-separated. Any overlap adds points.</p>
          </div>
          <div class="field">
            <label class="field__label" for="pref-min-score">Minimum match score</label>
            <input id="pref-min-score" type="range" min="0" max="100" step="1" value="${escapeHtml(String(prefs.minMatchScore ?? 40))}" class="range" />
            <div class="range__meta"><span class="text-muted">0</span><span class="range__value" data-range-value>${escapeHtml(String(prefs.minMatchScore ?? 40))}</span><span class="text-muted">100</span></div>
          </div>
        </div>
        <div class="card__section button-row">
          <button type="button" class="btn btn--primary" data-save-prefs>Save preferences</button>
        </div>
      </article>
    `;
  }

  function getLandingMarkup() {
    return `
      <div class="landing-cta">
        <a href="/settings" class="btn btn--primary" data-navigate="/settings">Start Tracking</a>
      </div>
    `;
  }

  function getEmptyStateMarkup(subtitle) {
    return `
      <article class="card">
        <div class="state">
          <p class="state__body">${escapeHtml(subtitle)}</p>
        </div>
      </article>
    `;
  }

  function getProofMarkup() {
    return `
      <article class="card">
        <p class="context-header__subtitle">Artifact collection and deployment proof will live here.</p>
      </article>
    `;
  }

  function getNotFoundMarkup() {
    return `
      <article class="card">
        <div class="state">
          <p class="state__body">${notFoundSubtitle}</p>
        </div>
      </article>
    `;
  }

  function renderWorkspace(path, route) {
    const primary = document.getElementById("workspace-primary");
    const secondary = document.getElementById("workspace-secondary");
    if (!primary) return;

    primary.innerHTML = "";
    if (secondary) secondary.innerHTML = "";

    if (!route) {
      primary.innerHTML = getNotFoundMarkup();
      return;
    }

    switch (route.type) {
      case "landing":
        primary.innerHTML = getLandingMarkup();
        bindNavigateLinks(primary);
        break;
      case "dashboard":
        renderDashboardContent();
        break;
      case "saved":
        renderSavedContent();
        break;
      case "settings":
        primary.innerHTML = getSettingsMarkup();
        bindSettings(primary);
        break;
      case "empty-dashboard":
        primary.innerHTML = getEmptyStateMarkup("No jobs yet. In the next step, you will load a realistic dataset.");
        break;
      case "empty-digest":
        primary.innerHTML = getEmptyStateMarkup("Your daily job summary will appear here, delivered at 9AM.");
        break;
      case "proof":
        primary.innerHTML = getProofMarkup();
        break;
      default:
        primary.innerHTML = getEmptyStateMarkup(route.subtitle || "This section will be built in the next step.");
    }
  }

  function bindNavigateLinks(container) {
    if (!container) return;
    const link = container.querySelector("[data-navigate]");
    if (link) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const path = link.getAttribute("data-navigate");
        if (path) handleNavigation(path, false);
      });
    }
  }

  function bindSettings(container) {
    if (!container) return;
    const saveBtn = container.querySelector("[data-save-prefs]");
    const range = container.querySelector("#pref-min-score");
    const rangeValue = container.querySelector("[data-range-value]");

    if (range && rangeValue) {
      range.addEventListener("input", () => {
        rangeValue.textContent = String(range.value);
      });
    }

    if (!saveBtn) return;
    saveBtn.addEventListener("click", () => {
      const roleKeywords = (container.querySelector("#pref-role-keywords")?.value || "").trim();
      const skills = (container.querySelector("#pref-skills")?.value || "").trim();
      const experienceLevel = container.querySelector("#pref-experience")?.value || "";
      const minMatchScore = parseInt(container.querySelector("#pref-min-score")?.value || "40", 10);

      const preferredLocations = Array.from(
        container.querySelector("#pref-locations")?.selectedOptions || []
      ).map((o) => o.value);

      const preferredMode = Array.from(container.querySelectorAll("[data-pref-mode]"))
        .filter((i) => i.checked)
        .map((i) => i.value);

      savePreferences({
        roleKeywords,
        preferredLocations,
        preferredMode,
        experienceLevel,
        skills,
        minMatchScore: Number.isFinite(minMatchScore) ? minMatchScore : 40
      });

      // Re-render to ensure prefilled UI remains deterministic after save.
      if (currentPath === "/settings") {
        renderWorkspace("/settings", routes["/settings"]);
      }
    });
  }

  function renderRoute(path) {
    if (path === currentPath) return;

    const titleEl = document.getElementById("page-title");
    const subtitleEl = document.getElementById("page-subtitle");
    if (!titleEl || !subtitleEl) return;

    const route = routes[path];

    if (!route) {
      titleEl.textContent = notFoundTitle;
      subtitleEl.textContent = notFoundSubtitle;
      setActiveLink("");
      renderWorkspace(path, null);
    } else {
      titleEl.textContent = route.title;
      subtitleEl.textContent = route.subtitle;
      const effectivePath = path === "/" ? "" : path;
      setActiveLink(effectivePath);
      renderWorkspace(path, route);
    }

    currentPath = path;
  }

  function handleNavigation(path, replace) {
    const normalized = normalizePath(path);
    if (normalized === currentPath) return;

    if (replace) {
      window.history.replaceState({}, "", normalized);
    } else {
      window.history.pushState({}, "", normalized);
    }
    renderRoute(normalized);
  }

  function setupNavLinks() {
    const nav = document.querySelector("[data-primary-nav]");
    const toggle = document.querySelector("[data-nav-toggle]");

    if (nav && toggle) {
      toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("primary-nav--open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      });
    }

    document.querySelectorAll("[data-route]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const targetPath = link.getAttribute("data-route");
        if (!targetPath) return;
        handleNavigation(targetPath, false);
        if (nav && nav.classList.contains("primary-nav--open")) {
          nav.classList.remove("primary-nav--open");
          if (toggle) toggle.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  window.addEventListener("popstate", () => {
    const path = normalizePath(window.location.pathname);
    currentPath = null;
    renderRoute(path);
  });

  window.addEventListener("DOMContentLoaded", () => {
    bindModal();
    setupNavLinks();
    const initialPath = normalizePath(window.location.pathname);
    renderRoute(initialPath);
  });
})();
