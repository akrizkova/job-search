"""
Company career page directory.

Curated list of UK companies (and major global employers with UK presence)
that primarily advertise on their own websites rather than job boards.
Supports: discover by company name, auto-detect ATS, return career page URL.
"""
from dataclasses import dataclass
from typing import Optional
import re

@dataclass
class CompanyEntry:
    name: str
    career_url: str
    ats: str           # greenhouse | lever | workday | smartrecruiters | ashby | custom
    ats_id: str        # ID used by the ATS API (empty for custom/generic scrape)
    country: str       # "uk", "global", "us"
    sector: str

# ---------------------------------------------------------------------------
# Curated UK & global companies with career pages
# ---------------------------------------------------------------------------
COMPANY_DIRECTORY: list[CompanyEntry] = [
    # ── UK Fintech ──────────────────────────────────────────────────────────
    CompanyEntry("Monzo", "https://monzo.com/careers", "ashby", "monzo", "uk", "fintech"),
    CompanyEntry("Starling Bank", "https://www.starlingbank.com/careers", "ashby", "starlingbank", "uk", "fintech"),
    CompanyEntry("Wise", "https://wise.com/gb/careers", "ashby", "wise", "uk", "fintech"),
    CompanyEntry("Revolut", "https://www.revolut.com/careers", "custom", "", "uk", "fintech"),
    CompanyEntry("Checkout.com", "https://www.checkout.com/careers", "ashby", "checkout", "uk", "fintech"),
    CompanyEntry("GoCardless", "https://gocardless.com/about/careers", "ashby", "gocardless", "uk", "fintech"),
    CompanyEntry("Funding Circle", "https://www.fundingcircle.com/uk/careers", "ashby", "fundingcircle", "uk", "fintech"),
    CompanyEntry("OakNorth", "https://www.oaknorth.com/careers", "ashby", "oaknorth", "uk", "fintech"),
    CompanyEntry("TrueLayer", "https://truelayer.com/careers", "ashby", "truelayer", "uk", "fintech"),
    CompanyEntry("Zopa", "https://www.zopa.com/careers", "ashby", "zopa", "uk", "fintech"),
    CompanyEntry("Thought Machine", "https://thoughtmachine.net/careers", "greenhouse", "thought-machine", "uk", "fintech"),
    CompanyEntry("Form3", "https://www.form3.tech/careers", "ashby", "form3", "uk", "fintech"),
    CompanyEntry("ClearScore", "https://www.clearscore.com/about/careers", "lever", "clearscore", "uk", "fintech"),
    CompanyEntry("MarketAxess", "https://www.marketaxess.com/careers", "workday", "marketaxess", "uk", "fintech"),
    CompanyEntry("WorldFirst", "https://www.worldfirst.com/uk/careers", "smartrecruiters", "WorldFirst", "uk", "fintech"),
    CompanyEntry("Paysafe", "https://careers.paysafe.com", "workday", "paysafe", "uk", "fintech"),

    # ── UK Tech / Scale-ups ──────────────────────────────────────────────────
    CompanyEntry("Deliveroo", "https://careers.deliveroo.co.uk", "greenhouse", "deliveroo", "uk", "tech"),
    CompanyEntry("Ocado Technology", "https://careers.ocado.com", "workday", "ocado", "uk", "tech"),
    CompanyEntry("Skyscanner", "https://www.skyscanner.net/jobs", "smartrecruiters", "Skyscanner", "uk", "tech"),
    CompanyEntry("Darktrace", "https://darktrace.com/careers", "greenhouse", "darktrace", "uk", "tech"),
    CompanyEntry("Graphcore", "https://www.graphcore.ai/careers", "greenhouse", "graphcore", "uk", "tech"),
    CompanyEntry("Behavox", "https://behavox.com/careers", "lever", "behavox", "uk", "tech"),
    CompanyEntry("Faculty AI", "https://faculty.ai/careers", "lever", "faculty", "uk", "tech"),
    CompanyEntry("Improbable", "https://improbable.io/careers", "lever", "improbable", "uk", "tech"),
    CompanyEntry("Tractable", "https://tractable.ai/careers", "greenhouse", "tractable", "uk", "tech"),
    CompanyEntry("Cleo", "https://web.meetcleo.com/careers", "lever", "cleo", "uk", "tech"),
    CompanyEntry("Memrise", "https://memrise.com/jobs", "lever", "memrise", "uk", "tech"),
    CompanyEntry("Bought By Many", "https://boughtbymany.com/careers", "lever", "boughtbymany", "uk", "tech"),
    CompanyEntry("Nested", "https://nested.com/careers", "lever", "nested", "uk", "tech"),
    CompanyEntry("Unmind", "https://unmind.com/careers", "lever", "unmind", "uk", "tech"),
    CompanyEntry("Hinge Health", "https://www.hingehealth.com/careers", "lever", "hingehealth", "uk", "healthtech"),
    CompanyEntry("Pando", "https://pando.com/careers", "lever", "pando", "uk", "tech"),
    CompanyEntry("Multiverse", "https://www.multiverse.io/en-GB/careers", "ashby", "multiverse", "uk", "edtech"),
    CompanyEntry("Onfido", "https://onfido.com/careers", "lever", "onfido", "uk", "tech"),
    CompanyEntry("Tessian", "https://tessian.com/careers", "greenhouse", "tessian", "uk", "cybersec"),
    CompanyEntry("Mimecast", "https://www.mimecast.com/careers", "workday", "mimecast", "uk", "cybersec"),
    CompanyEntry("Sophos", "https://www.sophos.com/careers", "workday", "sophos", "uk", "cybersec"),
    CompanyEntry("Arm", "https://careers.arm.com", "workday", "arm", "uk", "semiconductors"),
    CompanyEntry("Sage", "https://www.sage.com/en-gb/company/careers", "workday", "sage", "uk", "software"),
    CompanyEntry("Aveva", "https://www.aveva.com/en/careers", "workday", "aveva", "uk", "software"),
    CompanyEntry("Kainos", "https://careers.kainos.com", "workday", "kainos", "uk", "consulting"),
    CompanyEntry("BJSS", "https://www.bjss.com/careers", "custom", "", "uk", "consulting"),
    CompanyEntry("Scott Logic", "https://www.scottlogic.com/careers", "custom", "", "uk", "consulting"),
    CompanyEntry("Equal Experts", "https://www.equalexperts.com/join-us", "custom", "", "uk", "consulting"),

    # ── UK Finance / Banking ─────────────────────────────────────────────────
    CompanyEntry("HSBC", "https://mycareer.hsbc.com", "workday", "hsbc", "uk", "banking"),
    CompanyEntry("Barclays", "https://search.jobs.barclays", "workday", "barclays", "uk", "banking"),
    CompanyEntry("Lloyds Banking Group", "https://careers.lloydsbank.com", "workday", "lloyds", "uk", "banking"),
    CompanyEntry("NatWest Group", "https://jobs.natwestgroup.com", "workday", "natwestgroup", "uk", "banking"),
    CompanyEntry("Standard Chartered", "https://www.sc.com/en/careers", "workday", "standardchartered", "uk", "banking"),
    CompanyEntry("Santander UK", "https://jobs.santander.co.uk", "workday", "santander", "uk", "banking"),
    CompanyEntry("Schroders", "https://careers.schroders.com", "workday", "schroders", "uk", "finance"),
    CompanyEntry("Man Group", "https://www.man.com/careers", "greenhouse", "man-group", "uk", "finance"),
    CompanyEntry("Baillie Gifford", "https://www.bailliegifford.com/careers", "custom", "", "uk", "finance"),
    CompanyEntry("Hargreaves Lansdown", "https://careers.hl.co.uk", "custom", "", "uk", "finance"),

    # ── UK Consulting / Big4 ──────────────────────────────────────────────────
    CompanyEntry("Deloitte UK", "https://jobs2.deloitte.com/uk", "workday", "deloitte", "uk", "consulting"),
    CompanyEntry("KPMG UK", "https://kpmgcareers.co.uk", "workday", "kpmg", "uk", "consulting"),
    CompanyEntry("PwC UK", "https://jobs.pwc.co.uk", "workday", "pwc", "uk", "consulting"),
    CompanyEntry("EY UK", "https://careers.ey.com/ey/go/United-Kingdom", "workday", "ey", "uk", "consulting"),
    CompanyEntry("Accenture UK", "https://www.accenture.com/gb-en/careers", "workday", "accenture", "uk", "consulting"),
    CompanyEntry("McKinsey UK", "https://www.mckinsey.com/careers/search-jobs", "custom", "", "uk", "consulting"),
    CompanyEntry("BCG UK", "https://careers.bcg.com/locations/united-kingdom", "custom", "", "uk", "consulting"),
    CompanyEntry("Bain UK", "https://www.bain.com/careers/find-a-role", "custom", "", "uk", "consulting"),
    CompanyEntry("Capgemini UK", "https://www.capgemini.com/gb-en/careers", "workday", "capgemini", "uk", "consulting"),
    CompanyEntry("CGI UK", "https://www.cgi.com/en/careers", "workday", "cgi", "uk", "consulting"),
    CompanyEntry("Fujitsu UK", "https://careers.fujitsu.com/uk", "workday", "fujitsu", "uk", "consulting"),

    # ── UK Government / Public Sector ────────────────────────────────────────
    CompanyEntry("GCHQ", "https://www.gchq-careers.co.uk", "custom", "", "uk", "government"),
    CompanyEntry("NHS Digital", "https://digital.nhs.uk/about-nhs-digital/jobs", "custom", "", "uk", "government"),
    CompanyEntry("HMRC", "https://www.civilservicejobs.service.gov.uk", "custom", "", "uk", "government"),
    CompanyEntry("Cabinet Office", "https://www.civilservicejobs.service.gov.uk", "custom", "", "uk", "government"),
    CompanyEntry("Ministry of Justice Digital", "https://mojdigital.blog.gov.uk/jobs", "custom", "", "uk", "government"),
    CompanyEntry("GDS (Gov Digital Service)", "https://gds.blog.gov.uk/jobs", "custom", "", "uk", "government"),

    # ── UK Defence / Aerospace ──────────────────────────────────────────────
    CompanyEntry("BAE Systems", "https://www.baesystems.com/en/careers", "workday", "baesystems", "uk", "defence"),
    CompanyEntry("Leonardo UK", "https://www.leonardocompany.com/en/careers", "workday", "leonardo", "uk", "defence"),
    CompanyEntry("QinetiQ", "https://www.qinetiq.com/careers", "workday", "qinetiq", "uk", "defence"),
    CompanyEntry("Rolls-Royce", "https://careers.rolls-royce.com", "workday", "rollsroyce", "uk", "aerospace"),
    CompanyEntry("Babcock International", "https://careers.babcockinternational.com", "workday", "babcock", "uk", "defence"),

    # ── UK Media / Entertainment ─────────────────────────────────────────────
    CompanyEntry("BBC", "https://careers.bbc.co.uk", "custom", "", "uk", "media"),
    CompanyEntry("ITV", "https://www.itv.com/careers", "custom", "", "uk", "media"),
    CompanyEntry("Sky", "https://careers.sky.com", "lever", "sky", "uk", "media"),
    CompanyEntry("Channel 4", "https://jobs.channel4.com", "custom", "", "uk", "media"),
    CompanyEntry("The Guardian", "https://workforus.theguardian.com", "lever", "guardian", "uk", "media"),

    # ── UK Gaming ────────────────────────────────────────────────────────────
    CompanyEntry("Rockstar North", "https://www.rockstargames.com/careers", "custom", "", "uk", "gaming"),
    CompanyEntry("King (Candy Crush)", "https://careers.king.com", "greenhouse", "king", "uk", "gaming"),
    CompanyEntry("Jagex", "https://www.jagex.com/en-GB/careers", "greenhouse", "jagex", "uk", "gaming"),
    CompanyEntry("Frontier Developments", "https://frontier.co.uk/careers", "custom", "", "uk", "gaming"),
    CompanyEntry("Rebellion", "https://rebellion.com/careers", "custom", "", "uk", "gaming"),
    CompanyEntry("Sports Interactive", "https://www.sportsinteractive.com/jobs", "custom", "", "uk", "gaming"),
    CompanyEntry("PolyArc", "https://polyarcgames.com/jobs", "custom", "", "uk", "gaming"),

    # ── UK Retail / E-commerce ────────────────────────────────────────────────
    CompanyEntry("Ocado", "https://careers.ocado.com", "workday", "ocado", "uk", "retail"),
    CompanyEntry("ASOS", "https://careers.asos.com", "greenhouse", "asos", "uk", "retail"),
    CompanyEntry("Tesco", "https://apply.tesco-careers.com", "workday", "tesco", "uk", "retail"),
    CompanyEntry("Marks and Spencer", "https://jobs.marksandspencer.com", "workday", "marksandspencer", "uk", "retail"),
    CompanyEntry("Boohoo", "https://careers.boohoogroup.com", "custom", "", "uk", "retail"),
    CompanyEntry("Farfetch", "https://careers.farfetch.com", "lever", "farfetch", "uk", "retail"),
    CompanyEntry("Secret Sales", "https://secretsales.com/careers", "custom", "", "uk", "retail"),

    # ── Global Tech (with large UK engineering teams) ─────────────────────────
    CompanyEntry("Google UK", "https://careers.google.com/locations/london", "custom", "", "global", "tech"),
    CompanyEntry("Amazon UK", "https://www.amazon.jobs/en/locations/london-uk", "custom", "", "global", "tech"),
    CompanyEntry("Microsoft UK", "https://careers.microsoft.com/v2/global/en/locations/united-kingdom.html", "custom", "", "global", "tech"),
    CompanyEntry("Meta UK", "https://www.metacareers.com/locations/london", "custom", "", "global", "tech"),
    CompanyEntry("Apple UK", "https://jobs.apple.com/en-gb/search", "custom", "", "global", "tech"),
    CompanyEntry("Spotify UK", "https://www.lifeatspotify.com/jobs", "greenhouse", "spotify", "global", "tech"),
    CompanyEntry("Airbnb UK", "https://careers.airbnb.com", "greenhouse", "airbnb", "global", "tech"),
    CompanyEntry("Stripe UK", "https://stripe.com/jobs", "greenhouse", "stripe", "global", "fintech"),
    CompanyEntry("Cloudflare UK", "https://www.cloudflare.com/careers/jobs", "greenhouse", "cloudflare", "global", "tech"),
    CompanyEntry("Figma", "https://www.figma.com/careers", "greenhouse", "figma", "global", "tech"),
    CompanyEntry("Notion", "https://www.notion.so/careers", "ashby", "notion", "global", "tech"),

    # ── EU Fintech ─────────────────────────────────────────────────────────────
    CompanyEntry("Klarna", "https://www.klarna.com/careers", "ashby", "klarna", "eu", "fintech"),
    CompanyEntry("N26", "https://n26.com/en-eu/careers", "ashby", "n26", "eu", "fintech"),
    CompanyEntry("Pleo", "https://www.pleo.io/en/careers", "ashby", "pleo", "eu", "fintech"),
    CompanyEntry("Spendesk", "https://www.spendesk.com/careers", "ashby", "spendesk", "eu", "fintech"),
    CompanyEntry("Qonto", "https://qonto.com/en/careers", "ashby", "qonto", "eu", "fintech"),
    CompanyEntry("Payfit", "https://payfit.com/en/company/careers", "ashby", "payfit", "eu", "fintech"),
    CompanyEntry("Sumeria (ex-Lydia)", "https://sumeria.eu/en/careers", "lever", "lydia", "eu", "fintech"),
    CompanyEntry("Moss", "https://getmoss.com/careers", "ashby", "getmoss", "eu", "fintech"),
    CompanyEntry("Trade Republic", "https://traderepublic.com/careers", "smartrecruiters", "TradeRepublic", "eu", "fintech"),
    CompanyEntry("Raisin", "https://www.raisin.com/careers", "smartrecruiters", "Raisin", "eu", "fintech"),
    CompanyEntry("SumUp", "https://sumup.com/careers", "smartrecruiters", "SumUp", "eu", "fintech"),

    # ── EU AI / Deep Tech ──────────────────────────────────────────────────────
    CompanyEntry("Mistral AI", "https://mistral.ai/careers", "ashby", "mistral", "eu", "ai"),
    CompanyEntry("Wayve", "https://wayve.ai/careers", "ashby", "wayve", "eu", "ai"),
    CompanyEntry("Synthesia", "https://www.synthesia.io/careers", "ashby", "synthesia", "eu", "ai"),
    CompanyEntry("PolyAI", "https://poly.ai/careers", "ashby", "polyai", "eu", "ai"),
    CompanyEntry("ElevenLabs", "https://elevenlabs.io/careers", "ashby", "elevenlabs", "eu", "ai"),
    CompanyEntry("Poolside", "https://poolside.ai/careers", "ashby", "poolside", "eu", "ai"),
    CompanyEntry("Helsing", "https://helsing.ai/careers", "greenhouse", "helsing", "eu", "ai"),
    CompanyEntry("DeepL", "https://www.deepl.com/en/careers", "lever", "deepl", "eu", "ai"),

    # ── EU SaaS / Developer Tools ──────────────────────────────────────────────
    CompanyEntry("Personio", "https://www.personio.com/careers", "ashby", "personio", "eu", "hr-tech"),
    CompanyEntry("Factorial", "https://factorialhr.com/careers", "ashby", "factorial", "eu", "hr-tech"),
    CompanyEntry("Typeform", "https://www.typeform.com/careers", "ashby", "typeform", "eu", "saas"),
    CompanyEntry("Miro", "https://miro.com/careers", "ashby", "miro", "eu", "saas"),
    CompanyEntry("Pitch", "https://pitch.com/careers", "ashby", "pitch", "eu", "saas"),
    CompanyEntry("Aiven", "https://aiven.io/careers", "ashby", "aiven", "eu", "data"),
    CompanyEntry("Contentful", "https://www.contentful.com/careers", "ashby", "contentful", "eu", "saas"),
    CompanyEntry("Storyblok", "https://www.storyblok.com/jobs", "ashby", "storyblok", "eu", "saas"),
    CompanyEntry("GetResponse", "https://www.getresponse.com/careers", "ashby", "getresponse", "eu", "saas"),
    CompanyEntry("Usercentrics", "https://usercentrics.com/careers", "ashby", "usercentrics", "eu", "saas"),

    # ── EU E-commerce / Marketplace ────────────────────────────────────────────
    CompanyEntry("Zalando", "https://jobs.zalando.com", "smartrecruiters", "Zalando", "eu", "ecommerce"),
    CompanyEntry("HelloFresh", "https://careers.hellofresh.com", "smartrecruiters", "HelloFreshGroup", "eu", "ecommerce"),
    CompanyEntry("About You", "https://aboutyou.com/en/careers", "smartrecruiters", "AboutYouGmbH", "eu", "ecommerce"),
    CompanyEntry("Wolt", "https://careers.wolt.com", "ashby", "wolt", "eu", "marketplace"),
    CompanyEntry("Bolt (rideshare)", "https://bolt.eu/en/careers", "ashby", "bolt", "eu", "marketplace"),
    CompanyEntry("Gorillas", "https://gorillas.io/en/jobs", "lever", "gorillas", "eu", "marketplace"),

    # ── EU Health / BioTech ────────────────────────────────────────────────────
    CompanyEntry("Alan (health)", "https://alan.com/careers", "ashby", "alan", "eu", "healthtech"),
    CompanyEntry("Doctolib", "https://careers.doctolib.fr", "ashby", "doctolib", "eu", "healthtech"),
    CompanyEntry("Kry / Livi", "https://careers.kry.se", "greenhouse", "kry", "eu", "healthtech"),
    CompanyEntry("BioNTech", "https://careers.biontech.de", "workday", "biontech", "eu", "biotech"),
    CompanyEntry("Immunocore", "https://www.immunocore.com/careers", "workday", "immunocore", "eu", "biotech"),

    # ── EU Gaming ──────────────────────────────────────────────────────────────
    CompanyEntry("Supercell", "https://supercell.com/en/careers", "greenhouse", "supercell", "eu", "gaming"),
    CompanyEntry("Rovio", "https://careers.rovio.com", "lever", "rovio", "eu", "gaming"),
    CompanyEntry("Ubisoft", "https://www.ubisoft.com/en-gb/careers", "workday", "ubisoft", "eu", "gaming"),
    CompanyEntry("CD Projekt", "https://www.cdprojekt.com/en/careers", "custom", "", "eu", "gaming"),

    # ── Nordic Tech ────────────────────────────────────────────────────────────
    CompanyEntry("Spotify", "https://www.lifeatspotify.com/jobs", "greenhouse", "spotify", "eu", "tech"),
    CompanyEntry("King", "https://careers.king.com", "greenhouse", "king", "eu", "gaming"),
    CompanyEntry("Klarna", "https://www.klarna.com/careers", "ashby", "klarna", "eu", "fintech"),
    CompanyEntry("Trustpilot", "https://careers.trustpilot.com", "greenhouse", "trustpilot", "eu", "saas"),
    CompanyEntry("Unity", "https://careers.unity.com", "lever", "unity", "eu", "tech"),
    CompanyEntry("Voi Technology", "https://careers.voi.com", "lever", "voi", "eu", "mobility"),
    CompanyEntry("Northvolt", "https://northvolt.com/careers", "workday", "northvolt", "eu", "greentech"),
    CompanyEntry("ISAR Aerospace", "https://isaragroup.com/careers", "lever", "isar", "eu", "aerospace"),
    CompanyEntry("OLX Group", "https://www.olxgroup.com/careers", "greenhouse", "olx-group", "eu", "marketplace"),
]


def search_directory(query: str, uk_only: bool = False) -> list[CompanyEntry]:
    """Find companies matching a name query."""
    q = query.lower()
    results = []
    for entry in COMPANY_DIRECTORY:
        if q in entry.name.lower() or q in entry.sector.lower():
            if uk_only and entry.country not in ("uk",):
                continue
            results.append(entry)
    return results


def normalize_company_name(name: str) -> str:
    """Normalize a company name for matching against the visa sponsor register."""
    name = name.lower()
    # Remove common legal suffixes
    for suffix in [
        " limited", " ltd", " plc", " llc", " inc", " corp", " corporation",
        " group", " holdings", " uk", " gb", " (uk)", " (gb)", " &amp;",
        " technologies", " technology", " solutions", " services",
        " international", " global",
    ]:
        name = name.replace(suffix, "")
    name = re.sub(r"[^\w\s]", " ", name)
    name = " ".join(name.split())
    return name
