(() => {
  const routes = {
    "/": {
      title: "Stop Missing The Right Jobs.",
      subtitle: "Precision-matched job discovery delivered daily at 9AM.",
      type: "landing"
    },
    "/dashboard": {
      title: "Dashboard",
      subtitle: "No jobs yet. In the next step, you will load a realistic dataset.",
      type: "empty-dashboard"
    },
    "/saved": {
      title: "Saved",
      subtitle: "Jobs you save will appear here. Start tracking to build your list.",
      type: "empty-saved"
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
          <p class="state__body">${subtitle}</p>
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
      case "settings":
        primary.innerHTML = getSettingsMarkup();
        break;
      case "empty-dashboard":
        primary.innerHTML = getEmptyStateMarkup("No jobs yet. In the next step, you will load a realistic dataset.");
        break;
      case "empty-saved":
        primary.innerHTML = getEmptyStateMarkup("Jobs you save will appear here. Start tracking to build your list.");
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

    const links = document.querySelectorAll("[data-route]");
    links.forEach((link) => {
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
    setupNavLinks();
    const initialPath = normalizePath(window.location.pathname);
    renderRoute(initialPath);
  });
})();
