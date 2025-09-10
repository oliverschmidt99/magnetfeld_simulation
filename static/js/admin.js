// static/js/admin.js

document.addEventListener("DOMContentLoaded", () => {
  const tagList = document.getElementById("tag-list");
  const newTagNameInput = document.getElementById("new-tag-name");
  const addTagBtn = document.getElementById("add-tag-btn");

  // Funktion zum Laden und Anzeigen der Tags
  function loadTags() {
    fetch("/api/tags")
      .then((response) => response.json())
      .then((tags) => {
        tagList.innerHTML = ""; // Liste leeren
        tags.forEach((tag) => {
          const tagElement = document.createElement("div");
          tagElement.className = "tag-item";

          const tagName = document.createElement("span");
          tagName.textContent = tag.name;

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "Löschen";
          deleteBtn.className = "delete-btn";
          deleteBtn.onclick = () => deleteTag(tag.id);

          tagElement.appendChild(tagName);
          tagElement.appendChild(deleteBtn);
          tagList.appendChild(tagElement);
        });
      })
      .catch((error) => console.error("Fehler beim Laden der Tags:", error));
  }

  // Funktion zum Hinzufügen eines neuen Tags
  function addTag() {
    const tagName = newTagNameInput.value.trim();
    if (!tagName) {
      alert("Bitte einen Tag-Namen eingeben.");
      return;
    }

    fetch("/api/tags", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: tagName }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          newTagNameInput.value = "";
          loadTags(); // Liste neu laden
        } else {
          alert("Fehler beim Hinzufügen des Tags: " + data.message);
        }
      })
      .catch((error) =>
        console.error("Fehler beim Senden der Anfrage:", error)
      );
  }

  // Funktion zum Löschen eines Tags
  function deleteTag(tagId) {
    if (!confirm("Soll dieser Tag wirklich gelöscht werden?")) {
      return;
    }

    fetch(`/api/tags/${tagId}`, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          loadTags(); // Liste neu laden
        } else {
          alert("Fehler beim Löschen des Tags: " + data.message);
        }
      })
      .catch((error) =>
        console.error("Fehler beim Senden der Anfrage:", error)
      );
  }

  // Event Listeners
  addTagBtn.addEventListener("click", addTag);
  newTagNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addTag();
    }
  });

  // Initiales Laden der Tags
  loadTags();
});
