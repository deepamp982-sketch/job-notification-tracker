(() => {
  const SAVED_KEY = "job-notification-tracker-saved";
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
    if (filterState.sort === "latest") {
      list.sort((a, b) => (a.postedDaysAgo || 0) - (b.postedDaysAgo || 0));
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

    return `
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
              <option value="oldest" ${filterState.sort === "oldest" ? "selected" : ""}>Oldest</option>
            </select>
          </div>
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

    return `
      <article class="job-card card" data-job-id="${escapeHtml(job.id)}">
        <header class="job-card__header">
          <h3 class="job-card__title">${escapeHtml(job.title)}</h3>
          <span class="badge badge--source">${escapeHtml(job.source)}</span>
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
      const event = el.tagName === "INPUT" ? "input" : "change";
      el.addEventListener(event, () => {
        filterState[key] = el.value || "";
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
      primary.innerHTML =
        getFilterBarMarkup() +
        '<div class="card state"><p class="state__body">No jobs match your search.</p></div>';
    }
    bindFilterBar(primary);
    bindJobCards(primary);
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
    return `
      <article class="card">
        <header class="card__header">
          <h2 class="card__title">Preferences</h2>
          <p class="card__subtitle">Placeholder fields. No logic or saving yet.</p>
        </header>
        <div class="card__section form-grid">
          <div class="field">
            <label class="field__label" for="role-keywords">Role keywords</label>
            <input id="role-keywords" class="input" type="text" placeholder="e.g. Product Manager, UX" />
          </div>
          <div class="field">
            <label class="field__label" for="locations">Preferred locations</label>
            <input id="locations" class="input" type="text" placeholder="e.g. London, Remote" />
          </div>
        </div>
        <div class="card__section form-grid">
          <div class="field">
            <label class="field__label" for="mode">Mode</label>
            <select id="mode" class="select">
              <option value="">Select</option>
              <option>Remote</option>
              <option>Hybrid</option>
              <option>Onsite</option>
            </select>
          </div>
          <div class="field">
            <label class="field__label" for="experience">Experience level</label>
            <select id="experience" class="select">
              <option value="">Select</option>
              <option>Entry</option>
              <option>Mid</option>
              <option>Senior</option>
              <option>Lead</option>
            </select>
          </div>
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
