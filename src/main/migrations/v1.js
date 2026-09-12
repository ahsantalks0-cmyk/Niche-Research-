'use strict';

/**
 * Migration v1: Initial Complete Schema for 35 Agents + Seed Countries.
 * Niche Research Department (NRD) — SQLite Schema v1.
 */

const SEED_COUNTRIES = [
  {
    country_code: 'US',
    country_name: 'United States',
    region: 'North America',
    internet_users_millions: 311.3,
    ecommerce_spend_usd_billions: 1118.7,
    avg_adsense_rpm_usd: 28.5,
    affiliate_ecosystem_score: 98.0,
    language: 'English',
    primary_language_code: 'en',
    local_platforms: JSON.stringify(['Amazon US', 'Walmart', 'Target', 'Etsy', 'eBay', 'ShareASale', 'CJ Affiliate']),
    cultural_notes: 'High disposable income, mature e-commerce habits, heavy reliance on reviews and video recommendations.',
    potential_score: 96.5,
    is_active: 1,
  },
  {
    country_code: 'UK',
    country_name: 'United Kingdom',
    region: 'Europe',
    internet_users_millions: 66.9,
    ecommerce_spend_usd_billions: 162.4,
    avg_adsense_rpm_usd: 23.8,
    affiliate_ecosystem_score: 92.0,
    language: 'English',
    primary_language_code: 'en',
    local_platforms: JSON.stringify(['Amazon UK', 'Argos', 'ASOS', 'John Lewis', 'Awin', 'eBay UK']),
    cultural_notes: 'Dense e-commerce infrastructure, high mobile purchase rates, strong consumer protection awareness.',
    potential_score: 91.0,
    is_active: 1,
  },
  {
    country_code: 'CA',
    country_name: 'Canada',
    region: 'North America',
    internet_users_millions: 36.8,
    ecommerce_spend_usd_billions: 74.2,
    avg_adsense_rpm_usd: 21.5,
    affiliate_ecosystem_score: 87.0,
    language: 'English / French',
    primary_language_code: 'en',
    local_platforms: JSON.stringify(['Amazon CA', 'Canadian Tire', 'Best Buy CA', 'Shopify Ecosystem']),
    cultural_notes: 'High basket size, strong bilingual sensitivity in Quebec, cross-border US shipping affinity.',
    potential_score: 86.5,
    is_active: 1,
  },
  {
    country_code: 'AU',
    country_name: 'Australia',
    region: 'Oceania',
    internet_users_millions: 24.3,
    ecommerce_spend_usd_billions: 48.6,
    avg_adsense_rpm_usd: 22.0,
    affiliate_ecosystem_score: 85.0,
    language: 'English',
    primary_language_code: 'en',
    local_platforms: JSON.stringify(['Amazon AU', 'Catch.com.au', 'Kogan', 'JB Hi-Fi', 'Commission Factory']),
    cultural_notes: 'High outdoor and fitness niche demand, strong loyalty to local Aussie brands, high domestic freight considerations.',
    potential_score: 85.0,
    is_active: 1,
  },
  {
    country_code: 'DE',
    country_name: 'Germany',
    region: 'Europe',
    internet_users_millions: 79.2,
    ecommerce_spend_usd_billions: 114.5,
    avg_adsense_rpm_usd: 19.8,
    affiliate_ecosystem_score: 88.0,
    language: 'German',
    primary_language_code: 'de',
    local_platforms: JSON.stringify(['Amazon DE', 'Otto', 'Zalando', 'Idealo', 'Awin DE']),
    cultural_notes: 'Strong preference for German language content, data privacy sensitivity (GDPR/Impressum), invoice/SEPA payment demand.',
    potential_score: 88.0,
    is_active: 1,
  },
  {
    country_code: 'FR',
    country_name: 'France',
    region: 'Europe',
    internet_users_millions: 60.5,
    ecommerce_spend_usd_billions: 96.3,
    avg_adsense_rpm_usd: 18.2,
    affiliate_ecosystem_score: 84.0,
    language: 'French',
    primary_language_code: 'fr',
    local_platforms: JSON.stringify(['Amazon FR', 'Cdiscount', 'Fnac', 'La Redoute', 'Awin FR']),
    cultural_notes: 'High insistence on flawless native French, luxury and artisanal aesthetic affinity, strict cookie compliance.',
    potential_score: 83.5,
    is_active: 1,
  },
  {
    country_code: 'PK',
    country_name: 'Pakistan',
    region: 'South Asia',
    internet_users_millions: 111.0,
    ecommerce_spend_usd_billions: 6.4,
    avg_adsense_rpm_usd: 2.8,
    affiliate_ecosystem_score: 48.0,
    language: 'Urdu / English',
    primary_language_code: 'ur',
    local_platforms: JSON.stringify(['Daraz', 'OLX Pakistan', 'PakWheels', 'Zameen', 'Telemart', 'PriceOye']),
    cultural_notes: 'Cash on Delivery (COD) dominates, rapid growth in digital wallets (Easypaisa/JazzCash), booming freelance and digital services market.',
    potential_score: 64.0,
    is_active: 1,
  },
  {
    country_code: 'IN',
    country_name: 'India',
    region: 'South Asia',
    internet_users_millions: 820.0,
    ecommerce_spend_usd_billions: 118.0,
    avg_adsense_rpm_usd: 3.5,
    affiliate_ecosystem_score: 76.0,
    language: 'Hindi / English',
    primary_language_code: 'hi',
    local_platforms: JSON.stringify(['Flipkart', 'Amazon IN', 'Meesho', 'Myntra', 'JioMart', 'Cuelinks', 'EarnKaro']),
    cultural_notes: 'UPI mobile payments omnipresent, massive volume with price-sensitive audience, regional language video consumption surging.',
    potential_score: 82.0,
    is_active: 1,
  },
  {
    country_code: 'AE',
    country_name: 'United Arab Emirates',
    region: 'Middle East',
    internet_users_millions: 9.9,
    ecommerce_spend_usd_billions: 12.8,
    avg_adsense_rpm_usd: 16.5,
    affiliate_ecosystem_score: 81.0,
    language: 'Arabic / English',
    primary_language_code: 'ar',
    local_platforms: JSON.stringify(['Amazon AE', 'Noon', 'Namshi', 'Sharaf DG', 'ArabClicks']),
    cultural_notes: 'Expat-heavy demographics, ultra-fast delivery expectations, high-ticket electronics and luxury lifestyle niche demand.',
    potential_score: 84.0,
    is_active: 1,
  },
  {
    country_code: 'SA',
    country_name: 'Saudi Arabia',
    region: 'Middle East',
    internet_users_millions: 36.2,
    ecommerce_spend_usd_billions: 17.5,
    avg_adsense_rpm_usd: 15.2,
    affiliate_ecosystem_score: 79.0,
    language: 'Arabic',
    primary_language_code: 'ar',
    local_platforms: JSON.stringify(['Amazon SA', 'Noon SA', 'Jarir', 'Haraj', 'Mada Payments']),
    cultural_notes: 'Heavy Vision 2030 digital adoption, high purchasing power, massive Snapchat and TikTok engagement.',
    potential_score: 83.0,
    is_active: 1,
  },
  {
    country_code: 'BD',
    country_name: 'Bangladesh',
    region: 'South Asia',
    internet_users_millions: 74.0,
    ecommerce_spend_usd_billions: 3.8,
    avg_adsense_rpm_usd: 2.1,
    affiliate_ecosystem_score: 42.0,
    language: 'Bengali',
    primary_language_code: 'bn',
    local_platforms: JSON.stringify(['Daraz BD', 'Bikroy', 'Chaldal', 'Rokomari', 'bKash Payments']),
    cultural_notes: 'Mobile financial services (bKash/Nagad) widely accepted, rapid urbanization, emerging tech and education niches.',
    potential_score: 58.0,
    is_active: 1,
  },
  {
    country_code: 'ID',
    country_name: 'Indonesia',
    region: 'Southeast Asia',
    internet_users_millions: 215.0,
    ecommerce_spend_usd_billions: 62.0,
    avg_adsense_rpm_usd: 4.8,
    affiliate_ecosystem_score: 78.0,
    language: 'Indonesian',
    primary_language_code: 'id',
    local_platforms: JSON.stringify(['Tokopedia', 'Shopee ID', 'Blibli', 'Bukalapak', 'TikTok Shop ID', 'Involve Asia']),
    cultural_notes: 'World-leading social commerce adoption (TikTok Shop & live streams), youth-dominated demographic, halal product emphasis.',
    potential_score: 80.0,
    is_active: 1,
  },
  {
    country_code: 'MY',
    country_name: 'Malaysia',
    region: 'Southeast Asia',
    internet_users_millions: 33.0,
    ecommerce_spend_usd_billions: 14.2,
    avg_adsense_rpm_usd: 8.5,
    affiliate_ecosystem_score: 77.0,
    language: 'Malay / English',
    primary_language_code: 'ms',
    local_platforms: JSON.stringify(['Shopee MY', 'Lazada MY', 'Mudah.my', 'PG Mall', 'Involve Asia']),
    cultural_notes: 'High cross-border purchase appetite, multiracial consumer segments, strong English fluency alongside Bahasa Melayu.',
    potential_score: 78.5,
    is_active: 1,
  },
  {
    country_code: 'PH',
    country_name: 'Philippines',
    region: 'Southeast Asia',
    internet_users_millions: 85.0,
    ecommerce_spend_usd_billions: 16.0,
    avg_adsense_rpm_usd: 5.2,
    affiliate_ecosystem_score: 72.0,
    language: 'Filipino / English',
    primary_language_code: 'tl',
    local_platforms: JSON.stringify(['Shopee PH', 'Lazada PH', 'Carousell PH', 'GCash Ecosystem']),
    cultural_notes: 'Highest social media daily usage worldwide, strong English literacy, viral influencer and creator culture.',
    potential_score: 76.0,
    is_active: 1,
  },
  {
    country_code: 'SG',
    country_name: 'Singapore',
    region: 'Southeast Asia',
    internet_users_millions: 5.8,
    ecommerce_spend_usd_billions: 11.2,
    avg_adsense_rpm_usd: 18.5,
    affiliate_ecosystem_score: 89.0,
    language: 'English',
    primary_language_code: 'en',
    local_platforms: JSON.stringify(['Shopee SG', 'Lazada SG', 'Amazon SG', 'Qoo10', 'Carousell']),
    cultural_notes: 'Extremely high tech literacy and GDP per capita, regional fintech and SaaS launchpad.',
    potential_score: 87.0,
    is_active: 1,
  },
  {
    country_code: 'JP',
    country_name: 'Japan',
    region: 'East Asia',
    internet_users_millions: 102.5,
    ecommerce_spend_usd_billions: 155.0,
    avg_adsense_rpm_usd: 16.0,
    affiliate_ecosystem_score: 86.0,
    language: 'Japanese',
    primary_language_code: 'ja',
    local_platforms: JSON.stringify(['Rakuten', 'Amazon JP', 'Yahoo! Shopping JP', 'Mercari', 'A8.net']),
    cultural_notes: 'Requires authentic native Japanese presentation, high brand loyalty, point-reward systems (Point Town/Rakuten Points) highly prized.',
    potential_score: 85.5,
    is_active: 1,
  },
  {
    country_code: 'KR',
    country_name: 'South Korea',
    region: 'East Asia',
    internet_users_millions: 50.2,
    ecommerce_spend_usd_billions: 135.0,
    avg_adsense_rpm_usd: 14.5,
    affiliate_ecosystem_score: 84.0,
    language: 'Korean',
    primary_language_code: 'ko',
    local_platforms: JSON.stringify(['Coupang', 'Naver Shopping', 'Gmarket', '11Street', 'Kakao Pay']),
    cultural_notes: 'Ultra-fast rocket deliveries (Coupang Dawn Delivery), Naver search ecosystem dominance over Google, trend-driven consumerism.',
    potential_score: 84.5,
    is_active: 1,
  },
  {
    country_code: 'BR',
    country_name: 'Brazil',
    region: 'Latin America',
    internet_users_millions: 166.0,
    ecommerce_spend_usd_billions: 48.0,
    avg_adsense_rpm_usd: 6.2,
    affiliate_ecosystem_score: 79.0,
    language: 'Portuguese',
    primary_language_code: 'pt',
    local_platforms: JSON.stringify(['Mercado Livre', 'Amazon BR', 'Magalu', 'Shopee BR', 'Hotmart']),
    cultural_notes: 'Pix instant payments revolutionized commerce, world capital for info-products and courses (Hotmart), passionate social audiences.',
    potential_score: 79.5,
    is_active: 1,
  },
  {
    country_code: 'MX',
    country_name: 'Mexico',
    region: 'Latin America',
    internet_users_millions: 98.0,
    ecommerce_spend_usd_billions: 34.0,
    avg_adsense_rpm_usd: 7.0,
    affiliate_ecosystem_score: 75.0,
    language: 'Spanish',
    primary_language_code: 'es',
    local_platforms: JSON.stringify(['Mercado Libre MX', 'Amazon MX', 'Liverpool', 'Coppel', 'OXXO Pay']),
    cultural_notes: 'OXXO convenience store cash vouchers remain vital, booming nearshoring economy, growing middle class in tech niches.',
    potential_score: 77.0,
    is_active: 1,
  },
  {
    country_code: 'NG',
    country_name: 'Nigeria',
    region: 'Africa',
    internet_users_millions: 104.0,
    ecommerce_spend_usd_billions: 9.5,
    avg_adsense_rpm_usd: 3.1,
    affiliate_ecosystem_score: 55.0,
    language: 'English',
    primary_language_code: 'en',
    local_platforms: JSON.stringify(['Jumia NG', 'Konga', 'Jiji NG', 'Paystack Ecosystem', 'Selar']),
    cultural_notes: 'Dynamic creator economy, high demand for remote work, digital skills and fintech tools, creator commerce on Selar booming.',
    potential_score: 68.0,
    is_active: 1,
  },
  {
    country_code: 'KE',
    country_name: 'Kenya',
    region: 'Africa',
    internet_users_millions: 24.5,
    ecommerce_spend_usd_billions: 3.2,
    avg_adsense_rpm_usd: 3.4,
    affiliate_ecosystem_score: 58.0,
    language: 'English / Swahili',
    primary_language_code: 'sw',
    local_platforms: JSON.stringify(['Jumia KE', 'Kilimall', 'Jiji KE', 'M-Pesa Safaricom']),
    cultural_notes: 'M-Pesa mobile money pioneer, high tech entrepreneurship hub (Silicon Savannah), agriculture and micro-business niche strength.',
    potential_score: 66.5,
    is_active: 1,
  },
  {
    country_code: 'EG',
    country_name: 'Egypt',
    region: 'Middle East & North Africa',
    internet_users_millions: 80.0,
    ecommerce_spend_usd_billions: 7.1,
    avg_adsense_rpm_usd: 3.0,
    affiliate_ecosystem_score: 59.0,
    language: 'Arabic',
    primary_language_code: 'ar',
    local_platforms: JSON.stringify(['Amazon EG', 'Noon EG', 'Jumia EG', 'B.TECH', 'Fawry Payments']),
    cultural_notes: 'Fawry payment kiosks bridge cash and digital, large youth population, rapid shift toward online consumer electronics.',
    potential_score: 67.0,
    is_active: 1,
  },
  {
    country_code: 'TR',
    country_name: 'Turkey',
    region: 'Europe / Asia',
    internet_users_millions: 72.0,
    ecommerce_spend_usd_billions: 26.5,
    avg_adsense_rpm_usd: 4.5,
    affiliate_ecosystem_score: 71.0,
    language: 'Turkish',
    primary_language_code: 'tr',
    local_platforms: JSON.stringify(['Trendyol', 'Hepsiburada', 'Amazon TR', 'N11', 'GittiGidiyor']),
    cultural_notes: 'Trendyol super-app dominates, strong domestic manufacturing and fashion export base, high installment credit usage.',
    potential_score: 75.0,
    is_active: 1,
  },
  {
    country_code: 'NL',
    country_name: 'Netherlands',
    region: 'Europe',
    internet_users_millions: 17.1,
    ecommerce_spend_usd_billions: 36.8,
    avg_adsense_rpm_usd: 21.0,
    affiliate_ecosystem_score: 88.0,
    language: 'Dutch / English',
    primary_language_code: 'nl',
    local_platforms: JSON.stringify(['Bol.com', 'Coolblue', 'Amazon NL', 'iDEAL Payments', 'Daisycon']),
    cultural_notes: 'iDEAL bank payment standard covers ~70% of e-commerce, near 100% internet penetration, high English proficiency.',
    potential_score: 87.5,
    is_active: 1,
  },
  {
    country_code: 'ES',
    country_name: 'Spain',
    region: 'Europe',
    internet_users_millions: 43.5,
    ecommerce_spend_usd_billions: 68.2,
    avg_adsense_rpm_usd: 15.0,
    affiliate_ecosystem_score: 80.0,
    language: 'Spanish',
    primary_language_code: 'es',
    local_platforms: JSON.stringify(['Amazon ES', 'El Corte Inglés', 'PcComponentes', 'Wallapop', 'Awin ES']),
    cultural_notes: 'Wallapop second-hand marketplace huge, strong seasonal tourism niches, growing tech and eco-lifestyle interest.',
    potential_score: 80.5,
    is_active: 1,
  },
  {
    country_code: 'IT',
    country_name: 'Italy',
    region: 'Europe',
    internet_users_millions: 51.0,
    ecommerce_spend_usd_billions: 54.0,
    avg_adsense_rpm_usd: 14.8,
    affiliate_ecosystem_score: 79.0,
    language: 'Italian',
    primary_language_code: 'it',
    local_platforms: JSON.stringify(['Amazon IT', 'Subito.it', 'ePRICE', 'Unieuro', 'Awin IT']),
    cultural_notes: 'Traditional brand affinity, food and culinary niches supreme, rapid catching-up in subscription boxes and direct-to-consumer.',
    potential_score: 79.0,
    is_active: 1,
  },
  {
    country_code: 'PL',
    country_name: 'Poland',
    region: 'Europe',
    internet_users_millions: 33.5,
    ecommerce_spend_usd_billions: 28.0,
    avg_adsense_rpm_usd: 11.2,
    affiliate_ecosystem_score: 82.0,
    language: 'Polish',
    primary_language_code: 'pl',
    local_platforms: JSON.stringify(['Allegro', 'InPost Paczkomaty', 'Amazon PL', 'Ceneo', 'BLIK Payments']),
    cultural_notes: 'Allegro and BLIK payment/locker ecosystem holds fierce market share over foreign entrants, highly efficient logistics.',
    potential_score: 81.0,
    is_active: 1,
  },
  {
    country_code: 'VN',
    country_name: 'Vietnam',
    region: 'Southeast Asia',
    internet_users_millions: 78.5,
    ecommerce_spend_usd_billions: 20.5,
    avg_adsense_rpm_usd: 3.8,
    affiliate_ecosystem_score: 70.0,
    language: 'Vietnamese',
    primary_language_code: 'vi',
    local_platforms: JSON.stringify(['Shopee VN', 'Lazada VN', 'Tiki', 'Sendo', 'TikTok Shop VN', 'Accesstrade VN']),
    cultural_notes: 'One of the fastest-growing digital economies in ASEAN, lively livestream selling culture, high developer and gaming community.',
    potential_score: 76.5,
    is_active: 1,
  },
  {
    country_code: 'TH',
    country_name: 'Thailand',
    region: 'Southeast Asia',
    internet_users_millions: 61.2,
    ecommerce_spend_usd_billions: 24.0,
    avg_adsense_rpm_usd: 4.2,
    affiliate_ecosystem_score: 73.0,
    language: 'Thai',
    primary_language_code: 'th',
    local_platforms: JSON.stringify(['Shopee TH', 'Lazada TH', 'PromptPay', 'LINE Shopping', 'Central Online']),
    cultural_notes: 'LINE conversational commerce widely used, PromptPay instant QR payments ubiquitous, visual aesthetics-driven buyers.',
    potential_score: 77.0,
    is_active: 1,
  },
  {
    country_code: 'ZA',
    country_name: 'South Africa',
    region: 'Africa',
    internet_users_millions: 43.0,
    ecommerce_spend_usd_billions: 6.8,
    avg_adsense_rpm_usd: 9.5,
    affiliate_ecosystem_score: 72.0,
    language: 'English',
    primary_language_code: 'en',
    local_platforms: JSON.stringify(['Takealot', 'Amazon ZA', 'Superbalist', 'Makro', 'PayFast']),
    cultural_notes: 'Takealot powerhouse market leader now joined by Amazon ZA, strong English content appetite, fitness/solar power niches thriving.',
    potential_score: 74.0,
    is_active: 1,
  },
];

/**
 * Executes migration v1 on the given better-sqlite3 db instance.
 * @param {import('better-sqlite3').Database} db
 */
function up(db) {
  // 1. Enforce foreign keys & WAL
  db.pragma('foreign_keys = ON');

  // Transactionally create all 35 tables + indexes + seed
  const runMigration = db.transaction(() => {
    /* ══════════════════════════════════════════════════════════
       SECTION A: CORE / RUN MANAGEMENT (Tables 1-4)
       ══════════════════════════════════════════════════════════ */

    // 1. research_runs
    db.exec(`
      CREATE TABLE IF NOT EXISTS research_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_name TEXT NOT NULL,
        input_mode TEXT NOT NULL CHECK(input_mode IN ('discovery', 'own_niche', 'own_domain')),
        business_modes TEXT NOT NULL, -- JSON array of 'blogging','affiliate','ecommerce','digital_products'
        niche_quantity INTEGER NOT NULL,
        domain TEXT, -- nullable, only for own_domain mode
        competition_level TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'planning', 'discovery', 'awaiting_approval', 'deep_research', 'scoring', 'qa', 'reporting', 'completed', 'failed', 'cancelled')),
        approval_gate_passed BOOLEAN NOT NULL DEFAULT 0,
        auto_approve BOOLEAN NOT NULL DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        error_summary TEXT,
        dh_execution_plan TEXT, -- JSON
        trigger_source TEXT NOT NULL DEFAULT 'ui' CHECK(trigger_source IN ('ui', 'chat', 'scheduler', 'jarvis')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_research_runs_status ON research_runs(status);
      CREATE INDEX IF NOT EXISTS idx_research_runs_created ON research_runs(created_at);
    `);

    // 2. run_countries
    db.exec(`
      CREATE TABLE IF NOT EXISTS run_countries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        country_name TEXT NOT NULL,
        selection_type TEXT NOT NULL DEFAULT 'user_selected' CHECK(selection_type IN ('user_selected', 'auto_potential')),
        potential_score REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(run_id, country_code)
      );
      CREATE INDEX IF NOT EXISTS idx_run_countries_run ON run_countries(run_id);
    `);

    // 3. run_criteria
    db.exec(`
      CREATE TABLE IF NOT EXISTS run_criteria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
        raw_input TEXT NOT NULL, -- JSON
        parsed_brief TEXT NOT NULL, -- JSON
        parser_version TEXT NOT NULL DEFAULT '1.0',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_run_criteria_run ON run_criteria(run_id);
    `);

    // 4. agent_status
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
        agent_number INTEGER NOT NULL, -- 1-35
        agent_name TEXT NOT NULL,
        layer TEXT NOT NULL CHECK(layer IN ('control', 'discovery', 'deep_research', 'intelligence', 'qa_reporting')),
        status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle', 'queued', 'running', 'done', 'failed', 'retrying')),
        started_at TEXT,
        finished_at TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        output_summary TEXT,
        input_received TEXT, -- JSON
        output_payload TEXT, -- JSON
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(run_id, agent_number)
      );
      CREATE INDEX IF NOT EXISTS idx_agent_status_run ON agent_status(run_id);
      CREATE INDEX IF NOT EXISTS idx_agent_status_layer ON agent_status(layer);
    `);

    /* ══════════════════════════════════════════════════════════
       SECTION B: COUNTRIES (Agent #10) (Table 5)
       ══════════════════════════════════════════════════════════ */

    // 5. countries
    db.exec(`
      CREATE TABLE IF NOT EXISTS countries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_code TEXT NOT NULL UNIQUE,
        country_name TEXT NOT NULL,
        region TEXT,
        internet_users_millions REAL,
        ecommerce_spend_usd_billions REAL,
        avg_adsense_rpm_usd REAL,
        affiliate_ecosystem_score REAL,
        language TEXT,
        primary_language_code TEXT,
        local_platforms TEXT, -- JSON
        cultural_notes TEXT,
        potential_score REAL,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(country_code);
      CREATE INDEX IF NOT EXISTS idx_countries_active ON countries(is_active);
    `);

    /* ══════════════════════════════════════════════════════════
       SECTION C: DISCOVERY LAYER (Agents #6-9) (Tables 6-7)
       ══════════════════════════════════════════════════════════ */

    // 6. niches
    db.exec(`
      CREATE TABLE IF NOT EXISTS niches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
        niche_name TEXT NOT NULL,
        niche_slug TEXT NOT NULL,
        description TEXT,
        mode_fit TEXT, -- JSON
        why_relevant TEXT,
        trend_status TEXT CHECK(trend_status IN ('rising', 'stable', 'declining')),
        seasonality TEXT CHECK(seasonality IN ('evergreen', 'seasonal')),
        peak_months TEXT, -- JSON
        trend_reasoning TEXT,
        discovery_status TEXT NOT NULL DEFAULT 'candidate' CHECK(discovery_status IN ('candidate', 'screened_pass', 'screened_reject', 'duplicate_reject', 'approved', 'researched')),
        screen_reject_reason TEXT,
        duplicate_reason TEXT,
        domain_fit_reasoning TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_niches_run ON niches(run_id);
      CREATE INDEX IF NOT EXISTS idx_niches_slug ON niches(niche_slug);
      CREATE INDEX IF NOT EXISTS idx_niches_status ON niches(discovery_status);
    `);

    // 7. niche_history
    db.exec(`
      CREATE TABLE IF NOT EXISTS niche_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_name TEXT NOT NULL, -- normalized
        niche_slug TEXT NOT NULL,
        last_run_id INTEGER REFERENCES research_runs(id) ON DELETE SET NULL,
        last_suggested_at TEXT,
        last_status TEXT,
        reject_reason TEXT,
        times_suggested INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_niche_history_slug ON niche_history(niche_slug);
    `);

    /* ══════════════════════════════════════════════════════════
       SECTION D: DEEP RESEARCH (Agents #11-26) (Tables 8-23)
       All keyed by (niche_id + country_code) per Rule 7!
       ══════════════════════════════════════════════════════════ */

    // 8. keywords (Agent #11)
    db.exec(`
      CREATE TABLE IF NOT EXISTS keywords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        keyword TEXT NOT NULL,
        keyword_type TEXT CHECK(keyword_type IN ('seed', 'long_tail', 'question')),
        search_intent TEXT CHECK(search_intent IN ('informational', 'commercial', 'transactional', 'navigational')),
        volume_estimate INTEGER,
        difficulty_score REAL,
        cluster_name TEXT,
        local_term BOOLEAN NOT NULL DEFAULT 0,
        position_in_report INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_keywords_isolation ON keywords(niche_id, country_code);
    `);

    // 9. serp_results (Agent #12)
    db.exec(`
      CREATE TABLE IF NOT EXISTS serp_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        keyword TEXT NOT NULL,
        rank_position INTEGER,
        result_url TEXT NOT NULL,
        result_title TEXT,
        domain_name TEXT,
        result_type TEXT CHECK(result_type IN ('blog', 'ecommerce', 'forum', 'video', 'news', 'other')),
        da_estimate REAL,
        screenshot_path TEXT,
        captured_at TEXT,
        gl_parameter TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_serp_isolation ON serp_results(niche_id, country_code);
    `);

    // 10. competitors (Agent #13)
    db.exec(`
      CREATE TABLE IF NOT EXISTS competitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        competitor_name TEXT NOT NULL,
        website_url TEXT NOT NULL,
        pages_crawled INTEGER DEFAULT 0,
        affiliate_networks TEXT, -- JSON
        ad_networks TEXT, -- JSON
        social_profiles TEXT, -- JSON
        posting_frequency TEXT,
        content_formats TEXT, -- JSON
        teardown_9_fields TEXT, -- JSON
        screenshot_path TEXT,
        strength_summary TEXT,
        weakness_summary TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_competitors_isolation ON competitors(niche_id, country_code);
    `);

    // 11. content_gaps (Agent #14)
    db.exec(`
      CREATE TABLE IF NOT EXISTS content_gaps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        keyword TEXT NOT NULL,
        what_competitors_cover TEXT,
        what_is_missing TEXT,
        how_to_target TEXT,
        priority_rank INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_content_gaps_isolation ON content_gaps(niche_id, country_code);
    `);

    // 12. unmet_intents (Agent #15)
    db.exec(`
      CREATE TABLE IF NOT EXISTS unmet_intents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        intent_angle TEXT NOT NULL,
        source TEXT CHECK(source IN ('paa', 'related_searches', 'reddit', 'quora', 'forum')),
        source_url TEXT,
        demand_evidence TEXT,
        supply_gap_reasoning TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_unmet_intents_isolation ON unmet_intents(niche_id, country_code);
    `);

    // 13. social_competition (Agent #16)
    db.exec(`
      CREATE TABLE IF NOT EXISTS social_competition (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        platform TEXT NOT NULL CHECK(platform IN ('instagram', 'tiktok', 'youtube', 'facebook', 'pinterest')),
        top_accounts TEXT, -- JSON
        engagement_summary TEXT,
        gap_opportunity TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_social_comp_isolation ON social_competition(niche_id, country_code);
    `);

    // 14. paid_ads (Agent #17)
    db.exec(`
      CREATE TABLE IF NOT EXISTS paid_ads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        platform TEXT NOT NULL CHECK(platform IN ('facebook_ad_library', 'google_ads_transparency')),
        advertiser_name TEXT NOT NULL,
        ad_angles TEXT, -- JSON
        cpc_signal_usd REAL,
        ads_active BOOLEAN NOT NULL DEFAULT 1,
        money_signal_reasoning TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_paid_ads_isolation ON paid_ads(niche_id, country_code);
    `);

    // 15. digital_product_market (Agent #18)
    db.exec(`
      CREATE TABLE IF NOT EXISTS digital_product_market (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        platform TEXT NOT NULL CHECK(platform IN ('gumroad', 'etsy_digital', 'udemy', 'other')),
        product_name TEXT NOT NULL,
        price_usd REAL,
        demand_signal TEXT,
        sales_evidence TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_dig_mkt_isolation ON digital_product_market(niche_id, country_code);
    `);

    // 16. ecomm_market (Agent #19)
    db.exec(`
      CREATE TABLE IF NOT EXISTS ecomm_market (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        platform TEXT NOT NULL CHECK(platform IN ('amazon', 'daraz', 'aliexpress', 'etsy')),
        product_name TEXT NOT NULL,
        price_range_usd TEXT,
        price_range_local TEXT,
        demand_level TEXT CHECK(demand_level IN ('low', 'medium', 'high')),
        competition_level TEXT CHECK(competition_level IN ('low', 'medium', 'high')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_ecomm_mkt_isolation ON ecomm_market(niche_id, country_code);
    `);

    // 17. digital_product_list (Agent #20)
    db.exec(`
      CREATE TABLE IF NOT EXISTS digital_product_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        product_name TEXT NOT NULL,
        product_type TEXT NOT NULL CHECK(product_type IN ('ebook', 'course', 'template', 'tool', 'other')),
        launch_order INTEGER NOT NULL,
        why_this_order TEXT,
        research_basis TEXT, -- JSON
        expandable_batch INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_dig_list_isolation ON digital_product_list(niche_id, country_code);
    `);

    // 18. ecomm_product_list (Agent #21)
    db.exec(`
      CREATE TABLE IF NOT EXISTS ecomm_product_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        product_name TEXT NOT NULL,
        product_type TEXT,
        launch_order INTEGER NOT NULL,
        why_this_order TEXT,
        research_basis TEXT, -- JSON
        expandable_batch INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_ecomm_list_isolation ON ecomm_product_list(niche_id, country_code);
    `);

    // 19. affiliate_programs (Agent #22)
    db.exec(`
      CREATE TABLE IF NOT EXISTS affiliate_programs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        network TEXT NOT NULL CHECK(network IN ('amazon_associates', 'clickbank', 'shareasale', 'cj', 'impact', 'niche_specific')),
        program_name TEXT NOT NULL,
        commission_rate TEXT,
        cookie_duration_days INTEGER,
        payout_terms TEXT,
        earnings_estimate_usd REAL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_affiliate_isolation ON affiliate_programs(niche_id, country_code);
    `);

    // 20. rpm_data (Agent #23)
    db.exec(`
      CREATE TABLE IF NOT EXISTS rpm_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        estimated_rpm_usd REAL,
        adsense_rpm_usd REAL,
        mediavine_rpm_usd REAL,
        raptive_rpm_usd REAL,
        realistic_monthly_income_usd REAL,
        income_reasoning TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_rpm_isolation ON rpm_data(niche_id, country_code);
    `);

    // 21. personas (Agent #24)
    db.exec(`
      CREATE TABLE IF NOT EXISTS personas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        persona_name TEXT NOT NULL,
        demographics TEXT, -- JSON
        pain_points TEXT, -- JSON
        desires TEXT, -- JSON
        buying_behavior TEXT,
        online_hangouts TEXT, -- JSON
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_personas_isolation ON personas(niche_id, country_code);
    `);

    // 22. geo_localization (Agent #25)
    db.exec(`
      CREATE TABLE IF NOT EXISTS geo_localization (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        local_language TEXT,
        currency TEXT,
        local_platforms TEXT, -- JSON
        local_competitors TEXT, -- JSON
        cultural_notes TEXT,
        multi_country_comparison TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_geo_loc_isolation ON geo_localization(niche_id, country_code);
    `);

    // 23. domain_brand (Agent #26)
    db.exec(`
      CREATE TABLE IF NOT EXISTS domain_brand (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT, -- nullable
        domain_option TEXT NOT NULL,
        domain_available BOOLEAN NOT NULL DEFAULT 0,
        verified_at TEXT,
        brand_name TEXT,
        social_handles TEXT, -- JSON
        fit_analysis TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_domain_brand_isolation ON domain_brand(niche_id, country_code);
    `);

    /* ══════════════════════════════════════════════════════════
       SECTION E: INTELLIGENCE & SCORING (Agents #27-30) (Tables 24-27)
       ══════════════════════════════════════════════════════════ */

    // 24. country_benchmarks (Agent #27)
    db.exec(`
      CREATE TABLE IF NOT EXISTS country_benchmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        competition_level TEXT CHECK(competition_level IN ('low', 'medium', 'high')),
        potential_level TEXT CHECK(potential_level IN ('low', 'medium', 'high')),
        verdict_reason TEXT,
        matrix_position TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_benchmarks_isolation ON country_benchmarks(niche_id, country_code);
    `);

    // 25. opportunity_scores (Agent #28)
    db.exec(`
      CREATE TABLE IF NOT EXISTS opportunity_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        composite_score REAL NOT NULL DEFAULT 0,
        demand_score REAL,
        trend_score REAL,
        competition_score REAL,
        monetization_score REAL,
        gap_score REAL,
        mode_weights TEXT, -- JSON
        score_breakdown TEXT, -- JSON
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_scores_isolation ON opportunity_scores(niche_id, country_code);
    `);

    // 26. final_verdicts (Agent #29)
    db.exec(`
      CREATE TABLE IF NOT EXISTS final_verdicts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        verdict TEXT NOT NULL CHECK(verdict IN ('target', 'avoid', 'conditional')),
        target_countries TEXT, -- JSON
        avoid_countries TEXT, -- JSON
        honest_assessment TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_final_verdicts_niche ON final_verdicts(niche_id);
    `);

    // 27. risk_flags (Agent #30)
    db.exec(`
      CREATE TABLE IF NOT EXISTS risk_flags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        risk_type TEXT NOT NULL CHECK(risk_type IN ('ymyl', 'eeat', 'ad_restriction', 'affiliate_restriction', 'platform_policy')),
        severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')),
        description TEXT NOT NULL,
        mitigation TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_risk_flags_isolation ON risk_flags(niche_id, country_code);
    `);

    /* ══════════════════════════════════════════════════════════
       SECTION F: QA, REPORTING & HANDOFF (Agents #31-35) (Tables 28-31)
       ══════════════════════════════════════════════════════════ */

    // 28. qa_checks (Agents #31 & #32)
    db.exec(`
      CREATE TABLE IF NOT EXISTS qa_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
        niche_id INTEGER REFERENCES niches(id) ON DELETE CASCADE, -- nullable
        agent_number INTEGER NOT NULL,
        check_type TEXT NOT NULL CHECK(check_type IN ('during_run_supervisor', 'final_validation')),
        check_name TEXT NOT NULL,
        result TEXT NOT NULL CHECK(result IN ('pass', 'fail', 'warning')),
        issue_description TEXT,
        sent_back_to_agent BOOLEAN NOT NULL DEFAULT 0,
        resolved_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_qa_checks_run ON qa_checks(run_id);
    `);

    // 29. reports (Agent #33)
    db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        country_code TEXT, -- nullable for multi-country
        report_title TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'english' CHECK(language IN ('english', 'urdu')),
        pdf_path TEXT,
        charts_data TEXT, -- JSON
        page_14_content TEXT NOT NULL DEFAULT 'research_summary_handoff_preview',
        white_label_brand TEXT,
        generated_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_reports_run ON reports(run_id);
      CREATE INDEX IF NOT EXISTS idx_reports_niche ON reports(niche_id);
    `);

    // 30. seo_handoff_packages (Agent #34)
    db.exec(`
      CREATE TABLE IF NOT EXISTS seo_handoff_packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        package_json TEXT NOT NULL, -- JSON
        delivered_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_seo_packages_run ON seo_handoff_packages(run_id);
    `);

    // 31. re_research_log (Agent #35)
    db.exec(`
      CREATE TABLE IF NOT EXISTS re_research_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_run_id INTEGER NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
        new_run_id INTEGER NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
        change_type TEXT NOT NULL CHECK(change_type IN ('country_swap', 'filter_change', 'expand_products')),
        change_details TEXT, -- JSON
        affected_parts TEXT, -- JSON
        skipped_parts TEXT, -- JSON
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_reresearch_orig ON re_research_log(original_run_id);
    `);

    /* ══════════════════════════════════════════════════════════
       SECTION G: CONTROL LAYER SUPPORT (Agents #1-5) (Tables 32-35)
       ══════════════════════════════════════════════════════════ */

    // 32. scheduler_jobs (Agent #4)
    db.exec(`
      CREATE TABLE IF NOT EXISTS scheduler_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_name TEXT NOT NULL,
        criteria_json TEXT NOT NULL, -- JSON
        frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly')),
        next_run_at TEXT,
        last_run_at TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_run_ids TEXT, -- JSON
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_scheduler_active ON scheduler_jobs(is_active);
    `);

    // 33. chat_messages (Agent #5)
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'consultant', 'system')),
        message_content TEXT NOT NULL,
        referenced_niche_id INTEGER REFERENCES niches(id) ON DELETE SET NULL,
        forwarded_to_dh BOOLEAN NOT NULL DEFAULT 0,
        dh_run_id INTEGER REFERENCES research_runs(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id);
    `);

    // 34. jarvis_requests (Agent #3)
    db.exec(`
      CREATE TABLE IF NOT EXISTS jarvis_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_payload TEXT NOT NULL, -- JSON
        response_payload TEXT, -- JSON
        status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received', 'processing', 'completed', 'failed')),
        forwarded_run_id INTEGER REFERENCES research_runs(id) ON DELETE SET NULL,
        responded_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_jarvis_status ON jarvis_requests(status);
    `);

    // 35. app_settings (Global Settings Single-Row Table)
    db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        theme TEXT NOT NULL DEFAULT 'dark' CHECK(theme IN ('dark', 'light')),
        language TEXT NOT NULL DEFAULT 'english' CHECK(language IN ('english', 'urdu')),
        auto_approve BOOLEAN NOT NULL DEFAULT 0,
        gemini_api_key TEXT,
        jarvis_api_key TEXT,
        white_label_brand TEXT,
        last_update_check TEXT,
        schema_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Seed default app_settings row if not exists
    const existingSettings = db.prepare('SELECT id FROM app_settings WHERE id = 1').get();
    if (!existingSettings) {
      db.prepare(`
        INSERT INTO app_settings (id, theme, language, auto_approve, schema_version)
        VALUES (1, 'dark', 'english', 0, 1)
      `).run();
    }

    /* ══════════════════════════════════════════════════════════
       SEED DATA: 30 Major Countries with potential data
       ══════════════════════════════════════════════════════════ */
    const insertCountry = db.prepare(`
      INSERT OR REPLACE INTO countries (
        country_code, country_name, region, internet_users_millions,
        ecommerce_spend_usd_billions, avg_adsense_rpm_usd, affiliate_ecosystem_score,
        language, primary_language_code, local_platforms, cultural_notes,
        potential_score, is_active
      ) VALUES (
        @country_code, @country_name, @region, @internet_users_millions,
        @ecommerce_spend_usd_billions, @avg_adsense_rpm_usd, @affiliate_ecosystem_score,
        @language, @primary_language_code, @local_platforms, @cultural_notes,
        @potential_score, @is_active
      )
    `);

    for (const c of SEED_COUNTRIES) {
      insertCountry.run(c);
    }
  });

  runMigration();
}

module.exports = {
  version: 1,
  name: 'initial_35_agents_schema_and_seed_countries',
  up,
};
