// "Have Your Say" — letters to the editor. Newspaper tradition that
// signals an active community voice. Seed letters at launch with a
// "Write to us" CTA that opens a pre-filled mailto.
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/letters")({
  head: () => ({
    meta: buildMeta({
      title: `Letters to the Editor — ${siteName()}`,
      description: `Have Your Say: letters from ${cityName()} readers responding to our coverage.`,
      path: "/letters",
    }),
    links: canonicalLinks("/letters"),
  }),
  component: LettersPage,
});

type Letter = {
  author: string;
  suburb: string;
  date: string;
  paragraphs: string[];
};

function writeMailto() {
  const subject = encodeURIComponent("Letter to the Editor —");
  const body = encodeURIComponent(
    "Dear Editor,\n\n[Your letter here. Please include your full name and suburb. Letters may be edited for length and clarity.]\n\nRegards,\n",
  );
  return `mailto:letters@dailycanberra.com.au?subject=${subject}&body=${body}`;
}

function LettersPage() {
  const city = cityName();
  const letters: Letter[] = [
    {
      author: "John S.",
      suburb: `${city} resident`,
      date: "This week",
      paragraphs: [
        `Your coverage of the light rail debate has been the most balanced reporting I've seen in ${city} for years.`,
        "What's missing from the national coverage is the lived experience of residents along the corridor. Please keep asking the hard questions about cost, timeline and benefit.",
      ],
    },
    {
      author: "Margaret D.",
      suburb: "Belconnen",
      date: "Last week",
      paragraphs: [
        "I was delighted to read your piece on community gardens. We've been running one for fifteen years and the number of volunteers has trebled since lockdown.",
        `The future of ${city} isn't only in big projects — it's in the small patches of green that bring neighbours together.`,
      ],
    },
    {
      author: "Andrew P.",
      suburb: "Tuggeranong",
      date: "Last week",
      paragraphs: [
        "Bus services in our part of the city have not kept up with population growth. The 7:42 service is regularly so full that drivers skip stops.",
        "I'd like to see Transport Canberra publish on-time and capacity data the way other cities do. Sunlight is the best disinfectant.",
      ],
    },
    {
      author: "Helen R.",
      suburb: "Gungahlin",
      date: "Two weeks ago",
      paragraphs: [
        `It's good to finally have a daily news source written for ${city} rather than at it. Keep going.`,
      ],
    },
  ];

  return (
    <>
      <SiteHeader activePath="/letters" />
      <main className="container-read py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--ink)] pb-6">
          <div>
            <p className="kicker text-[var(--accent,#A32D2D)]">Have your say</p>
            <h1 className="h1-news mt-2">Letters to the Editor</h1>
            <p className="dek mt-2 max-w-[60ch]">
              Readers respond to our coverage of {city}. Letters may be
              edited for length and clarity.
            </p>
          </div>
          <a href={writeMailto()} className="btn-primary no-underline">
            Write to us
          </a>
        </div>

        <div className="mt-10 space-y-12">
          {letters.map((l) => (
            <article key={`${l.author}-${l.date}`} className="border-l-4 border-[var(--accent,#A32D2D)] pl-5">
              <p className="kicker">
                {l.author} · {l.suburb} · {l.date}
              </p>
              {l.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? "serif mt-3 text-2xl leading-snug font-semibold"
                      : "serif mt-3 text-lg leading-relaxed"
                  }
                >
                  {p}
                </p>
              ))}
              <p className="meta mt-4 italic">
                The views expressed are those of the reader and not of {siteName()}.
              </p>
            </article>
          ))}
        </div>

        <section className="mt-14 border-t border-[var(--hairline,#d6d2c9)] pt-6">
          <h2 className="h2-news">How to write to us</h2>
          <p className="serif mt-3 max-w-[60ch]">
            Email{" "}
            <a href={writeMailto()} className="underline">
              letters@dailycanberra.com.au
            </a>
            . Please include your full name, suburb and a contact phone
            number (not for publication). Keep letters under 300 words where
            possible.
          </p>
        </section>
      </main>
    </>
  );
}
