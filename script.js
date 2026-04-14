document.documentElement.classList.add("js-enabled");

document.addEventListener("DOMContentLoaded", () => {
  try {
    setupMobileNav(document.querySelector(".topbar"));
  } catch (error) {
    console.error("Mobile nav setup failed:", error);
  }

  try {
    setupStage(document.querySelector("[data-stage]"));
  } catch (error) {
    console.error("Stage setup failed:", error);
  }

  try {
    setupChapterCards(document.querySelectorAll("[data-chapter-card]"));
  } catch (error) {
    console.error("Chapter card setup failed:", error);
  }

  try {
    setupRevealObserver();
  } catch (error) {
    console.error("Reveal setup failed:", error);
  }
});

function setupMobileNav(topbar) {
  if (!topbar) {
    return;
  }

  const toggle = topbar.querySelector("[data-nav-toggle]");
  const panel = topbar.querySelector("[data-nav-panel]");
  const links = Array.from(panel?.querySelectorAll("a[href]") || []);
  const mobileQuery = window.matchMedia("(max-width: 720px)");

  if (!toggle || !panel) {
    return;
  }

  const updateLinkFocus = (isOpen) => {
    links.forEach((link) => {
      link.tabIndex = !mobileQuery.matches || isOpen ? 0 : -1;
    });
  };

  const setOpen = (isOpen) => {
    topbar.classList.toggle("is-nav-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    panel.setAttribute("aria-hidden", String(mobileQuery.matches ? !isOpen : false));
    updateLinkFocus(isOpen);
  };

  const syncToViewport = () => {
    if (mobileQuery.matches) {
      setOpen(topbar.classList.contains("is-nav-open"));
      return;
    }

    topbar.classList.remove("is-nav-open");
    toggle.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "false");
    updateLinkFocus(true);
  };

  toggle.addEventListener("click", () => {
    setOpen(!topbar.classList.contains("is-nav-open"));
  });

  links.forEach((link) => {
    link.addEventListener("click", () => {
      if (mobileQuery.matches) {
        setOpen(false);
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (!mobileQuery.matches || !topbar.classList.contains("is-nav-open")) {
      return;
    }

    if (!topbar.contains(event.target)) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !topbar.classList.contains("is-nav-open")) {
      return;
    }

    setOpen(false);
    toggle.focus();
  });

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", syncToViewport);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(syncToViewport);
  }

  syncToViewport();
}

function setupStage(stage) {
  if (!stage) {
    return;
  }

  const panels = Array.from(stage.querySelectorAll("[data-stage-panel]"));
  const panelCount = panels.length;
  const previousButton = stage.querySelector("[data-stage-prev]");
  const nextButton = stage.querySelector("[data-stage-next]");
  const progressBar = stage.querySelector("[data-stage-progress]");
  const currentCounter = stage.querySelector("[data-stage-current]");
  const kicker = stage.querySelector("[data-stage-kicker]");
  const title = stage.querySelector("[data-stage-title]");
  const description = stage.querySelector("[data-stage-description]");
  const link = stage.querySelector("[data-stage-link]");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const autoplayDelay = Number(stage.dataset.autoplayDelay) || 5600;
  let activeIndex = panels.findIndex((panel) => panel.classList.contains("is-active"));
  let autoplayId = null;
  let renderFrameId = null;
  let pendingIndex = activeIndex;

  if (!panelCount) {
    return;
  }

  if (activeIndex < 0) {
    activeIndex = 0;
  }

  pendingIndex = activeIndex;

  const applyRender = () => {
    renderFrameId = null;
    activeIndex = pendingIndex;

    panels.forEach((panel, panelIndex) => {
      const isActive = panelIndex === activeIndex;
      panel.classList.toggle("is-active", isActive);
      panel.setAttribute("aria-pressed", String(isActive));
    });

    const activePanel = panels[activeIndex];
    const {
      kicker: panelKicker,
      title: panelTitle,
      description: panelDescription,
      link: panelLink,
      linkLabel
    } = activePanel.dataset;

    if (kicker) {
      kicker.textContent = panelKicker || "";
    }

    if (title) {
      title.textContent = panelTitle || "";
    }

    if (description) {
      description.textContent = panelDescription || "";
    }

    if (link) {
      if (panelLink) {
        link.setAttribute("href", panelLink);
        link.removeAttribute("aria-disabled");
        link.tabIndex = 0;
      } else {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
        link.tabIndex = -1;
      }

      link.textContent = linkLabel || "Explore the chapter";
    }

    if (currentCounter) {
      currentCounter.textContent = String(activeIndex + 1).padStart(2, "0");
    }

    if (progressBar) {
      const progress = `${((activeIndex + 1) / panelCount) * 100}%`;
      stage.style.setProperty("--stage-progress", progress);
    }
  };

  const render = (index) => {
    pendingIndex = (index + panelCount) % panelCount;

    if (renderFrameId !== null) {
      return;
    }

    renderFrameId = window.requestAnimationFrame(applyRender);
  };

  const stopAutoplay = () => {
    if (autoplayId !== null) {
      window.clearTimeout(autoplayId);
      autoplayId = null;
    }
  };

  const startAutoplay = () => {
    stopAutoplay();

    if (panelCount < 2 || reducedMotionQuery.matches) {
      return;
    }

    autoplayId = window.setTimeout(() => {
      render(activeIndex + 1);
      startAutoplay();
    }, autoplayDelay);
  };

  const goTo = (index) => {
    render(index);
    startAutoplay();
  };

  const isSafeUrl = (url) => {
    if (url.startsWith("#") || url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) {
      return true;
    }

    try {
      const parsed = new URL(url, window.location.href);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  };

  const navigateToLink = (panelLink) => {
    if (!panelLink) {
      return;
    }

    if (!isSafeUrl(panelLink)) {
      return;
    }

    if (panelLink.startsWith("#")) {
      window.location.hash = panelLink.slice(1);
      return;
    }

    window.location.assign(panelLink);
  };

  [previousButton, nextButton].forEach((button) => {
    button?.addEventListener("click", () => {
      goTo(button === previousButton ? activeIndex - 1 : activeIndex + 1);
    });
  });

  panels.forEach((panel, panelIndex) => {
    panel.addEventListener("click", () => {
      if (panelIndex === activeIndex) {
        navigateToLink(panel.dataset.link);
        return;
      }

      goTo(panelIndex);
    });
  });

  stage.addEventListener("mouseenter", stopAutoplay);
  stage.addEventListener("mouseleave", startAutoplay);
  stage.addEventListener("focusin", stopAutoplay);
  stage.addEventListener("focusout", (event) => {
    if (!event.relatedTarget || !stage.contains(event.relatedTarget)) {
      startAutoplay();
    }
  });

  const openActivePanelLink = () => {
    const activePanel = panels[activeIndex];
    const panelLink = activePanel?.dataset.link;
    navigateToLink(panelLink);
  };

  stage.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(activeIndex + 1);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(activeIndex - 1);
    }

    if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      goTo(panelCount - 1);
    }

    if ((event.key === "Enter" || event.key === " ") && event.target === stage) {
      event.preventDefault();
      openActivePanelLink();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoplay();
      return;
    }

    startAutoplay();
  });

  if (typeof reducedMotionQuery.addEventListener === "function") {
    reducedMotionQuery.addEventListener("change", () => {
      if (reducedMotionQuery.matches) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });
  }

  render(activeIndex);
  startAutoplay();
}

function setupChapterCards(cardNodes) {
  const cards = Array.from(cardNodes || []);
  const compactQuery = window.matchMedia("(max-width: 420px)");

  if (!cards.length) {
    return;
  }

  const setExpanded = (target) => {
    cards.forEach((card) => {
      card.classList.toggle("is-expanded", card === target);
    });
  };

  const clearExpanded = () => {
    cards.forEach((card) => {
      card.classList.remove("is-expanded");
    });
  };

  const syncToViewport = () => {
    if (compactQuery.matches) {
      const expandedCard = cards.find((card) => card.classList.contains("is-expanded"));

      if (!expandedCard) {
        setExpanded(cards[0]);
      }

      return;
    }

    if (!compactQuery.matches) {
      clearExpanded();
    }
  };

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      if (!compactQuery.matches) {
        return;
      }

      setExpanded(card);
    });

    card.addEventListener("focus", () => {
      if (!compactQuery.matches) {
        return;
      }

      setExpanded(card);
    });
  });

  document.addEventListener("click", (event) => {
    if (!compactQuery.matches) {
      return;
    }

    if (cards.some((card) => card.contains(event.target))) {
      return;
    }

    setExpanded(cards[0]);
  });

  if (typeof compactQuery.addEventListener === "function") {
    compactQuery.addEventListener("change", syncToViewport);
  } else if (typeof compactQuery.addListener === "function") {
    compactQuery.addListener(syncToViewport);
  }

  syncToViewport();
}

function setupRevealObserver() {
  const revealElements = Array.from(document.querySelectorAll("[data-reveal]"));

  if (!revealElements.length) {
    return;
  }

  const revealElement = (element, instant = false) => {
    if (instant) {
      element.style.setProperty("--reveal-delay", "0ms");
      element.classList.add("reveal--instant");
    }

    element.classList.add("is-visible");
  };

  const isInInitialViewport = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => {
      revealElement(element, true);
    });

    document.documentElement.classList.add("reveal-ready");
    return;
  }

  revealElements.forEach((element, index) => {
    element.style.setProperty("--reveal-delay", `${(index % 4) * 70}ms`);

    if (isInInitialViewport(element)) {
      revealElement(element);
    }
  });

  document.documentElement.classList.add("reveal-ready");

  const fallbackRevealId = window.setTimeout(() => {
    revealElements.forEach((element) => {
      if (!element.classList.contains("is-visible")) {
        revealElement(element, true);
      }
    });
  }, 1400);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        revealElement(entry.target);
        observer.unobserve(entry.target);

        const hasPendingElements = revealElements.some((element) => !element.classList.contains("is-visible"));

        if (!hasPendingElements) {
          window.clearTimeout(fallbackRevealId);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -10vh 0px"
    }
  );

  revealElements.forEach((element) => {
    if (element.classList.contains("is-visible")) {
      return;
    }

    observer.observe(element);
  });
}
