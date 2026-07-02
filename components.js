(function () {
  var NAV_LINKS = [
    { href: "index.html", label: "Accueil" },
    { href: "compte.html", label: "Comptes" },
    { href: "cartes.html", label: "Cartes" },
    { href: "transactions.html", label: "Transactions" },
    { href: "services.html", label: "Services" },
    { href: "contact.html", label: "Contact" },
  ];

  var FACE_MODAL_HTML =
    '<div class="face-modal" id="faceModal" aria-hidden="true">' +
    '  <div class="face-dialog">' +
    '    <button class="close-modal" id="closeModal" type="button" aria-label="Fermer">&times;</button>' +
    '    <h2 id="faceTitle">Reconnaissance faciale</h2>' +
    '    <div class="face-frame"><div class="scan-line"></div><div class="face-shape"><span></span><span></span><i></i></div></div>' +
    '    <p class="muted" id="faceText">Placez votre visage dans le cadre lumineux.</p>' +
    '    <button class="primary" id="finishFace" type="button">Valider la reconnaissance</button>' +
    "  </div>" +
    "</div>";

  var FOOTER_HTML =
    '<footer class="footer">' +
    "  <h3>LJ BANK</h3>" +
    "  <p>Votre partenaire financier de confiance. " +
    "S\u00e9curit\u00e9, innovation et performance au service de vos finances.</p>" +
    '  <div class="copyright">&copy; 2026 LJ Bank - Tous droits r\u00e9serv\u00e9s.</div>' +
    "</footer>";

  function currentPage() {
    var path = location.pathname;
    var file = path.substring(path.lastIndexOf("/") + 1);
    return file || "index.html";
  }

  var page = currentPage();
  var main = document.querySelector("main");

  var actionsTemplate = document.getElementById("nav-actions");
  var actionsHTML = actionsTemplate ? actionsTemplate.innerHTML.trim() : "";
  if (actionsTemplate) actionsTemplate.remove();

  var linksHTML = NAV_LINKS.map(function (link) {
    var activeAttr = link.href === page ? ' class="active"' : "";
    return "<li><a" + activeAttr + ' href="' + link.href + '">' + link.label + "</a></li>";
  }).join("");

  var headerHTML =
    "<header>" +
    '  <nav class="navbar">' +
    '    <div class="logo"><span>LJ</span> BANK</div>' +
    '    <ul class="nav-links">' +
    linksHTML +
    "    </ul>" +
    '    <div class="actions">' +
    actionsHTML +
    "    </div>" +
    "  </nav>" +
    "</header>";

  document.body.insertAdjacentHTML("afterbegin", '<div id="cursor-glow"></div>');

  if (main) {
    main.insertAdjacentHTML("beforebegin", headerHTML);
  }

  if (document.body.hasAttribute("data-face-modal") && main) {
    main.insertAdjacentHTML("afterend", FACE_MODAL_HTML);
  }

  var toastAnchor = document.querySelector(".face-modal") || main;
  if (toastAnchor) {
    toastAnchor.insertAdjacentHTML("afterend", '<div class="toast" id="toast"></div>');
  }

  var footerAnchor = document.getElementById("toast") || document.querySelector(".face-modal") || main;
  if (footerAnchor) {
    footerAnchor.insertAdjacentHTML("afterend", FOOTER_HTML);
  }
})();
