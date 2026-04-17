import { useState } from 'react'

const SECTIONS = [
  {
    title: '🚀 Getting Started',
    color: '#00e5ff',
    faqs: [
      {
        q: 'What is Media Tracker?',
        a: `Media Tracker is a private dashboard for The Block's media team to log, organize, and measure all published content across every platform — YouTube, X (Twitter), TikTok, LinkedIn, Instagram, and more. It's a single source of truth for everything you've published and how it's performing.`,
      },
      {
        q: 'How do I log a new post?',
        a: `Click the pink "+ LOG POST" button in the top right. Paste the URL — if it's a YouTube link, the title auto-fetches. Then select the show, media type (Clip, Full Episode, Broadcast, Article, Thread, Reply, Partner Post), and optionally the episode number or label. Hit Enter or click Submit.`,
      },
      {
        q: 'What are the tabs?',
        a: `• BOARD — Kanban columns organized by show\n• CALENDAR — Posts by publish date with metrics inline\n• ANALYTICS — Performance charts, Sprout sync, and stats table\n• PODCAST — Transistor.fm download data for your three main shows\n• INBOX — Triage view for sorting unassigned or imported posts\n• HELP — You're here`,
      },
      {
        q: 'Who can access this?',
        a: `Access is controlled by Cloudflare Pages authentication. Only email addresses added to the ALLOWED_EMAILS secret in Cloudflare Pages settings can log in. Contact your admin to be added.`,
      },
    ],
  },
  {
    title: '📋 The Board',
    color: '#b44eff',
    faqs: [
      {
        q: 'What are the columns?',
        a: `• The Crypto Beat, The Big Brain Podcast, Layer One, The White Papers — main podcast shows\n• Standalones — one-off videos or clips not tied to a series\n• Editorials — Instagram + LinkedIn cross-posted article content\n• Newsroom — @TheBlockCo X/Twitter news headlines with article links\n• Unassigned — anything imported that hasn't been categorized yet`,
      },
      {
        q: 'How do I hide or show columns?',
        a: `Use the COLUMNS toggle bar just above the board. Each pill represents a column — click it to hide or show that column. The × on each column header also hides it. Your preferences are saved automatically and remembered when you refresh the page. Hidden columns still collect data normally — it's display only.`,
      },
      {
        q: 'What do the colored pills on each card mean?',
        a: `• Platform pill (YouTube, X, TikTok, etc.) — where the content lives\n• Media type pill (Clip, Full Episode, Broadcast, Article, Thread, Reply, Partner Post) — what kind of content it is\n• Episode number or label — which episode or group it belongs to\n• Clip2, Clip3, etc. — multiple clips for the same episode are numbered automatically`,
      },
      {
        q: 'What are the grouped "EP 73" sections?',
        a: `When multiple posts share the same episode number, they collapse into a group. Click the group to expand it. The collapsed view shows platform pills and type labels at a glance. The checkbox next to the post count selects all posts in that group at once for batch actions.`,
      },
      {
        q: 'How do I filter the board by date?',
        a: `Use the date range bar below the nav tabs. Choose This Week (default), Last 14 Days, Last 30 Days, All Time, or a custom date range. The board and the six stats cards at the top all update to reflect posts from that period only.`,
      },
      {
        q: 'How do I edit a post?',
        a: `Click Edit on any card (hover to reveal it, or expand an episode group). A modal opens where you can change the show, media type, and episode number/label. Hit Enter or Save Changes. Changes save immediately. You can type anything in the Episode field — numbers like 73, or text labels like "Polymarket" or "Q1".`,
      },
    ],
  },
  {
    title: '🏷️ Media Types',
    color: '#f0a020',
    faqs: [
      {
        q: 'What media types are available?',
        a: `• Clip — short clip from an episode. TikToks always import as Clip. YouTube Shorts also import as Clip.\n• Full Episode — complete episode video (YouTube long-form)\n• Broadcast — live stream or broadcast version\n• Article — written article or editorial post. LinkedIn/Instagram posts and @TheBlockCo news headlines import as Article.\n• Thread — multi-post X/Twitter thread\n• Reply — a reply or quote tweet with notable engagement\n• Partner Post — content created with a sponsor or partner`,
      },
      {
        q: 'How does clip numbering work?',
        a: `If you log multiple clips for the same show and episode, they're numbered automatically: Clip, Clip2, Clip3, etc. The system counts existing clips for that show+episode and assigns the next number. This also applies to Broadcasts (Broadcast, Broadcast2, etc.).`,
      },
      {
        q: 'How does the importer decide media type?',
        a: `The import logic uses several signals:\n• TikTok → always Clip\n• YouTube /shorts/ URL → Clip\n• YouTube /watch URL → Full Episode\n• @TheBlockPods X posts → Clip (guest quote clips from episodes)\n• @TheBlockCo X short headline (no hashtags) → Article in Newsroom\n• @TheBlockCo X with hashtags/emojis → Clip\n• LinkedIn/Instagram cross-posted pairs → Article in Editorials\n• LinkedIn alone → skipped (not imported)\n• Sprout episode tags (TCB 73, L1 01, etc.) always override the above`,
      },
    ],
  },
  {
    title: '📊 Analytics & Metrics',
    color: '#ff2d78',
    faqs: [
      {
        q: 'Where do the numbers come from?',
        a: `All metrics come directly from Sprout Social, which pulls them from each platform's native API (X, YouTube, LinkedIn, TikTok, Instagram). These are identical to what you'd see in Sprout's own dashboard. They are "lifetime" metrics — total since the post was published, not for a specific date window.`,
      },
      {
        q: 'What does Sync Sprout do?',
        a: `Sync Sprout ONLY updates stats (views, engagement, impressions) on posts already logged in your tracker. It does NOT create new posts or cards. It fetches the last 365 days of data from Sprout, matches URLs to your existing logged posts, and writes the metric numbers to the database. Your show assignments, media types, episode labels, and all other manual edits are never touched.`,
      },
      {
        q: 'How do I bring in NEW posts from Sprout?',
        a: `Use "Import from Sprout" in the Analytics tab (the green button). This is different from Sync. Import fetches posts from Sprout and creates new cards for ones not already in your tracker. It uses your Sprout tags to auto-assign shows: TCB 73 → The Crypto Beat EP 73, L1 01 → Layer One EP 1, BBP 05 → Big Brain EP 5. Unrecognized posts land in Newsroom or Unassigned for sorting in the Inbox tab.`,
      },
      {
        q: 'What do the six stats cards at the top show?',
        a: `All six update based on your selected date range:\n• Total Posts — posts in the date range\n• Shows Active — shows with content in that range\n• Top Platform — platform with the most posts\n• Total Views — sum of all video views\n• Total Engagement — sum of likes, comments, shares\n• Total Impressions — sum of all impressions\n\nHover over Views, Engagement, or Impressions to see the exact full number.`,
      },
      {
        q: 'Can I export data to a spreadsheet?',
        a: `Yes, two ways:\n1. Analytics tab → yellow "⬇ CSV" button exports whatever your current filter shows\n2. Board → batch-select posts with checkboxes → "⬇ Export CSV" in the purple batch bar\n\nBoth exports include: Title, Show, Platform, Media Type, Episode, Date, Views, Engagement, Impressions, URL.`,
      },
    ],
  },
  {
    title: '🎙️ Podcast Tab',
    color: '#39ff8c',
    faqs: [
      {
        q: 'What shows appear in the Podcast tab?',
        a: `The Crypto Beat, Layer One, and The Big Brain Podcast only. Click "All Shows" to see combined data across all three, or click a specific show to drill in. The Scoop and The Block Research Podcast are excluded.`,
      },
      {
        q: 'What data comes from Transistor?',
        a: `Total downloads per episode and daily download trends, using the IAB 2.0 standard (industry standard for podcast measurement). View 7, 14, or 30-day windows. Toggle between bar and line chart. Sort episodes by downloads or publish date. The trend chart has hover tooltips showing the exact download count per day.`,
      },
      {
        q: 'Why are Spotify Streams and Apple Listens not shown?',
        a: `Transistor's API only exposes total downloads — not per-platform breakdowns. Spotify and Apple listener counts are only available inside those platforms' own dashboards. Downloads measure audio file deliveries, which is a separate metric from platform-side streams.`,
      },
    ],
  },
  {
    title: '📬 Inbox',
    color: '#ff9de2',
    faqs: [
      {
        q: 'What is the Inbox for?',
        a: `The Inbox is a triage view for posts that haven't been properly categorized. Mainly content imported from Sprout that landed in Newsroom or Unassigned because it didn't match a known episode tag. Use it to bulk-sort posts without opening individual edit modals.`,
      },
      {
        q: 'How do I use the Inbox?',
        a: `Filter by show (e.g. Newsroom or Unassigned), then use the inline dropdowns on each row to change the show, media type, and episode/label. When you change anything, the row highlights purple. Hit Enter in the label field or click Save to commit. A green "✓ saved" confirmation appears briefly. Use the search bar to find specific content by keyword.`,
      },
    ],
  },
  {
    title: '✅ Batch Actions',
    color: '#00e5ff',
    faqs: [
      {
        q: 'How do I select multiple posts?',
        a: `On the Board, hover over any card to reveal a checkbox in the top-right corner. Click to select. For episode groups, click the checkbox next to the post count in the group header to select all posts in that group at once. You can select posts across multiple columns and groups simultaneously.`,
      },
      {
        q: 'What can I do with batch-selected posts?',
        a: `Once posts are selected, a purple bar appears at the top of the board:\n• Move to show — reassign all selected to a different column/show\n• Change type — change media type for all selected\n• Apply — executes the above changes immediately\n• ⬇ Export CSV — download a spreadsheet with all metrics for selected posts\n• 🗑 Delete — delete all selected (with confirmation step)`,
      },
    ],
  },
  {
    title: '🗂️ Sprout Import Logic',
    color: '#f0e040',
    faqs: [
      {
        q: 'How does the importer match posts to shows?',
        a: `The importer reads Sprout tags on each post. Tags follow naming conventions:\n• TCB 73 → The Crypto Beat, Episode 73\n• L1 01 → Layer One, Episode 1\n• BBP 05 → The Big Brain Podcast, Episode 5\n• WP 02 → The White Papers, Episode 2\n• Editorials tag → Editorials board\n\nIf no matching tag is found, the post goes to Newsroom (X posts) or Unassigned (other platforms).`,
      },
      {
        q: 'What is the difference between Sync and Import?',
        a: `• SYNC SPROUT — Updates stats (views, engagement, impressions) on posts already in your tracker. Never creates new cards. Never overwrites show/type/episode data.\n\n• IMPORT FROM SPROUT — Creates new cards for posts not yet in your tracker. Uses Sprout tags to assign shows and episode numbers. Skips any URL already logged (no duplicates).`,
      },
      {
        q: 'What happens to posts that don\'t match any tag?',
        a: `• X/Twitter posts without a tag → Newsroom column, Article type\n• @TheBlockPods X posts → Clip type for the matched show\n• Instagram + LinkedIn cross-posted pairs with an Editorials tag → Editorials column\n• Everything else → Unassigned column\n\nUse the Inbox tab to sort through Newsroom and Unassigned posts and assign them properly.`,
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
    <div style={{ maxWidth:860, margin:'0 auto', padding:'24px 24px 60px' }}>
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
