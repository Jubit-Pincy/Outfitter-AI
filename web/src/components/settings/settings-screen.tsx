"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { FieldSelect } from "@/components/wardrobe/field-select";
import { FORMALITIES } from "@/data/options";
import { useOutfitter } from "@/lib/store";
import * as api from "@/lib/api";
import { SLOT_KINDS, type Formality, type SlotKind } from "@/lib/types";
import { CitySearch } from "./city-search";
import { UseMyLocation } from "./use-my-location";

const REST_OPTIONS = ["3 days", "5 days", "7 days", "10 days"];

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-dashed border-stitch py-4">
      <div>
        <div className="text-[15px]">{label}</div>
        {hint ? <div className="mt-0.5 text-[13px] text-ink-soft">{hint}</div> : null}
      </div>
      <div className="text-[14.5px] text-ink-soft">{children}</div>
    </div>
  );
}

/** A field that only saves once you leave it, so it is not sent per keystroke. */
function TextRow({
  label,
  hint,
  value,
  type = "text",
  onCommit,
}: {
  label: string;
  hint?: string;
  value: string;
  type?: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <Row label={label} hint={hint}>
      <input
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft.trim() && draft !== value && onCommit(draft.trim())}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        aria-label={label}
        className="w-[230px] max-w-full border-b border-stitch bg-transparent py-0.5 text-right text-[14.5px] text-ink outline-none focus:border-ink"
      />
    </Row>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const settings = useOutfitter((s) => s.settings);
  const account = useOutfitter((s) => s.account);
  const updateSettings = useOutfitter((s) => s.updateSettings);
  const signOut = useOutfitter((s) => s.signOut);

  const [changing, setChanging] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  const setFormality = (kind: SlotKind, value: string) =>
    updateSettings({
      formalityMap: { ...settings.formalityMap, [kind]: value as Formality },
    });

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setPwError(null);
    try {
      await api.changePassword(current, next);
      setChanging(false);
      setCurrent("");
      setNext("");
      toast("Password changed");
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Could not change it");
    }
  }

  return (
    <>
      <PageHeader title="Settings" lede="Everything here changes what shows up on Today." />

      <div className="max-w-[620px]">
        <h2 className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-ink-soft">
          ACCOUNT
        </h2>

        <TextRow
          label="Name"
          value={settings.name}
          onCommit={(name) => {
            updateSettings({ name });
            toast("Name updated");
          }}
        />

        <TextRow
          label="Email"
          hint="What you sign in with"
          type="email"
          value={settings.email}
          onCommit={(email) => {
            updateSettings({ email });
            toast("Email updated");
          }}
        />

        <Row label="Password">
          {changing ? null : (
            <button
              onClick={() => setChanging(true)}
              className="text-fern underline underline-offset-[3px]"
            >
              Change
            </button>
          )}
        </Row>

        {changing ? (
          <form onSubmit={submitPassword} className="mb-4 grid gap-3 rounded-[11px] bg-paper p-4">
            <label className="grid gap-1.5 text-[13px] text-ink-soft">
              Current password
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                required
                className="rounded-[10px] border border-stitch bg-linen px-3 py-2 text-[14.5px] text-ink outline-none focus:border-fern"
              />
            </label>
            <label className="grid gap-1.5 text-[13px] text-ink-soft">
              New password
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                className="rounded-[10px] border border-stitch bg-linen px-3 py-2 text-[14.5px] text-ink outline-none focus:border-fern"
              />
            </label>
            {pwError ? (
              <p role="alert" className="text-[13px] text-destructive">
                {pwError}
              </p>
            ) : null}
            <div className="flex gap-2.5">
              <button
                type="submit"
                className="rounded-[10px] bg-ink px-4 py-2 text-[14px] font-semibold text-paper transition-colors hover:bg-fern"
              >
                Save password
              </button>
              <button
                type="button"
                onClick={() => {
                  setChanging(false);
                  setPwError(null);
                }}
                className="rounded-[10px] border border-stitch px-4 py-2 text-[14px] text-ink-soft transition-colors hover:border-ink"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <h2 className="mt-8 mb-1 text-[11px] font-semibold tracking-[0.1em] text-ink-soft">
          PICKS
        </h2>

        <Row label="Location" hint="Used for the forecast">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <UseMyLocation />
            <CitySearch />
          </div>
        </Row>

        <Row label="Temperature units">
          <FieldSelect
            label="Temperature units"
            value={settings.units}
            options={["Celsius", "Fahrenheit"]}
            onChange={(value) => updateSettings({ units: value as "Celsius" | "Fahrenheit" })}
          />
        </Row>

        <Row label="Rest period" hint="How long an item sits out after you wear it">
          <FieldSelect
            label="Rest period"
            value={`${settings.restDays} days`}
            options={REST_OPTIONS}
            onChange={(value) => updateSettings({ restDays: Number.parseInt(value, 10) })}
          />
        </Row>

        {/* Every kind a slot can be, not just the ones the seed happened to
            name — otherwise Casual and Travel can never be configured. */}
        {SLOT_KINDS.map((kind) => (
          <Row key={kind} label={`${kind} counts as`}>
            <FieldSelect
              label={`${kind} counts as`}
              value={settings.formalityMap[kind] ?? "Casual"}
              options={FORMALITIES}
              onChange={(value) => setFormality(kind, value)}
            />
          </Row>
        ))}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[13px] text-ink-soft">
            Signed in as {settings.email}
            {account ? ` · member since ${new Date(account.createdAt).toLocaleDateString()}` : null}
          </p>
          <button
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
            className="rounded-[10px] border border-stitch px-4 py-2 text-[14px] text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
