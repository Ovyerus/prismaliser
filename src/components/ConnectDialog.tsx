import { isHandle } from "@atcute/lexicons/syntax";
import { OAuthResponseError } from "@atcute/oauth-browser-client";
import React, { useEffect, useRef, useState } from "react";

import styles from "./Sharing.module.css";

import Dialog from "~/components/Dialog";

import CloseIcon from "~icons/gg/close";
import BlueskyIcon from "~icons/simple-icons/bluesky";

const INVALID_HANDLE_ERROR =
  "Enter a valid AT Protocol handle, such as alice.bsky.social.";
const NARROW_SCOPE_ERROR =
  "This provider cannot grant Prismaliser's narrow repository permission. Prismaliser will not request broader access.";
const AUTHORIZATION_DENIED_ERROR =
  "Account connection was not authorised. Your schema is unchanged.";
const GENERIC_CONNECTION_ERROR =
  "We couldn't connect this account. Please try again.";

export interface ConnectDialogProps {
  error?: string;
  initialHandle?: string;
  open: boolean;
  onClose(): void;
  onConnect(handle: string): Promise<void> | void;
  onConnectBluesky(): Promise<void> | void;
}

export const validateHandleInput = (value: string): string | null => {
  const handle = value.trim();
  return isHandle(handle) ? handle : null;
};

const describesGranularPermissionRejection = (value: string): boolean =>
  value.includes("granular") ||
  value.includes("repository permission") ||
  (value.includes("scope") && value.includes("repo:app.prismaliser.schema"));

export const getAccountConnectionError = (
  error: unknown,
  callbackErrorCode?: string,
): string => {
  const oauthError =
    callbackErrorCode ??
    (error instanceof OAuthResponseError ? error.error : undefined);
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const description =
    error instanceof OAuthResponseError
      ? error.description?.toLowerCase()
      : undefined;
  const granularPermissionRejected =
    describesGranularPermissionRejection(message) ||
    describesGranularPermissionRejection(description ?? "");

  if (
    oauthError === "invalid_scope" ||
    message.includes("invalid_scope") ||
    granularPermissionRejected
  )
    return NARROW_SCOPE_ERROR;

  if (oauthError === "access_denied" || message.includes("access_denied"))
    return AUTHORIZATION_DENIED_ERROR;

  return GENERIC_CONNECTION_ERROR;
};

const ConnectDialog = ({
  error,
  initialHandle,
  open,
  onClose,
  onConnect,
  onConnectBluesky,
}: ConnectDialogProps) => {
  const [handle, setHandle] = useState(initialHandle ?? "");
  const [localError, setLocalError] = useState<string>();
  const [pending, setPending] = useState(false);
  const handleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (initialHandle !== undefined) setHandle(initialHandle);
      handleInputRef.current?.focus();
    } else {
      setLocalError(undefined);
      setPending(false);
    }
  }, [initialHandle, open]);

  const connect = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validHandle = validateHandleInput(handle);
    if (validHandle === null) {
      setLocalError(INVALID_HANDLE_ERROR);
      return;
    }

    setLocalError(undefined);
    setPending(true);
    try {
      await onConnect(validHandle);
    } catch (connectionError) {
      setLocalError(getAccountConnectionError(connectionError));
      setPending(false);
    }
  };

  const connectBluesky = async () => {
    setLocalError(undefined);
    setPending(true);
    try {
      await onConnectBluesky();
    } catch (connectionError) {
      setLocalError(getAccountConnectionError(connectionError));
      setPending(false);
    }
  };

  const displayedError = localError ?? error;

  return (
    <Dialog
      descriptionId="connect-dialog-description"
      open={open}
      titleId="connect-dialog-title"
      onClose={onClose}
    >
      <div className={styles.dialogBody}>
        <div className={styles.headingRow}>
          <div className={styles.headingCopy}>
            <h2 className={styles.title} id="connect-dialog-title">
              Connect an AT Protocol account
            </h2>
            <p className={styles.description} id="connect-dialog-description">
              Use your account to publish and manage shared diagrams.
            </p>
          </div>
          <button
            aria-label="Close connection dialog"
            className={styles.closeButton}
            type="button"
            onClick={onClose}
          >
            <CloseIcon height={22} width={22} />
          </button>
        </div>

        <form className={styles.form} onSubmit={connect}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="atproto-handle">
              Handle
            </label>
            <input
              ref={handleInputRef}
              aria-describedby="atproto-handle-helper"
              autoCapitalize="none"
              autoComplete="username"
              className={styles.input}
              id="atproto-handle"
              name="handle"
              placeholder="alice.bsky.social"
              spellCheck={false}
              type="text"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
            />
            <p className={styles.helper} id="atproto-handle-helper">
              If you use Bluesky, this is your Bluesky handle.
            </p>
          </div>

          {displayedError ? (
            <p className={styles.alert} role="alert">
              {displayedError}
            </p>
          ) : null}

          <details className={styles.details}>
            <summary className={styles.summary}>
              What is an Atmosphere account?
            </summary>
            <div className={styles.detailsBody}>
              <p>
                Prismaliser uses the{" "}
                <a
                  href="https://atproto.com"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  AT Protocol
                </a>{" "}
                to share your diagrams with others. You can use the same account
                to own your data across compatible applications, like{" "}
                <a
                  href="https://bsky.app"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Bluesky
                </a>{" "}
                and{" "}
                <a
                  href="https://tangled.org"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Tangled
                </a>
                <span>.</span>
              </p>

              <p>
                Shared schemas are public. Check them for passwords, connection
                strings, and other secrets before publishing.
              </p>
            </div>
          </details>

          <div className={styles.actions}>
            <button className={styles.primary} disabled={pending} type="submit">
              Connect
            </button>

            <div className={styles.actionsSeparator} role="separator">
              or
            </div>

            <button
              className={styles.secondary}
              disabled={pending}
              type="button"
              onClick={connectBluesky}
            >
              <BlueskyIcon height={20} width={20} />
              Connect with Bluesky
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default ConnectDialog;
