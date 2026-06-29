// Decides whether the homepage leads with news articles or with the
// events diary. Exported so tests can lock the behaviour down.
export type HomepageMode = "news" | "events";

export function homepageMode(input: { articles: { id?: unknown }[] }): HomepageMode {
  return input.articles.length > 0 ? "news" : "events";
}
