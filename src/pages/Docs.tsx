import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModuleSection } from "@/components/docs/ModuleSection";
import {
  clubEnrichmentDiagram,
  visualDnaDiagram,
  peopleInstagramDiagram,
  crmApiDiagram,
} from "@/components/docs/mermaid-sources";

const toc = [
  { id: "overview", label: "Overview" },
  { id: "club-enrichment", label: "Club Intelligence Enrichment" },
  { id: "visual-dna", label: "Visual DNA Analysis" },
  { id: "people-instagram", label: "People & Instagram Intel" },
  { id: "crm-api", label: "External CRM API" },
];

const Docs = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to app
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          {/* Sidebar TOC */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Contents
              </p>
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-sm text-muted-foreground hover:text-foreground py-1.5 border-l-2 border-transparent hover:border-primary pl-3 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="space-y-12 max-w-3xl">
            {/* Hero */}
            <section id="overview" className="scroll-mt-24 space-y-4">
              <div>
                <Badge variant="secondary" className="mb-3">Documentation</Badge>
                <h1 className="text-4xl font-bold text-foreground">
                  GTM Engine
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Padel-industry intelligence platform for enriching clubs,
                  people, Instagram, and visual identity — with a secure API
                  surface for external CRMs.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <h3 className="font-semibold">What this app does</h3>
                <p className="text-sm text-muted-foreground">
                  The GTM Engine takes a raw club name, website, or Instagram
                  handle and runs it through a multi-step pipeline of scrapers
                  and AI models. It produces structured business profiles,
                  visual-identity DNA, and an Invisibility Score that quantifies
                  how visible a club is on social media. Results are stored in
                  the database and exposed through a set of authenticated
                  <code className="mx-1">api-*</code>
                  edge functions that any external CRM can consume.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <StatCard label="Modules" value="4" />
                <StatCard label="Edge functions" value="30+" />
                <StatCard label="AI providers" value="4" />
                <StatCard label="Public API endpoints" value="11" />
              </div>

              <p className="text-xs text-muted-foreground">
                AI providers used: Perplexity Sonar, Anthropic Claude Sonnet
                4.5, Google Gemini 2.0 Flash, plus Firecrawl and Apify for
                scraping.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {toc.slice(1).map((item) => (
                  <a key={item.id} href={`#${item.id}`}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                      {item.label}
                    </Badge>
                  </a>
                ))}
              </div>
            </section>

            {/* Club Intelligence */}
            <ModuleSection
              id="club-enrichment"
              title="Club Intelligence Enrichment"
              subtitle="7-step sequential pipeline that builds a comprehensive club profile."
              diagram={clubEnrichmentDiagram}
            >
              <p>
                The core enrichment module. Given any combination of{" "}
                <strong>club name</strong>, <strong>website URL</strong>, or{" "}
                <strong>Instagram handle</strong>, it produces a fully-populated
                enriched_clubs record. Step 0 is a bootstrap phase that runs
                only when the input is incomplete — a Perplexity Sonar query
                finds the missing website and social handles so the rest of the
                pipeline has something to work with.
              </p>
              <p>
                Steps 1–3 collect raw signals: the website is scraped by
                Firecrawl (with footers preserved to catch social links),
                branding colors and fonts are extracted, and Apify pulls up to
                12 recent Instagram posts. Step 4 runs four parallel Perplexity
                research queries covering description, founder history, recent
                activity, and leadership. Step 5 hands the whole packet to
                Claude Sonnet 4.5, which synthesizes a structured JSON with
                attitude, aesthetics, key people, and social profiles. Step 6
                automatically triggers Visual DNA analysis on the resulting
                Instagram data.
              </p>
              <p className="text-xs text-muted-foreground">
                Related edge functions: <code>create-enrichment-job</code>,{" "}
                <code>enrichment-worker</code>, <code>extract-branding</code>,{" "}
                <code>instagram-scraper</code>, <code>test-step-zero</code>.
              </p>
            </ModuleSection>

            {/* Visual DNA */}
            <ModuleSection
              id="visual-dna"
              title="Visual DNA Analysis"
              subtitle="Multi-modal analysis of a club's Instagram visual and voice identity."
              diagram={visualDnaDiagram}
            >
              <p>
                Visual DNA answers a single question: <em>what does this club
                look and sound like on Instagram, and how invisible are they?</em>{" "}
                It accepts either an <code>enriched_club_id</code> or a raw{" "}
                <code>instagram_handle</code>, pulls up to 12 recent posts
                (cached when available), and downloads each image resized to
                512px. Images are persisted to the{" "}
                <code>instagram-post-images</code> Supabase Storage bucket so
                the gallery still works after Instagram CDN links expire.
              </p>
              <p>
                Three AI calls run in sequence: Gemini 2.0 Flash performs
                multimodal visual analysis (color palette, photography style,
                composition, branding elements, content mix), Claude Sonnet 4.5
                analyzes the captions for tone / hashtags / signature phrases,
                and a second Claude call matches the visual output against 20
                CTLT reference styles. Finally, an Invisibility Score is
                computed as a weighted sum:
              </p>
              <ul className="text-sm">
                <li>Posting Frequency — 30%</li>
                <li>Content Quality — 25%</li>
                <li>Brand Consistency — 20%</li>
                <li>Engagement Rate — 15%</li>
                <li>Caption Effort — 10%</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Categories: 0–19 Invisible · 20–39 Struggling · 40–59 Average ·
                60–79 Strong · 80–100 Excellent.
              </p>
            </ModuleSection>

            {/* People & Instagram */}
            <ModuleSection
              id="people-instagram"
              title="People & Instagram Intelligence"
              subtitle="Two complementary modules for person dossiers and standalone Instagram scraping."
              diagram={peopleInstagramDiagram}
            >
              <p>
                <strong>People Intelligence</strong> takes a name (and
                optionally company / role) and builds a 42-column dossier
                covering identity, career, education, achievements, and news.
                The <code>find-people-worker</code> discovers candidate
                profiles, then <code>enrich-person</code> synthesizes the final
                dossier via Perplexity + Claude.
              </p>
              <p>
                <strong>Instagram Intelligence</strong> is the lightweight
                sibling: given a list of handles, it runs the Apify profile
                scraper and stores raw profile + latest posts in{" "}
                <code>instagram_company_data</code>. This is the same data the
                Visual DNA module consumes, which is why Visual DNA can often
                skip the scrape step entirely.
              </p>
              <p>
                Both modules share the jobs / rows tracking tables so progress,
                errors, and CSV downloads work identically across all modules.
              </p>
            </ModuleSection>

            {/* CRM API */}
            <ModuleSection
              id="crm-api"
              title="External CRM API"
              subtitle="Authenticated api-* edge functions for third-party CRM integration."
              diagram={crmApiDiagram}
            >
              <p>
                Every public API function requires an <code>x-api-key</code>{" "}
                header that is checked against the <code>CRM_API_KEY</code>{" "}
                secret. Requests without it get a 401 immediately, before any
                work is done. The design goal is <em>one request, one result</em>{" "}
                — endpoints that trigger long-running work (like Visual DNA
                analysis) block until completion and return the full payload,
                so consumers never have to poll.
              </p>
              <p>Available endpoints:</p>
              <ul className="text-sm">
                <li><code>api-get-clubs</code> — list / fetch enriched clubs (includes all Visual DNA fields and media URLs)</li>
                <li><code>api-update-clubs</code> — patch club records</li>
                <li><code>api-create-enrichment-job</code> — trigger the 7-step pipeline</li>
                <li><code>api-get-enrichment-status</code> — poll job progress</li>
                <li><code>api-analyze-visual-dna</code> — full Visual DNA analysis in one call</li>
                <li><code>api-get-people</code> / <code>api-update-people</code> — person dossiers</li>
                <li><code>api-create-people-job</code> / <code>api-get-people-status</code> — people jobs</li>
                <li><code>api-extract-logo</code> — pull a logo from a website URL</li>
                <li><code>api-extract-instagram-pfp</code> — pull an Instagram profile picture</li>
              </ul>
            </ModuleSection>
          </main>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-card px-3 py-2">
    <div className="text-lg font-bold text-foreground">{value}</div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
  </div>
);

export default Docs;
