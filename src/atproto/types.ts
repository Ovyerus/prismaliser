import type { NodePosition } from "~/util/types";

import type { Client } from "@atcute/client";
import type { OAuthUserAgent } from "@atcute/oauth-browser-client";

export interface SnapshotDraft {
  name?: string;
  schema: string;
  positions: NodePosition[];
}

export interface ConnectedSession {
  did: string;
  handle?: string;
  agent: OAuthUserAgent;
  client: Client;
}

export interface LoadedSnapshot {
  uri: string;
  cid: string;
  name?: string;
  schema: string;
  positions: NodePosition[];
  prismaVersion: string;
  createdAt: string;
  authorDid: string;
  authorHandle?: string;
}

export interface SnapshotSummary {
  uri: string;
  cid: string;
  name?: string;
  label: string;
  createdAt: string;
  nodeIds: string[];
}

export interface SnapshotPage {
  snapshots: SnapshotSummary[];
  cursor?: string;
  invalidCount: number;
}

export type ShareLocation =
  | { kind: "at"; uri: string }
  | { kind: "invalid"; reason: string }
  | { kind: "legacy"; schema: string }
  | { kind: "local" };
