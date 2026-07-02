const glow = document.getElementById("cursor-glow");
if (glow) {
  document.addEventListener("mousemove", (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  });
}

const modal = document.getElementById("faceModal");
const closeModal = document.getElementById("closeModal");
const finishFace = document.getElementById("finishFace");
const faceTitle = document.getElementById("faceTitle");
const faceText = document.getElementById("faceText");
const toast = document.getElementById("toast");

let pendingAction = "Validation";
let cameraStream = null;
let cameraVideo = null;
let cameraReady = false;

window.addEventListener("unhandledrejection", (event) => {
  console.error("[LJBank] Unhandled promise rejection:", event.reason);
  showToast("Une erreur inattendue est survenue.");
});

window.addEventListener("error", (event) => {
  console.error("[LJBank] Uncaught error:", event.error || event.message);
});

function showToast(message) {
  if (!toast) {
    console.warn("[LJBank] Toast element not found; cannot display:", message);
    return;
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function ensureCameraVideo() {
  const frame = document.querySelector(".face-frame");
  if (!frame) {
    console.error("[LJBank] .face-frame element not found in DOM. Camera preview cannot be created.");
    return null;
  }

  if (!cameraVideo) {
    cameraVideo = document.createElement("video");
    cameraVideo.className = "camera-preview";
    cameraVideo.autoplay = true;
    cameraVideo.muted = true;
    cameraVideo.playsInline = true;
    frame.prepend(cameraVideo);
  }

  return cameraVideo;
}

async function startCamera() {
  cameraReady = false;
  const video = ensureCameraVideo();

  if (!video) {
    const msg = "Camera indisponible : element video introuvable.";
    if (faceText) faceText.textContent = msg;
    throw new Error(msg);
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const msg = "Camera indisponible sur ce navigateur.";
    if (faceText) faceText.textContent = msg;
    throw new Error(msg);
  }

  faceText.textContent = "Autorisez la camera pour lancer la reconnaissance faciale.";

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });
  } catch (error) {
    let msg;
    switch (error.name) {
      case "NotAllowedError":
        msg = "Acces camera refuse. Veuillez autoriser la camera dans les parametres du navigateur.";
        break;
      case "NotFoundError":
        msg = "Aucune camera detectee sur cet appareil.";
        break;
      case "NotReadableError":
        msg = "La camera est deja utilisee par une autre application.";
        break;
      case "OverconstrainedError":
        msg = "La camera ne satisfait pas les contraintes requises.";
        break;
      default:
        msg = "Erreur camera inattendue. Veuillez reessayer.";
    }
    console.error("[LJBank] Camera error:", error.name, error.message);
    if (faceText) faceText.textContent = msg;
    throw error;
  }

  video.srcObject = cameraStream;

  try {
    await video.play();
  } catch (playError) {
    console.error("[LJBank] Video playback failed:", playError.name, playError.message);
    if (faceText) faceText.textContent = "Impossible de lire le flux camera. Veuillez reessayer.";
    stopCamera();
    throw playError;
  }

  cameraReady = true;
  faceText.textContent = "Camera active. Gardez votre visage dans le cadre lumineux.";
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (trackError) {
        console.warn("[LJBank] Error stopping camera track:", trackError.message);
      }
    });
    cameraStream = null;
  }

  if (cameraVideo) {
    cameraVideo.srcObject = null;
  }

  cameraReady = false;
}

async function openFace(action) {
  if (!modal || !faceTitle || !faceText || !finishFace) {
    console.error("[LJBank] Face modal elements missing. Cannot open facial recognition.");
    showToast("Erreur : elements de reconnaissance faciale introuvables.");
    return;
  }

  pendingAction = action;
  faceTitle.textContent = action;
  faceText.textContent = "Ouverture de la camera...";
  finishFace.textContent = "Valider la reconnaissance";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  try {
    await startCamera();
  } catch (error) {
    console.error("[LJBank] Failed to start camera for action:", action, error);
  }
}

function closeFace() {
  stopCamera();
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

document.querySelectorAll("[data-face]").forEach((button) => {
  button.addEventListener("click", () => openFace(button.dataset.face));
});

if (finishFace) {
  finishFace.addEventListener("click", () => {
    if (!cameraReady) {
      showToast("Veuillez d'abord activer la camera.");
      return;
    }

    faceText.textContent = "Reconnaissance faciale confirmee.";
    finishFace.textContent = "Acces autorise";

    if (pendingAction.includes("carte")) {
      document.querySelectorAll("[data-secret]").forEach((element) => {
        element.textContent = element.dataset.secret;
      });
      const badge = document.getElementById("cardBadge");
      if (badge) badge.textContent = "Donnees visibles";
    }

    showToast(`${pendingAction} reussie.`);
    setTimeout(closeFace, 650);
  });
}

if (closeModal) closeModal.addEventListener("click", closeFace);
if (modal) {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeFace();
  });
}

document.querySelectorAll("[data-toast]").forEach((button) => {
  button.addEventListener("click", () => showToast(button.dataset.toast));
});
