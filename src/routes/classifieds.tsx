import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, cityName } from "@/lib/city";

type Cat = "For Sale" | "Wanted" | "Services" | "Jobs" | "Rentals" | "Community";
const CATS: Cat[] = ["For Sale", "Wanted", "Services", "Jobs", "Rentals", "Community"];

type Listing = {
  id: string;
  category: Cat;
  title: string;
  description: string;
  price?: string;
  contact: string;
  posted_at: string; // ISO
  status?: "live" | "pending";
};

const SEED: Listing[] = [
  { id: "s1", category: "For Sale", title: "2019 Honda Civic VTi-S — low km", description: "One owner, full service history, rego till March. Garaged in Curtin.", price: "$14,500", contact: "honda.canberra@example.com", posted_at: daysAgoISO(2) },
  { id: "s2", category: "For Sale", title: "IKEA Pax wardrobe — white, 2m wide", description: "Disassembled, all fittings included. Pickup Belconnen.", price: "$220", contact: "kim.belconnen@example.com", posted_at: daysAgoISO(5) },
  { id: "s3", category: "Services", title: "Lawn mowing & garden tidy — ACT wide", description: "Reliable weekend service, fully insured. Free quote.", price: "From $55", contact: "greenstrip.act@example.com", posted_at: daysAgoISO(1) },
  { id: "s4", category: "Services", title: "Babysitter available weekends", description: "Working with vulnerable people check, first aid certified. Inner North.", contact: "sitter.canberra@example.com", posted_at: daysAgoISO(3) },
  { id: "s5", category: "Wanted", title: "Looking for a 2BR rental in Belconnen", description: "Quiet professional couple, no pets, references available. Up to $620/wk.", contact: "rent.belco@example.com", posted_at: daysAgoISO(4) },
  { id: "s6", category: "Wanted", title: "Used kids' bike — 20 inch", description: "Happy to collect. Cash on pickup.", contact: "tuggsdad@example.com", posted_at: daysAgoISO(7) },
  { id: "s7", category: "Rentals", title: "Studio in Braddon — short term", description: "Available 4 weeks from next Mon. Furnished, off-street parking.", price: "$420/wk", contact: "braddonstays@example.com", posted_at: daysAgoISO(1) },
  { id: "s8", category: "Jobs", title: "Cafe all-rounder — Kingston", description: "Weekend shifts, barista experience preferred. Award rates.", contact: "kingston.cafe@example.com", posted_at: daysAgoISO(2) },
  { id: "s9", category: "Community", title: "Volunteers wanted — Sat soup kitchen", description: "Civic-based community group needs 4 helpers Saturday mornings.", contact: "volunteer.canberra@example.com", posted_at: daysAgoISO(6) },
  { id: "s10", category: "Community", title: "Free piano — upright, you collect", description: "Working condition, tuning needed. Weston Creek.", contact: "freepiano.weston@example.com", posted_at: daysAgoISO(9) },
];

function daysAgoISO(d: number) {
  return new Date(Date.now() - d * 86400000).toISOString();
}
function daysAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

const LS_KEY = "dn_classifieds_user";

export const Route = createFileRoute("/classifieds")({
  head: () => ({
    meta: buildMeta({
      title: `Classifieds | ${siteName()}`,
      description: `Community classifieds for ${cityName()} — for sale, wanted, services, jobs, rentals and notices.`,
      path: "/classifieds",
    }),
    links: canonicalLinks("/classifieds"),
  }),
  component: ClassifiedsPage,
});

function ClassifiedsPage() {
  const [filter, setFilter] = useState<Cat | "All">("All");
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setUserListings(JSON.parse(raw));
    } catch { /* localStorage unavailable in private mode */ }
  }, []);

  const all = [...userListings, ...SEED];
  const visible = filter === "All" ? all : all.filter((l) => l.category === filter);

  function handleSubmit(l: Listing) {
    const next = [{ ...l, status: "pending" as const }, ...userListings];
    setUserListings(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* localStorage unavailable in private mode */ }
    setShowForm(false);
    setSubmitMsg("Your listing is under review — we'll publish within 24 hours.");
    setTimeout(() => setSubmitMsg(null), 6000);
  }

  return (
    <>
      <SiteHeader activePath="/classifieds" />
      <main className="container-news py-10">
        <nav className="meta mb-4"><a href="/">Home</a> / Classifieds</nav>
        <p className="kicker">Community</p>
        <h1 className="h1-news mt-1">{cityName()} Classifieds</h1>
        <p className="dek mt-3 max-w-2xl">
          Free local listings from the {cityName()} community. For sale, wanted, services, jobs, rentals and notices. All listings reviewed before publishing.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button onClick={() => setShowForm(true)} className="btn-primary">Post a free listing</button>
          {submitMsg && <span className="meta text-[var(--ink-red)]">{submitMsg}</span>}
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-y border-[var(--hairline)] py-3">
          {(["All", ...CATS] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1 text-[12px] uppercase tracking-widest ${
                filter === c ? "bg-[var(--ink)] text-[var(--surface)]" : "border border-[var(--hairline)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((l) => (
            <article key={l.id} className="border-t border-[var(--hairline)] pt-4">
              <div className="flex items-center justify-between">
                <span className="inline-block bg-[var(--ink)] text-[var(--surface)] text-[10px] uppercase tracking-widest px-2 py-0.5">
                  {l.category}
                </span>
                {l.status === "pending" && (
                  <span className="meta text-[var(--ink-red)] uppercase text-[10px] tracking-widest">Pending review</span>
                )}
              </div>
              <h2 className="serif text-lg font-semibold mt-2">{l.title}</h2>
              <p className="meta mt-2">{l.description}</p>
              {l.price && <p className="mt-2 font-semibold">{l.price}</p>}
              <p className="meta mt-3">Posted {daysAgo(l.posted_at)}</p>
              <a href={`mailto:${l.contact}?subject=${encodeURIComponent(l.title)}`} className="mt-3 inline-block btn-primary">Contact</a>
            </article>
          ))}
          {visible.length === 0 && (
            <p className="meta col-span-full">No listings in this category yet. Be the first to post.</p>
          )}
        </div>

        <p className="meta mt-10 max-w-2xl">
          Classifieds are a community service. {siteName()} doesn't verify individual listings — use your judgement and meet in safe public places.
        </p>
      </main>

      {showForm && <ListingForm onClose={() => setShowForm(false)} onSubmit={handleSubmit} />}
    </>
  );
}

function ListingForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (l: Listing) => void }) {
  const [category, setCategory] = useState<Cat>("For Sale");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [contact, setContact] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] max-w-lg w-full p-6 border border-[var(--ink)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="serif text-xl font-semibold">Post a free listing</h2>
          <button onClick={onClose} aria-label="Close" className="text-xl">×</button>
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !contact.trim() || !description.trim()) return;
            onSubmit({
              id: `u${Date.now()}`,
              category,
              title: title.trim().slice(0, 120),
              description: description.trim().slice(0, 600),
              price: price.trim() ? price.trim().slice(0, 40) : undefined,
              contact: contact.trim().slice(0, 120),
              posted_at: new Date().toISOString(),
            });
          }}
        >
          <label className="block">
            <span className="label">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as Cat)} className="mt-1 w-full border border-[var(--hairline)] bg-transparent p-2">
              {CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Title</span>
            <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full border border-[var(--hairline)] bg-transparent p-2" />
          </label>
          <label className="block">
            <span className="label">Description</span>
            <textarea required maxLength={600} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full border border-[var(--hairline)] bg-transparent p-2" />
          </label>
          <label className="block">
            <span className="label">Price (optional)</span>
            <input maxLength={40} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. $120 or Negotiable" className="mt-1 w-full border border-[var(--hairline)] bg-transparent p-2" />
          </label>
          <label className="block">
            <span className="label">Contact email</span>
            <input required type="email" maxLength={120} value={contact} onChange={(e) => setContact(e.target.value)} className="mt-1 w-full border border-[var(--hairline)] bg-transparent p-2" />
          </label>
          <button type="submit" className="btn-primary w-full">Submit listing</button>
        </form>
      </div>
    </div>
  );
}
