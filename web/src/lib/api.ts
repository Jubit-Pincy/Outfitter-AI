/**
 * Talking to the Python engine.
 *
 * Every call goes to this app's own `/api/...`, which forwards to the service
 * on :8000 (see `app/api/[...path]/route.ts`). Going through our own origin
 * rather than straight to :8000 is what lets the session cookie be `httpOnly`
 * and `sameSite: lax` — a cookie set by another port could not be either.
 */

import type {
  Account,
  Formality,
  Item,
  Pick,
  Settings,
  Slot,
  SlotKind,
} from "@/lib/types";

/** The message the API sent, or something honest when it sent nothing. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers:
        init?.body instanceof FormData
          ? init?.headers
          : { "content-type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "The Outfitter service is not answering. Is it running on :8000?");
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.detail;
    throw new ApiError(
      response.status,
      typeof detail === "string" ? detail : `Request failed (${response.status})`,
    );
  }
  return body as T;
}

// -- accounts --------------------------------------------------------------

export const signup = (name: string, email: string, password: string) =>
  call<{ user: Account }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

export const login = (email: string, password: string) =>
  call<{ user: Account }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const logout = () => call<{ ok: true }>("/auth/logout", { method: "POST" });

export const me = () => call<{ user: Account }>("/auth/me");

export const updateProfile = (patch: {
  name?: string;
  email?: string;
  settings?: Partial<Settings>;
}) => call<{ user: Account }>("/auth/me", { method: "PATCH", body: JSON.stringify(patch) });

export const changePassword = (currentPassword: string, newPassword: string) =>
  call<{ ok: true }>("/auth/password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

// -- wardrobe --------------------------------------------------------------

export const fetchItems = () => call<{ items: Item[] }>("/items");

export const createItem = (draft: Partial<Item>) =>
  call<{ item: Item }>("/items", { method: "POST", body: JSON.stringify(draft) });

export const patchItem = (id: string, patch: Partial<Item>) =>
  call<{ item: Item }>(`/items/${id}`, { method: "PATCH", body: JSON.stringify(patch) });

export const deleteItem = (id: string) =>
  call<{ ok: true }>(`/items/${id}`, { method: "DELETE" });

export const markWorn = (ids: string[]) =>
  call<{ items: Item[] }>("/items/worn", { method: "POST", body: JSON.stringify({ ids }) });

export const tagPhoto = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return call<{ draft: Item; photo: string; notes: string[] }>("/tagging", {
    method: "POST",
    body: form,
  });
};

export const taggingStatus = () =>
  call<{ available: { florence: boolean; color: boolean; cutout: boolean } }>("/tagging/status");

// -- the day ---------------------------------------------------------------

export const fetchSchedule = () => call<{ schedule: Slot[] }>("/schedule");

export const createSlot = (time: string, kind: SlotKind) =>
  call<{ schedule: Slot[] }>("/schedule", {
    method: "POST",
    body: JSON.stringify({ time, kind }),
  });

export const deleteSlot = (id: string) =>
  call<{ schedule: Slot[] }>(`/schedule/${id}`, { method: "DELETE" });

// -- what to wear ----------------------------------------------------------

export interface OccasionRequest {
  id: string | null;
  kind: SlotKind;
  time: string;
  temp: number;
  rainProbability: number;
  /** "Gym counts as ..." from Settings. Omitted, the engine uses its default. */
  formality?: Formality;
}

export const fetchPicks = (occasions: OccasionRequest[], restDays: number, perOccasion = 2) =>
  call<{ picks: Pick[]; generatedAt: string }>("/picks", {
    method: "POST",
    body: JSON.stringify({ occasions, perOccasion, restDays }),
  });
