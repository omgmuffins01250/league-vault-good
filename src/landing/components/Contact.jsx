import BlockTitle from "./BlockTitle";
import ContactImage from "../assets/images/resources/contact-1-1.jpg";

const Contact = () => {
  return (
    <section id="contact" className="vault-panel">
      <div className="vault-panel__inner mx-auto max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] items-start">
          <form className="space-y-6">
            <BlockTitle
              textAlign="left"
              text="Have a question?"
              title="Write us a message"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col text-sm text-slate-300/80">
                Name
                <input
                  type="text"
                  name="name"
                  className="mt-1 rounded-lg border border-slate-600/60 bg-slate-900/40 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/70"
                  placeholder="Jane Manager"
                />
              </label>
              <label className="flex flex-col text-sm text-slate-300/80">
                Email
                <input
                  type="email"
                  name="email"
                  className="mt-1 rounded-lg border border-slate-600/60 bg-slate-900/40 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/70"
                  placeholder="you@example.com"
                />
              </label>
              <label className="flex flex-col text-sm text-slate-300/80">
                Subject
                <input
                  type="text"
                  name="subject"
                  className="mt-1 rounded-lg border border-slate-600/60 bg-slate-900/40 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/70"
                  placeholder="What can we help with?"
                />
              </label>
              <label className="flex flex-col text-sm text-slate-300/80">
                Phone (optional)
                <input
                  type="tel"
                  name="phone"
                  className="mt-1 rounded-lg border border-slate-600/60 bg-slate-900/40 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/70"
                  placeholder="(555) 123-4567"
                />
              </label>
              <label className="sm:col-span-2 flex flex-col text-sm text-slate-300/80">
                Message
                <textarea
                  name="message"
                  rows={5}
                  className="mt-1 resize-none rounded-lg border border-slate-600/60 bg-slate-900/40 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/70"
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
