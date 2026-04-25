import { useState } from 'react'

const SECTIONS = [
  {
    title: '🚀 Getting Started',
    color: '#00e5ff',
    faqs: [
      {
        q: 'What is Media Tracker?',
        a: `Media Tracker is a private dashboard for The Block's media team to log, organize, and measure all published content across every platform — YouTube, X (Twitter), TikTok, LinkedIn, Instagram, and more. It's a single source of truth for everything published and how it's performing.`,
      },
      {
        q: 'How do I log a new post?',
        a: `Click "✚ Log Post" in the top right header. Paste the URL — YouTube links auto-fetch the title. Set the show, media type, episode number or label, and publish date. Click "+ Add another link" to batch-log multiple posts at once with the same show/type/episode. Hit Enter or Log Post to submit.`,
      },
      {
        q: 'What are the tabs?',
        a: `• 🏆 TOP — Leaderboard of best performing content\n• ▦ BOARD — Kanban columns organized by show\n• ▲ ANALYTICS — Calendar date filter, performance chart, and stats table\n• 🎙 PODCAST — Transistor.fm download data\n• ? HELP — You're here\n\n📬 Inbox, 📥 Import, and ⟳ Sync are in the top header — accessible from any tab.`,
      },
      {
        q: 'Who can access this?',
        a: `The site is password-protected via Cloudflare Pages. Anyone with the site password can access it. Contact cotykuhn@gmail.com to get access.`,
      },
    ],
  },
  {
    title: '📋 The Board',
    color: '#b44eff',
    faqs: [
      {
        q: 'What are the columns?',
        a: `• The Crypto Beat, The Big Brain Podcast, Layer One, The White Papers — main podcast shows\n• Standalones — one-off videos not tied to a series\n• Editorials — Instagram + LinkedIn cross-posted articles\n• Newsroom — @TheBlockCo X/Twitter news headlines\n• Partners & Campaigns — sponsored content and campaign posts (e.g. Polymarket)\n• Unassigned — imported content not yet categorized`,
      },
      {
        q: 'How do I hide or show columns?',
        a: `Use the COLUMNS toggle bar above the board. Click any pill to hide/show that column. The × on each column header also hides it. Your preferences save automatically. Hidden columns still collect data — it's display only.\n\nThe board has a horizontal scrollbar when all columns are visible — scroll right to see Newsroom and Partners & Campaigns.`,
      },
      {
        q: 'What do the colored pills on each card mean?',
        a: `• Platform pill (YouTube, X, TikTok, etc.) — where the content lives\n• Media type pill — what kind of content it is\n• Episode number or label — which episode or group it belongs to\n• Clip2, Clip3 etc. — multiple clips for the same episode are auto-numbered`,
      },
      {
        q: 'What are the grouped "EP 73" sections?',
        a: `When multiple posts share the same episode number, they collapse into a group. Click to expand and see all posts inside. The checkbox next to the post count selects all posts in that group for batch actions.`,
      },
      {
        q: 'How do I filter the board by date?',
        a: `Use the date range bar below the nav tabs: Today · This Week (default) · Last 14 Days · Last 30 Days · All Time · Custom. The board and the six stats cards update to reflect posts from that period only.`,
      },
      {
        q: 'How does search work?',
        a: `The search box in the date range bar searches ALL posts regardless of the selected date range. Searches across title, show, platform, media type, episode number, and URL. Results appear immediately as you type. Click × to clear.`,
      },
      {
        q: 'How do I edit a post?',
        a: `Hover over any card and click Edit. A modal opens to change the show, media type, episode/label, publish date, and Sprout Sync URL. You can also enter stats manually if Sprout can't sync them. Hit Enter or Save Changes.`,
      },
    ],
  },
  {
    title: '🏷️ Media Types',
    color: '#f0a020',
    faqs: [
      {
        q: 'What media types are available?',
        a: `• Clip — short clip from an episode (TikToks and YouTube Shorts always import as Clip)\n• Full Episode — complete episode (YouTube long-form)\n• Broadcast — live stream or broadcast\n• Article — written article, editorial, or news headline\n• Podcast Article — article specifically about a podcast episode\n• Thread — multi-post X/Twitter thread\n• Reply — notable reply or quote tweet\n• Partner Post — sponsored or campaign content`,
      },
      {
        q: 'How does the importer assign media types?',
        a: `• TikTok → Clip\n• YouTube Shorts (/shorts/ URL) → Clip\n• YouTube regular (/watch URL) → Full Episode\n• @TheBlockPods X posts → Clip\n• @TheBlockCo short plain headline → Article in Newsroom\n• LinkedIn/Instagram cross-posts → Article in Editorials\n• Campaign-tagged posts (Polymarket, partner, sponsored) → Partner Post in Partners & Campaigns\n• Sprout episode tags (TCB 73, L1 01, BBP 05, TWP 01) override everything above`,
      },
      {
        q: 'How does clip numbering work?',
        a: `Multiple clips for the same show+episode are auto-numbered: Clip, Clip2, Clip3, etc. Same applies to Broadcasts.`,
      },
    ],
  },
  {
    title: '📊 Analytics & Metrics',
    color: '#ff2d78',
    faqs: [
      {
        q: 'Where do the numbers come from?',
        a: `All metrics come from Sprout Social, which pulls from each platform's native API. These are "lifetime" metrics — total since the post was published. They're what you'd see in Sprout's own dashboard.\n\nNote: YouTube stats have a 2-3 day reporting delay. X's API doesn't expose all metrics visible in native X analytics (link clicks, profile visits, etc.).`,
      },
      {
        q: 'What does ⟳ Sync do?',
        a: `Sync updates stats (views, engagement, impressions) on posts already in your tracker. It does NOT create new cards. It searches Sprout for matching URLs and writes back the latest numbers. Your show assignments, media types, and episode labels are never touched by sync.\n\nEvery card also has an individual ⟳ sync button — click it to sync just that one post immediately without running a full sync.`,
      },
      {
        q: 'What does 📥 Import do?',
        a: `Import fetches posts from Sprout and creates NEW cards for ones not yet in your tracker. Uses Sprout tags to auto-assign shows and episode numbers. Unrecognized posts land in Newsroom or Unassigned.\n\nDefault import window is Last 24 hours — change it for broader pulls (Last 7 days, Last 30 days, etc.). All platforms are selected by default.`,
      },
      {
        q: 'What if a post won\'t sync via Sprout?',
        a: `Two options:\n1. Sprout Sync URL — in the Edit modal, paste the URL exactly as Sprout stores it. The sync will use that URL to find the match.\n2. Manual stats — in the Edit modal, expand "Enter stats manually" and type in views, engagement, and impressions directly from YouTube Studio or X Analytics.`,
      },
      {
        q: 'What do the six stats cards at the top show?',
        a: `All six reflect your selected date range AND visible columns (hidden columns are excluded):\n• Total Posts, Shows Active, Top Platform\n• Total Views — hover to see the full unabbreviated number\n• Total Engagement — hover for full number\n• Total Impressions — hover for full number`,
      },
      {
        q: 'Can I export data?',
        a: `Two ways:\n1. Analytics tab → ⬇ CSV exports your current filtered view\n2. Board → batch-select posts → ⬇ Export CSV in the purple batch bar\n\nBoth include: Title, Show, Platform, Media Type, Episode, Date, Views, Engagement, Impressions, URL.`,
      },
    ],
  },
  {
    title: '🏆 Leaderboard (TOP)',
    color: '#ffd700',
    faqs: [
      {
        q: 'What is the TOP tab?',
        a: `A leaderboard of best performing content. Top 3 get gold/silver/bronze hero cards. Everything else is in a ranked table below.`,
      },
      {
        q: 'How do I filter the leaderboard?',
        a: `• RANGE — Today · This Week · Month · Year · All Time\n• RANKED BY — 👁 Views · 💬 Engagement · 📢 Impressions\n• SHOW — filter to a specific show (includes Newsroom, Editorials, Partners & Campaigns)\n• TYPE — filter to Clips only, Articles only, etc.\n\nTotals bar shows combined metrics for your current filtered view. "Show 25 more" loads additional results.`,
      },
    ],
  },
  {
    title: '◫ Analytics Calendar',
    color: '#39ff8c',
    faqs: [
      {
        q: 'How does the date range work on Analytics?',
        a: `The calendar on the left of the Analytics page is the date filter. Click any day to filter to just that day, or click and drag across multiple days to select a range. Quick presets — 7d, 30d, 90d — and a Today jump are below the grid. Click ✕ Clear to go back to all time.`,
      },
      {
        q: 'What do the cell colors mean?',
        a: `Each day is shaded by how many posts were published that day — darker cells = busier days. The number in the corner is the post count. Today is outlined in yellow.`,
      },
      {
        q: 'How does the calendar connect to the chart?',
        a: `Hover a day on the calendar and you'll see a crosshair appear on the chart at that date. Hover a point on the chart and the matching calendar cell highlights. Rows in the Post Stats table below also highlight when their day is hovered.`,
      },
    ],
  },
  {
    title: '🎙️ Podcast',
    color: '#00e5ff',
    faqs: [
      {
        q: 'What shows appear in the Podcast tab?',
        a: `The Crypto Beat, Layer One, and The Big Brain Podcast only. Click "All Shows" for combined data or a specific show to drill in.`,
      },
      {
        q: 'What data comes from Transistor?',
        a: `Total downloads per episode using the IAB 2.0 standard. View 7, 14, or 30-day windows. Toggle bar/line chart. Sort by downloads or publish date. Hover chart bars for exact counts.\n\nNote: Transistor only provides total downloads — not per-platform breakdowns (Spotify, Apple). Those are only available in those platforms' own dashboards.`,
      },
    ],
  },
  {
    title: '📬 Inbox',
    color: '#ff9de2',
    faqs: [
      {
        q: 'What is the Inbox for?',
        a: `A triage view for posts that need categorizing — mainly Sprout imports that landed in Newsroom or Unassigned because they didn't match a known episode tag. Access it via 📬 Inbox in the header bar from any tab.`,
      },
      {
        q: 'How do I use the Inbox?',
        a: `Filter by show, then use the inline dropdowns on each row to change show, media type, and episode/label. Changed rows highlight purple. Hit Enter or click Save to commit. Green ✓ saved confirms it. Use the search bar to find specific content by keyword.`,
      },
    ],
  },
  {
    title: '✅ Batch Actions',
    color: '#b44eff',
    faqs: [
      {
        q: 'How do I select multiple posts?',
        a: `Hover any card to reveal a checkbox. For episode groups, click the checkbox next to the post count to select all posts in that group. Select across multiple columns simultaneously.`,
      },
      {
        q: 'What can I do with batch-selected posts?',
        a: `A purple bar appears at the top of the board:\n• Move to show — reassign all selected\n• Change type — change media type for all\n• EP / label — set episode number or label for all\n• Apply — executes changes\n• ⬇ Export CSV — download spreadsheet with all metrics\n• 🗑 Delete — delete all (with confirmation)`,
      },
    ],
  },
  {
    title: '🗂️ Sprout Import Logic',
    color: '#f0e040',
    faqs: [
      {
        q: 'What Sprout tags are supported?',
        a: `Episode tags (flexible spacing and zero-padding):\n• TCB 73, TCB73 → The Crypto Beat EP 73\n• BBP 05, BBP5 → The Big Brain Podcast EP 5\n• L1 01, L101 → Layer One EP 1\n• TWP 02, WP 02 → The White Papers EP 2\n\nCollection tags:\n• Editorials → Editorials column\n• Polymarket, campaign, partner, sponsored → Partners & Campaigns\n\nUntagged X posts → Newsroom · Everything else untagged → Unassigned`,
      },
      {
        q: 'Sync vs Import — what\'s the difference?',
        a: `• SYNC (⟳) — Updates stats on posts already logged. Never creates new cards. Never overwrites your show/type/episode data.\n\n• IMPORT (📥) — Creates new cards for posts not yet in your tracker. Uses Sprout tags to assign shows and episodes. Skips URLs already logged (duplicate detection normalizes x.com vs twitter.com and strips tracking params like ?s=20).`,
      },
      {
        q: 'What are the import date range options?',
        a: `Last 24 hours (default) · Last 7 days · Last 2 weeks · Last 30 days · Last 90 days · Last 6 months · Last 1 year · Last 2 years\n\nAll platforms selected by default. Use "Deselect All" or individual toggles to narrow it down.`,
      },
      {
        q: 'Why would a post not sync even though it\'s in Sprout?',
        a: `Most common reasons:\n1. URL mismatch — you logged x.com/... but Sprout has twitter.com/... (the normalizer handles this, but some edge cases exist)\n2. YouTube reporting delay — stats take 2-3 days to appear in Sprout\n3. Post is outside the 365-day sync window\n4. LinkedIn posts — LinkedIn's URL format in Sprout differs from what's visible in the browser\n\nFix: Use the Sprout Sync URL field in the Edit modal, or enter stats manually.`,
      },
    ],
  },
  {
    title: '🔧 Admin & Deployment',
    color: '#ff6b35',
    faqs: [
      {
        q: 'How is the site deployed?',
        a: `GitHub → Cloudflare Pages auto-deploy. Push to the main branch on GitHub and Cloudflare picks it up automatically. Alternatively deploy directly via:\nnpx wrangler pages deploy dist --project-name media-tracker --branch main`,
      },
      {
        q: 'Where is data stored?',
        a: `Cloudflare D1 (SQLite) database named "media-tracker-db". All posts, stats, import logs, and pending review submissions live here. The database is bound to the Pages project and accessible from all Functions.`,
      },
      {
        q: 'What environment variables are needed?',
        a: `Set in Cloudflare Pages → Settings → Environment Variables:\n• ADMIN_EMAIL — cotykuhn@gmail.com (admin access)\n• ALLOWED_EMAILS — comma-separated list of all allowed emails\n• SITE_PASSWORD — site access password\n• SPROUT_API_TOKEN — Sprout Social API token\n• SPROUT_CUSTOMER_ID — 7396117\n• DB binding — D1 database "media-tracker-db"`,
      },
      {
        q: 'What is the review queue?',
        a: `When non-admin users submit posts or edits, they go to a pending queue instead of going live immediately. The Review Queue button in the header shows the count of pending items.\n\nAs admin you can:\n• Edit a submission before approving\n• Approve or reject individually\n• Batch approve/reject multiple at once with checkboxes`,
      },
    ],
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setOpen(v => !v)}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', gap:12 }}>
        <div style={{ fontFamily:'DM Mono', fontSize:11, color:'var(--text)', lineHeight:1.4 }}>{q}</div>
        <span style={{ fontFamily:'DM Mono', fontSize:12, color:'var(--text3)', flexShrink:0,
          transition:'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </div>
      {open && (
        <div style={{ padding:'0 16px 14px 32px', fontFamily:'DM Mono', fontSize:10,
          color:'var(--text2)', lineHeight:1.9, whiteSpace:'pre-line',
          borderLeft:'2px solid var(--border2)', marginLeft:16 }}>
          {a}
        </div>
      )}
    </div>
  )
}

export default function HelpView() {
  const [activeSection, setActiveSection] = useState(null)
  const filtered = activeSection ? SECTIONS.filter(s => s.title === activeSection) : SECTIONS

  return (
    <div style={{ maxWidth:880, margin:'0 auto', padding:'24px 24px 60px' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'Press Start 2P', fontSize:11, color:'var(--purple)',
          textShadow:'0 0 14px rgba(180,78,255,0.7)', marginBottom:8 }}>HELP & FAQ</div>
        <div style={{ fontFamily:'DM Mono', fontSize:10, color:'var(--text3)', lineHeight:1.8 }}>
          Everything you need to know about using Media Tracker. Click any question to expand.
        </div>
      </div>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
        <button className={`metric-btn${!activeSection ? ' active' : ''}`}
          style={!activeSection ? { color:'var(--purple)', borderColor:'rgba(180,78,255,0.4)' } : {}}
          onClick={() => setActiveSection(null)}>All Topics</button>
        {SECTIONS.map(s => (
          <button key={s.title} className={`metric-btn${activeSection === s.title ? ' active' : ''}`}
            style={activeSection === s.title ? { color:s.color, borderColor:s.color+'55' } : {}}
            onClick={() => setActiveSection(activeSection === s.title ? null : s.title)}>
            {s.title}
          </button>
        ))}
      </div>

      {filtered.map(section => (
        <div key={section.title} className="win95-window" style={{ marginBottom:16 }}>
          <div className="win95-titlebar" style={{ background:`linear-gradient(90deg, #0f0c1e, ${section.color}22)`,
            borderBottom:`1px solid ${section.color}33` }}>
            <span className="win95-title" style={{ color:section.color }}>{section.title}</span>
          </div>
          <div>{section.faqs.map(faq => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}</div>
        </div>
      ))}

      <div style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--text3)', textAlign:'center', marginTop:32, lineHeight:1.8 }}>
        Built for The Block media team · Cloudflare Pages + D1 + Sprout Social + Transistor.fm
      </div>
    </div>
  )
}
