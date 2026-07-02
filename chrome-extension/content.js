// Keep Brain Content Script
// Handles scraping notes from Google Keep DOM

function scrapeNotes() {
  console.log("Keep Brain: Starting note scraping...");
  const noteElements = document.querySelectorAll('.IZ65Hb-n1N15c, .IZ65Hb-TBnied, div[role="button"][tabindex="0"]');
  const notes = [];

  noteElements.forEach((el, index) => {
    // Basic verification to check if this is indeed a note card
    const hasPin = el.querySelector('.activePin, div[aria-label*="Připnout"], div[aria-label*="Pin"]');
    const hasArchive = el.querySelector('div[aria-label*="Archiv"], div[aria-label*="Archive"]');
    const hasDelete = el.querySelector('div[aria-label*="Smazat"], div[aria-label*="Delete"]');
    
    // Google Keep notes usually have a data-id or inline ID
    const keepId = el.getAttribute('data-id') || el.getAttribute('id') || `scraped-note-${index}-${Date.now()}`;
    
    // Find Title
    let title = "";
    const titleEl = el.querySelector('.IZ65Hb-TBnied-Title, .gp-title, div[aria-label="Název"], div[placeholder="Název"]');
    if (titleEl) {
      title = titleEl.innerText || titleEl.textContent || "";
    }

    // Find Content or Checklist Items
    let content = "";
    const listItems = el.querySelectorAll('.gkA7Yd-sK1WDc, .Lw7p-X4n7ed-HaSUpf'); // checklist item containers
    
    if (listItems && listItems.length > 0) {
      // It's a checklist note
      const itemsList = [];
      listItems.forEach(item => {
        const checkbox = item.querySelector('div[role="checkbox"]');
        const textEl = item.querySelector('div[contenteditable="true"], .Lw7p-X4n7ed-content');
        if (textEl) {
          const isChecked = checkbox ? checkbox.getAttribute('aria-checked') === 'true' : false;
          const text = textEl.innerText || textEl.textContent || "";
          itemsList.push(`${isChecked ? '[x]' : '[ ]'} ${text}`);
        }
      });
      content = itemsList.join('\n');
    } else {
      // Standard text note
      const contentEl = el.querySelector('.IZ65Hb-TBnied-content, .gp-note, div[aria-label="Poznámka"], div[placeholder="Poznámka"]');
      if (contentEl) {
        content = contentEl.innerText || contentEl.textContent || "";
      }
    }

    // Skip if there's absolutely no content and no title
    if (!title && !content) {
      return;
    }

    // Find Color (extract from style background-color)
    let color = null;
    const style = window.getComputedStyle(el);
    if (style && style.backgroundColor) {
      color = style.backgroundColor;
    }

    // Find Labels
    const labels = [];
    const labelChips = el.querySelectorAll('.TEoLIe-Lgbs3e, .Token, div[role="button"][aria-label*="Label"]');
    labelChips.forEach(chip => {
      const text = chip.innerText || chip.textContent || "";
      if (text.trim()) {
        labels.push(text.trim());
      }
    });

    // Pinned status
    const isPinned = !!el.querySelector('.activePin, div[aria-label*="Zrušit připnutí"], div[aria-label*="Unpin"]');

    notes.push({
      keepId,
      title: title.trim(),
      content: content.trim(),
      labels,
      color,
      isPinned,
      isArchived: false,
      isTrashed: false
    });
  });

  console.log(`Keep Brain: Successfully scraped ${notes.length} notes.`);
  return notes;
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape_notes") {
    try {
      const notes = scrapeNotes();
      sendResponse({ notes });
    } catch (err) {
      console.error("Keep Brain Scraper Error:", err);
      sendResponse({ error: err.message });
    }
  }
  return true; // keeps the channel open for async response
});
