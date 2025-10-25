import BlockTitle from "./BlockTitle";
import ContactImage from "../assets/images/resources/contact-1-1.jpg";

const Contact = () => {
  return (
    <section id="contact" className="vault-panel">
      <div className="vault-panel__inner mx-auto max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] items-start">
          <form className="space-y-8">
            <BlockTitle
              textAlign="left"
              text="Have a question?"
              title="Write us a message"
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                <span className="text-sm font-medium normal-case tracking-normal text-slate-200 dark:text-white">
                  Name
                </span>
                <input
                  type="text"
                  name="name"
                  className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 text-sm font-medium text-white placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                  placeholder="Jane Manager"
                />
              </label>

              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                <span className="text-sm font-medium normal-case tracking-normal text-slate-200 dark:text-white">
                  Email
                </span>
                <input
                  type="email"
                  name="email"
                  className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 text-sm font-medium text-white placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                  placeholder="you@example.com"
                />
              </label>

              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                <span className="text-sm font-medium normal-case tracking-normal text-slate-200 dark:text-white">
                  Subject
                </span>
                <input
                  type="text"
                  name="subject"
                  className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 text-sm font-medium text-white placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                  placeholder="What can we help with?"
                />
              </label>

              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                <span className="text-sm font-medium normal-case tracking-normal text-slate-200 dark:text-white">
                  Contact (optional)
                </span>
                <input
                  type="tel"
                  name="phone"
                  className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 text-sm font-medium text-white placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                  placeholder="(555) 123-4567"
                />
              </label>

              <label className="sm:col-span-2 flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                <span className="text-sm font-medium normal-case tracking-normal text-slate-200 dark:text-white">
                  Message
                </span>
                <textarea
                  name="message"
                  rows={5}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 text-sm font-medium text-white placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                  placeholder="Tell us a bit about your league..."
                />
              </label>
            </div>

            <button type="submit" className="btn btn-vault self-start">
              Send Message
            </button>
          </form>

          <div className="vault-card overflow-hidden rounded-3xl">
            <img
              src={ContactImage}
              alt="LeagueVault team"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
