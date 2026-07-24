import { Client } from "@atcute/client";
import { isActorIdentifier, isDid } from "@atcute/lexicons/syntax";
import {
  configureOAuth,
  createAuthorizationUrl,
  deleteStoredSession,
  finalizeAuthorization,
  getSession,
  OAuthUserAgent,
} from "@atcute/oauth-browser-client";

import {
  ACTIVE_DID_KEY,
  PENDING_SHARE_KEY,
  PRISMALISER_OAUTH_SCOPE,
} from "~/atproto/constants";
import { actorResolver } from "~/atproto/identity";
import type { ConnectedSession, SnapshotDraft } from "~/atproto/types";

import type {
  AuthorizeTargetOptions,
  Session,
} from "@atcute/oauth-browser-client";

const OAUTH_METADATA_PATH = "/oauth-client-metadata.json";
const AUTHORIZATION_PERSISTENCE_DELAY_MS = 200;
const PENDING_SHARE_LIFETIME_MS = 15 * 60 * 1_000;

interface PendingShareEnvelope {
  expiresAt: number;
  draft: SnapshotDraft;
}

type UnknownRecord = Record<string, unknown>;

export type ShareStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

let oauthConfigured = false;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactStringArray = (
  value: unknown,
  expected: readonly string[],
): boolean =>
  Array.isArray(value) &&
  value.length === expected.length &&
  value.every((item, index) => item === expected[index]);

const getDeploymentOrigin = (origin: string): string | null => {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
};

export const validateClientMetadataDocument = (
  origin: string,
  document: unknown,
): boolean => {
  const deploymentOrigin = getDeploymentOrigin(origin);
  if (
    deploymentOrigin === null ||
    !deploymentOrigin.startsWith("https://") ||
    !isRecord(document)
  )
    return false;

  return (
    document.client_id === `${deploymentOrigin}${OAUTH_METADATA_PATH}` &&
    hasExactStringArray(document.redirect_uris, [`${deploymentOrigin}/`]) &&
    document.scope === PRISMALISER_OAUTH_SCOPE &&
    hasExactStringArray(document.grant_types, [
      "authorization_code",
      "refresh_token",
    ]) &&
    hasExactStringArray(document.response_types, ["code"]) &&
    document.application_type === "web" &&
    document.token_endpoint_auth_method === "none" &&
    document.dpop_bound_access_tokens === true &&
    (document.client_uri === undefined ||
      document.client_uri === deploymentOrigin)
  );
};

const hasValidDevelopmentOAuthConfiguration = (
  deploymentOrigin: string,
): boolean => {
  if (!import.meta.env.DEV) return false;

  const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URI as
    string | undefined;
  const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID as string | undefined;
  if (redirectUri !== `${deploymentOrigin}/`) return false;

  const expectedClientId =
    `http://localhost?redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(PRISMALISER_OAUTH_SCOPE)}`;
  return clientId === expectedClientId;
};

export const fetchAndValidateClientMetadata = async (
  origin: string = location.origin,
  fetcher: typeof fetch = fetch,
): Promise<boolean> => {
  const deploymentOrigin = getDeploymentOrigin(origin);
  if (deploymentOrigin === null) return false;
  if (hasValidDevelopmentOAuthConfiguration(deploymentOrigin)) return true;

  const metadataUrl = `${deploymentOrigin}${OAUTH_METADATA_PATH}`;
  try {
    const response = await fetcher(metadataUrl, {
      headers: { accept: "application/json" },
    });
    if (!response.ok || (response.url !== "" && response.url !== metadataUrl))
      return false;

    return validateClientMetadataDocument(
      deploymentOrigin,
      await response.json(),
    );
  } catch {
    return false;
  }
};

export const configureBrowserOAuth = (): void => {
  if (oauthConfigured) return;

  const clientId = import.meta.env.DEV
    ? (import.meta.env.VITE_OAUTH_CLIENT_ID as string)
    : `${location.origin}${OAUTH_METADATA_PATH}`;
  const redirectUri = import.meta.env.DEV
    ? (import.meta.env.VITE_OAUTH_REDIRECT_URI as string)
    : `${location.origin}/`;
  configureOAuth({
    metadata: {
      client_id: clientId,
      redirect_uri: redirectUri,
    },
    identityResolver: actorResolver,
  });
  oauthConfigured = true;
};

const navigateToAuthorization = async (
  target: AuthorizeTargetOptions,
): Promise<void> => {
  const url = await createAuthorizationUrl({
    target,
    scope: PRISMALISER_OAUTH_SCOPE,
  });

  const { promise, resolve } = Promise.withResolvers<undefined>();
  setTimeout(() => resolve(undefined), AUTHORIZATION_PERSISTENCE_DELAY_MS);
  await promise;
  location.assign(url);
};

export const beginAccountAuthorization = async (
  handle: string,
): Promise<void> => {
  if (!isActorIdentifier(handle))
    throw new TypeError("Invalid AT Protocol account identifier");

  await navigateToAuthorization({
    type: "account",
    identifier: handle,
  });
};

export const beginBlueskyAuthorization = (): Promise<void> =>
  navigateToAuthorization({
    type: "pds",
    serviceUrl: "https://bsky.social",
  });

const createConnectedSession = async (
  session: Session,
): Promise<ConnectedSession> => {
  const agent = new OAuthUserAgent(session);
  const client = new Client({ handler: agent });
  let handle: string | undefined;

  try {
    const { handle: resolvedHandle } = await actorResolver.resolve(
      session.info.sub,
    );
    handle = resolvedHandle;
  } catch {
    handle = undefined;
  }

  return {
    did: session.info.sub,
    handle,
    agent,
    client,
  };
};

const hasSingleNonEmptyParameter = (
  params: URLSearchParams,
  name: string,
): boolean => {
  const values = params.getAll(name);
  return values.length === 1 && values[0] !== "";
};

export const hasOAuthCallback = (hash: string = location.hash): boolean => {
  const params = new URLSearchParams(
    hash.startsWith("#") ? hash.slice(1) : hash,
  );
  const hasState = hasSingleNonEmptyParameter(params, "state");
  const hasCode = hasSingleNonEmptyParameter(params, "code");
  const hasError = hasSingleNonEmptyParameter(params, "error");

  if (!hasState || hasCode === hasError) return false;
  if (hasError) return true;

  return hasSingleNonEmptyParameter(params, "iss");
};

export const finalizeBrowserOAuth = async (
  hash: string = location.hash,
  storage: ShareStorage = localStorage,
): Promise<ConnectedSession | null> => {
  if (!hasOAuthCallback(hash)) return null;

  const params = new URLSearchParams(
    hash.startsWith("#") ? hash.slice(1) : hash,
  );
  history.replaceState(null, "", `${location.pathname}${location.search}`);

  if (params.has("error")) sessionStorage.removeItem(PENDING_SHARE_KEY);

  const { session } = await finalizeAuthorization(params);
  storage.setItem(ACTIVE_DID_KEY, session.info.sub);
  return createConnectedSession(session);
};

export const resumeBrowserSession = async (
  storage: ShareStorage = localStorage,
): Promise<ConnectedSession | null> => {
  const did = storage.getItem(ACTIVE_DID_KEY);
  if (!isDid(did)) {
    if (did !== null) storage.removeItem(ACTIVE_DID_KEY);
    return null;
  }

  try {
    const session = await getSession(did, { allowStale: true });
    return await createConnectedSession(session);
  } catch {
    storage.removeItem(ACTIVE_DID_KEY);
    return null;
  }
};

export const disconnectBrowserSession = async (
  session: ConnectedSession,
  storage: ShareStorage = localStorage,
): Promise<void> => {
  try {
    await session.agent.signOut();
  } catch {
    if (isDid(session.did)) deleteStoredSession(session.did);
  } finally {
    storage.removeItem(ACTIVE_DID_KEY);
  }
};

const isSnapshotDraft = (value: unknown): value is SnapshotDraft =>
  isRecord(value) &&
  typeof value.schema === "string" &&
  (value.name === undefined || typeof value.name === "string") &&
  Array.isArray(value.positions) &&
  value.positions.every(
    (position) =>
      isRecord(position) &&
      typeof position.id === "string" &&
      typeof position.x === "number" &&
      Number.isFinite(position.x) &&
      typeof position.y === "number" &&
      Number.isFinite(position.y),
  );

const isPendingShareEnvelope = (
  value: unknown,
): value is PendingShareEnvelope =>
  isRecord(value) &&
  typeof value.expiresAt === "number" &&
  Number.isFinite(value.expiresAt) &&
  isSnapshotDraft(value.draft);

export const savePendingShare = (
  draft: SnapshotDraft,
  now: number = Date.now(),
  storage: ShareStorage = sessionStorage,
): void => {
  const envelope: PendingShareEnvelope = {
    expiresAt: now + PENDING_SHARE_LIFETIME_MS,
    draft,
  };
  storage.setItem(PENDING_SHARE_KEY, JSON.stringify(envelope));
};

export const takePendingShare = (
  now: number = Date.now(),
  storage: ShareStorage = sessionStorage,
): SnapshotDraft | null => {
  const value = storage.getItem(PENDING_SHARE_KEY);
  if (value === null) return null;

  storage.removeItem(PENDING_SHARE_KEY);

  try {
    const envelope: unknown = JSON.parse(value);
    if (!isPendingShareEnvelope(envelope) || now >= envelope.expiresAt)
      return null;

    return envelope.draft;
  } catch {
    return null;
  }
};
