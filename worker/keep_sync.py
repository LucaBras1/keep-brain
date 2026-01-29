"""
Google Keep synchronization using gkeepapi.
"""

import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

import gkeepapi

logger = logging.getLogger('keep-sync')


class KeepSync:
    """Handles Google Keep synchronization."""

    def __init__(self):
        self.keep = gkeepapi.Keep()

    def authenticate(self, email: str, password: str) -> Optional[str]:
        """
        Authenticate with Google Keep and return master token.

        Args:
            email: Google account email
            password: Google account password or App Password

        Returns:
            Master token string if successful, None otherwise
        """
        try:
            logger.info(f"Authenticating {email}...")
            self.keep.login(email, password)
            master_token = self.keep.getMasterToken()
            logger.info(f"Authentication successful for {email}")
            return master_token
        except gkeepapi.exception.LoginException as e:
            logger.error(f"Authentication failed: {str(e)}")
            raise ValueError(f"Google Keep authentication failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected authentication error: {str(e)}")
            raise

    def resume(self, email: str, master_token: str) -> bool:
        """
        Resume session using stored master token.

        Args:
            email: Google account email
            master_token: Previously obtained master token

        Returns:
            True if resume successful, False otherwise
        """
        try:
            logger.info(f"Resuming session for {email}...")
            self.keep.resume(email, master_token)
            logger.info(f"Session resumed for {email}")
            return True
        except Exception as e:
            logger.error(f"Failed to resume session: {str(e)}")
            return False

    def sync_notes(
        self,
        email: str,
        master_token: str,
        include_archived: bool = False,
        include_trashed: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Sync notes from Google Keep.

        Args:
            email: Google account email
            master_token: Master token for authentication
            include_archived: Include archived notes
            include_trashed: Include trashed notes

        Returns:
            List of note dictionaries
        """
        # Resume session
        if not self.resume(email, master_token):
            raise ValueError("Failed to resume Google Keep session")

        # Sync with server
        logger.info("Syncing with Google Keep...")
        self.keep.sync()

        # Get all notes
        notes = []
        all_notes = self.keep.all()

        for note in all_notes:
            # Skip list items (we only want top-level notes)
            if note.type.name == 'List':
                # For lists, get the items
                content_parts = []
                if hasattr(note, 'items'):
                    for item in note.items:
                        checkbox = "[x]" if item.checked else "[ ]"
                        content_parts.append(f"{checkbox} {item.text}")
                content = "\n".join(content_parts)
            else:
                content = note.text if hasattr(note, 'text') else ''

            # Skip if no content
            if not content and not note.title:
                continue

            # Check filters
            if note.archived and not include_archived:
                continue
            if note.trashed and not include_trashed:
                continue

            # Get labels
            labels = []
            if hasattr(note, 'labels'):
                labels = [label.name for label in note.labels.all()]

            # Get timestamps
            created = None
            updated = None
            if hasattr(note, 'timestamps'):
                if note.timestamps.created:
                    created = note.timestamps.created.isoformat()
                if note.timestamps.updated:
                    updated = note.timestamps.updated.isoformat()

            # Get color
            color = None
            if hasattr(note, 'color'):
                color = note.color.name if note.color else None

            notes.append({
                'id': note.id,
                'title': note.title,
                'content': content,
                'labels': labels,
                'pinned': note.pinned,
                'archived': note.archived,
                'trashed': note.trashed,
                'color': color,
                'created': created,
                'updated': updated,
            })

        logger.info(f"Found {len(notes)} notes")
        return notes


def test_connection():
    """Test Google Keep connection (for debugging)."""
    import os
    email = os.getenv('TEST_KEEP_EMAIL')
    password = os.getenv('TEST_KEEP_PASSWORD')

    if not email or not password:
        print("Set TEST_KEEP_EMAIL and TEST_KEEP_PASSWORD environment variables")
        return

    sync = KeepSync()
    try:
        token = sync.authenticate(email, password)
        print(f"Authentication successful! Token: {token[:20]}...")

        notes = sync.sync_notes(email, token)
        print(f"\nFound {len(notes)} notes:")
        for note in notes[:5]:
            print(f"  - {note['title'] or 'Untitled'}: {note['content'][:50]}...")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == '__main__':
    test_connection()
