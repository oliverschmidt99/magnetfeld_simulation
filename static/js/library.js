function openTab(evt, tabName) {
  const tabcontent = document.querySelectorAll(".tab-content");
  tabcontent.forEach((tab) => {
    tab.style.display = "none";
    tab.classList.remove("active");
  });

  const tablinks = document.querySelectorAll(".tab-link");
  tablinks.forEach((link) => {
    link.classList.remove("active");
  });

  const currentTab = document.getElementById(tabName);
  currentTab.style.display = "block";
  currentTab.classList.add("active");
  evt.currentTarget.classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
  // Klicke initial auf den ersten Tab, um ihn zu aktivieren
  document.querySelector(".tab-link").click();
});
