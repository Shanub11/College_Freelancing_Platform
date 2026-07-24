export class SimpleSentry {
  private dsn: string;
  private publicKey: string = "";
  private projectId: string = "";
  private ingestUrl: string = "";

  constructor(dsn?: string) {
    this.dsn = dsn || "";
    if (this.dsn) {
      try {
        const url = new URL(this.dsn);
        this.publicKey = url.username;
        const pathParts = url.pathname.split("/").filter(Boolean);
        this.projectId = pathParts[pathParts.length - 1];
        this.ingestUrl = `${url.protocol}//${url.host}/api/${this.projectId}/store/`;
      } catch (e) {
        console.error("Failed to parse SENTRY_DSN:", e);
      }
    }
  }

  async captureMessage(message: string, level: string = "error") {
    console.error(`[Sentry Message - ${level}]:`, message);
    if (!this.ingestUrl) return;
    try {
      await fetch(this.ingestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=custom-convex/1.0, sentry_key=${this.publicKey}`,
        },
        body: JSON.stringify({
          message,
          level,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error("Failed to send message to Sentry:", e);
    }
  }

  async captureException(error: any) {
    console.error("[Sentry Exception]:", error);
    if (!this.ingestUrl) return;
    try {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      await fetch(this.ingestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=custom-convex/1.0, sentry_key=${this.publicKey}`,
        },
        body: JSON.stringify({
          message,
          level: "error",
          exception: {
            values: [
              {
                type: error?.name || "Error",
                value: message,
                stacktrace: stack ? { frames: [] } : undefined,
              },
            ],
          },
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error("Failed to send exception to Sentry:", e);
    }
  }
}
