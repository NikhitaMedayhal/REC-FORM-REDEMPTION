"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useAuth } from "../_components/auth-context";
import Terminal from "./Terminal";
import { deriveYear } from "@/lib/date";

type DomainId = "marketing" | "media" | "design" | "tech" | "events";

interface DomainQuestion {
  id: string;
  label: string;
  type: "text" | "textarea" | "scale";
  required?: boolean;
}

const DOMAINS: { id: DomainId; label: string; blurb: string }[] = [
  { id: "marketing", label: "marketing", blurb: "campaigns, copy, outreach" },
  { id: "media", label: "media", blurb: "photo, video, socials" },
  { id: "design", label: "design", blurb: "visual identity, UI/UX" },
  { id: "tech", label: "tech", blurb: "build & break things" },
  { id: "events", label: "events", blurb: "plan & run experiences" },
];

const DOMAIN_QUESTIONS: Record<"marketing" | "media" | "design", DomainQuestion[]> = {
  marketing: [
    {
      id: "marketingWhyDomain",
      label: "Why do you want to join the marketing domain?",
      type: "textarea",
      required: true,
    },
    {
      id: "marketingExperience",
      label: "Any prior marketing, copywriting, or social media experience?",
      type: "textarea",
    },
    {
      id: "marketingConfidence",
      label: "Rate your comfort with copywriting & content strategy (1-10)",
      type: "scale",
      required: true,
    },
  ],
  media: [
    {
      id: "mediaWhyDomain",
      label: "Why do you want to join the media domain?",
      type: "textarea",
      required: true,
    },
    {
      id: "mediaTools",
      label: "Which tools do you use? (Photoshop, Premiere, CapCut, etc.)",
      type: "text",
    },
    {
      id: "mediaPortfolio",
      label: "Link to any photography / video work (optional)",
      type: "text",
    },
  ],
  design: [
    {
      id: "designWhyDomain",
      label: "Why do you want to join the design domain?",
      type: "textarea",
      required: true,
    },
    {
      id: "designTools",
      label: "Which tools do you use? (Figma, Illustrator, etc.)",
      type: "text",
    },
    {
      id: "designConfidence",
      label: "Rate your confidence in UI / visual design (1-10)",
      type: "scale",
      required: true,
    },
  ],
};

function ScalePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="scale-grid">
      {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
        <button
          key={n}
          type="button"
          className={`scale-btn ${value === n ? "scale-btn-active" : ""}`}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function JoinPage() {
  const { user, profile, isLoading } = useAuth();
  const formRef = useRef<HTMLDivElement>(null);

  const [domains, setDomains] = useState<DomainId[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [experience, setExperience] = useState("");
  const [whyJoin, setWhyJoin] = useState("");

  const [marketingWhyDomain, setMarketingWhyDomain] = useState("");
  const [marketingExperience, setMarketingExperience] = useState("");
  const [marketingConfidence, setMarketingConfidence] = useState("");

  const [mediaWhyDomain, setMediaWhyDomain] = useState("");
  const [mediaTools, setMediaTools] = useState("");
  const [mediaPortfolio, setMediaPortfolio] = useState("");

  const [designWhyDomain, setDesignWhyDomain] = useState("");
  const [designTools, setDesignTools] = useState("");
  const [designConfidence, setDesignConfidence] = useState("");

  const [techCyberExperience, setTechCyberExperience] = useState("");
  const [techLanguage, setTechLanguage] = useState("");
  const [techWhyDomain, setTechWhyDomain] = useState("");
  const [techPriorExperience, setTechPriorExperience] = useState("");
  const [techCtfParticipated, setTechCtfParticipated] = useState("");
  const [techCtfOther, setTechCtfOther] = useState("");
  const [techCtfConfidence, setTechCtfConfidence] = useState("");
  const [techGithub, setTechGithub] = useState("");
  const [techLinkedin, setTechLinkedin] = useState("");
  const [techProject, setTechProject] = useState("");

  const [eventsWhyJoin, setEventsWhyJoin] = useState("");
  const [eventsPriorExperience, setEventsPriorExperience] = useState("");
  const [eventsPlanSteps, setEventsPlanSteps] = useState("");
  const [eventsOrientationIdeas, setEventsOrientationIdeas] = useState("");
  const [eventsExcites, setEventsExcites] = useState("");

  const [feedback, setFeedback] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Year is derived from the verified session's semester, exactly like
  // the backend does — it's display-only here. Users can no longer
  // submit their own year; the backend re-derives and overrides it from
  // the JWT session regardless of what's sent, so this value is never
  // read as a source of truth, only shown to the user for confirmation.
  const year = useMemo(
    () => deriveYear(profile?.semester ?? user?.semester),
    [profile, user]
  );

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleDomain(id: DomainId) {
    setDomains((prev) => {
      if (prev.includes(id)) return prev.filter((d) => d !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

  // Maps each marketing/media/design question id to its own dedicated
  // [value, setter] pair — mirrors how tech/events fields already work,
  // instead of everything piling into one generic answers object.
  const fieldState: Record<string, [string, (v: string) => void]> = {
    marketingWhyDomain: [marketingWhyDomain, setMarketingWhyDomain],
    marketingExperience: [marketingExperience, setMarketingExperience],
    marketingConfidence: [marketingConfidence, setMarketingConfidence],
    mediaWhyDomain: [mediaWhyDomain, setMediaWhyDomain],
    mediaTools: [mediaTools, setMediaTools],
    mediaPortfolio: [mediaPortfolio, setMediaPortfolio],
    designWhyDomain: [designWhyDomain, setDesignWhyDomain],
    designTools: [designTools, setDesignTools],
    designConfidence: [designConfidence, setDesignConfidence],
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;

    setStatus("submitting");
    setErrorMessage(null);

    const body = {
      fullName: profile.name,
      srn: profile.srn,
      branch: profile.branch,
      year,
      email: email.trim(),
      phone: phone.trim(),
      domains,
      portfolioUrl: portfolioUrl || undefined,
      experience: experience || undefined,
      whyJoin: whyJoin || undefined,
      techCyberExperience: techCyberExperience || undefined,
      techLanguage: techLanguage || undefined,
      techWhyDomain: techWhyDomain || undefined,
      techPriorExperience: techPriorExperience || undefined,
      techCtfParticipated: techCtfParticipated || undefined,
      techCtfOther: techCtfOther || undefined,
      techCtfConfidence: techCtfConfidence || undefined,
      techGithub: techGithub || undefined,
      techLinkedin: techLinkedin || undefined,
      techProject: techProject || undefined,
      eventsWhyJoin: eventsWhyJoin || undefined,
      eventsPriorExperience: eventsPriorExperience || undefined,
      eventsPlanSteps: eventsPlanSteps || undefined,
      eventsOrientationIdeas: eventsOrientationIdeas || undefined,
      eventsExcites: eventsExcites || undefined,
      marketingWhyDomain: marketingWhyDomain || undefined,
      marketingExperience: marketingExperience || undefined,
      marketingConfidence: marketingConfidence || undefined,
      mediaWhyDomain: mediaWhyDomain || undefined,
      mediaTools: mediaTools || undefined,
      mediaPortfolio: mediaPortfolio || undefined,
      designWhyDomain: designWhyDomain || undefined,
      designTools: designTools || undefined,
      designConfidence: designConfidence || undefined,
      feedback,
      website,
    };

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        const fieldErrors = data?.issues?.fieldErrors as
          | Record<string, string[]>
          | undefined;
        if (fieldErrors) {
          const detail = Object.entries(fieldErrors)
            .filter(([, msgs]) => msgs && msgs.length > 0)
            .map(([field, msgs]) => `${field}: ${msgs[0]}`)
            .join("; ");
          setErrorMessage(detail || data.error || "Validation failed");
        } else {
          setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        }
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Could not reach the server. Please try again.");
    }
  }

  return (
    <main className="min-h-screen">
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-20 pb-16 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="kicker">pesu club recruitment</span>
          <h1 className="text-4xl sm:text-5xl font-display mt-3 mb-5 leading-tight">
            join the club.
            <br />
            build something real.
          </h1>
          <p className="text-fg-dim mb-8 max-w-md">
            One application, five domains, no fluff. Log in with your PESU
            Academy credentials and we auto-fill the boring parts so you can
            get straight to telling us why you&apos;d be a good fit.
          </p>
          <button className="btn btn-solid" onClick={scrollToForm}>
            apply_now
          </button>
        </div>

        <Terminal onApply={scrollToForm} />
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-16">
        <div className="card">
          <span className="kicker">why join</span>
          <h2 className="text-2xl font-display mt-2 mb-4">what you get</h2>
          <ul className="space-y-3 text-fg-dim">
            <li>→ hands-on ownership over real projects from week one</li>
            <li>→ a domain that matches what you actually want to get better at</li>
            <li>→ a small, fast-moving team instead of a committee</li>
            <li>→ a straight line from &quot;I applied&quot; to &quot;I shipped this&quot;</li>
          </ul>
        </div>
      </section>

      <section ref={formRef} className="max-w-3xl mx-auto px-4 sm:px-8 pb-24">
        <span className="kicker">application</span>
        <h2 className="text-2xl font-display mt-2 mb-6">apply_now</h2>

        {isLoading && <p className="text-fg-dim">loading session...</p>}

        {!isLoading && !user && (
          <div className="card">
            <p className="mb-4">
              Please log in first to apply. We use your PESU Academy login to
              verify your identity and auto-fill your details.
            </p>
                    <div className="mb-4 rounded border border-fg-dim/30 bg-fg-dim/5 p-3 text-sm">
          <p className="mb-2 font-medium">
            Note: To allow us to auto-fill your form, please complete this
            quick step in line with PESU Academy's IT policy:
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Open pesuacademy.com</li>
            <li>Log in with your credentials</li>
            <li>Check the consent checkbox and click "Agree &amp; Continue"</li>
          </ol>
          <p className="mt-2">
            Please do this when you log in to fill the form.
          </p>
        </div>
            <Link href="/login" className="btn btn-solid">
              go_to_login
            </Link>
          </div>
        )}

        {!isLoading && user && status === "success" && (
          <div className="card">
            <p className="text-fg">
              {"> application received. we'll be in touch."}
            </p>
          </div>
        )}

        {!isLoading && user && status !== "success" && (
          <form className="card" onSubmit={handleSubmit}>
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
              aria-hidden="true"
            />

            <h3 className="text-sm text-fg-dim uppercase tracking-wide mb-4">
              verified via pesu auth
            </h3>

            <div className="grid sm:grid-cols-2 gap-x-4">
              <div className="field">
                <label>full name</label>
                <input type="text" value={profile?.name ?? user.name} readOnly />
              </div>
              <div className="field">
                <label>srn</label>
                <input type="text" value={profile?.srn ?? user.srn} readOnly />
              </div>
              <div className="field">
                <label>branch</label>
                <input type="text" value={profile?.branch ?? user.branch} readOnly />
              </div>
              <div className="field">
                <label>year</label>
                <input type="text" value={year} readOnly required />
                <span className="field-hint">
                  derived from your PESU semester — this can&apos;t be
                  edited
                </span>
              </div>
              <div className="field">
                <label>email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="field">
                <label>phone</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit phone number"
                />
              </div>
            </div>

            <hr className="rule" />

            <h3 className="text-sm text-fg-dim uppercase tracking-wide mb-3">
              pick your domain(s) — max 2
            </h3>
            <div className="checkbox-grid mb-6">
              {DOMAINS.map((d) => {
                const active = domains.includes(d.id);
                const disabled = !active && domains.length >= 2;
                return (
                  <label
                    key={d.id}
                    className={`chip-check ${active ? "chip-check-active" : ""} ${
                      disabled ? "chip-check-disabled" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      disabled={disabled}
                      onChange={() => toggleDomain(d.id)}
                    />
                    <span>
                      {d.label}
                      <span className="block text-fg-faint text-xs">{d.blurb}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <hr className="rule" />

            <h3 className="text-sm text-fg-dim uppercase tracking-wide mb-3">
              general
            </h3>
            <div className="field">
              <label>portfolio / links (optional)</label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-fg-faint text-xs mt-1">
                using a google drive/docs link? click{" "}
                <span className="text-fg-dim">share → general access → anyone with the link</span>{" "}
                before pasting it here, or we won&apos;t be able to open it.
              </p>
            </div>
            <div className="field">
              <label>relevant experience (optional)</label>
              <textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              />
            </div>
            <div className="field">
              <label>why do you want to join the club? (optional)</label>
              <textarea value={whyJoin} onChange={(e) => setWhyJoin(e.target.value)} />
            </div>

            {(["marketing", "media", "design"] as const)
              .filter((d) => domains.includes(d))
              .map((d) => (
                <div key={d}>
                  <hr className="rule" />
                  <h3 className="text-sm text-fg-dim uppercase tracking-wide mb-3">
                    {d} domain
                  </h3>
                  {DOMAIN_QUESTIONS[d].map((q) => {
                    const [value, setValue] = fieldState[q.id];
                    return (
                      <div className="field" key={q.id}>
                        <label>
                          {q.label}
                          {q.required ? " *" : ""}
                        </label>
                        {q.type === "textarea" && (
                          <textarea
                            required={q.required}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                          />
                        )}
                        {q.type === "text" && (
                          <input
                            type="text"
                            required={q.required}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                          />
                        )}
                        {q.type === "scale" && (
                          <ScalePicker value={value} onChange={setValue} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

            {domains.includes("tech") && (
              <div>
                <hr className="rule" />
                <h3 className="text-sm text-fg-dim uppercase tracking-wide mb-3">
                  tech domain
                </h3>

                <div className="field">
                  <label>do you have prior cybersecurity experience?</label>
                  <select
                    value={techCyberExperience}
                    onChange={(e) => setTechCyberExperience(e.target.value)}
                  >
                    <option value="">select...</option>
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                </div>

                <div className="field">
                  <label>preferred coding language(s)</label>
                  <input
                    type="text"
                    value={techLanguage}
                    onChange={(e) => setTechLanguage(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>why do you want to join the tech domain? *</label>
                  <textarea
                    required
                    value={techWhyDomain}
                    onChange={(e) => setTechWhyDomain(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>prior experience relevant to tech *</label>
                  <textarea
                    required
                    value={techPriorExperience}
                    onChange={(e) => setTechPriorExperience(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>have you participated in a CTF before?</label>
                  <select
                    value={techCtfParticipated}
                    onChange={(e) => setTechCtfParticipated(e.target.value)}
                  >
                    <option value="">select...</option>
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                    <option value="other">other</option>
                  </select>
                </div>

                {techCtfParticipated === "other" && (
                  <div className="field">
                    <label>tell us more</label>
                    <textarea
                      value={techCtfOther}
                      onChange={(e) => setTechCtfOther(e.target.value)}
                    />
                  </div>
                )}

                <div className="field">
                  <label>how confident are you solving CTF challenges? (1-10)</label>
                  <ScalePicker value={techCtfConfidence} onChange={setTechCtfConfidence} />
                </div>

                <div className="field">
                  <label>GitHub profile</label>
                  <input
                    type="text"
                    value={techGithub}
                    onChange={(e) => setTechGithub(e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>

                <div className="field">
                  <label>LinkedIn profile</label>
                  <input
                    type="text"
                    value={techLinkedin}
                    onChange={(e) => setTechLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>

                <div className="field">
                  <label>describe a project you&apos;re proud of</label>
                  <textarea
                    value={techProject}
                    onChange={(e) => setTechProject(e.target.value)}
                  />
                </div>
              </div>
            )}

            {domains.includes("events") && (
              <div>
                <hr className="rule" />
                <h3 className="text-sm text-fg-dim uppercase tracking-wide mb-3">
                  events domain
                </h3>

                <div className="field">
                  <label>why do you want to join events? *</label>
                  <textarea
                    required
                    value={eventsWhyJoin}
                    onChange={(e) => setEventsWhyJoin(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>prior event-planning experience *</label>
                  <textarea
                    required
                    value={eventsPriorExperience}
                    onChange={(e) => setEventsPriorExperience(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>walk us through the steps you&apos;d take to plan an event</label>
                  <textarea
                    value={eventsPlanSteps}
                    onChange={(e) => setEventsPlanSteps(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>got any ideas for our next orientation?</label>
                  <textarea
                    value={eventsOrientationIdeas}
                    onChange={(e) => setEventsOrientationIdeas(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>what excites you most about running events?</label>
                  <textarea
                    value={eventsExcites}
                    onChange={(e) => setEventsExcites(e.target.value)}
                  />
                </div>
              </div>
            )}

            <hr className="rule" />

            <div className="field">
              <label>feedback & queries *</label>
              <textarea
                required
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="anything you'd like us to know, or questions for us"
              />
            </div>

            {errorMessage && <p className="field-error mb-4">{"> error: " + errorMessage}</p>}

            <button
              type="submit"
              className="btn btn-solid w-full justify-center"
              disabled={domains.length === 0 || status === "submitting"}
            >
              {status === "submitting" ? "submitting..." : "submit_application"}
            </button>
            {domains.length === 0 && (
              <p className="field-hint mt-2">select at least one domain to submit</p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}