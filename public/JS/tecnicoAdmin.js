document.addEventListener("DOMContentLoaded", () => {
  const privilege = localStorage.getItem("userPrivilege"); // Será "0", "1", o "2" (string)
  const getUsersLink = document.getElementById("get-users"); // <-- Debes poner este ID en tu HTML
  if (getUsersLink && privilege == "1") {
    // Si NO es Admin (0)
    getUsersLink.style.display = "none"; // Ocultar el enlace
  }
  const maxCycles = document.getElementById("edit-max-cycles");

  const currentCycles = document.getElementById("edit-current-cycles");
  if (privilege == "1") {
    // Si es Técnico (2)
    currentCycles.disabled = "true"; // Ocultar el enlace
    maxCycles.disabled = "true"; // Ocultar el enlace
  }

  const bajaDiv = document.getElementById("baja-div");
  if (bajaDiv && privilege == "1") {
    // Si es Técnico (2)
    bajaDiv.style.display = "none"; // Ocultar el enlace
  }
});
