/**
 * @jest-environment jsdom
 */

function buildDOM() {
  document.body.innerHTML = `
    <div id="cursor-glow"></div>

    <button data-face="Connexion au compte" type="button">Connexion faciale</button>
    <button data-face="Affichage des données de carte" type="button">Voir la carte</button>
    <button data-toast="Compte client prêt." type="button">S'inscrire</button>
    <button data-toast="Carte bloquée." type="button">Bloquer</button>

    <div class="face-modal" id="faceModal" aria-hidden="true">
      <div class="face-dialog">
        <button class="close-modal" id="closeModal" type="button" aria-label="Fermer">&times;</button>
        <h2 id="faceTitle">Reconnaissance faciale</h2>
        <div class="face-frame">
          <div class="scan-line"></div>
          <div class="face-shape"><span></span><span></span><i></i></div>
        </div>
        <p class="muted" id="faceText">Placez votre visage dans le cadre lumineux.</p>
        <button class="primary" id="finishFace" type="button">Valider la reconnaissance</button>
      </div>
    </div>

    <div class="toast" id="toast"></div>

    <span id="cardBadge">Masquées</span>
    <strong data-secret="4976 1200 8821 8429">**** **** **** 8429</strong>
    <strong data-secret="09/29">**/**</strong>
    <strong data-secret="418">***</strong>
  `;
}

function loadApp() {
  jest.resetModules();
  return require("../app");
}

describe("showToast", () => {
  beforeEach(() => {
    buildDOM();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("adds 'show' class and sets text content", () => {
    const app = loadApp();
    const toast = document.getElementById("toast");
    app.showToast("Hello!");
    expect(toast.textContent).toBe("Hello!");
    expect(toast.classList.contains("show")).toBe(true);
  });

  test("removes 'show' class after timeout", () => {
    const app = loadApp();
    const toast = document.getElementById("toast");
    app.showToast("Temp message");
    expect(toast.classList.contains("show")).toBe(true);
    jest.advanceTimersByTime(2800);
    expect(toast.classList.contains("show")).toBe(false);
  });

  test("resets timer on successive calls", () => {
    const app = loadApp();
    const toast = document.getElementById("toast");
    app.showToast("First");
    jest.advanceTimersByTime(2000);
    app.showToast("Second");
    expect(toast.textContent).toBe("Second");
    jest.advanceTimersByTime(1000);
    expect(toast.classList.contains("show")).toBe(true);
    jest.advanceTimersByTime(1800);
    expect(toast.classList.contains("show")).toBe(false);
  });

  test("does nothing when toast element is absent", () => {
    document.body.innerHTML = "";
    const app = loadApp();
    expect(() => app.showToast("No crash")).not.toThrow();
  });
});

describe("ensureCameraVideo", () => {
  beforeEach(() => buildDOM());

  test("creates a video element inside .face-frame on first call", () => {
    const app = loadApp();
    const video = app.ensureCameraVideo();
    expect(video).not.toBeNull();
    expect(video.tagName).toBe("VIDEO");
    expect(video.className).toBe("camera-preview");
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
  });

  test("returns the same video element on subsequent calls", () => {
    const app = loadApp();
    const first = app.ensureCameraVideo();
    const second = app.ensureCameraVideo();
    expect(first).toBe(second);
  });

  test("returns null when .face-frame is absent", () => {
    document.body.innerHTML = "<div></div>";
    const app = loadApp();
    expect(app.ensureCameraVideo()).toBeNull();
  });
});

describe("startCamera", () => {
  beforeEach(() => buildDOM());

  test("sets faceText when getUserMedia is unavailable", async () => {
    delete navigator.mediaDevices;
    const app = loadApp();
    await app.startCamera();
    const faceText = document.getElementById("faceText");
    expect(faceText.textContent).toBe(
      "Camera indisponible sur ce navigateur."
    );
  });

  test("activates camera stream when getUserMedia succeeds", async () => {
    const mockTrack = { stop: jest.fn() };
    const mockStream = { getTracks: () => [mockTrack] };
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: jest.fn().mockResolvedValue(mockStream) },
      writable: true,
      configurable: true,
    });
    const app = loadApp();
    await app.startCamera();
    const faceText = document.getElementById("faceText");
    expect(faceText.textContent).toBe(
      "Camera active. Gardez votre visage dans le cadre lumineux."
    );
  });

  test("handles getUserMedia rejection gracefully", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: jest.fn().mockRejectedValue(new Error("Denied")),
      },
      writable: true,
      configurable: true,
    });
    const app = loadApp();
    await app.startCamera();
    const faceText = document.getElementById("faceText");
    expect(faceText.textContent).toContain("Acces camera refuse");
  });
});

describe("stopCamera", () => {
  beforeEach(() => buildDOM());

  test("stops all tracks and clears srcObject", async () => {
    const mockTrack = { stop: jest.fn() };
    const mockStream = { getTracks: () => [mockTrack] };
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: jest.fn().mockResolvedValue(mockStream) },
      writable: true,
      configurable: true,
    });
    const app = loadApp();
    await app.startCamera();
    app.stopCamera();
    expect(mockTrack.stop).toHaveBeenCalled();
  });

  test("does not throw when no camera is active", () => {
    const app = loadApp();
    expect(() => app.stopCamera()).not.toThrow();
  });
});

describe("openFace", () => {
  beforeEach(() => {
    buildDOM();
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: jest
          .fn()
          .mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] }),
      },
      writable: true,
      configurable: true,
    });
  });

  test("opens the modal with correct title and aria attribute", async () => {
    const app = loadApp();
    await app.openFace("Connexion au compte");
    const modal = document.getElementById("faceModal");
    const title = document.getElementById("faceTitle");
    expect(modal.classList.contains("open")).toBe(true);
    expect(modal.getAttribute("aria-hidden")).toBe("false");
    expect(title.textContent).toBe("Connexion au compte");
  });

  test("sets finishFace button text", async () => {
    const app = loadApp();
    await app.openFace("Test Action");
    const finishFace = document.getElementById("finishFace");
    expect(finishFace.textContent).toBe("Valider la reconnaissance");
  });

  test("does nothing when modal elements are missing", async () => {
    document.body.innerHTML = "";
    const app = loadApp();
    await expect(app.openFace("Anything")).resolves.toBeUndefined();
  });
});

describe("closeFace", () => {
  beforeEach(() => {
    buildDOM();
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: jest
          .fn()
          .mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] }),
      },
      writable: true,
      configurable: true,
    });
  });

  test("removes open class and sets aria-hidden to true", async () => {
    const app = loadApp();
    await app.openFace("Test");
    app.closeFace();
    const modal = document.getElementById("faceModal");
    expect(modal.classList.contains("open")).toBe(false);
    expect(modal.getAttribute("aria-hidden")).toBe("true");
  });

  test("does not throw when modal is absent", () => {
    document.body.innerHTML = "";
    const app = loadApp();
    expect(() => app.closeFace()).not.toThrow();
  });
});

describe("finishFace click handler", () => {
  beforeEach(() => {
    buildDOM();
    jest.useFakeTimers();
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: jest
          .fn()
          .mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] }),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("sets confirmation text and shows toast on non-carte action", async () => {
    const app = loadApp();
    await app.openFace("Connexion au compte");
    const finishFace = document.getElementById("finishFace");
    finishFace.click();
    const faceText = document.getElementById("faceText");
    expect(faceText.textContent).toBe("Reconnaissance faciale confirmee.");
    expect(finishFace.textContent).toBe("Acces autorise");
    const toast = document.getElementById("toast");
    expect(toast.textContent).toBe("Connexion au compte reussie.");
  });

  test("reveals card secrets when action includes 'carte'", async () => {
    const app = loadApp();
    await app.openFace("Affichage des données de carte");
    const finishFace = document.getElementById("finishFace");
    finishFace.click();
    const secrets = document.querySelectorAll("[data-secret]");
    secrets.forEach((el) => {
      expect(el.textContent).toBe(el.dataset.secret);
    });
    const badge = document.getElementById("cardBadge");
    expect(badge.textContent).toBe("Donnees visibles");
  });

  test("closes modal after delay", async () => {
    const app = loadApp();
    await app.openFace("Test");
    const finishFace = document.getElementById("finishFace");
    finishFace.click();
    const modal = document.getElementById("faceModal");
    expect(modal.classList.contains("open")).toBe(true);
    jest.advanceTimersByTime(650);
    expect(modal.classList.contains("open")).toBe(false);
  });
});

describe("closeModal button", () => {
  beforeEach(() => {
    buildDOM();
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: jest
          .fn()
          .mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] }),
      },
      writable: true,
      configurable: true,
    });
  });

  test("closes modal when closeModal button is clicked", async () => {
    const app = loadApp();
    await app.openFace("Test");
    const closeBtn = document.getElementById("closeModal");
    closeBtn.click();
    const modal = document.getElementById("faceModal");
    expect(modal.classList.contains("open")).toBe(false);
  });
});

describe("modal backdrop click", () => {
  beforeEach(() => {
    buildDOM();
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: jest
          .fn()
          .mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] }),
      },
      writable: true,
      configurable: true,
    });
  });

  test("closes modal when clicking the backdrop (modal itself)", async () => {
    const app = loadApp();
    await app.openFace("Test");
    const modal = document.getElementById("faceModal");
    modal.dispatchEvent(new Event("click", { bubbles: true }));
    expect(modal.classList.contains("open")).toBe(false);
  });

  test("does not close modal when clicking inside the dialog", async () => {
    const app = loadApp();
    await app.openFace("Test");
    const dialog = document.querySelector(".face-dialog");
    dialog.click();
    const modal = document.getElementById("faceModal");
    expect(modal.classList.contains("open")).toBe(true);
  });
});

describe("data-face button wiring", () => {
  beforeEach(() => {
    buildDOM();
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: jest
          .fn()
          .mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] }),
      },
      writable: true,
      configurable: true,
    });
  });

  test("clicking [data-face] button opens modal with correct action", async () => {
    loadApp();
    const btn = document.querySelector('[data-face="Connexion au compte"]');
    btn.click();
    await Promise.resolve();
    const modal = document.getElementById("faceModal");
    const title = document.getElementById("faceTitle");
    expect(modal.classList.contains("open")).toBe(true);
    expect(title.textContent).toBe("Connexion au compte");
  });
});

describe("data-toast button wiring", () => {
  beforeEach(() => {
    buildDOM();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("clicking [data-toast] button shows toast with message", () => {
    loadApp();
    const btn = document.querySelector('[data-toast="Compte client prêt."]');
    btn.click();
    const toast = document.getElementById("toast");
    expect(toast.textContent).toBe("Compte client prêt.");
    expect(toast.classList.contains("show")).toBe(true);
  });
});

describe("cursor glow", () => {
  beforeEach(() => buildDOM());

  test("moves glow element on mousemove", () => {
    loadApp();
    const glow = document.getElementById("cursor-glow");
    const event = new MouseEvent("mousemove", { clientX: 200, clientY: 300 });
    document.dispatchEvent(event);
    expect(glow.style.left).toBe("200px");
    expect(glow.style.top).toBe("300px");
  });

  test("works without cursor-glow element", () => {
    document.body.innerHTML = `
      <div class="toast" id="toast"></div>
    `;
    expect(() => loadApp()).not.toThrow();
  });
});
