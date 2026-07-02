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

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function ensureCameraVideo() {
  const frame = document.querySelector(".face-frame");
  if (!frame) return null;

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
  const video = ensureCameraVideo();
  if (!video || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    faceText.textContent = "Camera indisponible sur ce navigateur.";
    return;
  }

  try {
    faceText.textContent = "Autorisez la camera pour lancer la reconnaissance faciale.";
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });
    video.srcObject = cameraStream;
    faceText.textContent = "Camera active. Gardez votre visage dans le cadre lumineux.";
  } catch (error) {
    faceText.textContent = "Acces camera refuse ou indisponible. Vous pouvez reessayer depuis le bouton de reconnaissance.";
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  if (cameraVideo) {
    cameraVideo.srcObject = null;
  }
}

async function openFace(action) {
  if (!modal || !faceTitle || !faceText || !finishFace) return;

  pendingAction = action;
  faceTitle.textContent = action;
  faceText.textContent = "Ouverture de la camera...";
  finishFace.textContent = "Valider la reconnaissance";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  await startCamera();
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    showToast,
    ensureCameraVideo,
    startCamera,
    stopCamera,
    openFace,
    closeFace,
  };
}
