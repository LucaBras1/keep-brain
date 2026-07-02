document.addEventListener("DOMContentLoaded", () => {
  const serverUrlInput = document.getElementById("serverUrl");
  const syncBtn = document.getElementById("syncBtn");
  const statusDiv = document.getElementById("status");

  // Load saved server URL
  chrome.storage.local.get(["serverUrl"], (result) => {
    if (result.serverUrl) {
      serverUrlInput.value = result.serverUrl;
    }
  });

  function showStatus(text, type) {
    statusDiv.style.display = "block";
    statusDiv.textContent = text;
    statusDiv.className = type; // success, error, info
  }

  syncBtn.addEventListener("click", async () => {
    const serverUrl = serverUrlInput.value.trim().replace(/\/$/, "");
    if (!serverUrl) {
      showStatus("Zadejte platnou URL serveru.", "error");
      return;
    }

    // Save URL for next time
    chrome.storage.local.set({ serverUrl });

    showStatus("Zjišťuji aktivní záložku...", "info");
    syncBtn.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url || !tab.url.includes("keep.google.com")) {
        showStatus("Chyba: Otevřete prosím záložku s keep.google.com", "error");
        syncBtn.disabled = false;
        return;
      }

      showStatus("Načítám poznámky z Google Keep...", "info");

      // Inject content.js script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });

      // Wait a moment and request note scraping
      chrome.tabs.sendMessage(tab.id, { action: "scrape_notes" }, async (response) => {
        if (chrome.runtime.lastError) {
          showStatus("Chyba při komunikaci se stránkou. Zkuste obnovit stránku Google Keep.", "error");
          syncBtn.disabled = false;
          return;
        }

        if (!response || !response.notes || response.notes.length === 0) {
          showStatus("Nenalezeny žádné poznámky ke stažení. Ujistěte se, že vidíte své poznámky na obrazovce.", "error");
          syncBtn.disabled = false;
          return;
        }

        showStatus(`Nalezeno ${response.notes.length} poznámek. Odesílám do Keep Brain...`, "info");

        // Send to Keep Brain server
        try {
          const syncRes = await fetch(`${serverUrl}/api/notes/sync-extension`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ notes: response.notes }),
            credentials: "include" // Send cookies of the server origin (session token)
          });

          const syncData = await syncRes.json();

          if (!syncRes.ok) {
            throw new Error(syncData.error || `Server vrátil status ${syncRes.status}`);
          }

          showStatus(
            `Synchronizace úspěšná!\nZpracováno poznámek: ${syncData.notesFound}\nVytvořeno nových: ${syncData.created}\nAktualizováno: ${syncData.updated}\nSpuštěno AI úloh: ${syncData.queuedJobs}`,
            "success"
          );
        } catch (err) {
          showStatus(`Chyba synchronizace: ${err.message}. Jste přihlášeni v Keep Brain?`, "error");
        } finally {
          syncBtn.disabled = false;
        }
      });

    } catch (e) {
      showStatus(`Chyba: ${e.message}`, "error");
      syncBtn.disabled = false;
    }
  });
});
