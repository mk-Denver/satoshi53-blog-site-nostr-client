import { finalizeEvent } from "nostr-tools/pure";
import type { EventTemplate } from "nostr-tools";

// Image upload to nostr.build (NIP-96)
// Free Nostr-native image hosting. Signs a kind 27235 auth event
// with the writer's nsec so larger files are allowed.
export async function uploadImage(params: {
  sk: Uint8Array;
  file: File;
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { sk, file } = params;

  const template: EventTemplate = {
    kind: 27235,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["u", "https://nostr.build/api/v2/nip96/upload"],
      ["method", "POST"],
    ],
    content: "",
  };

  const authEvent = finalizeEvent(template, sk);
  const authHeader = "Nostr " + btoa(JSON.stringify(authEvent));

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("https://nostr.build/api/v2/nip96/upload", {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Upload failed (${res.status}): ${text}` };
    }

    const data = await res.json();

    const url =
      data?.nip94_event?.content ||
      data?.url ||
      data?.processing_url ||
      (typeof data === "string" ? data : null);

    if (!url) {
      const tags = data?.nip94_event?.tags || [];
      for (const tag of tags) {
        if (tag[0] === "url" && tag[1]) {
          return { ok: true, url: tag[1] };
        }
      }
      return { ok: false, error: "Could not find image URL in response." };
    }

    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: `Upload error: ${err}` };
  }
}
