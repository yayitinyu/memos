package v1

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestResolveLocalAttachmentPath(t *testing.T) {
	dataDir := t.TempDir()

	path, reference, err := resolveLocalAttachmentPath(dataDir, "assets/note.txt", "safe-id")
	require.NoError(t, err)
	require.Equal(t, filepath.Join(dataDir, "assets", "note.txt"), path)
	require.Equal(t, "assets/note.txt", reference)

	require.NoError(t, os.MkdirAll(filepath.Dir(path), 0750))
	require.NoError(t, os.WriteFile(path, []byte("existing"), 0600))
	uniquePath, uniqueReference, err := resolveLocalAttachmentPath(dataDir, "assets/note.txt", "safe-id")
	require.NoError(t, err)
	require.Equal(t, filepath.Join(dataDir, "assets", "note_safe-id.txt"), uniquePath)
	require.Equal(t, "assets/note_safe-id.txt", uniqueReference)

	_, _, err = resolveLocalAttachmentPath(dataDir, "../outside.txt", "safe-id")
	require.Error(t, err)
}
