"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowDownAZ,
  BarChart3,
  Bold,
  BookOpen,
  Bookmark,
  BookmarkPlus,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Command,
  Copy,
  Download,
  FileText,
  Filter,
  Folder,
  Globe2,
  Hash,
  HelpCircle,
  History,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  Lock,
  Maximize2,
  Menu,
  Minimize2,
  MoreHorizontal,
  Moon,
  Pin,
  Plus,
  PenLine,
  Redo2,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Type,
  Undo2,
  Unlock,
  X,
} from "lucide-react";

import {
  defaultAccent,
  isNoteColor,
  limits,
  noteColors,
  redactProtected,
  sampleNotes,
  templates,
  type MemoTemplate,
  type Note,
  type Revision,
  type SavedSearch,
} from "../lib/memo";
import { excerpt, markdownToHtml, outgoingLinkTitles, taskStats, wordCount } from "../lib/markdown";
import {
  highlightTerms,
  isOverdue,
  matchesSearch,
  normalizeTag,
  tagMatches,
  tagNamespaces,
} from "../lib/search";
import { canProtectMemos, decryptText, encryptText, makeRecoveryCode } from "../lib/crypto";
import {
  clearWorkspace,
  loadWorkspace,
  readJson,
  readPref,
  saveWorkspace,
  storageEstimate,
  writeJson,
  writePref,
} from "../lib/client-store";
import {
  probeServer,
  pushWorkspace,
  readPassphrase,
  writePassphrase,
  type SyncTarget,
} from "../lib/sync-client";
import { coerceImportedNote } from "../lib/validate-note";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
const formatDueDate = formatDate;

/** Formats a byte count for the storage readout in settings. */
const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size < 10 ? size.toFixed(1) : Math.round(size)} ${units[unit]}`;
};

/** Wraps each matching search term in the given text with a <mark>. */
function HighlightedText({ value, query }: { value: string; query: string }) {
  const terms = useMemo(() => highlightTerms(query), [query]);
  if (!terms.length) return <>{value}</>;
  const pattern = new RegExp(
    `(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "ig",
  );
  return (
    <>
      {value
        .split(pattern)
        .map((part, index) => (terms.includes(part.toLowerCase()) ? <mark key={index}>{part}</mark> : part))}
    </>
  );
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>(sampleNotes);
  const [activeId, setActiveId] = useState(sampleNotes[0].id);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<"updated" | "title" | "created" | "due">("updated");
  const [dark, setDark] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [quickCaptureTitle, setQuickCaptureTitle] = useState("");
  const [quickCaptureValue, setQuickCaptureValue] = useState("");
  const [linkCaptureOpen, setLinkCaptureOpen] = useState(false);
  const [linkCaptureUrl, setLinkCaptureUrl] = useState("");
  const [linkCaptureTitle, setLinkCaptureTitle] = useState("");
  const [linkCaptureNote, setLinkCaptureNote] = useState("");
  const [commandQuery, setCommandQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const [toast, setToast] = useState("");
  const [syncState, setSyncState] = useState<"saved" | "saving" | "offline">("saved");
  const [syncTarget, setSyncTarget] = useState<SyncTarget["kind"]>("device");
  const [storageNotice, setStorageNotice] = useState("");
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [passphraseInput, setPassphraseInput] = useState("");
  const [modKey, setModKey] = useState("Ctrl");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [linkQuery, setLinkQuery] = useState("");
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const [linkSuggestionIndex, setLinkSuggestionIndex] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("any");
  const [lengthFilter, setLengthFilter] = useState("any");
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [customTemplates, setCustomTemplates] = useState<MemoTemplate[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [accent, setAccent] = useState(defaultAccent);
  const [compact, setCompact] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<Note | null>(null);
  const [recoveryPrompt, setRecoveryPrompt] = useState<Note | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [unlockedKeys, setUnlockedKeys] = useState<Record<string, string>>({});
  const [passwordMode, setPasswordMode] = useState<"unlock" | "protect" | "unprotect">("unlock");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const encryptionVersion = useRef(0);
  const historyRef = useRef<Record<string, { past: string[]; future: string[] }>>({});
  const historySkip = useRef(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingSave = useRef<Note[] | null>(null);
  const deepLinkHandled = useRef(false);
  const shareHandled = useRef(false);
  const active = notes.find((note) => note.id === activeId) ?? notes[0];

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setCustomFolders(readJson<string[]>("memo-folders", []).filter((folder) => typeof folder === "string"));
    setSavedSearches(
      readJson<SavedSearch[]>("memo-saved-searches", []).filter(
        (saved) => !!saved && typeof saved.name === "string" && typeof saved.query === "string",
      ),
    );
    setCustomTemplates(
      readJson<MemoTemplate[]>("memo-templates", []).filter(
        (template) =>
          !!template &&
          typeof template === "object" &&
          typeof template.id === "string" &&
          typeof template.title === "string" &&
          typeof template.content === "string",
      ),
    );
    const storedView = readPref("memo-view");
    if (storedView === "grid" || storedView === "list") setView(storedView);
    const storedSort = readPref("memo-sort");
    if (
      storedSort === "updated" ||
      storedSort === "title" ||
      storedSort === "created" ||
      storedSort === "due"
    )
      setSort(storedSort);
    setDark(readPref("memo-theme") === "dark");
    setAccent(readPref("memo-accent") || defaultAccent);
    setCompact(readPref("memo-density") === "compact");
    setPassphraseInput(readPassphrase());
    if (/mac|iphone|ipad|ipod/i.test(navigator.userAgent)) setModKey("\u2318");

    /**
     * Works out where this workspace lives, then opens it.
     *
     * The device copy and the server probe run together so a slow or absent
     * server never delays first paint, and a server workspace replaces the
     * device copy only when the server genuinely holds memos.
     */
    const start = async () => {
      const [device, probe] = await Promise.all([loadWorkspace(), probeServer(controller.signal)]);
      if (cancelled) return;
      setSyncTarget(probe.target.kind);

      if (probe.target.kind === "server" && probe.notes?.length) {
        setNotes(probe.notes);
        setActiveId(probe.notes[0].id);
        setSyncState("saved");
        return;
      }

      const initial = device?.length ? device : sampleNotes;
      setNotes(initial);
      setActiveId(initial[0].id);
      if (probe.target.kind === "server") persistWorkspace(initial, "server");
      else setSyncState("saved");
    };
    void start();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  useEffect(() => {
    if (deepLinkHandled.current || !notes.length) return;
    const hash = window.location.hash;
    if (!hash.startsWith("#note-")) {
      deepLinkHandled.current = true;
      return;
    }
    const note = notes.find((item) => item.id === hash.slice(6));
    if (!note) return;
    deepLinkHandled.current = true;
    openNote(note);
  }, [notes]);
  useEffect(() => {
    if (shareHandled.current || typeof window === "undefined" || !notes.length) return;
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get("url")?.trim() || "";
    const sharedText = params.get("text")?.trim() || "";
    const sharedTitle = params.get("title")?.trim() || "";
    if (!sharedUrl && !sharedText && !sharedTitle) {
      shareHandled.current = true;
      return;
    }
    shareHandled.current = true;
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
    if (sharedUrl) {
      setLinkCaptureUrl(sharedUrl);
      setLinkCaptureTitle(sharedTitle);
      setLinkCaptureNote(sharedText);
      setLinkCaptureOpen(true);
      notify("Shared link ready to save");
    } else {
      setQuickCaptureTitle(sharedTitle);
      setQuickCaptureValue(sharedText);
      setQuickCaptureOpen(true);
      notify("Shared text ready to save");
    }
  }, [notes]);
  useEffect(() => {
    if (!notes.length) return;
    let cancelled = false;
    // Protected plaintext is held in memory only; the device copy keeps ciphertext.
    void saveWorkspace(redactProtected(notes)).then((outcome) => {
      if (cancelled) return;
      if (!outcome.ok)
        setStorageNotice(
          outcome.reason === "quota"
            ? "This device is out of storage. Export a backup, then remove some embedded images."
            : "This browser is not allowing memos to be saved. Export a backup to be safe.",
        );
      else if (!outcome.durable)
        setStorageNotice("This browser blocked its database, so memos are in a smaller fallback store.");
      else setStorageNotice("");
    });
    return () => {
      cancelled = true;
    };
  }, [notes]);
  useEffect(() => {
    const preview = document.querySelector<HTMLElement>(".editor-preview");
    if (!preview || !active) return;
    const handleTaskChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.tagName !== "INPUT" || target.type !== "checkbox" || !target.dataset.taskIndex) return;
      let current = 0;
      const nextContent = active.content.replace(
        /^\s*([-*+]) \[([ xX])\] (.*)$/gm,
        (line, marker, mark, text) => {
          if (current++ !== Number(target.dataset.taskIndex)) return line;
          return `${marker} [${target.checked ? "x" : " "}] ${text}`;
        },
      );
      updateNote({ content: nextContent });
    };
    const handleInternalLink = (event: Event) => {
      const target = (event.target as HTMLElement).closest<HTMLAnchorElement>("a.internal-link");
      if (!target) return;
      event.preventDefault();
      const encodedTitle = target.getAttribute("href")?.replace("#memo-", "") || "";
      const linked = notes.find(
        (note) => note.title.toLowerCase() === decodeURIComponent(encodedTitle).toLowerCase(),
      );
      if (linked) openNote(linked);
      else notify("That linked memo does not exist");
    };
    preview.addEventListener("change", handleTaskChange);
    preview.addEventListener("click", handleInternalLink);
    return () => {
      preview.removeEventListener("change", handleTaskChange);
      preview.removeEventListener("click", handleInternalLink);
    };
  }, [active?.id, active?.content, previewMode, notes]);
  useEffect(() => {
    const editor = document.querySelector<HTMLElement>(".editor-modal");
    if (!editor || !active || previewMode) return;
    const getImage = (files: FileList | null) =>
      Array.from(files || []).find((file) => file.type.startsWith("image/"));
    const handlePaste = (event: ClipboardEvent) => {
      const image = getImage(event.clipboardData?.files || null);
      if (!image) return;
      event.preventDefault();
      attachImage(image);
    };
    const handleDragOver = (event: DragEvent) => {
      if (getImage(event.dataTransfer?.files || null)) event.preventDefault();
    };
    const handleDrop = (event: DragEvent) => {
      const image = getImage(event.dataTransfer?.files || null);
      if (!image) return;
      event.preventDefault();
      attachImage(image);
    };
    editor.addEventListener("paste", handlePaste);
    editor.addEventListener("dragover", handleDragOver);
    editor.addEventListener("drop", handleDrop);
    return () => {
      editor.removeEventListener("paste", handlePaste);
      editor.removeEventListener("dragover", handleDragOver);
      editor.removeEventListener("drop", handleDrop);
    };
  }, [active?.id, previewMode]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    writePref("memo-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-deep", accent);
    document.documentElement.dataset.density = compact ? "compact" : "comfortable";
    writePref("memo-accent", accent);
    writePref("memo-density", compact ? "compact" : "comfortable");
  }, [accent, compact]);
  useEffect(() => {
    writePref("memo-view", view);
    writePref("memo-sort", sort);
  }, [view, sort]);
  useEffect(() => {
    if (!editorOpen) setFocusMode(false);
  }, [editorOpen]);
  useEffect(() => {
    // A debounced save would otherwise be lost if the tab closes within 250 ms.
    const flush = () => {
      if (!pendingSave.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      flushPendingSave();
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);
  // Held in a ref so the listener below stays registered while still seeing
  // current state; re-binding it on every render churned the event listener.
  const shortcutRef = useRef<(event: KeyboardEvent) => void>(() => undefined);
  shortcutRef.current = (event: KeyboardEvent) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "k" &&
      !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)
    ) {
      event.preventDefault();
      setCommandQuery("");
      setCommandIndex(0);
      setCommandOpen(true);
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
      event.preventDefault();
      createNote();
    }
    if (
      event.key.toLowerCase() === "q" &&
      !event.metaKey &&
      !event.ctrlKey &&
      !["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement).tagName)
    ) {
      event.preventDefault();
      setQuickCaptureTitle("");
      setQuickCaptureValue("");
      setQuickCaptureOpen(true);
    }
    if (event.key === "Escape") {
      setCommandOpen(false);
      setCommandQuery("");
      setCommandIndex(0);
      setEditorOpen(false);
      setPasswordPrompt(null);
      setRecoveryPrompt(null);
      setRecoveryNotice("");
      setAnalyticsOpen(false);
      setConnectionsOpen(false);
      setHelpOpen(false);
      setSettingsOpen(false);
      setTemplateOpen(false);
      setQuickCaptureOpen(false);
      setLinkCaptureOpen(false);
      setHistoryOpen(false);
      setQuickCaptureTitle("");
      setQuickCaptureValue("");
      setLinkCaptureUrl("");
      setLinkCaptureTitle("");
      setLinkCaptureNote("");
    }
  };
  useEffect(() => {
    const handler = (event: KeyboardEvent) => shortcutRef.current(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && query.trim()) {
        setQuery("");
        setAdvancedOpen(false);
        setDateFilter("any");
        setLengthFilter("any");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [query]);

  const filtered = useMemo(
    () =>
      notes
        .filter((note) => {
          const matches = matchesSearch(
            note.protected && !unlockedKeys[note.id] ? { ...note, content: "" } : note,
            query,
          );
          const stats = taskStats(note.content);
          const byFilter =
            filter === "all"
              ? !note.archived && !note.deleted
              : filter === "favorites"
                ? !!note.favorite && !note.archived && !note.deleted
                : filter === "archived"
                  ? !!note.archived && !note.deleted
                  : filter === "trash"
                    ? !!note.deleted
                    : filter === "recent"
                      ? new Date(note.updatedAt).getTime() > Date.now() - 604800000 &&
                        !note.archived &&
                        !note.deleted
                      : filter === "pinned"
                        ? !!note.pinned && !note.archived && !note.deleted
                        : filter === "upcoming" || filter === "calendar"
                          ? !!note.dueAt && !note.archived && !note.deleted
                          : filter === "task-board"
                            ? stats.total > 0 && !note.archived && !note.deleted
                            : note.tags.some((tag) => tagMatches(tag, filter)) &&
                              !note.archived &&
                              !note.deleted;
          const noteAge = Date.now() - new Date(note.updatedAt).getTime();
          const dateMatches =
            dateFilter === "any" ||
            (dateFilter === "today" && noteAge < 86400000) ||
            (dateFilter === "week" && noteAge < 604800000) ||
            (dateFilter === "month" && noteAge < 2592000000);
          const words = note.protected && !unlockedKeys[note.id] ? 0 : wordCount(note.content);
          const lengthMatches =
            lengthFilter === "any" ||
            (lengthFilter === "short" && words < 100) ||
            (lengthFilter === "medium" && words >= 100 && words <= 300) ||
            (lengthFilter === "long" && words > 300);
          return matches && byFilter && dateMatches && lengthMatches;
        })
        .sort((a, b) =>
          sort === "title"
            ? a.title.localeCompare(b.title)
            : sort === "created"
              ? new Date(a.createdAt || a.updatedAt).getTime() -
                new Date(b.createdAt || b.updatedAt).getTime()
              : sort === "due"
                ? (a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY) -
                  (b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY)
                : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [notes, query, filter, sort, dateFilter, lengthFilter],
  );
  const tags = Array.from(
    new Set(notes.filter((note) => !note.deleted).flatMap((note) => note.tags.flatMap(tagNamespaces))),
  ).sort((a, b) => a.localeCompare(b));
  const allTemplates = [...templates, ...customTemplates];
  const folders = Array.from(
    new Set([
      "inbox",
      "work",
      "personal",
      ...customFolders,
      ...notes.filter((note) => !note.deleted).map((note) => note.folder || "inbox"),
    ]),
  );
  const activeTags = active?.tags ?? [];
  const outgoingLinks = active ? outgoingLinkTitles(active.content) : [];
  const linkedNotes = active
    ? notes.filter(
        (note) =>
          outgoingLinks.some((link) => note.title.toLowerCase() === link.toLowerCase()) &&
          note.id !== active.id,
      )
    : [];
  const backlinks = active
    ? notes.filter(
        (note) =>
          note.id !== active.id && note.content.toLowerCase().includes(`[[${active.title.toLowerCase()}]]`),
      )
    : [];
  const graphNeighbors = Array.from(
    new Map([...linkedNotes, ...backlinks].map((note) => [note.id, note])).values(),
  ).slice(0, 6);
  const graphPositions = [
    [18, 24],
    [82, 24],
    [12, 72],
    [88, 72],
    [35, 90],
    [65, 90],
  ];
  const linkSuggestions = notes
    .filter(
      (note) =>
        !note.deleted && note.id !== active?.id && note.title.toLowerCase().includes(linkQuery.toLowerCase()),
    )
    .slice(0, 6);
  useEffect(() => {
    const visible = new Set(filtered.map((note) => note.id));
    setSelectedIds((current) => {
      const next = current.filter((id) => visible.has(id));
      return next.length === current.length ? current : next;
    });
  }, [filtered]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        editorOpen ||
        commandOpen ||
        passwordPrompt ||
        recoveryPrompt ||
        recoveryNotice ||
        analyticsOpen ||
        connectionsOpen ||
        helpOpen ||
        settingsOpen ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      )
        return;
      const key = event.key.toLowerCase();
      if (!["j", "k", "enter"].includes(key) || !filtered.length) return;
      event.preventDefault();
      const currentIndex = Math.max(
        0,
        filtered.findIndex((note) => note.id === activeId),
      );
      if (key === "enter") {
        if (active) openNote(active);
        return;
      }
      const nextIndex = Math.min(filtered.length - 1, Math.max(0, currentIndex + (key === "j" ? 1 : -1)));
      const next = filtered[nextIndex];
      if (!next) return;
      setActiveId(next.id);
      requestAnimationFrame(() =>
        document.getElementById(`note-${next.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
      );
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    filtered,
    activeId,
    active,
    editorOpen,
    commandOpen,
    passwordPrompt,
    recoveryPrompt,
    recoveryNotice,
    analyticsOpen,
    connectionsOpen,
    helpOpen,
    settingsOpen,
  ]);
  async function retrySync() {
    if (!notes.length) {
      notify("There are no memos to sync");
      return;
    }
    const probe = await probeServer();
    setSyncTarget(probe.target.kind);
    if (probe.target.kind !== "server") {
      setSyncState("saved");
      notify(
        probe.target.kind === "locked"
          ? "Add your sync passphrase in settings"
          : "This workspace is saved on this device",
      );
      return;
    }
    persistWorkspace(notes);
    notify("Sync retry queued");
  }
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };
  /**
   * Queues the workspace for the server store.
   *
   * The device copy is written by its own effect, so when no server store is
   * reachable this only has to report that the work is already safe.
   */
  function persistWorkspace(nextNotes: Note[], target: SyncTarget["kind"] = syncTarget) {
    if (target !== "server") {
      pendingSave.current = null;
      setSyncState("saved");
      return;
    }
    pendingSave.current = redactProtected(
      nextNotes.map((note) => ({ ...note, title: note.title.trim() || "Untitled memo" })),
    );
    setSyncState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushPendingSave, 250);
  }

  /** Sends the newest queued workspace, never more than one request at a time. */
  function flushPendingSave() {
    const notesToSave = pendingSave.current;
    pendingSave.current = null;
    if (!notesToSave) return;
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        const result = await pushWorkspace(notesToSave);
        if (result === "saved") setSyncState("saved");
        else if (result === "offline") setSyncState("offline");
        else {
          // The server withdrew its store mid-session; the device copy stands.
          setSyncTarget(result);
          setSyncState("saved");
        }
      });
  }
  /** Saves a sync passphrase, then re-probes so the UI reflects the new access. */
  async function applyPassphrase() {
    writePassphrase(passphraseInput);
    const probe = await probeServer();
    setSyncTarget(probe.target.kind);
    if (probe.target.kind === "server") {
      if (probe.notes?.length) {
        setNotes(probe.notes);
        setActiveId(probe.notes[0].id);
        setSyncState("saved");
        notify("Sync connected");
      } else {
        persistWorkspace(notes, "server");
        notify("Sync connected — uploading this workspace");
      }
      return;
    }
    setSyncState("saved");
    notify(
      probe.target.kind === "locked"
        ? "That passphrase was not accepted"
        : "This deployment has no shared database",
    );
  }

  /** Clears every memo held in this browser. The server copy, if any, is untouched. */
  async function forgetDeviceWorkspace() {
    if (
      !window.confirm(
        "Remove every memo stored in this browser? Export a backup first — this cannot be undone.",
      )
    )
      return;
    await clearWorkspace();
    setNotes([]);
    setActiveId("");
    setSelectedIds([]);
    setEditorOpen(false);
    setSettingsOpen(false);
    setStorageNotice("");
    notify("Memos removed from this device");
  }

  function createNote() {
    const now = new Date().toISOString();
    const note: Note = {
      id: crypto.randomUUID(),
      title: "Untitled memo",
      content: "",
      tags: ["inbox"],
      folder: "inbox",
      createdAt: now,
      updatedAt: now,
      color: "yellow",
    };
    const nextNotes = [note, ...notes];
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    setActiveId(note.id);
    setEditorOpen(true);
    setSidebarOpen(false);
  }
  function submitQuickCapture() {
    const content = quickCaptureValue.trim();
    if (!content) {
      notify("Write something first");
      return;
    }
    const now = new Date().toISOString();
    const note: Note = {
      id: crypto.randomUUID(),
      title: quickCaptureTitle.trim() || "Quick capture",
      content,
      tags: ["inbox", "quick-capture"],
      folder: "inbox",
      createdAt: now,
      updatedAt: now,
      color: "yellow",
    };
    const nextNotes = [note, ...notes];
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    setActiveId(note.id);
    setQuickCaptureOpen(false);
    setQuickCaptureTitle("");
    setQuickCaptureValue("");
    setEditorOpen(true);
    setSidebarOpen(false);
    notify("Quick capture saved");
  }
  function submitLinkCapture() {
    const rawUrl = linkCaptureUrl.trim();
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      notify("Enter a valid http or https link");
      return;
    }
    const title = linkCaptureTitle.trim() || url.hostname.replace(/^www\./, "");
    const content = `${linkCaptureNote.trim() ? `${linkCaptureNote.trim()}\n\n` : ""}[Open source link](${url.toString()})`;
    const now = new Date().toISOString();
    const note: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      tags: ["web", "inbox"],
      folder: "inbox",
      createdAt: now,
      updatedAt: now,
      color: "blue",
    };
    const nextNotes = [note, ...notes];
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    setActiveId(note.id);
    setLinkCaptureOpen(false);
    setLinkCaptureUrl("");
    setLinkCaptureTitle("");
    setLinkCaptureNote("");
    setEditorOpen(true);
    setSidebarOpen(false);
    notify("Link saved to your library");
  }
  function createFromTemplate(template: MemoTemplate) {
    const today = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(),
    );
    const dailyTitle = `Daily note · ${today}`;
    if (template.id === "daily") {
      const existing = notes.find((note) => note.title === dailyTitle && !note.deleted);
      if (existing) {
        setActiveId(existing.id);
        setEditorOpen(true);
        setTemplateOpen(false);
        notify("Opened today’s daily note");
        return;
      }
    }
    const now = new Date().toISOString();
    const note: Note = {
      id: crypto.randomUUID(),
      title: template.id === "daily" ? dailyTitle : template.title,
      content: template.content,
      tags: template.tags,
      folder: template.id === "daily" ? "personal" : "work",
      createdAt: now,
      updatedAt: now,
      color: template.color,
    };
    const nextNotes = [note, ...notes];
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    setActiveId(note.id);
    setEditorOpen(true);
    setTemplateOpen(false);
    setSidebarOpen(false);
    notify(`${template.title} created`);
  }
  function saveCurrentAsTemplate() {
    if (!active) {
      notify("Open a memo to save it as a template");
      return;
    }
    if (active.protected && !unlockedKeys[active.id]) {
      notify("Unlock this memo before saving it as a template");
      return;
    }
    const value = window.prompt("Name this template", active.title);
    const title = value?.trim();
    if (!title) return;
    const template: MemoTemplate = {
      id: `custom-${crypto.randomUUID()}`,
      title: title.slice(0, limits.folder),
      description: `From ${active.title}`,
      tags: active.tags.slice(0, 20),
      color: active.color,
      content: active.content,
      custom: true,
    };
    const nextTemplates = [...customTemplates, template].slice(-limits.customTemplates);
    setCustomTemplates(nextTemplates);
    writeJson("memo-templates", nextTemplates);
    setTemplateOpen(true);
    notify("Template saved");
  }
  function removeCustomTemplate(id: string) {
    const nextTemplates = customTemplates.filter((template) => template.id !== id);
    setCustomTemplates(nextTemplates);
    writeJson("memo-templates", nextTemplates);
    notify("Template removed");
  }
  function duplicateNote() {
    if (!active) return;
    if (active.protected && !unlockedKeys[active.id]) {
      notify("Unlock this memo before duplicating it");
      return;
    }
    const now = new Date().toISOString();
    const duplicate: Note = {
      ...active,
      id: crypto.randomUUID(),
      title: `${active.title} (copy)`,
      createdAt: now,
      updatedAt: now,
      protected: false,
      encryptedContent: undefined,
      recoveryEncryptedContent: undefined,
      deleted: false,
      archived: false,
    };
    const nextNotes = [duplicate, ...notes];
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    setActiveId(duplicate.id);
    setEditorOpen(true);
    notify("Memo duplicated");
  }
  function updateNote(patch: Partial<Note>) {
    if (!active) return;
    if (patch.content !== undefined && patch.content !== active.content && !historySkip.current) {
      const history = historyRef.current[active.id] || { past: [], future: [] };
      history.past = [...history.past.slice(-(limits.undoDepth - 1)), active.content];
      history.future = [];
      historyRef.current[active.id] = history;
    }
    if (patch.content !== undefined && patch.content !== active.content && !active.protected) {
      const allRevisions = readJson<Record<string, Revision[]>>("memo-revisions", {});
      const currentRevisions = allRevisions[active.id] || [];
      const last = currentRevisions[0];
      // One snapshot per burst of typing rather than one per keystroke.
      if (!last || Date.now() - new Date(last.savedAt).getTime() > 8000) {
        allRevisions[active.id] = [
          { content: active.content, title: active.title, savedAt: new Date().toISOString() },
          ...currentRevisions,
        ].slice(0, limits.revisionsPerNote);
        writeJson("memo-revisions", allRevisions);
      }
    }
    const nextNotes = notes.map((note) =>
      note.id === active.id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note,
    );
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    if (active.protected && patch.content !== undefined && unlockedKeys[active.id]) {
      const version = ++encryptionVersion.current;
      void encryptText(patch.content, unlockedKeys[active.id])
        .then((encryptedContent) => {
          if (version !== encryptionVersion.current) return;
          const encryptedNotes = nextNotes.map((note) =>
            note.id === active.id ? { ...note, encryptedContent } : note,
          );
          setNotes(encryptedNotes);
          persistWorkspace(encryptedNotes);
        })
        .catch(() => notify("Could not re-encrypt this memo"));
    }
  }
  function clearRevisionHistory(noteId: string) {
    const allRevisions = readJson<Record<string, Revision[]>>("memo-revisions", {});
    delete allRevisions[noteId];
    writeJson("memo-revisions", allRevisions);
  }
  function openHistory() {
    if (!active) return;
    if (active.protected) {
      notify("Protected memos do not keep plaintext history");
      return;
    }
    const entries = readJson<Record<string, Revision[]>>("memo-revisions", {})[active.id] || [];
    if (!entries.length) {
      notify("No saved revisions for this memo yet");
      return;
    }
    setRevisions(entries);
    setHistoryOpen(true);
  }
  function restoreRevision(revision: Revision) {
    updateNote({ title: revision.title, content: revision.content });
    setHistoryOpen(false);
    notify("Revision restored");
  }
  function undoEdit() {
    if (!active) return;
    const history = historyRef.current[active.id] || { past: [], future: [] };
    const previous = history.past.pop();
    if (previous === undefined) {
      notify("Nothing to undo in this memo");
      return;
    }
    history.future.push(active.content);
    historyRef.current[active.id] = history;
    historySkip.current = true;
    updateNote({ content: previous });
    historySkip.current = false;
    notify("Edit undone");
  }
  function redoEdit() {
    if (!active) return;
    const history = historyRef.current[active.id] || { past: [], future: [] };
    const next = history.future.pop();
    if (next === undefined) {
      notify("Nothing to redo in this memo");
      return;
    }
    history.past.push(active.content);
    historyRef.current[active.id] = history;
    historySkip.current = true;
    updateNote({ content: next });
    historySkip.current = false;
    notify("Edit redone");
  }
  function deleteNote() {
    if (!active) return;
    const nextNotes = notes.map((note) =>
      note.id === active.id
        ? { ...note, deleted: true, archived: false, updatedAt: new Date().toISOString() }
        : note,
    );
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    setActiveId(notes.find((note) => note.id !== active.id && !note.deleted)?.id ?? "");
    setEditorOpen(false);
    notify("Memo moved to trash");
  }
  function restoreNote(note: Note) {
    const nextNotes = notes.map((item) =>
      item.id === note.id ? { ...item, deleted: false, updatedAt: new Date().toISOString() } : item,
    );
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    notify("Memo restored");
  }
  function permanentlyDelete(note: Note) {
    if (!window.confirm(`Permanently delete “${note.title}”? This cannot be undone.`)) return;
    const nextNotes = notes.filter((item) => item.id !== note.id);
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    notify("Memo permanently deleted");
  }
  function emptyTrash() {
    const deletedCount = notes.filter((note) => note.deleted).length;
    if (!deletedCount) {
      notify("Trash is already empty");
      return;
    }
    if (
      !window.confirm(
        `Permanently delete ${deletedCount} memo${deletedCount === 1 ? "" : "s"} from trash? This cannot be undone.`,
      )
    )
      return;
    const nextNotes = notes.filter((note) => !note.deleted);
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    setActiveId(nextNotes[0]?.id || "");
    notify("Trash emptied");
  }
  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }
  function selectVisible() {
    setSelectedIds((current) => (current.length === filtered.length ? [] : filtered.map((note) => note.id)));
  }
  function bulkAction(action: "archive" | "trash") {
    if (!selectedIds.length) return;
    const selected = new Set(selectedIds);
    const now = new Date().toISOString();
    const nextNotes = notes.map((note) =>
      selected.has(note.id)
        ? {
            ...note,
            archived: action === "archive" ? true : false,
            deleted: action === "trash" ? true : note.deleted,
            updatedAt: now,
          }
        : note,
    );
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    setSelectedIds([]);
    setActiveId(nextNotes.find((note) => !note.deleted && !note.archived)?.id || nextNotes[0]?.id || "");
    notify(
      `${selectedIds.length} memo${selectedIds.length === 1 ? "" : "s"} ${action === "archive" ? "archived" : "moved to trash"}`,
    );
  }
  function bulkSetFlag(flag: "favorite" | "pinned") {
    if (!selectedIds.length || filter === "trash") {
      notify("Select active memos first");
      return;
    }
    const selected = new Set(selectedIds);
    const now = new Date().toISOString();
    const shouldEnable = notes.some((note) => selected.has(note.id) && !note[flag]);
    const nextNotes = notes.map((note) =>
      selected.has(note.id) ? { ...note, [flag]: shouldEnable, updatedAt: now } : note,
    );
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    setSelectedIds([]);
    notify(
      `${selectedIds.length} memo${selectedIds.length === 1 ? "" : "s"} ${shouldEnable ? `added to ${flag === "favorite" ? "favorites" : "pinned"}` : `removed from ${flag === "favorite" ? "favorites" : "pins"}`}`,
    );
  }
  function archiveCompletedTasks() {
    const completedIds = new Set(
      notes
        .filter(
          (note) =>
            !note.deleted &&
            !note.archived &&
            taskStats(note.content).total > 0 &&
            taskStats(note.content).completed === taskStats(note.content).total,
        )
        .map((note) => note.id),
    );
    if (!completedIds.size) {
      notify("No completed task memos to archive");
      return;
    }
    const now = new Date().toISOString();
    const nextNotes = notes.map((note) =>
      completedIds.has(note.id) ? { ...note, archived: true, updatedAt: now } : note,
    );
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    setFilter("archived");
    setQuery("");
    notify(`${completedIds.size} completed task memo${completedIds.size === 1 ? "" : "s"} archived`);
  }
  function bulkMoveFolder(folder: string) {
    if (!selectedIds.length || filter === "trash") return;
    const selected = new Set(selectedIds);
    const now = new Date().toISOString();
    const nextNotes = notes.map((note) =>
      selected.has(note.id) ? { ...note, folder, updatedAt: now } : note,
    );
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    setSelectedIds([]);
    notify(`${selectedIds.length} memo${selectedIds.length === 1 ? "" : "s"} moved to ${folder}`);
  }
  function bulkTag(action: "add" | "remove") {
    const clean = normalizeTag(bulkTagInput);
    if (!selectedIds.length || filter === "trash") return;
    if (!clean) {
      notify("Enter a tag first");
      return;
    }
    const selected = new Set(selectedIds);
    const now = new Date().toISOString();
    const nextNotes = notes.map((note) => {
      if (!selected.has(note.id)) return note;
      const tags =
        action === "add"
          ? Array.from(new Set([...note.tags, clean]))
          : note.tags.filter((tag) => tag !== clean);
      return { ...note, tags, updatedAt: now };
    });
    setNotes(nextNotes);
    persistWorkspace(nextNotes);
    setSelectedIds([]);
    setBulkTagInput("");
    notify(
      `${selectedIds.length} memo${selectedIds.length === 1 ? "" : "s"} ${action === "add" ? "tagged" : "untagged"} with #${clean}`,
    );
  }
  function addTag() {
    const clean = normalizeTag(tagInput);
    if (!clean || !active || activeTags.includes(clean)) return;
    updateNote({ tags: [...activeTags, clean] });
    setTagInput("");
  }
  function removeTag(tag: string) {
    if (!active) return;
    updateNote({ tags: activeTags.filter((item) => item !== tag) });
  }
  function createFolder() {
    const value = window.prompt("Name this folder");
    const folder = value?.trim().toLowerCase().replace(/\s+/g, "-");
    if (!folder) return;
    if (folders.includes(folder)) {
      notify(`Folder ${folder} already exists`);
      return;
    }
    const nextFolders = [...customFolders, folder];
    setCustomFolders(nextFolders);
    writeJson("memo-folders", nextFolders);
    if (active) {
      updateNote({ folder });
      notify(`Moved to ${folder}`);
    } else notify(`Folder ${folder} created`);
  }
  function saveCurrentSearch() {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      notify("Enter a search before saving it");
      return;
    }
    const existing = savedSearches.find((saved) => saved.query === cleanQuery);
    if (existing) {
      notify("That search is already saved");
      return;
    }
    const value = window.prompt("Name this saved search", cleanQuery);
    const name = value?.trim();
    if (!name) return;
    const saved = { id: crypto.randomUUID(), name, query: cleanQuery };
    const nextSearches = [...savedSearches, saved];
    setSavedSearches(nextSearches);
    writeJson("memo-saved-searches", nextSearches);
    notify(`Saved view “${name}” created`);
  }
  function removeSavedSearch(id: string) {
    const nextSearches = savedSearches.filter((saved) => saved.id !== id);
    setSavedSearches(nextSearches);
    writeJson("memo-saved-searches", nextSearches);
    notify("Saved view removed");
  }
  function exportNotes(sourceNotes = notes, filename = "memo-no-sekai-export.json") {
    const exportable = sourceNotes
      .filter((note) => !note.deleted)
      .map((note) => (note.protected ? { ...note, content: "" } : note));
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      notes: exportable,
      folders: customFolders,
      savedSearches,
      templates: customTemplates,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    notify(`${exportable.length} memo${exportable.length === 1 ? "" : "s"} exported`);
  }
  function exportSelectedNotes() {
    if (!selectedIds.length) {
      notify("Select memos to export first");
      return;
    }
    const selected = new Set(selectedIds);
    exportNotes(
      notes.filter((note) => selected.has(note.id)),
      "memo-no-sekai-selection.json",
    );
    setSelectedIds([]);
  }
  function exportText() {
    const body = notes
      .filter((note) => !note.deleted)
      .map(
        (note) =>
          `# ${note.title}\n\n${note.protected ? "[Protected memo — unlock in Memo no Sekai to read]" : note.content}\n\nTags: ${note.tags.map((tag) => `#${tag}`).join(" ")}\nUpdated: ${formatDate(note.updatedAt)}\n\n---\n`,
      )
      .join("\n");
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "memo-no-sekai-export.txt";
    a.click();
    URL.revokeObjectURL(url);
    notify("Plain-text export downloaded");
  }
  function exportAnalytics() {
    const visibleNotes = notes.filter((note) => !note.deleted);
    const readableNotes = visibleNotes.filter((note) => !note.protected || unlockedKeys[note.id]);
    const tagUsage = Array.from(new Set(visibleNotes.flatMap((note) => note.tags)))
      .map((tag) => ({ tag, count: visibleNotes.filter((note) => note.tags.includes(tag)).length }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    const activityByDay = Array.from({ length: 30 }, (_, index) => {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (29 - index));
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      return {
        date: key,
        memos: visibleNotes.filter((note) => {
          const updated = new Date(note.updatedAt);
          return (
            updated.getFullYear() === day.getFullYear() &&
            updated.getMonth() === day.getMonth() &&
            updated.getDate() === day.getDate()
          );
        }).length,
      };
    });
    const report = {
      version: 1,
      generatedAt: new Date().toISOString(),
      totals: {
        memos: visibleNotes.length,
        protectedMemos: visibleNotes.filter((note) => note.protected).length,
        words: readableNotes.reduce((total, note) => total + wordCount(note.content), 0),
        taskMemos: visibleNotes.filter((note) => taskStats(note.content).total > 0).length,
        scheduledMemos: visibleNotes.filter((note) => note.dueAt).length,
      },
      tagUsage,
      activityByDay,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "memo-no-sekai-analytics.json";
    a.click();
    URL.revokeObjectURL(url);
    notify("Analytics report exported");
  }
  async function copySelectedNote() {
    const selected = selectedIds.length
      ? notes.filter((note) => selectedIds.includes(note.id))
      : active
        ? [active]
        : [];
    if (!selected.length) {
      notify("Select a memo to copy first");
      return;
    }
    const readable = selected.filter((note) => !note.protected || unlockedKeys[note.id]);
    if (!readable.length) {
      notify("Unlock the selected protected memos before copying");
      return;
    }
    try {
      await navigator.clipboard.writeText(
        readable.map((note) => `${note.title}\n\n${note.content}`).join("\n\n---\n\n"),
      );
      notify(`${readable.length} memo${readable.length === 1 ? "" : "s"} copied to clipboard`);
    } catch {
      notify("Clipboard access is unavailable");
    }
  }
  async function copyNoteLink() {
    if (!active) return;
    const url = new URL(window.location.href);
    url.hash = `note-${active.id}`;
    try {
      await navigator.clipboard.writeText(url.toString());
      notify("Memo link copied");
    } catch {
      notify("Clipboard access is unavailable");
    }
  }
  function importNotes(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as unknown;
        const payload = Array.isArray(parsed)
          ? { notes: parsed, folders: [], savedSearches: [], templates: [] }
          : parsed && typeof parsed === "object"
            ? (parsed as { notes?: unknown; folders?: unknown; savedSearches?: unknown; templates?: unknown })
            : null;
        if (!payload || !Array.isArray(payload.notes)) throw new Error();
        const usedIds = new Set(notes.map((note) => note.id));
        const takeId = (candidate?: string) => {
          const id = candidate && !usedIds.has(candidate) ? candidate : crypto.randomUUID();
          usedIds.add(id);
          return id;
        };
        const imported = payload.notes.map((raw) => coerceImportedNote(raw, takeId));
        if (imported.some((item) => item === null)) throw new Error("unreadable memo in backup");
        const normalizedNotes = imported as Note[];
        const nextNotes = [...normalizedNotes, ...notes];
        setNotes(nextNotes);
        persistWorkspace(nextNotes);
        const importedFolders = Array.isArray(payload.folders)
          ? payload.folders
              .filter((folder): folder is string => typeof folder === "string" && !!folder.trim())
              .map((folder) => folder.trim().toLowerCase().replace(/\s+/g, "-").slice(0, limits.folder))
              .slice(0, limits.customFolders)
          : [];
        const nextFolders = Array.from(new Set([...customFolders, ...importedFolders]));
        setCustomFolders(nextFolders);
        writeJson("memo-folders", nextFolders);
        const importedSearches = Array.isArray(payload.savedSearches)
          ? payload.savedSearches
              .filter(
                (saved) =>
                  saved &&
                  typeof (saved as { name?: unknown }).name === "string" &&
                  typeof (saved as { query?: unknown }).query === "string",
              )
              .map((saved) => ({
                id: crypto.randomUUID(),
                name: (saved as { name: string }).name.trim().slice(0, 100),
                query: (saved as { query: string }).query.trim().slice(0, 500),
              }))
              .filter((saved) => saved.name && saved.query)
          : [];
        const nextSearches = [
          ...savedSearches,
          ...importedSearches.filter(
            (saved) => !savedSearches.some((current) => current.query === saved.query),
          ),
        ].slice(0, limits.savedSearches);
        setSavedSearches(nextSearches);
        writeJson("memo-saved-searches", nextSearches);
        const importedTemplates = Array.isArray(payload.templates)
          ? payload.templates
              .filter(
                (template) =>
                  template &&
                  typeof template === "object" &&
                  typeof (template as { title?: unknown }).title === "string" &&
                  typeof (template as { content?: unknown }).content === "string",
              )
              .map((template) => {
                const item = template as Partial<MemoTemplate>;
                return {
                  id: `custom-${crypto.randomUUID()}`,
                  title: item.title!.trim().slice(0, 100),
                  description:
                    typeof item.description === "string"
                      ? item.description.trim().slice(0, 180)
                      : "Imported template",
                  tags: Array.isArray(item.tags)
                    ? item.tags
                        .filter((tag): tag is string => typeof tag === "string")
                        .map(normalizeTag)
                        .filter(Boolean)
                        .slice(0, 20)
                    : ["inbox"],
                  color: isNoteColor(item.color) ? item.color : "yellow",
                  content: item.content!.slice(0, limits.templateContent),
                  custom: true,
                };
              })
              .slice(0, limits.customTemplates)
          : [];
        const nextTemplates = [...customTemplates, ...importedTemplates].slice(-limits.customTemplates);
        setCustomTemplates(nextTemplates);
        writeJson("memo-templates", nextTemplates);
        notify(normalizedNotes.length + " memos and workspace views imported");
      } catch {
        notify("That file is not a Memo export");
      }
    };
    reader.readAsText(file);
  }
  function attachImage(file?: File) {
    if (!file || !active) return;
    if (!file.type.startsWith("image/")) {
      notify("Choose an image file");
      return;
    }
    if (file.size > limits.image) {
      notify("Images must be under 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      insertAtCursor(`![${alt}](${String(reader.result)})`);
      notify("Image added to this memo");
    };
    reader.readAsDataURL(file);
  }
  function insertAtCursor(prefix: string, suffix = "") {
    const textarea = document.querySelector<HTMLTextAreaElement>(".editor-body");
    if (!textarea || !active) return;
    const currentContent = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = currentContent.slice(start, end);
    updateNote({
      content: currentContent.slice(0, start) + prefix + selected + suffix + currentContent.slice(end),
    });
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  }
  function openNote(note: Note) {
    if (note.protected) {
      setPasswordPrompt(note);
      setPasswordMode("unlock");
      setPasswordValue("");
    } else {
      setActiveId(note.id);
      setEditorOpen(true);
    }
  }
  function requestProtection() {
    if (!active) return;
    if (!canProtectMemos()) {
      notify("This browser cannot encrypt memos. Open the app over HTTPS to protect them.");
      return;
    }
    setPasswordMode(active.protected ? "unprotect" : "protect");
    setPasswordPrompt(active);
    setPasswordValue("");
  }
  async function submitPassword() {
    if (!passwordPrompt || passwordValue.length < 4) {
      notify("Use at least 4 characters");
      return;
    }
    try {
      if (passwordMode === "unlock") {
        const content = await decryptText(passwordPrompt.encryptedContent || "", passwordValue);
        setUnlockedKeys((old) => ({ ...old, [passwordPrompt.id]: passwordValue }));
        setNotes((old) => old.map((note) => (note.id === passwordPrompt.id ? { ...note, content } : note)));
        setActiveId(passwordPrompt.id);
        setEditorOpen(true);
        notify("Memo unlocked");
      } else if (passwordMode === "protect") {
        clearRevisionHistory(passwordPrompt.id);
        const recoveryCode = makeRecoveryCode();
        const encryptedContent = await encryptText(passwordPrompt.content, passwordValue);
        const recoveryEncryptedContent = await encryptText(passwordPrompt.content, recoveryCode);
        const nextNotes = notes.map((note) =>
          note.id === passwordPrompt.id
            ? { ...note, protected: true, encryptedContent, recoveryEncryptedContent }
            : note,
        );
        setNotes(nextNotes);
        persistWorkspace(nextNotes);
        setRecoveryNotice(recoveryCode);
        notify("Memo protected");
      } else {
        const content = await decryptText(passwordPrompt.encryptedContent || "", passwordValue);
        const nextNotes = notes.map((note) =>
          note.id === passwordPrompt.id
            ? {
                ...note,
                protected: false,
                encryptedContent: undefined,
                recoveryEncryptedContent: undefined,
                content,
              }
            : note,
        );
        setNotes(nextNotes);
        persistWorkspace(nextNotes);
        notify("Memo protection removed");
      }
      setPasswordPrompt(null);
      setPasswordValue("");
    } catch {
      notify("That password did not unlock this memo");
    }
  }
  async function recoverMemo() {
    if (!recoveryPrompt || passwordValue.length < 4) {
      notify("Enter your recovery code");
      return;
    }
    try {
      const content = await decryptText(recoveryPrompt.recoveryEncryptedContent || "", passwordValue);
      const nextNotes = notes.map((note) =>
        note.id === recoveryPrompt.id
          ? {
              ...note,
              protected: false,
              encryptedContent: undefined,
              recoveryEncryptedContent: undefined,
              content,
            }
          : note,
      );
      setNotes(nextNotes);
      persistWorkspace(nextNotes);
      setActiveId(recoveryPrompt.id);
      setRecoveryPrompt(null);
      setPasswordValue("");
      setEditorOpen(true);
      notify("Memo recovered — protect it again with a new password");
    } catch {
      notify("That recovery code is not valid");
    }
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "/" && target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('[aria-label="Search memos"]')?.focus();
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        createFromTemplate(templates[0]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [notes]);
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest(".nav-item");
      if (
        button &&
        !button.closest(".folders-block") &&
        !button.closest(".task-block") &&
        !button.closest(".saved-searches-block")
      )
        setQuery("");
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);
  useEffect(() => {
    if (filter === "upcoming") setSort("due");
  }, [filter]);
  const syncStatus =
    syncState === "saving"
      ? { label: "Saving", hint: "Writing your latest change" }
      : syncState === "offline"
        ? { label: "Offline", hint: "Saved on this device. Select to retry sync." }
        : syncTarget === "server"
          ? { label: "Synced", hint: "Saved to your database" }
          : syncTarget === "locked"
            ? { label: "On this device", hint: "Add a sync passphrase in settings" }
            : { label: "On this device", hint: "Memos never leave this browser" };
  useEffect(() => {
    let cancelled = false;
    void storageEstimate().then((value) => {
      if (!cancelled) setStorageUsage(value);
    });
    return () => {
      cancelled = true;
    };
  }, [settingsOpen, notes.length]);
  const commandActions = [
    {
      id: "new",
      label: "New memo",
      hint: "Capture a thought",
      shortcut: `${modKey} N`,
      icon: <Plus size={16} />,
      run: () => createNote(),
    },
    {
      id: "quick-capture",
      label: "Quick capture",
      hint: "Save a thought without leaving your flow",
      shortcut: "Q",
      icon: <PenLine size={16} />,
      run: () => {
        setQuickCaptureTitle("");
        setQuickCaptureValue("");
        setQuickCaptureOpen(true);
      },
    },
    {
      id: "save-link",
      label: "Save a link",
      hint: "Keep a useful page with a note",
      shortcut: "",
      icon: <Globe2 size={16} />,
      run: () => {
        setLinkCaptureUrl("");
        setLinkCaptureTitle("");
        setLinkCaptureNote("");
        setLinkCaptureOpen(true);
      },
    },
    {
      id: "save-search",
      label: "Save current search",
      hint: "Keep this query in the sidebar",
      shortcut: "",
      icon: <BookmarkPlus size={16} />,
      run: () => saveCurrentSearch(),
    },
    {
      id: "history",
      label: "Version history",
      hint: "Restore an earlier local revision",
      shortcut: "",
      icon: <History size={16} />,
      run: () => openHistory(),
    },
    {
      id: "template",
      label: "Start from a template",
      hint: "Daily, meeting, or project",
      shortcut: "",
      icon: <CalendarDays size={16} />,
      run: () => setTemplateOpen(true),
    },
    {
      id: "save-template",
      label: "Save current memo as template",
      hint: "Reuse this structure later",
      shortcut: "",
      icon: <BookmarkPlus size={16} />,
      run: () => saveCurrentAsTemplate(),
    },
    {
      id: "tasks",
      label: "Show task memos",
      hint: "Find memos with Markdown checklists",
      shortcut: "",
      icon: <Check size={16} />,
      run: () => {
        setFilter("all");
        setQuery("is:task");
      },
    },
    {
      id: "open-tasks",
      label: "Show open tasks",
      hint: "Find memos with unfinished checklists",
      shortcut: "",
      icon: <Check size={16} />,
      run: () => {
        setFilter("all");
        setQuery("is:open");
      },
    },
    {
      id: "completed-tasks",
      label: "Show completed tasks",
      hint: "Find memos with finished checklists",
      shortcut: "",
      icon: <Check size={16} />,
      run: () => {
        setFilter("all");
        setQuery("is:completed");
      },
    },
    {
      id: "task-board",
      label: "Open task board",
      hint: "Group checklist memos by progress",
      shortcut: "",
      icon: <CalendarDays size={16} />,
      run: () => {
        setFilter("task-board");
        setQuery("");
      },
    },
    {
      id: "archive-completed-tasks",
      label: "Archive completed task memos",
      hint: "Clear finished checklist work from the library",
      shortcut: "",
      icon: <Archive size={16} />,
      run: () => archiveCompletedTasks(),
    },
    {
      id: "favorite-selected",
      label: "Favorite selected memos",
      hint: "Toggle favorites for the current selection",
      shortcut: "",
      icon: <Star size={16} />,
      run: () => bulkSetFlag("favorite"),
    },
    {
      id: "pin-selected",
      label: "Pin selected memos",
      hint: "Toggle pins for the current selection",
      shortcut: "",
      icon: <Pin size={16} />,
      run: () => bulkSetFlag("pinned"),
    },
    {
      id: "upcoming",
      label: "Show upcoming",
      hint: "Open memos with due dates",
      shortcut: "",
      icon: <CalendarClock size={16} />,
      run: () => {
        setFilter("upcoming");
        setQuery("");
        setSort("due");
      },
    },
    {
      id: "calendar",
      label: "Open calendar",
      hint: "See scheduled memos by month",
      shortcut: "",
      icon: <CalendarDays size={16} />,
      run: () => {
        setFilter("calendar");
        setQuery("");
      },
    },
    {
      id: "copy",
      label: "Copy selected memos",
      hint: "Copy title and content",
      shortcut: "",
      icon: <FileText size={16} />,
      run: () => {
        void copySelectedNote();
      },
    },
    {
      id: "export",
      label: "Export workspace",
      hint: "Download a JSON backup",
      shortcut: "",
      icon: <Download size={16} />,
      run: () => exportNotes(),
    },
    {
      id: "export-selected",
      label: "Export selected memos",
      hint: "Download only the current selection",
      shortcut: "",
      icon: <Download size={16} />,
      run: () => exportSelectedNotes(),
    },
    {
      id: "plain",
      label: "Export as plain text",
      hint: "Download a readable archive",
      shortcut: "",
      icon: <FileText size={16} />,
      run: () => exportText(),
    },
    {
      id: "protect",
      label: active?.protected ? "Remove memo protection" : "Protect selected memo",
      hint: "Encrypt this memo locally",
      shortcut: "",
      icon: <Lock size={16} />,
      run: () => requestProtection(),
    },
    {
      id: "appearance",
      label: "Toggle appearance",
      hint: "Switch light and dark mode",
      shortcut: "",
      icon: <Moon size={16} />,
      run: () => setDark((value) => !value),
    },
    {
      id: "analytics",
      label: "View analytics",
      hint: "See your writing pulse",
      shortcut: "",
      icon: <BarChart3 size={16} />,
      run: () => setAnalyticsOpen(true),
    },
    {
      id: "analytics-export",
      label: "Export analytics report",
      hint: "Download privacy-safe workspace metrics",
      shortcut: "",
      icon: <Download size={16} />,
      run: () => exportAnalytics(),
    },
    {
      id: "connections",
      label: "Explore connections",
      hint: "Inspect linked memos",
      shortcut: "",
      icon: <Link2 size={16} />,
      run: () => setConnectionsOpen(true),
    },
    {
      id: "shortcuts",
      label: "Show shortcuts",
      hint: "Open the quick reference",
      shortcut: "",
      icon: <HelpCircle size={16} />,
      run: () => setHelpOpen(true),
    },
    {
      id: "empty-trash",
      label: "Empty trash",
      hint: "Permanently remove trashed memos",
      shortcut: "",
      icon: <Trash2 size={16} />,
      run: () => emptyTrash(),
    },
  ];
  const noteCommands = commandQuery.trim()
    ? notes
        .filter(
          (note) =>
            !note.deleted &&
            !note.archived &&
            note.title.toLowerCase().includes(commandQuery.trim().toLowerCase()),
        )
        .slice(0, 8)
        .map((note) => ({
          id: `open-${note.id}`,
          label: note.title,
          hint: `Open memo · ${note.folder || "inbox"}`,
          shortcut: "",
          icon: <FileText size={16} />,
          run: () => openNote(note),
        }))
    : [];
  const allCommands = [...commandActions, ...noteCommands];
  const visibleCommands = allCommands.filter((action) =>
    `${action.label} ${action.hint}`.toLowerCase().includes(commandQuery.trim().toLowerCase()),
  );
  function runCommand(action: (typeof allCommands)[number]) {
    setCommandOpen(false);
    setCommandQuery("");
    setCommandIndex(0);
    action.run();
  }
  function handleEditorChange(value: string, cursor: number) {
    updateNote({ content: value });
    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/\[\[([^\]\n]*)$/);
    if (!match) {
      setLinkMenuOpen(false);
      setLinkQuery("");
      return;
    }
    setLinkQuery(match[1]);
    setLinkSuggestionIndex(0);
    setLinkMenuOpen(true);
  }
  function insertLinkSuggestion(title: string) {
    const textarea = document.querySelector<HTMLTextAreaElement>(".editor-body");
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const start = textarea.value.slice(0, cursor).lastIndexOf("[[");
    if (start < 0) return;
    const nextContent = textarea.value.slice(0, start) + `[[${title}]]` + textarea.value.slice(cursor);
    updateNote({ content: nextContent });
    setLinkMenuOpen(false);
    setLinkQuery("");
    requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = start + title.length + 4;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }
  return (
    <main className="shell">
      <a className="skip-link" href="#memo-grid">
        Skip to memos
      </a>
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <BookOpen size={17} />
          </div>
          <span>memo no sekai</span>
          <button className="icon-btn mobile-close" onClick={() => setSidebarOpen(false)}>
            <X size={16} />
          </button>
        </div>
        <button className="capture" onClick={createNote}>
          <Plus size={17} /> New memo <kbd>{modKey} N</kbd>
        </button>
        <button
          className="template-trigger"
          onClick={() => {
            setSidebarOpen(false);
            setTemplateOpen(true);
          }}
        >
          <CalendarDays size={15} /> Start from a template
        </button>
        <button
          className="template-trigger"
          onClick={() => {
            setSidebarOpen(false);
            setLinkCaptureUrl("");
            setLinkCaptureTitle("");
            setLinkCaptureNote("");
            setLinkCaptureOpen(true);
          }}
        >
          <Globe2 size={15} /> Save a web link
        </button>
        <nav className="nav-block">
          <p className="eyebrow">Library</p>
          <NavItem
            icon={<FileText size={16} />}
            label="All memos"
            count={notes.filter((n) => !n.archived && !n.deleted).length}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <NavItem
            icon={<ArrowDownAZ size={16} />}
            label="Recent"
            active={filter === "recent"}
            onClick={() => setFilter("recent")}
          />
          <NavItem
            icon={<CalendarClock size={16} />}
            label="Upcoming"
            count={notes.filter((n) => n.dueAt && !n.archived && !n.deleted).length}
            active={filter === "upcoming"}
            onClick={() => setFilter("upcoming")}
          />
          <NavItem
            icon={<CalendarDays size={16} />}
            label="Calendar"
            active={filter === "calendar"}
            onClick={() => setFilter("calendar")}
          />
          <NavItem
            icon={<Pin size={16} />}
            label="Pinned"
            count={notes.filter((n) => n.pinned && !n.archived && !n.deleted).length}
            active={filter === "pinned"}
            onClick={() => setFilter("pinned")}
          />
          <NavItem
            icon={<Star size={16} />}
            label="Favorites"
            count={notes.filter((n) => n.favorite && !n.archived && !n.deleted).length}
            active={filter === "favorites"}
            onClick={() => setFilter("favorites")}
          />
          <NavItem
            icon={<Archive size={16} />}
            label="Archive"
            count={notes.filter((n) => n.archived && !n.deleted).length}
            active={filter === "archived"}
            onClick={() => setFilter("archived")}
          />
          <NavItem
            icon={<Trash2 size={16} />}
            label="Trash"
            count={notes.filter((n) => n.deleted).length}
            active={filter === "trash"}
            onClick={() => setFilter("trash")}
          />
        </nav>
        <div className="nav-block tags-block">
          <p className="eyebrow">
            Tags{" "}
            <button
              className="tiny-add"
              onClick={() => {
                if (!active) {
                  createNote();
                  return;
                }
                setEditorOpen(true);
                requestAnimationFrame(() => document.querySelector<HTMLInputElement>(".tag-input")?.focus());
              }}
              aria-label="Add tag"
            >
              +
            </button>
          </p>
          {tags.map((tag) => (
            <NavItem
              key={tag}
              icon={<Hash size={14} />}
              label={tag}
              active={filter === tag}
              onClick={() => setFilter(tag)}
            />
          ))}
        </div>
        <div className="sidebar-bottom">
          <button className="analytics-link" onClick={() => setAnalyticsOpen(true)}>
            <BarChart3 size={15} /> View analytics <ArrowDownAZ size={13} />
          </button>
          <button
            className={`sync-card ${syncState === "offline" ? "sync-offline" : ""}`}
            onClick={() => void retrySync()}
            title={syncStatus.hint}
          >
            <div className="sync-icon">
              {syncState === "saved" ? <Check size={14} /> : <MoreHorizontal size={14} />}
            </div>
            <div>
              <strong>{syncStatus.label}</strong>
              <span>{syncStatus.hint}</span>
            </div>
            <MoreHorizontal size={16} />
          </button>
          <button className="user-row" onClick={() => setSettingsOpen(true)}>
            <div className="avatar">M</div>
            <div>
              <strong>Your workspace</strong>
              <span>{storageUsage ? `${formatBytes(storageUsage.usage)} stored` : "Private to you"}</span>
            </div>
            <ChevronDown size={15} />
          </button>
        </div>
        <div className="nav-block folders-block">
          <p className="eyebrow">
            Folders{" "}
            <button className="tiny-add" onClick={createFolder} aria-label="Create folder">
              +
            </button>
          </p>
          {folders.map((folder) => (
            <NavItem
              key={folder}
              icon={<Folder size={14} />}
              label={folder}
              active={query === `folder:${folder}`}
              onClick={() => {
                setFilter("all");
                setQuery(`folder:${folder}`);
              }}
            />
          ))}
        </div>
        <div className="nav-block saved-searches-block">
          <p className="eyebrow">
            Saved views{" "}
            <button className="tiny-add" onClick={saveCurrentSearch} aria-label="Save current search">
              +
            </button>
          </p>
          {savedSearches.length ? (
            savedSearches.map((saved) => (
              <div className="saved-search-row" key={saved.id}>
                <button
                  className={`saved-search-apply ${query === saved.query ? "active" : ""}`}
                  onClick={() => {
                    setFilter("all");
                    setQuery(saved.query);
                    setSidebarOpen(false);
                  }}
                >
                  <Bookmark size={13} />
                  <span title={saved.query}>{saved.name}</span>
                </button>
                <button
                  className="saved-search-remove"
                  onClick={() => removeSavedSearch(saved.id)}
                  aria-label={`Delete saved search ${saved.name}`}
                  title="Delete saved view"
                >
                  <X size={12} />
                </button>
              </div>
            ))
          ) : (
            <p className="saved-search-empty">Save a query for one-click access.</p>
          )}
        </div>
        <div className="nav-block task-block">
          <p className="eyebrow">Tasks</p>
          <NavItem
            icon={<Check size={15} />}
            label="Task memos"
            count={notes.filter((note) => taskStats(note.content).total > 0 && !note.deleted).length}
            active={query === "is:task"}
            onClick={() => {
              setFilter("all");
              setQuery("is:task");
              setSidebarOpen(false);
            }}
          />
          <NavItem
            icon={<CalendarDays size={15} />}
            label="Task board"
            count={
              notes.filter((note) => taskStats(note.content).total > 0 && !note.deleted && !note.archived)
                .length
            }
            active={filter === "task-board"}
            onClick={() => {
              setFilter("task-board");
              setQuery("");
              setSidebarOpen(false);
            }}
          />
        </div>
      </aside>
      <section className="content" id="memo-content">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={19} />
          </button>
          <div className="crumb">
            <span>Library</span>
            <span>/</span>
            <strong>{filter === "all" ? "All memos" : filter[0].toUpperCase() + filter.slice(1)}</strong>
          </div>
          <div className="top-actions">
            <div className="search">
              <Search size={16} />
              <input
                aria-label="Search memos"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search… tag:work content:meeting"
              />
              <kbd>{modKey} K</kbd>
            </div>
            <button
              className="icon-btn"
              onClick={() => {
                setQuickCaptureTitle("");
                setQuickCaptureValue("");
                setQuickCaptureOpen(true);
              }}
              title="Quick capture"
              aria-label="Quick capture"
            >
              <PenLine size={18} />
            </button>
            <button
              className="icon-btn"
              onClick={() => {
                setCommandQuery("");
                setCommandIndex(0);
                setCommandOpen(true);
              }}
              title="Command palette"
              aria-label="Open command palette"
            >
              <Command size={18} />
            </button>
            <button
              className="icon-btn"
              onClick={() => setHelpOpen(true)}
              title="Keyboard shortcuts"
              aria-label="Keyboard shortcuts"
            >
              <HelpCircle size={18} />
            </button>
            <button
              className="icon-btn"
              onClick={() => setSettingsOpen(true)}
              title="Appearance settings"
              aria-label="Appearance settings"
            >
              <Settings size={18} />
            </button>
            <button
              className="icon-btn"
              onClick={() => setDark(!dark)}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="avatar top-avatar"
              onClick={() => setSettingsOpen(true)}
              title="Workspace settings"
              aria-label="Open workspace settings"
            >
              M
            </button>
          </div>
        </header>
        <div className="page-wrap">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <h1>{filter === "all" ? "Your memos" : filter[0].toUpperCase() + filter.slice(1)}</h1>
              <p className="subheading">A small place to put the things worth keeping.</p>
            </div>
            <button className="capture heading-action" onClick={createNote}>
              <Plus size={17} /> New memo
            </button>
          </div>
          <div className="workspace-pulse" aria-label="Workspace pulse">
            <button
              onClick={() => {
                setFilter("all");
                setQuery("is:open");
              }}
            >
              <strong>
                {
                  notes.filter(
                    (note) =>
                      !note.deleted &&
                      taskStats(note.content).total > 0 &&
                      taskStats(note.content).completed < taskStats(note.content).total,
                  ).length
                }
              </strong>
              <span>Open task memos</span>
            </button>
            <button onClick={() => setFilter("upcoming")}>
              <strong>
                {notes.filter((note) => !!note.dueAt && !note.archived && !note.deleted).length}
              </strong>
              <span>Scheduled memos</span>
            </button>
            <button onClick={() => setFilter("favorites")}>
              <strong>
                {notes.filter((note) => !!note.favorite && !note.archived && !note.deleted).length}
              </strong>
              <span>Favorites</span>
            </button>
          </div>
          <div className="toolbar">
            <div className="result-count">
              {filtered.length} {filtered.length === 1 ? "memo" : "memos"}
            </div>
            <div className="toolbar-actions">
              {filter === "trash" && (
                <button className="tool-btn danger-tool" onClick={emptyTrash}>
                  <Trash2 size={15} /> Empty trash
                </button>
              )}
              {filtered.length > 0 && (
                <button
                  className={`tool-btn select-visible ${selectedIds.length ? "active-tool" : ""}`}
                  onClick={selectVisible}
                  aria-label={
                    selectedIds.length === filtered.length ? "Clear selection" : "Select visible memos"
                  }
                >
                  {selectedIds.length === filtered.length ? "Clear selection" : "Select"}
                </button>
              )}
              <button
                className={`tool-btn ${advancedOpen ? "active-tool" : ""}`}
                onClick={() => setAdvancedOpen(!advancedOpen)}
              >
                <Filter size={15} /> Filter
              </button>
              {query.trim() && (
                <button className="tool-btn" onClick={saveCurrentSearch} aria-label="Save current search">
                  <BookmarkPlus size={15} /> Save search
                </button>
              )}
              <button className="tool-btn" onClick={() => exportNotes()}>
                <Download size={15} /> Export
              </button>
              <button className="tool-btn" onClick={() => fileRef.current?.click()}>
                <ArrowDownAZ size={15} /> Import
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => importNotes(e.target.files?.[0])}
              />
              <label className="sort-select">
                Sort{" "}
                <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                  <option value="updated">Updated</option>
                  <option value="due">Due date</option>
                  <option value="title">Title</option>
                  <option value="created">Created</option>
                </select>
              </label>
              <div className="view-toggle">
                <button
                  aria-label="Grid view"
                  className={view === "grid" ? "selected" : ""}
                  onClick={() => setView("grid")}
                >
                  <Hash size={15} />
                </button>
                <button
                  aria-label="List view"
                  className={view === "list" ? "selected" : ""}
                  onClick={() => setView("list")}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
          {selectedIds.length > 0 && (
            <div className="selection-bar">
              <strong>{selectedIds.length} selected</strong>
              <span>Apply to visible memos</span>
              <div>
                <label className="bulk-tag">
                  <Hash size={14} />
                  <input
                    aria-label="Add tag to selected memos"
                    value={bulkTagInput}
                    onChange={(event) => setBulkTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") bulkTag("add");
                    }}
                    placeholder="tag…"
                    disabled={filter === "trash"}
                  />
                </label>
                <button onClick={() => bulkTag("add")} disabled={filter === "trash"}>
                  Add tag
                </button>
                <button onClick={() => bulkTag("remove")} disabled={filter === "trash"}>
                  Remove tag
                </button>
                <label className="bulk-folder">
                  <Folder size={14} />
                  <select
                    aria-label="Move selected memos to folder"
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value) bulkMoveFolder(event.target.value);
                    }}
                    disabled={filter === "trash"}
                  >
                    <option value="" disabled>
                      Move to…
                    </option>
                    {folders.map((folder) => (
                      <option key={folder} value={folder}>
                        {folder}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={() => bulkAction("archive")} disabled={filter === "trash"}>
                  <Archive size={14} /> Archive
                </button>
                <button onClick={() => bulkAction("trash")} disabled={filter === "trash"}>
                  <Trash2 size={14} /> Trash
                </button>
                <button onClick={exportSelectedNotes} disabled={filter === "trash"}>
                  <Download size={14} /> Export
                </button>
                <button className="selection-clear" onClick={() => setSelectedIds([])}>
                  Clear
                </button>
              </div>
            </div>
          )}
          {advancedOpen && (
            <div className="advanced-filters">
              <label>
                Date updated
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                  <option value="any">Any time</option>
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                </select>
              </label>
              <label>
                Length
                <select value={lengthFilter} onChange={(e) => setLengthFilter(e.target.value)}>
                  <option value="any">Any length</option>
                  <option value="short">Short · under 100 words</option>
                  <option value="medium">Medium · 100–300 words</option>
                  <option value="long">Long · over 300 words</option>
                </select>
              </label>
              <button
                onClick={() => {
                  setDateFilter("any");
                  setLengthFilter("any");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          {filter === "calendar" ? (
            <CalendarView
              notes={filtered}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onOpen={openNote}
            />
          ) : filter === "task-board" ? (
            <TaskBoardView notes={filtered} onOpen={openNote} onArchive={archiveCompletedTasks} />
          ) : filtered.length ? (
            <div className={`note-grid ${view}`} id="memo-grid">
              {filtered.map((note, index) => (
                <article
                  className={`note-card ${note.color} ${activeId === note.id ? "selected" : ""} ${note.deleted ? "trashed" : ""}`}
                  id={`note-${note.id}`}
                  style={{ animationDelay: `${index * 45}ms` }}
                  key={note.id}
                  role="button"
                  tabIndex={note.deleted ? -1 : 0}
                  aria-label={`Open ${note.title}`}
                  onClick={() => {
                    if (!note.deleted) openNote(note);
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      !note.deleted &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      openNote(note);
                    }
                  }}
                >
                  <div className="note-card-top">
                    <label className="card-select" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(note.id)}
                        onChange={() => toggleSelection(note.id)}
                        aria-label={`Select ${note.title}`}
                      />
                      <span className="selection-check" aria-hidden="true">
                        <Check size={11} />
                      </span>
                    </label>
                    <span className="note-date">{formatDate(note.updatedAt)}</span>
                    <div className="card-actions">
                      {note.deleted ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              restoreNote(note);
                            }}
                            aria-label="Restore memo"
                          >
                            <Undo2 size={15} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              permanentlyDelete(note);
                            }}
                            aria-label="Delete permanently"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextNotes = notes.map((item) =>
                                item.id === note.id
                                  ? { ...item, favorite: !item.favorite, updatedAt: new Date().toISOString() }
                                  : item,
                              );
                              setNotes(nextNotes);
                              persistWorkspace(nextNotes);
                            }}
                            aria-label="Toggle favorite"
                          >
                            {note.favorite ? <Star size={15} fill="currentColor" /> : <Star size={15} />}
                          </button>
                          {note.protected && <span title="Protected memo">•••</span>}
                          {note.pinned && <Pin size={14} fill="currentColor" />}
                        </>
                      )}
                    </div>
                  </div>
                  <h2>
                    <HighlightedText value={note.title} query={query} />
                  </h2>
                  <p>
                    <HighlightedText
                      value={
                        note.protected && !unlockedKeys[note.id]
                          ? "This memo is protected. Unlock to read it."
                          : excerpt(note.content)
                      }
                      query={query}
                    />
                  </p>
                  <div className="note-card-foot">
                    <div className="tags">
                      {note.tags.slice(0, 2).map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                    {note.dueAt && (
                      <span className={`due-badge ${isOverdue(note.dueAt) ? "overdue" : ""}`}>
                        {isOverdue(note.dueAt) ? "Overdue" : `Due ${formatDueDate(note.dueAt)}`}
                      </span>
                    )}
                    <span className="read-time">
                      {note.deleted
                        ? "In trash"
                        : note.protected && !unlockedKeys[note.id]
                          ? "Protected"
                          : `${Math.max(1, Math.ceil(note.content.split(/\s+/).filter(Boolean).length / 180))} min read`}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Sparkles size={24} />
              <h2>Nothing here yet</h2>
              <p>Try another filter or capture a new idea.</p>
              <button className="capture" onClick={createNote}>
                <Plus size={16} /> New memo
              </button>
            </div>
          )}
          <div className="insight">
            <div className="insight-icon">
              <Sparkles size={17} />
            </div>
            <div>
              <strong>Keep the thread going</strong>
              <p>
                Your most active tag is <span>#ideas</span>. Small notes become useful when they have
                somewhere to connect.
              </p>
            </div>
            <button onClick={() => setConnectionsOpen(true)}>
              Explore connections <ArrowDownAZ size={14} />
            </button>
          </div>
        </div>
      </section>
      {editorOpen && active && (
        <div
          className={`overlay ${focusMode ? "focus-overlay" : ""}`}
          onMouseDown={(e) => e.target === e.currentTarget && setEditorOpen(false)}
        >
          <section
            className={`editor-modal ${focusMode ? "focus-mode" : ""}`}
            role="dialog"
            aria-modal="true"
          >
            <header className="editor-header">
              <span
                className={`save-status ${syncState === "offline" ? "save-offline" : syncState === "saving" ? "save-pending" : ""}`}
                aria-live="polite"
              >
                {syncState === "saved" ? <Check size={14} /> : <MoreHorizontal size={14} />}{" "}
                {syncState === "saving" ? "Saving…" : syncStatus.label}
              </span>
              <div>
                <button
                  className="icon-btn"
                  onClick={() => updateNote({ favorite: !active.favorite })}
                  title="Toggle favorite memo"
                  aria-label="Toggle favorite memo"
                >
                  <Star size={17} fill={active.favorite ? "currentColor" : "none"} />
                </button>
                <button
                  className="icon-btn"
                  onClick={openHistory}
                  title="Version history"
                  aria-label="Version history"
                >
                  <History size={17} />
                </button>
                <button
                  className="icon-btn"
                  onClick={saveCurrentAsTemplate}
                  title="Save as template"
                  aria-label="Save current memo as template"
                >
                  <BookmarkPlus size={17} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => void copyNoteLink()}
                  title="Copy memo link"
                  aria-label="Copy memo link"
                >
                  <Link2 size={17} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => updateNote({ pinned: !active.pinned })}
                  title="Pin memo"
                  aria-label="Pin memo"
                >
                  <Pin size={17} fill={active.pinned ? "currentColor" : "none"} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => updateNote({ archived: !active.archived })}
                  title="Archive memo"
                  aria-label="Archive memo"
                >
                  <Archive size={17} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setFocusMode((value) => !value)}
                  title={focusMode ? "Exit focus mode" : "Enter focus mode"}
                  aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
                >
                  {focusMode ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>
                <button
                  className="icon-btn"
                  onClick={deleteNote}
                  title="Delete memo"
                  aria-label="Delete memo"
                >
                  <Trash2 size={17} />
                </button>
                <button className="icon-btn" onClick={() => setEditorOpen(false)} aria-label="Close editor">
                  <X size={18} />
                </button>
              </div>
            </header>
            <input
              className="editor-title"
              value={active.title}
              onChange={(e) => updateNote({ title: e.target.value })}
              onBlur={(e) => {
                if (!e.target.value.trim()) updateNote({ title: "Untitled memo" });
              }}
            />
            <div className="editor-meta">
              <span>{formatDate(active.updatedAt)}</span>
              {active.tags.map((tag) => (
                <button className="meta-tag removable-tag" key={tag} onClick={() => removeTag(tag)}>
                  #{tag} ×
                </button>
              ))}
              <input
                className="tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder="add tag…"
              />
            </div>
            <input
              ref={imageRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              hidden
              onChange={(e) => {
                void attachImage(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
            <div className="format-bar">
              <button onClick={() => insertAtCursor("**", "**")} aria-label="Bold">
                <Bold size={16} />
              </button>
              <button onClick={() => insertAtCursor("_", "_")} aria-label="Italic">
                <Italic size={16} />
              </button>
              <span></span>
              <button onClick={() => insertAtCursor("[", "](url)")} aria-label="Link">
                <Link2 size={16} />
              </button>
              <button onClick={() => insertAtCursor("- ")} aria-label="List">
                <List size={16} />
              </button>
              <button onClick={() => imageRef.current?.click()} aria-label="Image" title="Add a local image">
                <ImageIcon size={16} />
              </button>
              <span></span>
              <button
                className={previewMode ? "active-tool" : ""}
                onClick={() => setPreviewMode(!previewMode)}
                aria-label="Toggle markdown preview"
              >
                {previewMode ? <Type size={16} /> : <FileText size={16} />}
              </button>
              <button
                onClick={() => notify("Use Markdown headings, lists, links, checklists, and images")}
                aria-label="Markdown help"
              >
                <HelpCircle size={16} />
              </button>
            </div>
            {!previewMode && linkMenuOpen && (
              <div className="link-suggestions" role="listbox" aria-label="Link memo suggestions">
                {linkSuggestions.length ? (
                  linkSuggestions.map((note, index) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === linkSuggestionIndex}
                      className={index === linkSuggestionIndex ? "suggestion-active" : ""}
                      key={note.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insertLinkSuggestion(note.title)}
                    >
                      <Link2 size={14} />
                      <span>{note.title}</span>
                      <small>{note.folder || "inbox"}</small>
                    </button>
                  ))
                ) : (
                  <span className="suggestion-empty">No matching memos</span>
                )}
              </div>
            )}
            {previewMode ? (
              <div
                className="editor-preview"
                dangerouslySetInnerHTML={{
                  __html: `<p>${markdownToHtml(active.content || "Nothing written yet.")}</p>`,
                }}
              />
            ) : (
              <textarea
                className="editor-body"
                value={active.content}
                onChange={(e) => handleEditorChange(e.target.value, e.currentTarget.selectionStart)}
                onKeyDown={(e) => {
                  if (linkMenuOpen) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setLinkSuggestionIndex((index) =>
                        Math.min(index + 1, Math.max(linkSuggestions.length - 1, 0)),
                      );
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setLinkSuggestionIndex((index) => Math.max(index - 1, 0));
                      return;
                    }
                    if (e.key === "Enter" && linkSuggestions[linkSuggestionIndex]) {
                      e.preventDefault();
                      insertLinkSuggestion(linkSuggestions[linkSuggestionIndex].title);
                      return;
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      setLinkMenuOpen(false);
                      return;
                    }
                  }
                  const textarea = e.currentTarget;
                  const start = textarea.selectionStart;
                  const lineBeforeCursor = textarea.value
                    .slice(0, start)
                    .slice(textarea.value.slice(0, start).lastIndexOf("\n") + 1);
                  if (e.key === "Enter") {
                    const emptyMatch = lineBeforeCursor.match(/^(\s*)([-*+]|\d+\.)\s+(\[[ xX]\]\s+)?$/);
                    if (emptyMatch) {
                      e.preventDefault();
                      const lineStart = start - lineBeforeCursor.length;
                      const nextContent =
                        textarea.value.slice(0, lineStart) + "\n" + textarea.value.slice(start);
                      updateNote({ content: nextContent });
                      requestAnimationFrame(() => {
                        textarea.focus();
                        textarea.setSelectionRange(lineStart + 1, lineStart + 1);
                      });
                      return;
                    }
                    const match = lineBeforeCursor.match(/^(\s*)([-*+]|\d+\.)\s+(\[[ xX]\]\s+)?(.+)$/);
                    if (match && match[4].trim()) {
                      e.preventDefault();
                      const marker = /^\d+\.$/.test(match[2])
                        ? `${Number.parseInt(match[2], 10) + 1}.`
                        : match[2];
                      const prefix = `${match[1]}${marker} ${match[3] || ""}`;
                      const nextContent =
                        textarea.value.slice(0, start) + "\n" + prefix + textarea.value.slice(start);
                      updateNote({ content: nextContent });
                      requestAnimationFrame(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + prefix.length + 1, start + prefix.length + 1);
                      });
                      return;
                    }
                  }
                  if (!(e.metaKey || e.ctrlKey) || previewMode) return;
                  const key = e.key.toLowerCase();
                  if (!["b", "i", "k", "l"].includes(key)) return;
                  e.preventDefault();
                  if (key === "b") insertAtCursor("**", "**");
                  else if (key === "i") insertAtCursor("_", "_");
                  else if (key === "k") insertAtCursor("[", "](url)");
                  else insertAtCursor("- ");
                }}
                placeholder="Start writing…"
              />
            )}
            <footer className="editor-footer">
              <span>{active.content.split(/\s+/).filter(Boolean).length} words</span>
              <span>
                {outgoingLinks.length
                  ? `${outgoingLinks.length} linked memo${outgoingLinks.length === 1 ? "" : "s"}`
                  : "Markdown supported · local only"}
              </span>
            </footer>
          </section>
        </div>
      )}
      {editorOpen && active && (
        <div className="editor-dock">
          <div className="editor-history-fab" role="group" aria-label="Edit history">
            <button onClick={undoEdit} aria-label="Undo edit" title="Undo edit">
              <Undo2 size={16} />
            </button>
            <button onClick={redoEdit} aria-label="Redo edit" title="Redo edit">
              <Redo2 size={16} />
            </button>
          </div>

          <div className="editor-color-fab" role="group" aria-label="Memo color">
            <span>Color</span>
            {noteColors.map((color) => (
              <button
                key={color}
                className={`color-dot ${color} ${active.color === color ? "active" : ""}`}
                onClick={() => updateNote({ color })}
                aria-label={`Set memo color ${color}`}
                title={`Set memo color ${color}`}
              >
                <span aria-hidden="true" />
              </button>
            ))}
          </div>

          <label className="editor-folder-fab">
            <Folder size={15} />
            <span>Folder</span>
            <select
              aria-label="Memo folder"
              value={active.folder || "inbox"}
              onChange={(event) => updateNote({ folder: event.target.value })}
            >
              {folders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
          </label>

          {taskStats(active.content).total > 0 && (
            <div
              aria-label={`${taskStats(active.content).completed} of ${taskStats(active.content).total} tasks complete`}
              className="editor-task-pill"
            >
              <Check size={14} />
              {taskStats(active.content).completed}/{taskStats(active.content).total} done
            </div>
          )}

          <label className="due-fab">
            <CalendarClock size={14} />
            <span>Due</span>
            <input
              type="date"
              value={active.dueAt ? active.dueAt.slice(0, 10) : ""}
              onChange={(e) =>
                updateNote({
                  dueAt: e.currentTarget.value
                    ? new Date(`${e.currentTarget.value}T12:00:00`).toISOString()
                    : undefined,
                })
              }
              onInput={(e) =>
                updateNote({
                  dueAt: e.currentTarget.value
                    ? new Date(`${e.currentTarget.value}T12:00:00`).toISOString()
                    : undefined,
                })
              }
              aria-label="Memo due date"
            />
          </label>

          <button className="editor-duplicate-fab" onClick={duplicateNote} title="Duplicate memo">
            <Copy size={16} />
            <span>Duplicate</span>
          </button>

          <button
            className="editor-protect-fab"
            onClick={requestProtection}
            title={active.protected ? "Remove memo protection" : "Protect memo"}
          >
            {active.protected ? <Unlock size={16} /> : <Lock size={16} />}
            <span>{active.protected ? "Protected" : "Protect"}</span>
          </button>
        </div>
      )}
      {historyOpen && (
        <div
          className="overlay command-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setHistoryOpen(false)}
        >
          <section className="history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
            <header>
              <div>
                <p className="eyebrow">Local recovery</p>
                <h2 id="history-title">Version history</h2>
              </div>
              <button
                className="icon-btn"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close version history"
              >
                <X size={18} />
              </button>
            </header>
            <p className="history-copy">
              Earlier memo snapshots stay on this device. Protected memo text is never added here.
            </p>
            <div className="history-list">
              {revisions.map((revision, index) => (
                <article className="history-item" key={`${revision.savedAt}-${index}`}>
                  <div>
                    <span>{index === 0 ? "Before recent edit" : `Revision ${revisions.length - index}`}</span>
                    <time>{formatDate(revision.savedAt)}</time>
                  </div>
                  <p>{revision.content || "Empty memo"}</p>
                  <button onClick={() => restoreRevision(revision)}>Restore</button>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
      {linkCaptureOpen && (
        <div
          className="overlay command-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setLinkCaptureOpen(false)}
        >
          <section
            className="quick-capture-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-capture-title"
          >
            <header>
              <div>
                <p className="eyebrow">Web clip</p>
                <h2 id="link-capture-title">Keep the good stuff.</h2>
              </div>
              <button
                className="icon-btn"
                onClick={() => setLinkCaptureOpen(false)}
                aria-label="Close link capture"
              >
                <X size={18} />
              </button>
            </header>
            <p className="quick-capture-copy">
              Save a URL with a little context. It stays local and exports as Markdown.
            </p>
            <input
              autoFocus
              className="quick-capture-title"
              value={linkCaptureUrl}
              onChange={(e) => setLinkCaptureUrl(e.target.value)}
              placeholder="https://example.com/article"
              aria-label="Web link URL"
            />
            <input
              className="quick-capture-title"
              value={linkCaptureTitle}
              onChange={(e) => setLinkCaptureTitle(e.target.value)}
              placeholder="Optional title"
              aria-label="Web link title"
            />
            <textarea
              className="quick-capture-body"
              value={linkCaptureNote}
              onChange={(e) => setLinkCaptureNote(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  submitLinkCapture();
                }
              }}
              placeholder="Why do you want to keep this?"
              aria-label="Web link note"
            />
            <footer>
              <span>
                <kbd>{modKey} ↵</kbd> to save
              </span>
              <div>
                <button onClick={() => setLinkCaptureOpen(false)}>Cancel</button>
                <button className="settings-done" onClick={submitLinkCapture}>
                  <Globe2 size={15} /> Save link
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
      {quickCaptureOpen && (
        <div
          className="overlay command-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setQuickCaptureOpen(false)}
        >
          <section
            className="quick-capture-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-capture-title"
          >
            <header>
              <div>
                <p className="eyebrow">Fast capture</p>
                <h2 id="quick-capture-title">Put it somewhere safe.</h2>
              </div>
              <button
                className="icon-btn"
                onClick={() => setQuickCaptureOpen(false)}
                aria-label="Close quick capture"
              >
                <X size={18} />
              </button>
            </header>
            <p className="quick-capture-copy">
              Save the thought now. Give it a proper home when you are ready.
            </p>
            <input
              autoFocus
              className="quick-capture-title"
              value={quickCaptureTitle}
              onChange={(e) => setQuickCaptureTitle(e.target.value)}
              placeholder="Optional title"
              aria-label="Quick capture title"
            />
            <textarea
              className="quick-capture-body"
              value={quickCaptureValue}
              onChange={(e) => setQuickCaptureValue(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  submitQuickCapture();
                }
              }}
              placeholder="What is on your mind?"
              aria-label="Quick capture content"
            />
            <footer>
              <span>
                <kbd>{modKey} ↵</kbd> to save
              </span>
              <div>
                <button onClick={() => setQuickCaptureOpen(false)}>Cancel</button>
                <button className="settings-done" onClick={submitQuickCapture}>
                  <Check size={15} /> Save memo
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
      {commandOpen && (
        <div
          className="overlay command-overlay"
          onMouseDown={(e) =>
            e.target === e.currentTarget && (setCommandOpen(false), setCommandQuery(""), setCommandIndex(0))
          }
        >
          <section className="command-box" role="dialog" aria-modal="true" aria-labelledby="command-title">
            <div className="command-search">
              <Search size={17} />
              <input
                autoFocus
                value={commandQuery}
                onChange={(e) => {
                  setCommandQuery(e.target.value);
                  setCommandIndex(0);
                }}
                placeholder="What do you want to do?"
                aria-label="Command search"
                aria-activedescendant={
                  visibleCommands[commandIndex] ? `command-${visibleCommands[commandIndex].id}` : undefined
                }
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCommandIndex((index) => Math.min(index + 1, Math.max(visibleCommands.length - 1, 0)));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCommandIndex((index) => Math.max(index - 1, 0));
                  } else if (e.key === "Enter" && visibleCommands[commandIndex]) {
                    e.preventDefault();
                    runCommand(visibleCommands[commandIndex]);
                  }
                }}
              />
              <kbd>esc</kbd>
            </div>
            <p id="command-title">Actions{commandQuery ? ` · ${visibleCommands.length}` : ""}</p>
            <div className="command-results">
              {visibleCommands.map((action, index) => (
                <button
                  id={`command-${action.id}`}
                  className={index === commandIndex ? "command-active" : ""}
                  key={action.id}
                  tabIndex={-1}
                  onMouseEnter={() => setCommandIndex(index)}
                  onClick={() => runCommand(action)}
                >
                  <span className="command-action-icon">{action.icon}</span>
                  <span className="command-action-copy">
                    <strong>{action.label}</strong>
                    <small>{action.hint}</small>
                  </span>
                  {action.shortcut && <kbd>{action.shortcut}</kbd>}
                </button>
              ))}
              {!visibleCommands.length && (
                <div className="command-empty">
                  <Search size={16} />
                  <span>No matching actions</span>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
      {passwordPrompt && (
        <div
          className="overlay command-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setPasswordPrompt(null)}
        >
          <section className="password-modal">
            <div className="password-icon">
              {passwordMode === "unlock" ? <Unlock size={19} /> : <Lock size={19} />}
            </div>
            <p className="eyebrow">
              {passwordMode === "unlock"
                ? "Protected memo"
                : passwordMode === "protect"
                  ? "Protect memo"
                  : "Remove protection"}
            </p>
            <h2>
              {passwordMode === "unlock"
                ? "Unlock this memo"
                : passwordMode === "protect"
                  ? "Keep this memo private"
                  : "Confirm your password"}
            </h2>
            <p className="password-copy">
              {passwordMode === "unlock"
                ? "This memo is encrypted locally. Enter its password to read it."
                : "Your memo will be encrypted with AES-GCM before it is saved to the local database."}
            </p>
            <input
              autoFocus
              type="password"
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitPassword();
              }}
              placeholder="Password (4+ characters)"
            />
            <div className="password-actions">
              <button onClick={() => setPasswordPrompt(null)}>Cancel</button>
              <button className="settings-done" onClick={() => void submitPassword()}>
                {passwordMode === "unlock" ? "Unlock" : "Continue"}
              </button>
            </div>
          </section>
        </div>
      )}
      {passwordPrompt?.recoveryEncryptedContent && passwordMode === "unlock" && (
        <button
          className="recovery-trigger"
          onClick={() => {
            setRecoveryPrompt(passwordPrompt);
            setPasswordPrompt(null);
            setPasswordValue("");
          }}
        >
          Forgot password? Use recovery code
        </button>
      )}
      {recoveryPrompt && (
        <div
          className="overlay command-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setRecoveryPrompt(null)}
        >
          <section
            className="password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovery-title"
          >
            <div className="password-icon">
              <Unlock size={19} />
            </div>
            <p className="eyebrow">Protected memo</p>
            <h2 id="recovery-title">Recover this memo</h2>
            <p className="password-copy">
              Enter the one-time recovery code you saved when protection was enabled. Recovery removes the old
              password so you can protect the memo again.
            </p>
            <input
              autoFocus
              type="text"
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") void recoverMemo();
              }}
              placeholder="XXXX-XXXX-XXXX"
              autoComplete="off"
            />
            <div className="password-actions">
              <button onClick={() => setRecoveryPrompt(null)}>Cancel</button>
              <button className="settings-done" onClick={() => void recoverMemo()}>
                Recover memo
              </button>
            </div>
          </section>
        </div>
      )}
      {recoveryNotice && (
        <div
          className="overlay command-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setRecoveryNotice("")}
        >
          <section
            className="password-modal recovery-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovery-code-title"
          >
            <div className="password-icon">
              <Lock size={19} />
            </div>
            <p className="eyebrow">Save this once</p>
            <h2 id="recovery-code-title">Your recovery code</h2>
            <p className="password-copy">
              Use this code if you forget the memo password. It is stored only as encrypted recovery data and
              will not be shown again.
            </p>
            <code className="recovery-code">{recoveryNotice}</code>
            <div className="password-actions">
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(recoveryNotice);
                  notify("Recovery code copied");
                }}
              >
                Copy code
              </button>
              <button className="settings-done" onClick={() => setRecoveryNotice("")}>
                I saved it
              </button>
            </div>
          </section>
        </div>
      )}
      {analyticsOpen && (
        <div
          className="overlay command-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setAnalyticsOpen(false)}
        >
          <section className="analytics-modal">
            <header>
              <div>
                <p className="eyebrow">Workspace pulse</p>
                <h2>Analytics</h2>
              </div>
              <div className="analytics-header-actions">
                <button className="tool-btn" onClick={exportAnalytics}>
                  <Download size={14} /> Export
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setAnalyticsOpen(false)}
                  aria-label="Close analytics"
                >
                  <X size={18} />
                </button>
              </div>
            </header>
            <div className="analytics-stats">
              <div>
                <strong>{notes.filter((n) => !n.deleted).length}</strong>
                <span>Total memos</span>
              </div>
              <div>
                <strong>
                  {
                    notes.filter(
                      (n) => new Date(n.updatedAt).getTime() > Date.now() - 604800000 && !n.deleted,
                    ).length
                  }
                </strong>
                <span>This week</span>
              </div>
              <div>
                <strong>
                  {notes.reduce(
                    (total, n) =>
                      total +
                      (n.protected && !unlockedKeys[n.id]
                        ? 0
                        : n.content.split(/\s+/).filter(Boolean).length),
                    0,
                  )}
                </strong>
                <span>Words written</span>
              </div>
            </div>
            <div className="tag-chart">
              <h3>Most used tags</h3>
              {tags.slice(0, 5).map((tag) => {
                const count = notes.filter((n) => n.tags.includes(tag) && !n.deleted).length;
                return (
                  <div className="bar-row" key={tag}>
                    <span>#{tag}</span>
                    <div>
                      <i
                        style={{
                          width: `${Math.max(8, (count / Math.max(...tags.map((t) => notes.filter((n) => n.tags.includes(t)).length), 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <em>{count}</em>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
      {connectionsOpen && (
        <div
          className="overlay command-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setConnectionsOpen(false)}
        >
          <section className="analytics-modal connections-modal">
            <header>
              <div>
                <p className="eyebrow">Knowledge map</p>
                <h2>Connections</h2>
              </div>
              <button
                className="icon-btn"
                onClick={() => setConnectionsOpen(false)}
                aria-label="Close connections"
              >
                <X size={18} />
              </button>
            </header>
            <p className="connections-intro">
              Link memos by writing <code>[[the exact memo title]]</code> inside your notes.
            </p>
            <div className="connection-graph" aria-label="Visual memo connections">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {graphNeighbors.map((note, index) => (
                  <line
                    key={note.id}
                    x1="50"
                    y1="50"
                    x2={graphPositions[index][0]}
                    y2={graphPositions[index][1]}
                  />
                ))}
              </svg>
              <div className="graph-center" title={active?.title}>
                {active?.title}
              </div>
              {graphNeighbors.map((note, index) => (
                <button
                  className="graph-node"
                  key={note.id}
                  style={{ left: `${graphPositions[index][0]}%`, top: `${graphPositions[index][1]}%` }}
                  onClick={() => {
                    setActiveId(note.id);
                    setConnectionsOpen(false);
                    setEditorOpen(true);
                  }}
                  title={`Open ${note.title}`}
                >
                  {note.title}
                </button>
              ))}
              {!graphNeighbors.length && <span className="graph-empty">No linked memos yet</span>}
            </div>
            <div className="connection-section">
              <h3>Recently linked</h3>
              {linkedNotes.length ? (
                linkedNotes.map((note) => (
                  <button
                    className="connection-row"
                    key={note.id}
                    onClick={() => {
                      setActiveId(note.id);
                      setConnectionsOpen(false);
                      setEditorOpen(true);
                    }}
                  >
                    <Link2 size={15} />
                    <span>{note.title}</span>
                    <ChevronDown size={14} />
                  </button>
                ))
              ) : (
                <p className="connection-empty">No outgoing links from the selected memo yet.</p>
              )}
            </div>
            <div className="connection-section">
              <h3>Links to {active?.title || "this memo"}</h3>
              {backlinks.length ? (
                backlinks.map((note) => (
                  <button
                    className="connection-row"
                    key={note.id}
                    onClick={() => {
                      setActiveId(note.id);
                      setConnectionsOpen(false);
                      setEditorOpen(true);
                    }}
                  >
                    <ArrowDownAZ size={15} />
                    <span>{note.title}</span>
                    <ChevronDown size={14} />
                  </button>
                ))
              ) : (
                <p className="connection-empty">Nothing links here yet. This is a good place to start.</p>
              )}
            </div>
          </section>
        </div>
      )}
      {helpOpen && (
        <div
          className="overlay command-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setHelpOpen(false)}
        >
          <section className="help-modal">
            <header>
              <div>
                <p className="eyebrow">Quick reference</p>
                <h2>Shortcuts</h2>
              </div>
              <button className="icon-btn" onClick={() => setHelpOpen(false)} aria-label="Close shortcuts">
                <X size={18} />
              </button>
            </header>
            <div className="shortcut-row">
              <span>New memo</span>
              <kbd>{modKey} N</kbd>
            </div>
            <div className="shortcut-row">
              <span>Search / command palette</span>
              <kbd>{modKey} K</kbd>
            </div>
            <div className="shortcut-row">
              <span>Close any dialog</span>
              <kbd>Esc</kbd>
            </div>
            <div className="shortcut-row">
              <span>Bold / italic</span>
              <kbd>{`${modKey} B · ${modKey} I`}</kbd>
            </div>
            <div className="shortcut-row">
              <span>Link / list</span>
              <kbd>{`${modKey} K · ${modKey} L`}</kbd>
            </div>
            <div className="shortcut-row">
              <span>Move through memos</span>
              <kbd>J · K · Enter</kbd>
            </div>
            <div className="shortcut-row">
              <span>Quick capture</span>
              <kbd>Q</kbd>
            </div>
            <div className="shortcut-row">
              <span>Write a linked memo</span>
              <code>[[title]]</code>
            </div>
          </section>
        </div>
      )}
      {settingsOpen && (
        <div
          className="overlay command-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setSettingsOpen(false)}
        >
          <section className="settings-modal">
            <header>
              <div>
                <p className="eyebrow">Workspace settings</p>
                <h2>Appearance</h2>
              </div>
              <button className="icon-btn" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                <X size={18} />
              </button>
            </header>
            <div className="settings-group">
              <span>Accent color</span>
              <div className="color-options">
                {["#df6b43", "#5e7f9a", "#8b6b91", "#6e8f79"].map((color) => (
                  <button
                    key={color}
                    className={accent === color ? "color-swatch active" : "color-swatch"}
                    style={{ background: color }}
                    onClick={() => setAccent(color)}
                    aria-label={`Set accent ${color}`}
                  >
                    {accent === color && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
            <label className="settings-toggle">
              <span>
                <strong>Compact cards</strong>
                <small>Fit more memos on screen</small>
              </span>
              <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
            </label>
            <label className="settings-toggle">
              <span>
                <strong>Dark mode</strong>
                <small>Use a darker workspace palette</small>
              </span>
              <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
            </label>
            {syncTarget !== "device" && (
              <div className="settings-group settings-stack">
                <span>Sync passphrase</span>
                <p className="settings-hint">
                  This deployment has a shared database. Enter its passphrase to keep memos in sync across
                  your devices, or leave it empty to keep this workspace in this browser only.
                </p>
                <div className="settings-row">
                  <input
                    type="password"
                    value={passphraseInput}
                    onChange={(e) => setPassphraseInput(e.target.value)}
                    placeholder="Sync passphrase"
                    aria-label="Sync passphrase"
                    autoComplete="off"
                  />
                  <button className="settings-done" onClick={() => void applyPassphrase()}>
                    Connect
                  </button>
                </div>
              </div>
            )}
            <div className="settings-group settings-stack">
              <span>Storage on this device</span>
              <p className="settings-hint">
                {storageUsage && storageUsage.quota
                  ? `${formatBytes(storageUsage.usage)} used of roughly ${formatBytes(storageUsage.quota)} available to this site.`
                  : "This browser does not report how much space is left."}
              </p>
              <div className="settings-row">
                <button onClick={() => exportNotes()}>Export a backup</button>
                <button className="settings-danger" onClick={() => void forgetDeviceWorkspace()}>
                  Remove memos from this device
                </button>
              </div>
            </div>
            <button className="settings-done" onClick={() => setSettingsOpen(false)}>
              Done
            </button>
          </section>
        </div>
      )}
      {storageNotice && (
        <div className="storage-notice" role="status">
          <span>{storageNotice}</span>
          <button onClick={() => exportNotes()}>Export backup</button>
          <button
            className="icon-btn"
            onClick={() => setStorageNotice("")}
            aria-label="Dismiss storage warning"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {toast && (
        <div className="toast">
          <Check size={15} />
          {toast}
        </div>
      )}
      {templateOpen && (
        <div
          className="overlay command-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setTemplateOpen(false)}
        >
          <section
            className="template-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-title"
          >
            <header>
              <div>
                <p className="eyebrow">Capture rhythm</p>
                <h2 id="template-title">Start with a shape</h2>
              </div>
              <button
                className="icon-btn"
                onClick={() => setTemplateOpen(false)}
                aria-label="Close templates"
              >
                <X size={18} />
              </button>
            </header>
            <p className="template-copy">
              A little structure helps the good stuff arrive. Pick a starting point and make it yours.
            </p>
            <div className="template-grid">
              {allTemplates.map((template) => (
                <div className="template-card-row" key={template.id}>
                  <button className="template-card" onClick={() => createFromTemplate(template)}>
                    <span className={`template-icon ${template.color}`}>
                      <CalendarDays size={17} />
                    </span>
                    <span>
                      <strong>{template.title}</strong>
                      <small>{template.description}</small>
                    </span>
                    <ArrowDownAZ size={15} />
                  </button>
                  {template.custom && (
                    <button
                      className="template-remove"
                      onClick={() => removeCustomTemplate(template.id)}
                      aria-label={`Remove template ${template.title}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button className="template-save-current" onClick={saveCurrentAsTemplate}>
              <BookmarkPlus size={15} /> Save open memo as template
            </button>
          </section>
        </div>
      )}
      <style jsx global>{`
        .calendar-view {
          border: 1px solid var(--line);
          border-radius: 10px;
          background: var(--surface);
          overflow: hidden;
          box-shadow: var(--shadow);
        }
        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 20px 22px;
          border-bottom: 1px solid var(--line);
        }
        .calendar-header h2 {
          margin: 2px 0 4px;
          font:
            700 22px Manrope,
            sans-serif;
          letter-spacing: -0.03em;
        }
        .calendar-header p:last-child {
          margin: 0;
          color: var(--muted);
          font:
            11px "DM Mono",
            monospace;
        }
        .calendar-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .calendar-actions button {
          min-height: 32px;
          padding: 0 10px;
          border: 1px solid var(--line);
          border-radius: 6px;
          background: var(--surface-2);
          color: var(--muted);
          font:
            10px "DM Mono",
            monospace;
        }
        .calendar-actions button:hover {
          color: var(--text);
          border-color: var(--accent);
        }
        .calendar-actions button:first-child,
        .calendar-actions button:last-child {
          display: grid;
          width: 32px;
          padding: 0;
          place-items: center;
        }
        .calendar-weekdays,
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
        }
        .calendar-weekdays {
          padding: 10px 12px 8px;
          background: var(--surface-2);
        }
        .calendar-weekdays span {
          color: var(--muted);
          text-align: right;
          padding-right: 7px;
          font:
            10px "DM Mono",
            monospace;
          text-transform: uppercase;
        }
        .calendar-cell {
          min-height: 112px;
          padding: 9px;
          border-top: 1px solid var(--line);
          border-right: 1px solid var(--line);
          background: var(--surface);
        }
        .calendar-cell:nth-child(7n) {
          border-right: 0;
        }
        .calendar-cell time {
          display: inline-grid;
          width: 24px;
          height: 24px;
          place-items: center;
          color: var(--muted);
          font:
            11px "DM Mono",
            monospace;
        }
        .calendar-cell.today time {
          border-radius: 50%;
          background: var(--accent);
          color: white;
        }
        .calendar-notes {
          display: grid;
          gap: 5px;
          margin-top: 7px;
        }
        .calendar-note {
          display: block;
          width: 100%;
          padding: 6px 7px;
          border: 0;
          border-left: 3px solid var(--accent);
          border-radius: 4px;
          background: var(--surface-2);
          color: var(--text);
          text-align: left;
        }
        .calendar-note.blue {
          border-left-color: #5e7f9a;
        }
        .calendar-note.purple {
          border-left-color: #8b6b91;
        }
        .calendar-note.green {
          border-left-color: #6e8f79;
        }
        .calendar-note.orange {
          border-left-color: #c48a55;
        }
        .calendar-note:hover {
          background: color-mix(in srgb, var(--accent) 12%, var(--surface-2));
        }
        .calendar-note span {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font:
            600 10px Manrope,
            sans-serif;
        }
        .calendar-note small {
          display: block;
          margin-top: 2px;
          color: #a65548;
          font:
            9px "DM Mono",
            monospace;
        }
        @media (max-width: 700px) {
          .calendar-header {
            align-items: flex-start;
            flex-direction: column;
          }
          .calendar-cell {
            min-height: 86px;
            padding: 6px;
          }
          .calendar-weekdays {
            padding-inline: 6px;
          }
          .calendar-weekdays span {
            padding-right: 3px;
            font-size: 8px;
          }
          .calendar-note {
            padding: 4px;
            border-left-width: 2px;
          }
          .calendar-note span {
            font-size: 9px;
          }
          .calendar-note small {
            display: none;
          }
        }
        @media (max-width: 460px) {
          .calendar-cell {
            min-height: 62px;
            padding: 4px;
          }
          .calendar-cell time {
            width: 20px;
            height: 20px;
            font-size: 9px;
          }
          .calendar-notes {
            margin-top: 3px;
            gap: 2px;
          }
          .calendar-note span {
            font-size: 8px;
          }
        }
      `}</style>
      <style jsx global>{`
        .due-badge {
          color: var(--accent-deep);
          font:
            10px "DM Mono",
            monospace;
          white-space: nowrap;
        }
        .due-badge.overdue {
          color: #a65548;
          font-weight: 600;
        }
        .due-fab {
          display: flex;
          align-items: center;
          gap: 7px;
          height: 36px;
          padding: 0 10px;
          border: 1px solid var(--line);
          border-radius: 18px;
          background: var(--surface);
          color: var(--muted);
          box-shadow: var(--shadow);
          font:
            11px "DM Mono",
            monospace;
        }
        .due-fab:hover {
          color: var(--accent-deep);
          border-color: var(--accent);
        }
        .due-fab input {
          max-width: 116px;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text);
          font:
            10px "DM Mono",
            monospace;
        }
        @media (max-width: 560px) {
          .due-fab {
          }
          .due-fab span {
            display: none;
          }
          .due-fab input {
            max-width: 104px;
          }
          .due-badge {
            font-size: 9px;
          }
        }
      `}</style>
      <style jsx global>{`
        .task-block {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid var(--line);
        }
        .task-block .nav-item.active {
          background: color-mix(in srgb, var(--accent) 12%, var(--surface));
        }
      `}</style>
      <style jsx global>{`
        .workspace-pulse {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
          margin: -26px 0 31px;
        }
        .workspace-pulse button {
          display: flex;
          align-items: baseline;
          gap: 8px;
          min-width: 0;
          padding: 11px 13px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--surface);
          color: var(--muted);
          text-align: left;
          transition: 0.2s;
        }
        .workspace-pulse button:hover {
          border-color: var(--accent);
          background: var(--surface-2);
          transform: translateY(-1px);
        }
        .workspace-pulse strong {
          color: var(--text);
          font:
            700 17px Manrope,
            sans-serif;
        }
        .workspace-pulse span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font:
            10px "DM Mono",
            monospace;
        }
        @media (max-width: 560px) {
          .workspace-pulse {
            grid-template-columns: 1fr;
            margin-top: -14px;
          }
          .workspace-pulse button {
            justify-content: space-between;
          }
        }
      `}</style>
    </main>
  );
}

function NavItem({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {count !== undefined && <em>{count}</em>}
    </button>
  );
}

function CalendarView({
  notes,
  month,
  onMonthChange,
  onOpen,
}: {
  notes: Note[];
  month: Date;
  onMonthChange: (month: Date) => void;
  onOpen: (note: Note) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? new Date(year, monthIndex, day) : null;
  });
  const notesForDay = (day: Date) =>
    notes.filter(
      (note) =>
        note.dueAt &&
        new Date(note.dueAt).getFullYear() === day.getFullYear() &&
        new Date(note.dueAt).getMonth() === day.getMonth() &&
        new Date(note.dueAt).getDate() === day.getDate(),
    );
  const today = new Date();
  const isToday = (day: Date) =>
    day.getFullYear() === today.getFullYear() &&
    day.getMonth() === today.getMonth() &&
    day.getDate() === today.getDate();
  const moveMonth = (amount: number) => onMonthChange(new Date(year, monthIndex + amount, 1));
  return (
    <section className="calendar-view" aria-label="Memo calendar">
      <header className="calendar-header">
        <div>
          <p className="eyebrow">Scheduled memos</p>
          <h2>{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month)}</h2>
          <p>
            {notes.length} memo{notes.length === 1 ? "" : "s"} with due dates
          </p>
        </div>
        <div className="calendar-actions">
          <button onClick={() => moveMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={17} />
          </button>
          <button onClick={() => onMonthChange(new Date())}>Today</button>
          <button onClick={() => moveMonth(1)} aria-label="Next month">
            <ChevronRight size={17} />
          </button>
        </div>
      </header>
      <div className="calendar-weekdays">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((day, index) => (
          <div
            className={`calendar-cell ${day && isToday(day) ? "today" : ""}`}
            key={day ? day.toISOString() : `empty-${index}`}
          >
            {day && (
              <>
                <time>{day.getDate()}</time>
                <div className="calendar-notes">
                  {notesForDay(day).map((note) => (
                    <button
                      key={note.id}
                      className={`calendar-note ${note.color}`}
                      onClick={() => onOpen(note)}
                      title={`Open ${note.title}`}
                    >
                      <span>{note.title}</span>
                      {isOverdue(note.dueAt || "") && <small>overdue</small>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function TaskBoardView({
  notes,
  onOpen,
  onArchive,
}: {
  notes: Note[];
  onOpen: (note: Note) => void;
  onArchive: () => void;
}) {
  const open = notes.filter((note) => {
    const stats = taskStats(note.content);
    return stats.total > 0 && stats.completed < stats.total;
  });
  const completed = notes.filter((note) => {
    const stats = taskStats(note.content);
    return stats.total > 0 && stats.completed === stats.total;
  });
  const column = (title: string, items: Note[], tone: string) => (
    <section className={`task-board-column ${tone}`}>
      <header>
        <div>
          <span className="task-board-dot" />
          <h2>{title}</h2>
        </div>
        <em>{items.length}</em>
      </header>
      <div className="task-board-list">
        {items.length ? (
          items.map((note) => {
            const stats = taskStats(note.content);
            return (
              <button className="task-board-card" key={note.id} onClick={() => onOpen(note)}>
                <strong>{note.title}</strong>
                <span>
                  {stats.completed}/{stats.total} tasks complete
                </span>
                {note.dueAt && (
                  <small>{isOverdue(note.dueAt) ? "Overdue" : `Due ${formatDueDate(note.dueAt)}`}</small>
                )}
              </button>
            );
          })
        ) : (
          <p className="task-board-empty">No memos here.</p>
        )}
      </div>
    </section>
  );
  return (
    <section className="task-board" aria-label="Task board">
      <header className="task-board-header">
        <div>
          <p className="eyebrow">Checklist workspace</p>
          <h2>Keep the work moving.</h2>
          <p>Every memo with a Markdown checklist, sorted by progress.</p>
        </div>
        <div className="task-board-header-actions">
          <div className="task-board-summary">
            <strong>{open.length}</strong>
            <span>open</span>
            <strong>{completed.length}</strong>
            <span>completed</span>
          </div>
          <button className="task-board-archive" onClick={onArchive} disabled={!completed.length}>
            <Archive size={14} /> Archive completed
          </button>
        </div>
      </header>
      <div className="task-board-columns">
        {column("Open", open, "open-column")}
        {column("Completed", completed, "completed-column")}
      </div>
    </section>
  );
}
