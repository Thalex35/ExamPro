import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type ContactField = "name" | "email" | "message";
type ContactErrors = Partial<Record<ContactField, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PublicContactForm() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<ContactErrors>({});
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const [busy, setBusy] = useState(false);

  function validate() {
    const next: ContactErrors = {};
    if (!name.trim()) next.name = t("contact.required");
    if (!email.trim()) next.email = t("contact.required");
    else if (!emailPattern.test(email.trim())) next.email = t("contact.invalidEmail");
    if (!message.trim()) next.message = t("contact.required");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function updateField(field: ContactField, update: (value: string) => void, value: string) {
    update(value);
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setFeedback(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !validate()) return;

    setBusy(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.functions.invoke("contact", {
        body: { name: name.trim(), email: email.trim(), message: message.trim() },
      });
      if (error) throw error;
      if (!data || data.success !== true) throw new Error("Contact submission was not confirmed.");

      setName("");
      setEmail("");
      setMessage("");
      setErrors({});
      setFeedback("success");
    } catch {
      setFeedback("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="public-contact-section" id="contact">
      <div className="public-contact-card">
        <div className="public-contact-heading">
          <span className="public-section-label">{t("contact.eyebrow")}</span>
          <h2>{t("contact.title")}</h2>
          <p>{t("contact.description")}</p>
        </div>
        <form className="public-contact-form" noValidate onSubmit={submit}>
          <div className="public-contact-field">
            <label htmlFor="public-contact-name">{t("contact.name")}</label>
            <input
              id="public-contact-name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={120}
              required
              placeholder={t("contact.namePlaceholder")}
              value={name}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "public-contact-name-error" : undefined}
              onChange={(event) => updateField("name", setName, event.target.value)}
            />
            {errors.name && (
              <span id="public-contact-name-error" className="public-contact-error">
                {errors.name}
              </span>
            )}
          </div>
          <div className="public-contact-field">
            <label htmlFor="public-contact-email">{t("contact.email")}</label>
            <input
              id="public-contact-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              placeholder={t("contact.emailPlaceholder")}
              value={email}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "public-contact-email-error" : undefined}
              onChange={(event) => updateField("email", setEmail, event.target.value)}
            />
            {errors.email && (
              <span id="public-contact-email-error" className="public-contact-error">
                {errors.email}
              </span>
            )}
          </div>
          <div className="public-contact-field">
            <label htmlFor="public-contact-message">{t("contact.message")}</label>
            <textarea
              id="public-contact-message"
              name="message"
              rows={6}
              maxLength={5000}
              required
              placeholder={t("contact.messagePlaceholder")}
              value={message}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "public-contact-message-error" : undefined}
              onChange={(event) => updateField("message", setMessage, event.target.value)}
            />
            {errors.message && (
              <span id="public-contact-message-error" className="public-contact-error">
                {errors.message}
              </span>
            )}
          </div>
          {feedback === "success" && (
            <p className="public-contact-feedback success" role="status">
              {t("contact.success")}
            </p>
          )}
          {feedback === "error" && (
            <p className="public-contact-feedback error" role="alert">
              {t("contact.submitError")}
            </p>
          )}
          <Button
            className="public-contact-submit"
            type="submit"
            variant="hero"
            size="lg"
            disabled={busy}
          >
            {busy ? t("contact.sending") : t("contact.submit")}
          </Button>
        </form>
      </div>
    </section>
  );
}
