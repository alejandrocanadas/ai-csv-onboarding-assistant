import { useState } from "react";

/**
 * Controlled component — App owns the actual apiKey state (and the
 * sessionStorage read/write); this just renders the input/edit UI.
 * sessionStorage (not localStorage) is deliberate: the key is gone the
 * moment the tab closes, and it's never sent anywhere but api.anthropic.com.
 */
function ApiKeySettings({ apiKey, onApiKeyChange }) {
  const [draft, setDraft] = useState(apiKey ?? "");
  const [isEditing, setIsEditing] = useState(!apiKey);

  function handleSave(e) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onApiKeyChange(trimmed);
    setIsEditing(false);
  }

  function handleClear() {
    onApiKeyChange("");
    setDraft("");
    setIsEditing(true);
  }

  if (!isEditing && apiKey) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
        <span className="text-ink-muted">Anthropic API key</span>
        <span className="font-mono text-ink">{maskKey(apiKey)}</span>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="ml-auto text-accent hover:underline"
        >
          Change
        </button>
        <button type="button" onClick={handleClear} className="text-bad hover:underline">
          Clear
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3"
    >
      <label htmlFor="api-key" className="text-sm text-ink-muted">
        Anthropic API key
      </label>
      <input
        id="api-key"
        type="password"
        autoComplete="off"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="sk-ant-..."
        className="min-w-64 flex-1 rounded-md border border-border/30 bg-bg px-3 py-1.5 text-sm outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={!draft.trim()}
        className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
      >
        Save
      </button>
      <p className="w-full text-xs text-ink-muted">
        Stored only in this tab's session storage — never sent anywhere but Anthropic's API, and gone when you close this tab.
      </p>
    </form>
  );
}

function maskKey(key) {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
}

export default ApiKeySettings;
