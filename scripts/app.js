(() => {
  const routes = {
    "/": { title: "Dashboard" },
    "/dashboard": { title: "Dashboard" },
    "/saved": { title: "Saved" },
    "/digest": { title: "Digest" },
    "/settings": { title: "Settings" },
    "/proof": { title: "Proof" }
  };

  const defaultSubtitle = "This section will be built in the next step.";
  const notFoundTitle = "Page Not Found";
  const notFoundSubtitle =
    "The page you are looking for does not exist.";

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
      if (linkPath === path) {
        link.classList.add("primary-nav__link--active");
      } else {
        link.classList.remove("primary-nav__link--active");
      }
    });
  }

  function renderRoute(path) {
    if (path === currentPath) {
      return;
    }

    const titleEl = document.getElementById("page-title");
    const subtitleEl = document.getElementById("page-subtitle");

    if (!titleEl || !subtitleEl) return;

    const route = routes[path];

    if (!route) {
      titleEl.textContent = notFoundTitle;
      subtitleEl.textContent = notFoundSubtitle;
      setActiveLink(""); // clear active state
    } else {
      titleEl.textContent = route.title;
      subtitleEl.textContent = defaultSubtitle;

      // Map "/" to Dashboard link
      const effectivePath = path === "/" ? "/dashboard" : path;
      setActiveLink(effectivePath);
    }

    currentPath = path;
  }

  function handleNavigation(path, replace) {
    const normalized = normalizePath(path);

    if (normalized === currentPath) {
      return;
    }

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
          if (toggle) {
            toggle.setAttribute("aria-expanded", "false");
          }
        }
      });
    });
  }

  window.addEventListener("popstate", () => {
    const path = normalizePath(window.location.pathname);
    renderRoute(path);
  });

  window.addEventListener("DOMContentLoaded", () => {
    setupNavLinks();
    const initialPath = normalizePath(window.location.pathname);
    renderRoute(initialPath);
  });
})();

