import { ClientResponseError } from "@atcute/client";
import { TokenRefreshError } from "@atcute/oauth-browser-client";
import { useMonaco } from "@monaco-editor/react";
import React, { useEffect, useRef, useState } from "react";
import { useDebounce, useLocalStorage } from "react-use";

import {
  createAtShareUrl,
  createLegacyShareUrl,
  parseShareLocation,
  removeShareParams,
} from "~/atproto/links";
import {
  beginAccountAuthorization,
  beginBlueskyAuthorization,
  configureBrowserOAuth,
  disconnectBrowserSession,
  fetchAndValidateClientMetadata,
  finalizeBrowserOAuth,
  hasOAuthCallback,
  resumeBrowserSession,
  savePendingShare,
  takePendingShare,
} from "~/atproto/oauth";
import {
  loadPublicRecord,
  PublicRecordLoadError,
} from "~/atproto/publicRecords";
import {
  createSnapshot,
  deleteSnapshot,
  listSnapshots,
} from "~/atproto/repository";
import type {
  ConnectedSession,
  LoadedSnapshot,
  SnapshotDraft,
  SnapshotPage,
} from "~/atproto/types";
import ConnectDialog, {
  getAccountConnectionError,
} from "~/components/ConnectDialog";
import EditorView from "~/components/EditorView";
import FlowView, { type FlowViewHandle } from "~/components/FlowView";
import Layout from "~/components/Layout";
import ShareButton from "~/components/ShareButton";
import ShareDialog from "~/components/ShareDialog";
import SharesDialog from "~/components/SharesDialog";
import SnapshotBar from "~/components/SnapshotBar";
import { sameNodePositions } from "~/util/nodePositions";
import { formatSchema, getDMMF, PrismaSchemaError } from "~/util/prisma";
import type { NodePosition, SchemaError } from "~/util/types";

import type { DMMF } from "@prisma/generator-helper";
import type { editor } from "monaco-editor";

const initial = `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id Int @id @default(autoincrement())
  createdAt DateTime @default(now())
  email String @unique
  name String?
  role Role @default(USER)
  posts Post[]
}

model Post {
  id Int @id @default(autoincrement())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  published Boolean @default(false)
  title String @db.VarChar(255)
  author User? @relation(fields: [authorId], references: [id])
  authorId Int?
}

enum Role {
  USER
  ADMIN
}
`.trim();

const PENDING_HANDLE_KEY = "prismaliser.atproto.pending-handle";

interface OAuthBootstrapDependencies {
  configure(): void;
  finalizeCallback(): Promise<ConnectedSession | null>;
  hasCallback(): boolean;
  resumeSession(): Promise<ConnectedSession | null>;
  takePendingShare(): SnapshotDraft | null;
  validateMetadata(): Promise<boolean>;
}

interface OAuthMetadataAvailabilityRef {
  current: boolean;
}

export const retainOAuthMetadataAvailability = async (
  validateMetadata: () => Promise<boolean>,
  metadataAvailable: OAuthMetadataAvailabilityRef,
): Promise<boolean> => {
  const available = await validateMetadata();
  metadataAvailable.current = available;
  return available;
};

interface OAuthBootstrapResult {
  atprotoAvailable: boolean;
  pendingShare: SnapshotDraft | null;
  session: ConnectedSession | null;
}

export const bootstrapOAuthSession = async ({
  configure,
  finalizeCallback,
  hasCallback,
  resumeSession,
  takePendingShare: restorePendingShare,
  validateMetadata,
}: OAuthBootstrapDependencies): Promise<OAuthBootstrapResult> => {
  configure();
  const callbackPresent = hasCallback();
  const atprotoAvailable = await validateMetadata();
  if (!atprotoAvailable)
    return {
      atprotoAvailable: false,
      pendingShare: null,
      session: null,
    };

  const session = callbackPresent
    ? await finalizeCallback()
    : await resumeSession();
  const pendingShare =
    callbackPresent && session !== null ? restorePendingShare() : null;

  return { atprotoAvailable, pendingShare, session };
};

interface SnapshotReference {
  cid: string;
  uri: string;
}

interface CurrentSnapshotBaseline extends SnapshotDraft, SnapshotReference {}

interface PublishSnapshotDependencies {
  copy(link: string): Promise<void>;
  create(
    session: ConnectedSession,
    draft: SnapshotDraft,
  ): Promise<SnapshotReference>;
  createUrl(uri: string): string;
}

export interface SnapshotPublicationResult {
  copied: boolean;
  link: string;
  snapshot: SnapshotReference;
}

export const createSnapshotDraft = (
  schema: string,
  positions: NodePosition[],
  name?: string,
): SnapshotDraft => {
  const trimmedName = name?.trim();
  return {
    ...(trimmedName ? { name: trimmedName } : {}),
    schema,
    positions,
  };
};

export const selectSnapshotPositions = (
  current: NodePosition[],
  restored: NodePosition[] = [],
  currentReady = true,
): NodePosition[] => (currentReady && current.length > 0 ? current : restored);

export const isExpiredSessionError = (error: unknown): boolean =>
  error instanceof TokenRefreshError ||
  (error instanceof ClientResponseError && error.status === 401);

export const publishSnapshotDraft = async (
  session: ConnectedSession,
  draft: SnapshotDraft,
  { copy, create, createUrl }: PublishSnapshotDependencies,
): Promise<SnapshotPublicationResult> => {
  const snapshot = await create(session, draft);
  const link = createUrl(snapshot.uri);

  try {
    await copy(link);
    return { copied: true, link, snapshot };
  } catch {
    return { copied: false, link, snapshot };
  }
};

const EMPTY_SNAPSHOT_PAGE: SnapshotPage = {
  invalidCount: 0,
  snapshots: [],
};

const App = () => {
  const [storedText, setStoredText] = useLocalStorage(
    "prismaliser.text",
    initial,
  );
  const [text, setText] = useState(storedText!);
  const [schemaErrors, setSchemaErrors] = useState<SchemaError[]>([]);
  const [dmmf, setDMMF] = useState<DMMF.Datamodel | null>(null);
  const [editorVisible, setEditorVisible] = useState(true);
  const [atprotoAvailable, setAtprotoAvailable] = useState(false);
  const [accountSession, setAccountSession] = useState<ConnectedSession | null>(
    null,
  );
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [connectionError, setConnectionError] = useState<string>();
  const [pendingShareDraft, setPendingShareDraft] =
    useState<SnapshotDraft | null>(null);
  const [pendingGraphReady, setPendingGraphReady] = useState(true);
  const [currentSnapshot, setCurrentSnapshot] = useState<LoadedSnapshot | null>(
    null,
  );
  const [currentSnapshotBaseline, setCurrentSnapshotBaseline] =
    useState<CurrentSnapshotBaseline | null>(null);
  const [snapshotStatus, setSnapshotStatus] = useState<
    "deleted" | "modified" | "original"
  >("original");
  const [sharesOpen, setSharesOpen] = useState(false);
  const [sharesPage, setSharesPage] =
    useState<SnapshotPage>(EMPTY_SNAPSHOT_PAGE);
  const [sharesQuery, setSharesQuery] = useState("");
  const [sharesLoading, setSharesLoading] = useState(false);
  const [sharesError, setSharesError] = useState<string>();
  const [sharesDeletingUri, setSharesDeletingUri] = useState<string>();
  const [oauthReady, setOAuthReady] = useState(false);
  const [currentPositions, setCurrentPositions] = useState<NodePosition[]>([]);
  const [shareLocationError, setShareLocationError] = useState<string>();
  const [shareRetryNonce, setShareRetryNonce] = useState(0);
  const [shareLocationLoading, setShareLocationLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePending, setSharePending] = useState(false);
  const [shareError, setShareError] = useState<string>();
  const [manualShareLink, setManualShareLink] = useState<string>();
  const [shareCopied, setShareCopied] = useState(false);
  const [pendingHandle, setPendingHandle] = useState<string | undefined>(
    () => sessionStorage.getItem(PENDING_HANDLE_KEY) ?? undefined,
  );
  const flowRef = useRef<FlowViewHandle>(null);
  const shareCopiedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const metadataAvailableRef = useRef(false);
  const oauthBootstrapPromiseRef = useRef<Promise<OAuthBootstrapResult> | null>(
    null,
  );
  const oauthCallbackPresentRef = useRef(false);
  const oauthCallbackErrorCodeRef = useRef<string | undefined>(undefined);
  const shareLocationUriRef = useRef<string | undefined>(undefined);
  const shareLocationHandledRef = useRef(false);
  const snapshotLoadGenerationRef = useRef(0);
  const snapshotAbortRef = useRef<AbortController | null>(null);

  const [parsing, setParsing] = useState(false);
  const monaco = useMonaco();

  const submit = async () => {
    setStoredText(text);
    setParsing(true);

    try {
      setDMMF(await getDMMF(text));
      setSchemaErrors([]);
    } catch (err) {
      if (err instanceof PrismaSchemaError) setSchemaErrors(err.errors);
      else console.error(err);
    } finally {
      setParsing(false);
    }
  };

  const format = async () => {
    setText(await formatSchema(text));
  };

  useDebounce(submit, 1000, [text]);

  useEffect(
    () => () => {
      clearTimeout(shareCopiedTimerRef.current ?? undefined);
    },
    [],
  );

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        oauthBootstrapPromiseRef.current ??= bootstrapOAuthSession({
          configure: configureBrowserOAuth,
          finalizeCallback: finalizeBrowserOAuth,
          hasCallback() {
            const callbackPresent = hasOAuthCallback();
            oauthCallbackPresentRef.current = callbackPresent;
            if (callbackPresent) {
              const params = new URLSearchParams(
                location.hash.startsWith("#")
                  ? location.hash.slice(1)
                  : location.hash,
              );
              oauthCallbackErrorCodeRef.current =
                params.get("error") ?? undefined;
            }

            return callbackPresent;
          },
          resumeSession: resumeBrowserSession,
          takePendingShare,
          validateMetadata: () =>
            retainOAuthMetadataAvailability(
              fetchAndValidateClientMetadata,
              metadataAvailableRef,
            ),
        });
        const result = await oauthBootstrapPromiseRef.current;
        if (!active) return;

        setAtprotoAvailable(result.atprotoAvailable);
        setAccountSession(result.session);
        setPendingShareDraft(result.pendingShare);
        if (oauthCallbackPresentRef.current && result.session !== null) {
          sessionStorage.removeItem(PENDING_HANDLE_KEY);
          setPendingHandle(undefined);
        }
      } catch (error) {
        if (!active) return;

        setAtprotoAvailable(metadataAvailableRef.current);
        setAccountSession(null);
        if (oauthCallbackPresentRef.current) {
          const submittedHandle = sessionStorage.getItem(PENDING_HANDLE_KEY);
          setPendingHandle(submittedHandle ?? undefined);
          setConnectionError(
            getAccountConnectionError(error, oauthCallbackErrorCodeRef.current),
          );
          setConnectDialogOpen(true);
        } else console.error(error);
      } finally {
        if (active) setOAuthReady(true);
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (pendingShareDraft === null) {
      setPendingGraphReady(true);
      return;
    }

    let active = true;
    setText(pendingShareDraft.schema);
    setPendingGraphReady(false);
    setShareDialogOpen(false);

    const restorePendingGraph = async () => {
      try {
        const restoredDMMF = await getDMMF(pendingShareDraft.schema);
        if (!active) return;

        setDMMF(restoredDMMF);
        setSchemaErrors([]);
        setPendingGraphReady(true);
      } catch (error) {
        if (!active) return;

        if (error instanceof PrismaSchemaError) setSchemaErrors(error.errors);
        else console.error(error);
      }

      setShareError(undefined);
      setManualShareLink(undefined);
      setShareDialogOpen(true);
    };

    void restorePendingGraph();
    return () => {
      active = false;
    };
  }, [pendingShareDraft]);

  useEffect(() => {
    // Set error squiggles in the editor if we have any
    if (!monaco) return;

    const markers = schemaErrors.map<editor.IMarkerData>((err) => ({
      message: err.reason,
      startLineNumber: Number(err.row),
      endLineNumber: Number(err.row),
      startColumn: 0,
      endColumn: 9999,
      severity: 8,
    }));
    const [model] = monaco.editor.getModels();

    monaco.editor.setModelMarkers(model!, "prismaliser", markers);
  }, [monaco, schemaErrors]);

  useEffect(() => {
    if (!oauthReady) return;

    let uri = shareLocationUriRef.current;
    if (!shareLocationHandledRef.current) {
      shareLocationHandledRef.current = true;
      const parsed = parseShareLocation(location.search);

      if (parsed.kind === "local") return;
      if (parsed.kind === "legacy") {
        setCurrentSnapshot(null);
        setCurrentPositions([]);
        setShareLocationError(undefined);
        setSchemaErrors([]);
        setText(parsed.schema);
        return;
      }
      if (parsed.kind === "invalid") {
        setShareLocationError(parsed.reason);
        return;
      }

      const { uri: parsedUri } = parsed;
      uri = parsedUri;
      shareLocationUriRef.current = uri;
    }

    if (uri === undefined) return;

    snapshotAbortRef.current?.abort();
    const controller = new AbortController();
    const generation = snapshotLoadGenerationRef.current + 1;
    snapshotLoadGenerationRef.current = generation;
    snapshotAbortRef.current = controller;
    setShareLocationLoading(true);
    setShareLocationError(undefined);

    const load = async () => {
      try {
        const loaded = await loadPublicRecord(uri, {
          signal: controller.signal,
        });
        const loadedDMMF = await getDMMF(loaded.schema);

        if (
          controller.signal.aborted ||
          snapshotLoadGenerationRef.current !== generation
        )
          return;

        setCurrentSnapshot(loaded);
        setSnapshotStatus("original");
        setCurrentPositions(loaded.positions);
        setText(loaded.schema);
        setDMMF(loadedDMMF);
        setSchemaErrors([]);
        setPendingGraphReady(true);
      } catch (error) {
        if (
          controller.signal.aborted ||
          snapshotLoadGenerationRef.current !== generation
        )
          return;

        if (error instanceof PrismaSchemaError) {
          setSchemaErrors(error.errors);
          setShareLocationError(
            "This shared snapshot contains an invalid Prisma schema.",
          );
        } else if (error instanceof PublicRecordLoadError) {
          if (error.code === "not-found") setSnapshotStatus("deleted");
          setShareLocationError(
            error.code === "not-found"
              ? "This shared snapshot was deleted or could not be found."
              : error.code === "unreachable"
                ? "The snapshot is temporarily unreachable."
                : error.code === "pds-cors"
                  ? "The snapshot cache is unavailable and the author's PDS blocked a browser read."
                  : "This record is not a valid Prismaliser snapshot.",
          );
        } else {
          console.error(error);
          setShareLocationError("The shared snapshot could not be loaded.");
        }
      } finally {
        if (snapshotLoadGenerationRef.current === generation) {
          setShareLocationLoading(false);
          snapshotAbortRef.current = null;
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [oauthReady, shareRetryNonce]);

  useEffect(() => {
    if (currentSnapshot === null || snapshotStatus === "deleted") return;

    setSnapshotStatus(
      text === currentSnapshot.schema &&
        sameNodePositions(currentPositions, currentSnapshot.positions)
        ? "original"
        : "modified",
    );
  }, [currentPositions, currentSnapshot, snapshotStatus, text]);
  const toggleEditor = () => setEditorVisible((visible) => !visible);
  const openConnectDialog = () => {
    setConnectionError(undefined);
    setConnectDialogOpen(true);
  };

  const detachShare = () => {
    snapshotAbortRef.current?.abort();
    snapshotAbortRef.current = null;
    snapshotLoadGenerationRef.current += 1;
    history.replaceState(
      history.state,
      "",
      `${location.pathname}${removeShareParams(location.search)}${location.hash}`,
    );
    shareLocationUriRef.current = undefined;
    shareLocationHandledRef.current = true;
    setCurrentSnapshot(null);
    setCurrentSnapshotBaseline(null);
    setSnapshotStatus("original");
    setShareLocationError(undefined);
    setShareLocationLoading(false);
  };

  const resetEditor = () => {
    detachShare();
    takePendingShare();
    setPendingShareDraft(null);
    setPendingGraphReady(true);
    setText(initial);
    setCurrentPositions([]);
    setSchemaErrors([]);
  };

  const copyOriginalSnapshotLink = async () => {
    if (currentSnapshot === null) return;

    try {
      await navigator.clipboard.writeText(
        createAtShareUrl(currentSnapshot.uri),
      );
    } catch (error) {
      setShareLocationError(
        "The original link could not be copied. Nothing was published.",
      );
      console.error(error);
    }
  };

  const onPositionsChange = (positions: NodePosition[]) => {
    setCurrentPositions(positions);
  };
  const disconnect = async () => {
    if (accountSession === null) return;

    await disconnectBrowserSession(accountSession);
    setAccountSession(null);
  };

  const loadShares = async (cursor?: string) => {
    if (accountSession === null) return;

    setSharesLoading(true);
    if (cursor === undefined) setSharesError(undefined);
    try {
      const page = await listSnapshots(accountSession, {
        ...(cursor === undefined ? {} : { cursor }),
        limit: 50,
      });
      setSharesPage((current) =>
        cursor === undefined
          ? page
          : {
              cursor: page.cursor,
              invalidCount: current.invalidCount + page.invalidCount,
              snapshots: [
                ...current.snapshots,
                ...page.snapshots.filter(
                  ({ uri }) =>
                    !current.snapshots.some((snapshot) => snapshot.uri === uri),
                ),
              ],
            },
      );
    } catch (error) {
      setSharesError(
        isExpiredSessionError(error)
          ? "Reconnect to continue."
          : "Your shares could not be loaded.",
      );
    } finally {
      setSharesLoading(false);
    }
  };

  const openSharesManager = () => {
    if (accountSession === null) return;

    setSharesOpen(true);
    setSharesQuery("");
    setSharesPage(EMPTY_SNAPSHOT_PAGE);
    void loadShares();
  };

  const copyShare = async (uri: string) => {
    await navigator.clipboard.writeText(createAtShareUrl(uri));
  };

  const openSharedSnapshot = (uri: string) => {
    setSharesOpen(false);
    history.replaceState(history.state, "", createAtShareUrl(uri));
    shareLocationUriRef.current = uri;
    shareLocationHandledRef.current = true;
    setShareLocationError(undefined);
    setShareRetryNonce((nonce) => nonce + 1);
  };

  const deleteSharedSnapshot = async (uri: string) => {
    if (accountSession === null || uri === "") return;

    setSharesDeletingUri(uri);
    setSharesError(undefined);
    try {
      await deleteSnapshot(accountSession, uri);
      setSharesPage((current) => ({
        ...current,
        snapshots: current.snapshots.filter((snapshot) => snapshot.uri !== uri),
      }));
      if (currentSnapshot?.uri === uri) setSnapshotStatus("deleted");
    } catch (error) {
      setSharesError(
        isExpiredSessionError(error)
          ? "Reconnect to continue."
          : "The snapshot could not be deleted. It is still in My shares.",
      );
    } finally {
      setSharesDeletingUri(undefined);
    }
  };

  const openShareDialog = () => {
    setShareError(undefined);
    setManualShareLink(undefined);
    setShareDialogOpen(true);
  };

  const connectToPublish = (name?: string) => {
    const draft = createSnapshotDraft(
      text,
      flowRef.current?.getPositions() ?? [],
      name,
    );
    savePendingShare(draft);
    setShareDialogOpen(false);
    openConnectDialog();
  };

  const publish = async (name?: string) => {
    if (accountSession === null) return;

    setShareError(undefined);
    setManualShareLink(undefined);
    setSharePending(true);

    const draft = createSnapshotDraft(
      text,
      selectSnapshotPositions(
        flowRef.current?.getPositions() ?? [],
        pendingShareDraft?.positions,
        pendingShareDraft === null ||
          text !== pendingShareDraft.schema ||
          pendingGraphReady,
      ),
      name ?? pendingShareDraft?.name,
    );

    try {
      const result = await publishSnapshotDraft(accountSession, draft, {
        copy: (link) => navigator.clipboard.writeText(link),
        create: createSnapshot,
        createUrl: createAtShareUrl,
      });

      setCurrentSnapshotBaseline({ ...draft, ...result.snapshot });
      history.replaceState(history.state, "", result.link);
      setPendingShareDraft(null);

      if (result.copied) {
        clearTimeout(shareCopiedTimerRef.current ?? undefined);
        setShareCopied(true);
        shareCopiedTimerRef.current = setTimeout(
          () => setShareCopied(false),
          2000,
        );
        setShareDialogOpen(false);
      } else setManualShareLink(result.link);
    } catch (error) {
      console.error(error);
      if (isExpiredSessionError(error)) {
        savePendingShare(draft);
        await disconnectBrowserSession(accountSession);
        setAccountSession(null);
        setConnectionError(
          "Your account session expired. Connect again to publish this snapshot.",
        );
        setShareDialogOpen(false);
        setConnectDialogOpen(true);
      } else
        setShareError(
          "We couldn't confirm publication. No automatic retry was attempted.",
        );
    } finally {
      setSharePending(false);
    }
  };

  const copyLegacy = async () => {
    setShareError(undefined);
    setManualShareLink(undefined);
    const link = createLegacyShareUrl(text);

    try {
      await navigator.clipboard.writeText(link);
    } catch (error) {
      setShareError(
        "The schema-only link could not be copied. Nothing was published.",
      );
      throw error;
    }
  };

  return (
    <>
      <Layout
        account={accountSession}
        atprotoAvailable={atprotoAvailable}
        noEditor={!editorVisible}
        onConnect={openConnectDialog}
        onDisconnect={disconnect}
        onOpenShares={openSharesManager}
      >
        {currentSnapshot ? (
          <SnapshotBar
            author={currentSnapshot.authorHandle ?? currentSnapshot.authorDid}
            createdAt={currentSnapshot.createdAt}
            label={currentSnapshot.name ?? "Shared diagram"}
            status={snapshotStatus}
            onCopyOriginal={copyOriginalSnapshotLink}
            onDetachShare={detachShare}
          />
        ) : null}
        {shareLocationError ? (
          <div
            className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-lg"
            role="alert"
            style={{ gridArea: "flow" }}
          >
            <span>{shareLocationError}</span>
            {shareLocationError ===
            "The snapshot is temporarily unreachable." ? (
              <button
                className="button"
                type="button"
                onClick={() => setShareRetryNonce((nonce) => nonce + 1)}
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
        {shareLocationLoading ? (
          <p
            aria-live="polite"
            className="absolute left-4 right-4 top-4 z-10 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 text-sm text-gray-700 shadow-lg"
            role="status"
            style={{ gridArea: "flow" }}
          >
            Loading shared snapshot…
          </p>
        ) : null}
        {/* eslint-disable-next-line react/jsx-no-leaked-render */}
        {editorVisible && (
          <section className="relative flex flex-col items-start border-r-2 border-gray-200">
            <EditorView value={text} onChange={(value) => setText(value!)} />

            <div className="absolute flex gap-2 left-4 bottom-4">
              <ShareButton copied={shareCopied} onClick={openShareDialog} />

              <button
                className="button floating"
                type="button"
                onClick={format}
              >
                Format
              </button>

              <button
                className="button floating"
                type="button"
                onClick={resetEditor}
              >
                Reset
              </button>
            </div>

            {parsing ? (
              <div className="absolute w-4 h-4 border-2 border-b-0 border-l-0 border-blue-500 rounded-full right-4 bottom-4 animate-spin" />
            ) : null}
          </section>
        )}
        <FlowView
          ref={flowRef}
          dmmf={dmmf}
          positionSeed={
            currentSnapshot
              ? {
                  key: currentSnapshot.uri,
                  positions: currentSnapshot.positions,
                }
              : pendingShareDraft
                ? {
                    key: "pending-share",
                    positions: pendingShareDraft.positions,
                  }
                : undefined
          }
          toggleEditor={toggleEditor}
          onPositionsChange={onPositionsChange}
        />
      </Layout>
      <ConnectDialog
        error={connectionError}
        initialHandle={pendingHandle}
        open={connectDialogOpen}
        onClose={() => {
          takePendingShare();
          setConnectDialogOpen(false);
        }}
        onConnect={async (handle) => {
          setConnectionError(undefined);
          setPendingHandle(handle);
          sessionStorage.setItem(PENDING_HANDLE_KEY, handle);
          try {
            await beginAccountAuthorization(handle);
          } catch (error) {
            sessionStorage.removeItem(PENDING_HANDLE_KEY);
            throw error;
          }
        }}
        onConnectBluesky={async () => {
          setConnectionError(undefined);
          setPendingHandle(undefined);
          sessionStorage.removeItem(PENDING_HANDLE_KEY);
          await beginBlueskyAuthorization();
        }}
      />
      <ShareDialog
        key={currentSnapshotBaseline?.uri ?? "local"}
        accountConnected={accountSession !== null}
        error={shareError}
        manualLink={manualShareLink}
        open={shareDialogOpen}
        pending={sharePending}
        onClose={() => {
          if (!sharePending) setShareDialogOpen(false);
        }}
        onConnect={connectToPublish}
        onCopyLegacy={copyLegacy}
        onPublish={publish}
      />
      <SharesDialog
        deletingUri={sharesDeletingUri}
        error={sharesError}
        loading={sharesLoading}
        open={sharesOpen}
        page={sharesPage}
        query={sharesQuery}
        onClose={() => setSharesOpen(false)}
        onCopy={copyShare}
        onDelete={deleteSharedSnapshot}
        onLoadMore={() => void loadShares(sharesPage.cursor)}
        onOpen={openSharedSnapshot}
        onQueryChange={setSharesQuery}
      />
    </>
  );
};

export default App;
